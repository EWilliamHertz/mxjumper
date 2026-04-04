import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

import axios from 'axios';
import { useAuth } from './AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL ? BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') : '';

// Ensure cookies are sent with every request
axios.defaults.withCredentials = true;

const GameContext = createContext(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

export const GameProvider = ({ children }) => {
  const { user } = useAuth();
  const [player, setPlayer] = useState(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true); // NEW: Prevents the flash
  const [playerLoading, setPlayerLoading] = useState(true);
  const [party, setParty] = useState([]);
  const [allies, setAllies] = useState([]);
  const [abilities, setAbilities] = useState({ unlocked: [], available: [], locked: [] });
  const [otherPlayers, setOtherPlayers] = useState({});
  const [gameState, setGameState] = useState('overworld');
  const [combatData, setCombatData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [friends, setFriends] = useState({ friends: [], pending: [], requests: [] });
  const [quests, setQuests] = useState({ available: [], active: [], completed: [] });
  const [npcs, setNpcs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [bestiary, setBestiary] = useState({ monsters: [], total: 0, discovered: 0, captured_count: 0 });
  
  const wsRef = useRef(null);

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch player data
  const fetchPlayer = useCallback(async () => {
    try {
      // Only set loading true if we don't already have a player (prevents flashing on re-fetches)
      if (!player) setPlayerLoading(true); 
      const { data } = await axios.get(`${API}/player`, { headers: getAuthHeader() });
      setPlayer(data);
      return data;
    } catch (err) {
      if (err.response?.status === 404) setPlayer(null);
      return null;
    } finally {
      setPlayerLoading(false);
      setIsLoadingPlayer(false); // Make sure to flip your new state too, just in case
    }
  }, [getAuthHeader, player]);

  // Create player
  const createPlayer = useCallback(async (name) => {
    try {
      const { data } = await axios.post(`${API}/player`, { name }, { headers: getAuthHeader() });
      setPlayer(data);
      return { success: true, player: data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  }, [getAuthHeader]);

  // Fetch party
  const fetchParty = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/party`, { headers: getAuthHeader() });
      setParty(data);
      return data;
    } catch (err) {
      return [];
    }
  }, [getAuthHeader]);

  // Fetch allies
  const fetchAllies = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/allies`, { headers: getAuthHeader() });
      setAllies(data);
      return data;
    } catch (err) {
      return [];
    }
  }, [getAuthHeader]);

  // Fetch abilities
  const fetchAbilities = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/player/abilities`, { headers: getAuthHeader() });
      setAbilities(data);
      return data;
    } catch (err) {
      return { unlocked: [], available: [], locked: [] };
    }
  }, [getAuthHeader]);

  // Toggle ally in party
  const toggleParty = useCallback(async (allyId) => {
    try {
      const { data } = await axios.put(`${API}/allies/${allyId}/party`, {}, { headers: getAuthHeader() });
      await fetchAllies();
      await fetchParty();
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, fetchAllies, fetchParty]);

  // Allocate stats
  const allocateStats = useCallback(async (stats) => {
    try {
      await axios.put(`${API}/player/stats`, stats, { headers: getAuthHeader() });
      await fetchPlayer();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, fetchPlayer]);

  // Unlock ability
  const unlockAbility = useCallback(async (abilityId) => {
    try {
      const { data } = await axios.post(`${API}/player/abilities/${abilityId}/unlock`, {}, { headers: getAuthHeader() });
      await fetchAbilities();
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, fetchAbilities]);

  // Update position with map
  const updatePosition = useCallback(async (x, y, currentMap = null) => {
    if (player) {
      // Optimistically save to session storage to prevent rubber-banding on remount
      sessionStorage.setItem(`mxjumper_x_${player.id}`, x);
      sessionStorage.setItem(`mxjumper_y_${player.id}`, y);
      if (currentMap) sessionStorage.setItem(`mxjumper_map_${player.id}`, currentMap);
      
      try {
        const payload = { x, y };
        if (currentMap) payload.current_map = currentMap;
        await axios.put(`${API}/player/position`, payload, { headers: getAuthHeader() });
      } catch (err) {
        // Ignore position update errors
      }
    }
  }, [player, getAuthHeader]);

  // Start random encounter
  const startEncounter = useCallback(async (zone = 'forest') => {
    try {
      const [partyData, enemiesResponse] = await Promise.all([
        fetchParty(),
        axios.get(`${API}/monsters/random?zone=${zone}`, { headers: getAuthHeader() })
      ]);
      
      if (!enemiesResponse.data.length) return { success: false, error: 'No monsters in this zone' };
      
      // Record encounter in bestiary
      const monsterIds = enemiesResponse.data.map(e => e.id);
      axios.post(`${API}/bestiary/encounter`, { monster_ids: monsterIds }, { headers: getAuthHeader() }).catch(() => {});
      
      setCombatData({
        party: partyData.map(p => ({ ...p, current_hp: p.hp, current_mp: p.mp })),
        enemies: enemiesResponse.data
      });
      setGameState('combat');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [fetchParty, getAuthHeader]);

  // Process victory
  const processVictory = useCallback(async (xp, partyState, defeatedMonsters = []) => {
    try {
      const [victoryData] = await Promise.all([
        axios.post(`${API}/combat/victory`, { xp, defeated_monsters: defeatedMonsters }, { headers: getAuthHeader() }),
        axios.post(`${API}/combat/save-state`, { party: partyState }, { headers: getAuthHeader() })
      ]);
      
      await fetchPlayer();
      await fetchParty();
      await fetchAllies();
      await fetchQuests();
      
      return victoryData.data;
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, fetchPlayer, fetchParty, fetchAllies, fetchQuests]);

  // Capture monster
  const captureMonster = useCallback(async (monsterId, name) => {
    try {
      const { data } = await axios.post(`${API}/allies/capture`, { monster_id: monsterId, name }, { headers: getAuthHeader() });
      if (data.success) {
        await fetchAllies();
      }
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, fetchAllies]);

  // Heal party
  const healParty = useCallback(async () => {
    try {
      await axios.post(`${API}/player/heal`, {}, { headers: getAuthHeader() });
      await fetchPlayer();
      await fetchParty();
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  }, [getAuthHeader, fetchPlayer, fetchParty]);

  // Chat
  const fetchChatMessages = useCallback(async (channel = 'global') => {
    try {
      const { data } = await axios.get(`${API}/chat/messages?channel=${channel}`, { headers: getAuthHeader() });
      setChatMessages(data);
      return data;
    } catch (err) {
      return [];
    }
  }, [getAuthHeader]);

  const sendChatMessage = useCallback(async (message, channel = 'global') => {
    try {
      const { data } = await axios.post(`${API}/chat/send`, { message, channel }, { headers: getAuthHeader() });
      // Also broadcast via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN && player) {
        wsRef.current.send(JSON.stringify({
          type: 'chat',
          name: player.name,
          message,
          channel
        }));
      }
      return data;
    } catch (err) {
      return { success: false };
    }
  }, [getAuthHeader, player]);

  // Friends
  const fetchFriends = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/friends`, { headers: getAuthHeader() });
      setFriends(data);
      return data;
    } catch (err) {
      return { friends: [], pending: [], requests: [] };
    }
  }, [getAuthHeader]);

  const sendFriendRequest = useCallback(async (targetPlayerId) => {
    try {
      const { data } = await axios.post(`${API}/friends/request`, { target_player_id: targetPlayerId }, { headers: getAuthHeader() });
      // Broadcast via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN && player) {
        wsRef.current.send(JSON.stringify({
          type: 'friend_request',
          name: player.name,
          target_id: targetPlayerId
        }));
      }
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, player]);

  const acceptFriend = useCallback(async (requestId) => {
    try {
      const { data } = await axios.post(`${API}/friends/accept/${requestId}`, {}, { headers: getAuthHeader() });
      await fetchFriends();
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, fetchFriends]);

  // NPCs
  const fetchNpcs = useCallback(async (zone) => {
    try {
      const { data } = await axios.get(`${API}/npcs${zone ? `?zone=${zone}` : ''}`, { headers: getAuthHeader() });
      setNpcs(data);
      return data;
    } catch (err) {
      return [];
    }
  }, [getAuthHeader]);

  const interactNpc = useCallback(async (npcId) => {
    try {
      const { data } = await axios.post(`${API}/npcs/${npcId}/interact`, {}, { headers: getAuthHeader() });
      if (data.type === 'healer') {
        await fetchPlayer();
        await fetchParty();
      }
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, fetchPlayer, fetchParty]);

  const buyFromNpc = useCallback(async (npcId, itemIndex) => {
    try {
      const { data } = await axios.post(`${API}/npcs/${npcId}/buy`, { item_index: itemIndex }, { headers: getAuthHeader() });
      await fetchPlayer();
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, fetchPlayer]);

  // Quests
  const fetchQuests = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/quests`, { headers: getAuthHeader() });
      setQuests(data);
      return data;
    } catch (err) {
      return { available: [], active: [], completed: [] };
    }
  }, [getAuthHeader]);

  const acceptQuest = useCallback(async (questId) => {
    try {
      const { data } = await axios.post(`${API}/quests/${questId}/accept`, {}, { headers: getAuthHeader() });
      await fetchQuests();
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, fetchQuests]);

  const completeQuest = useCallback(async (questId) => {
    try {
      const { data } = await axios.post(`${API}/quests/${questId}/complete`, {}, { headers: getAuthHeader() });
      await fetchQuests();
      await fetchPlayer();
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, fetchQuests, fetchPlayer]);

  const fetchBestiary = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/bestiary`, { headers: getAuthHeader() });
      setBestiary(data);
      return data;
    } catch (err) {
      return { monsters: [], total: 0, discovered: 0, captured_count: 0 };
    }
  }, [getAuthHeader]);


  // WebSocket for multiplayer and chat
  useEffect(() => {
    if (player && gameState === 'overworld') {
      const ws = new WebSocket(`${WS_URL}/api/ws/${player.id}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'positions') {
          const others = {};
          Object.entries(data.players).forEach(([id, p]) => {
            if (parseInt(id) !== player.id) {
              others[id] = p;
            }
          });
          setOtherPlayers(others);
        }
        
        if (data.type === 'chat') {
          setChatMessages(prev => [...prev.slice(-50), {
            sender_name: data.sender_name,
            message: data.message,
            channel: data.channel,
            created_at: new Date().toISOString()
          }]);
        }
        
        if (data.type === 'friend_request') {
          setNotifications(prev => [...prev, {
            type: 'friend_request',
            from_name: data.from_name,
            from_id: data.from_id
          }]);
        }
        
        if (data.type === 'duel_request') {
          setNotifications(prev => [...prev, {
            type: 'duel_request',
            from_name: data.from_name,
            from_id: data.from_id
          }]);
        }
        
        if (data.type === 'trade_request') {
          setNotifications(prev => [...prev, {
            type: 'trade_request',
            from_name: data.from_name,
            from_id: data.from_id
          }]);
        }
      };

      return () => ws.close();
    }
  }, [player, gameState]);

  // Send position via WebSocket
  const sendPosition = useCallback((x, y, facing, currentMap = 'forest') => {
    if (wsRef.current?.readyState === WebSocket.OPEN && player) {
      wsRef.current.send(JSON.stringify({
        type: 'position',
        name: player.name,
        x,
        y,
        current_map: currentMap,
        sprite: player.sprite,
        facing
      }));
    }
  }, [player]);

  // Send multiplayer request
  const sendMultiplayerRequest = useCallback((type, targetId, data = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && player) {
      wsRef.current.send(JSON.stringify({
        type: type,
        name: player.name,
        player_id: player.id,
        target_id: targetId,
        ...data
      }));
    }
  }, [player]);

  // Clear notification
  const clearNotification = useCallback((index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Initial fetch
  useEffect(() => {
    let mounted = true;

    const loadGameData = async () => {
      if (user) {
        setPlayerLoading(true);
        // Await the player fetch first so we don't flash screens
        await fetchPlayer(); 
        
        if (!mounted) return;
        
        // Fetch the rest in the background
        fetchAllies();
        fetchAbilities();
        fetchFriends();
        fetchQuests();
        fetchChatMessages();
      }
    };

    loadGameData();
    return () => { mounted = false; };
  // Only trigger on user login/change, drop the other dependencies to stop loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <GameContext.Provider value={{
      player, playerLoading, party, allies, abilities, otherPlayers, gameState, combatData, chatMessages, friends, quests, npcs, notifications, bestiary,
      setGameState, setCombatData,
      fetchPlayer, createPlayer, fetchParty, fetchAllies, fetchAbilities,
      toggleParty, allocateStats, unlockAbility,
      startEncounter, processVictory, captureMonster, healParty,
      updatePosition, sendPosition,
      fetchChatMessages, sendChatMessage,
      fetchFriends, sendFriendRequest, acceptFriend,
      fetchNpcs, interactNpc, buyFromNpc,
      fetchQuests, acceptQuest, completeQuest,
      fetchBestiary,
      sendMultiplayerRequest, clearNotification
    }}>
      {children}
    </GameContext.Provider>
  );
};
