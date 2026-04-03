import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const GameContext = createContext(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { user } = useAuth();
  const [player, setPlayer] = useState(null);
  const [party, setParty] = useState([]);
  const [allies, setAllies] = useState([]);
  const [abilities, setAbilities] = useState({ unlocked: [], available: [] });
  const [otherPlayers, setOtherPlayers] = useState({});
  const [gameState, setGameState] = useState('overworld'); // overworld, combat, menu
  const [combatData, setCombatData] = useState(null);
  const wsRef = useRef(null);

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch player data
  const fetchPlayer = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/player`, { headers: getAuthHeader() });
      setPlayer(data);
      return data;
    } catch (err) {
      if (err.response?.status === 404) {
        setPlayer(null);
      }
      return null;
    }
  }, [getAuthHeader]);

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
      return { unlocked: [], available: [] };
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

  // Start random encounter
  const startEncounter = useCallback(async () => {
    try {
      const [partyData, enemiesResponse] = await Promise.all([
        fetchParty(),
        axios.get(`${API}/monsters/random`, { headers: getAuthHeader() })
      ]);
      
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

  // Process combat victory
  const processVictory = useCallback(async (xp, partyState) => {
    try {
      const [victoryData] = await Promise.all([
        axios.post(`${API}/combat/victory`, { xp }, { headers: getAuthHeader() }),
        axios.post(`${API}/combat/save-state`, { party: partyState }, { headers: getAuthHeader() })
      ]);
      
      await fetchPlayer();
      await fetchParty();
      setGameState('overworld');
      setCombatData(null);
      
      return victoryData.data;
    } catch (err) {
      return { success: false, error: err.response?.data?.detail };
    }
  }, [getAuthHeader, fetchPlayer, fetchParty]);

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

  // Update position
  const updatePosition = useCallback(async (x, y) => {
    if (player) {
      try {
        await axios.put(`${API}/player/position`, { x, y }, { headers: getAuthHeader() });
      } catch (err) {
        // Ignore position update errors
      }
    }
  }, [player, getAuthHeader]);

  // WebSocket connection
  useEffect(() => {
    if (player && gameState === 'overworld') {
      const ws = new WebSocket(`${WS_URL}/ws/${player.id}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

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
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };

      return () => {
        ws.close();
      };
    }
  }, [player, gameState]);

  // Send position via WebSocket
  const sendPosition = useCallback((x, y, facing) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && player) {
      wsRef.current.send(JSON.stringify({
        type: 'position',
        name: player.name,
        x,
        y,
        sprite: player.sprite,
        facing
      }));
    }
  }, [player]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchPlayer();
      fetchAllies();
      fetchAbilities();
    }
  }, [user, fetchPlayer, fetchAllies, fetchAbilities]);

  return (
    <GameContext.Provider value={{
      player,
      party,
      allies,
      abilities,
      otherPlayers,
      gameState,
      combatData,
      setGameState,
      setCombatData,
      fetchPlayer,
      createPlayer,
      fetchParty,
      fetchAllies,
      fetchAbilities,
      toggleParty,
      allocateStats,
      unlockAbility,
      startEncounter,
      processVictory,
      captureMonster,
      healParty,
      updatePosition,
      sendPosition
    }}>
      {children}
    </GameContext.Provider>
  );
};
