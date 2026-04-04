import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
 
// Map definitions
const MAPS = {
  forest: {
    name: 'Emerald Forest (Safe)',
    bgGradient: ['#87CEEB', '#B0E0E6', '#90EE90'],
    platforms: [
      { x: 0, y: 520, width: 1000, height: 80, type: 'ground' },
      { x: 150, y: 420, width: 120, height: 24, type: 'grass' },
      { x: 350, y: 350, width: 150, height: 24, type: 'grass' },
      { x: 580, y: 420, width: 120, height: 24, type: 'grass' },
      { x: 80, y: 280, width: 100, height: 24, type: 'stone' },
      { x: 280, y: 220, width: 180, height: 24, type: 'stone' },
      { x: 700, y: 380, width: 140, height: 24, type: 'grass' },
    ],
    decorations: [
      { x: 100, y: 480, type: 'tree' },
      { x: 300, y: 480, type: 'bush' },
      { x: 500, y: 480, type: 'tree' },
      { x: 700, y: 480, type: 'bush' },
    ],
    exits: [
      { x: 0, y: 460, width: 50, height: 60, to: 'slime_forest', label: '← Slime Forest' },
      { x: 950, y: 460, width: 50, height: 60, to: 'cave', label: 'Cave →' },
    ],
    spawnX: 100,
    spawnY: 400,
    noEncounters: true,
  },
  slime_forest: {
    name: 'Slimy Bog (Beginner)',
    bgGradient: ['#6B8E23', '#556B2F', '#8B7355'],
    platforms: [
      { x: 0, y: 520, width: 1000, height: 80, type: 'mud' },
      { x: 100, y: 450, width: 150, height: 24, type: 'mud' },
      { x: 300, y: 380, width: 120, height: 24, type: 'mud' },
      { x: 500, y: 420, width: 150, height: 24, type: 'mud' },
      { x: 700, y: 360, width: 130, height: 24, type: 'mud' },
    ],
    decorations: [
      { x: 80, y: 480, type: 'bush' },
      { x: 200, y: 480, type: 'tree' },
      { x: 400, y: 480, type: 'bush' },
      { x: 600, y: 480, type: 'bush' },
      { x: 800, y: 480, type: 'tree' },
    ],
    exits: [
      { x: 950, y: 460, width: 50, height: 60, to: 'forest', label: 'Emerald Forest →' },
    ],
    spawnX: 100,
    spawnY: 400,
    encounterZone: 'slime',
  },
  wasteland: {
    name: 'The Dead Wasteland',
    bgGradient: ['#4a4e69', '#22223b', '#000000'],
    platforms: [
      { x: 0, y: 520, width: 1000, height: 80, type: 'stone' },
      { x: 200, y: 400, width: 200, height: 24, type: 'stone' },
      { x: 500, y: 300, width: 200, height: 24, type: 'stone' },
    ],
    decorations: [{ x: 400, y: 500, type: 'stalactite' }],
    exits: [
      { x: 0, y: 460, width: 50, height: 60, to: 'mountain', label: '← Mountain' },
      { x: 950, y: 460, width: 50, height: 60, to: 'tundra', label: 'Tundra →' },
    ],
    spawnX: 80,
    spawnY: 400,
    encounterZone: 'mountain',
  },
  tundra: {
    name: 'Frozen Tundra',
    bgGradient: ['#e0f2fe', '#bae6fd', '#7dd3fc'],
    platforms: [
      { x: 0, y: 520, width: 1000, height: 80, type: 'snow' },
      { x: 300, y: 380, width: 400, height: 20, type: 'ice' },
    ],
    decorations: [{ x: 150, y: 480, type: 'bush' }],
    exits: [
      { x: 0, y: 460, width: 50, height: 60, to: 'wasteland', label: '← Wasteland' },
      { x: 900, y: 460, width: 50, height: 60, to: 'sunken_citadel', label: 'Sunken Citadel ↓' }
    ],
    spawnX: 80,
    spawnY: 450,
    encounterZone: 'tundra',
  },
  cave: {
    name: 'Crystal Cave',
    bgGradient: ['#2d3748', '#1a202c', '#000000'],
    platforms: [
      { x: 0, y: 520, width: 1000, height: 80, type: 'stone' },
      { x: 200, y: 400, width: 150, height: 24, type: 'stone' },
      { x: 600, y: 300, width: 150, height: 24, type: 'stone' },
    ],
    decorations: [
      { x: 150, y: 100, type: 'stalactite' },
      { x: 350, y: 80, type: 'stalactite' },
      { x: 550, y: 120, type: 'stalactite' },
      { x: 750, y: 90, type: 'stalactite' },
    ],
    exits: [
      { x: 0, y: 460, width: 50, height: 60, to: 'forest', label: '← Forest' },
      { x: 950, y: 460, width: 50, height: 60, to: 'mountain', label: 'Mountain →' },
      { x: 900, y: 100, width: 60, height: 60, to: 'ancient_ruins', label: 'Ruins ↑' },
    ],
    spawnX: 80,
    spawnY: 400,
    encounterZone: 'cave',
  },
  mountain: {
    name: 'Rocky Mountain',
    bgGradient: ['#ffa07a', '#ffc0cb', '#dda0dd'],
    platforms: [
      { x: 0, y: 520, width: 1000, height: 80, type: 'stone' },
      { x: 50, y: 450, width: 100, height: 24, type: 'stone' },
      { x: 200, y: 380, width: 120, height: 24, type: 'stone' },
      { x: 380, y: 310, width: 100, height: 24, type: 'stone' },
      { x: 520, y: 250, width: 150, height: 24, type: 'stone' },
      { x: 720, y: 180, width: 120, height: 24, type: 'stone' },
      { x: 600, y: 400, width: 100, height: 24, type: 'stone' },
      { x: 850, y: 350, width: 100, height: 24, type: 'stone' },
    ],
    decorations: [
      { x: 100, y: 50, type: 'cloud' },
      { x: 400, y: 30, type: 'cloud' },
      { x: 700, y: 60, type: 'cloud' },
    ],
    exits: [
      { x: 0, y: 460, width: 50, height: 60, to: 'cave', label: '← Cave' },
      { x: 950, y: 460, width: 50, height: 60, to: 'village', label: 'Village →' },
      { x: 720, y: 120, width: 60, height: 60, to: 'wasteland', label: 'Wasteland ↑' },
      { x: 200, y: 100, width: 60, height: 60, to: 'sky_reach', label: 'Sky Reach ↑' },
      { x: 950, y: 120, width: 50, height: 60, to: 'volcanic_forge', label: 'Forge ↑' },
    ],
    spawnX: 80,
    spawnY: 400,
    encounterZone: 'mountain',
  },
  village: {
    name: 'Peaceful Village',
    bgGradient: ['#87CEEB', '#98FB98', '#F5DEB3'],
    platforms: [
      { x: 0, y: 520, width: 1000, height: 80, type: 'ground' },
    ],
    decorations: [
      { x: 50, y: 480, type: 'lamppost' },
      { x: 450, y: 480, type: 'bench' },
      { x: 680, y: 480, type: 'lamppost' },
    ],
    exits: [
      { x: 0, y: 460, width: 50, height: 60, to: 'mountain', label: '← Mountain' },
    ],
    npcs: [
      { id: 1, x: 250, y: 460, name: 'Elder Oak', type: 'quest_giver' },
      { id: 4, x: 400, y: 460, name: 'Healer Luna', type: 'healer' },
      { id: 2, x: 550, y: 460, name: 'Merchant Mari', type: 'shop' },
      { id: 3, x: 800, y: 460, name: 'Blacksmith Bron', type: 'shop' },
    ],
    spawnX: 80,
    spawnY: 400,
    noEncounters: true,
  },
  sky_reach: {
    name: 'Sky Reach',
    bgGradient: ['#000033', '#191970', '#87CEFA'],
    platforms: [
      { x: 50, y: 500, width: 150, height: 20, type: 'stone' },
      { x: 300, y: 400, width: 100, height: 20, type: 'stone' },
      { x: 500, y: 300, width: 100, height: 20, type: 'stone' },
      { x: 750, y: 200, width: 150, height: 20, type: 'stone' },
    ],
    decorations: [
      { x: 100, y: 480, type: 'cloud' },
      { x: 500, y: 280, type: 'cloud' },
      { x: 800, y: 180, type: 'cloud' },
    ],
    exits: [
      { x: 80, y: 440, width: 50, height: 60, to: 'mountain', label: '↓ Mountain' },
      { x: 850, y: 140, width: 60, height: 60, to: 'mystic_grove', label: 'Grove ↑' },
    ],
    spawnX: 80,
    spawnY: 400,
    encounterZone: 'mountain',
  },
  sunken_citadel: {
    name: 'Sunken Citadel',
    bgGradient: ['#0047AB', '#00008B', '#000000'],
    platforms: [
      { x: 0, y: 560, width: 1000, height: 40, type: 'stone' },
      { x: 200, y: 450, width: 150, height: 20, type: 'stone' },
      { x: 600, y: 350, width: 250, height: 20, type: 'stone' },
    ],
    decorations: [
      { x: 300, y: 520, type: 'stalactite' },
      { x: 700, y: 520, type: 'stalactite' },
    ],
    exits: [
      { x: 50, y: 500, width: 50, height: 60, to: 'tundra', label: '↑ Tundra' },
      { x: 950, y: 500, width: 50, height: 60, to: 'abyss', label: 'Abyss →' },
    ],
    spawnX: 100,
    spawnY: 480,
    encounterZone: 'tundra',
  },
  abyss: {
    name: 'The Abyss',
    bgGradient: ['#000000', '#0a0a1a', '#1a0a2a'],
    platforms: [
      { x: 0, y: 560, width: 1000, height: 40, type: 'stone' },
      { x: 100, y: 450, width: 200, height: 20, type: 'stone' },
      { x: 400, y: 350, width: 200, height: 20, type: 'stone' },
      { x: 700, y: 280, width: 180, height: 20, type: 'stone' },
    ],
    decorations: [
      { x: 200, y: 300, type: 'stalactite' },
      { x: 500, y: 200, type: 'stalactite' },
      { x: 800, y: 250, type: 'stalactite' },
    ],
    exits: [
      { x: 0, y: 500, width: 50, height: 60, to: 'sunken_citadel', label: '← Sunken Citadel' },
    ],
    spawnX: 100,
    spawnY: 480,
    encounterZone: 'abyss',
  },
  ancient_ruins: {
    name: 'Ancient Ruins',
    bgGradient: ['#D2B48C', '#C19A6B', '#A68A64'],
    platforms: [
      { x: 0, y: 520, width: 1000, height: 80, type: 'stone' },
      { x: 150, y: 400, width: 120, height: 24, type: 'stone' },
      { x: 350, y: 320, width: 140, height: 24, type: 'stone' },
      { x: 600, y: 380, width: 150, height: 24, type: 'stone' },
    ],
    decorations: [
      { x: 100, y: 480, type: 'stalactite' },
      { x: 400, y: 380, type: 'stalactite' },
      { x: 750, y: 480, type: 'stalactite' },
    ],
    exits: [
      { x: 0, y: 460, width: 50, height: 60, to: 'cave', label: '← Cave' },
    ],
    spawnX: 100,
    spawnY: 400,
    encounterZone: 'ruins',
  },
  volcanic_forge: {
    name: 'Volcanic Forge',
    bgGradient: ['#8B0000', '#FF4500', '#FFD700'],
    platforms: [
      { x: 0, y: 520, width: 1000, height: 80, type: 'stone' },
      { x: 100, y: 420, width: 150, height: 24, type: 'stone' },
      { x: 350, y: 340, width: 160, height: 24, type: 'stone' },
      { x: 600, y: 400, width: 140, height: 24, type: 'stone' },
    ],
    decorations: [
      { x: 150, y: 480, type: 'cloud' },
      { x: 450, y: 480, type: 'cloud' },
      { x: 750, y: 480, type: 'cloud' },
    ],
    exits: [
      { x: 0, y: 460, width: 50, height: 60, to: 'village', label: '← Village' },
    ],
    spawnX: 100,
    spawnY: 400,
    encounterZone: 'volcanic',
  },
  mystic_grove: {
    name: 'Mystic Grove',
    bgGradient: ['#2d5a27', '#3d6a37', '#4d7a47'],
    platforms: [
      { x: 50, y: 520, width: 900, height: 80, type: 'grass' },
      { x: 150, y: 420, width: 120, height: 24, type: 'grass' },
      { x: 400, y: 340, width: 140, height: 24, type: 'grass' },
      { x: 700, y: 380, width: 150, height: 24, type: 'grass' },
    ],
    decorations: [
      { x: 100, y: 480, type: 'tree' },
      { x: 350, y: 480, type: 'tree' },
      { x: 600, y: 480, type: 'tree' },
      { x: 850, y: 480, type: 'tree' },
    ],
    exits: [
      { x: 80, y: 440, width: 50, height: 60, to: 'sky_reach', label: '↓ Sky Reach' },
    ],
    spawnX: 100,
    spawnY: 400,
    encounterZone: 'forest',
  },
};
 
const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ENCOUNTER_STEPS = 15;
const ENCOUNTER_CHANCE = 0.25;
const AUTO_SAVE_INTERVAL = 5000;
 
export const Overworld = () => {
  const canvasRef = useRef(null);
  const audioRef = useRef(new Audio());
  const [isMuted, setIsMuted] = useState(true);
 
  const { 
    player, otherPlayers, sendPosition, startEncounter, healParty, setGameState, updatePosition, fetchPlayer,
    chatMessages, sendChatMessage, sendMultiplayerRequest, notifications, clearNotification,
    interactNpc, fetchNpcs, npcs, buyFromNpc, quests, fetchQuests, acceptQuest,
    spendSkillPoint
  } = useGame();
  
  const [currentMap, setCurrentMap] = useState(player?.current_map || 'forest');
  
  // Use a Ref for physics to prevent 60fps React re-renders (Fixes severe lag)
  const playerRef = useRef({
    x: player?.position_x || 100,
    y: player?.position_y || 400,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 'right',
    stepCounter: 0,
    frame: 0
  });
  // We keep a lightweight state just to force occasional UI updates if needed
  const [uiTrigger, setUiTrigger] = useState(0); 
  
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showEntityMenu, setShowEntityMenu] = useState(false);
  const [npcDialog, setNpcDialog] = useState(null);
  
  const [gameTime, setGameTime] = useState(0); 
  const [showInventory, setShowInventory] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false); 
  const [showGuildMenu, setShowGuildMenu] = useState(false); 
  const [duelSetup, setDuelSetup] = useState(null); 
  
  const keysRef = useRef({});
  const lastSaveRef = useRef(Date.now());
  const lastWsRef = useRef(Date.now()); // NEW: Throttles WebSocket messages
  
  // Fix for extreme lag: Refs to hold state without restarting the canvas loop
  const otherPlayersRef = useRef(otherPlayers);
  const playerDetailsRef = useRef(player);
  
  useEffect(() => { 
    otherPlayersRef.current = otherPlayers; 
  }, [otherPlayers]);
  
  useEffect(() => { 
    playerDetailsRef.current = player; 
  }, [player]);
  // Background Music Mapping
  const MAP_MUSIC = useMemo(() => ({
    forest: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    slime_forest: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    village: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    cave: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    ancient_ruins: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    mountain: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    volcanic_forge: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    wasteland: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    tundra: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    sunken_citadel: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    abyss: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    sky_reach: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    mystic_grove: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
  }), []);
 
  // Handle Music Switching
  useEffect(() => {
    const audio = audioRef.current;
    audio.src = MAP_MUSIC[currentMap] || MAP_MUSIC.forest;
    audio.loop = true;
    audio.volume = 0.2; 
    if (!isMuted) {
      audio.play().catch(e => console.log("Audio blocked by browser:", e));
    } else {
      audio.pause();
    }
    return () => audio.pause();
  }, [currentMap, isMuted, MAP_MUSIC]);
 
  // Day/Night Cycle Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setGameTime(prev => (prev + 1) % 600);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
 
  // Global Menu Keybinds
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'i') setShowInventory(prev => !prev);
      if (e.key.toLowerCase() === 'k') setShowSkillTree(prev => !prev);
      if (e.key.toLowerCase() === 'g') setShowGuildMenu(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
 
  const mapData = MAPS[currentMap];
 
  const isInitializedRef = useRef(false);

  // Load saved position (re-fetch when returning from combat)
  useEffect(() => {
    if (player && !isInitializedRef.current) {
      setCurrentMap(player.current_map || 'forest');
      playerRef.current.x = player.position_x || 100;
      playerRef.current.y = player.position_y || 400;
      
      // Lock it so background saves don't rubber-band the player back
      isInitializedRef.current = true; 
    }
  }, [player]);
  // Auto-save position and map
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (player) {
        updatePosition(playerRef.current.x, playerRef.current.y, currentMap);
        lastSaveRef.current = Date.now();
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(saveInterval);
  }, [player, updatePosition, currentMap]);
 
  // Save on map change
  useEffect(() => {
    if (player) {
      updatePosition(playerRef.current.x, playerRef.current.y, currentMap);
    }
  }, [currentMap, player, updatePosition]);
 
  // Fetch NPCs when entering village
  useEffect(() => {
    if (currentMap === 'village') {
      fetchNpcs('village');
    }
  }, [currentMap, fetchNpcs]);
 
  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'e', ' '].includes(key)) {
        keysRef.current[key] = true;
        if (key === ' ') e.preventDefault();
      }
      if (key === 'enter' && !npcDialog) {
        if (showChat) {
          if (chatInput.trim()) {
            sendChatMessage(chatInput.trim());
            setChatInput('');
          }
        }
        e.preventDefault();
      }
      if (key === 'escape') {
        setShowEntityMenu(false);
        setNpcDialog(null);
      }
      if (key === 'm' && !npcDialog) {
        updatePosition(playerRef.current.x, playerRef.current.y, currentMap);
        setGameState('menu');
      }
      if (key === 'h') healParty();
      if (key === 'e' && npcDialog) setNpcDialog(null);
    };
    
    const handleKeyUp = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showChat, chatInput, sendChatMessage, setGameState, healParty, updatePosition, currentMap, npcDialog]);
 
  const checkExits = useCallback((x, y, keys) => {
    const playerWidth = 40; const playerHeight = 56;
    for (const exit of mapData.exits) {
      if (x + playerWidth > exit.x && x < exit.x + exit.width &&
          y + playerHeight > exit.y && y < exit.y + exit.height) {
        if (keys['e']) {
          const newMap = MAPS[exit.to];
          updatePosition(newMap.spawnX, newMap.spawnY, exit.to);
          setCurrentMap(exit.to);
          playerRef.current.x = exit.x < 100 ? 900 : newMap.spawnX;
          playerRef.current.y = newMap.spawnY;
          return true;
        }
      }
    }
    return false;
  }, [mapData, updatePosition]);
 
  const checkEncounter = useCallback(async () => {
    if (mapData.noEncounters) return;
    if (Math.random() < ENCOUNTER_CHANCE) {
      updatePosition(playerRef.current.x, playerRef.current.y, currentMap);
      await startEncounter(mapData.encounterZone || 'forest');
    }
  }, [startEncounter, updatePosition, mapData, currentMap]);
 
  const checkNpcInteraction = useCallback(() => {
    if (!mapData.npcs) return null;
    const playerWidth = 40;
    const pX = playerRef.current.x;
    const pY = playerRef.current.y;
    
    for (const npc of mapData.npcs) {
      if (Math.abs(pX + playerWidth/2 - npc.x) < 50 && Math.abs(pY - npc.y) < 60) {
        return npc;
      }
    }
    return null;
  }, [mapData]);
 // Game loop (Refactored to use Ref to fix extreme lag)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let animationId;
    let frameCount = 0;
    
    const gameLoop = () => {
      const keys = keysRef.current;
      frameCount++;
      
      if (!npcDialog && !showEntityMenu && !showInventory && !showSkillTree && !showGuildMenu && !duelSetup) {
        let p = playerRef.current;
        p.vx = 0;
        
        if (keys['a']) { p.vx = -MOVE_SPEED; p.facing = 'left'; }
        if (keys['d']) { p.vx = MOVE_SPEED; p.facing = 'right'; }
        
        if ((keys[' '] || keys['w']) && p.onGround) {
          p.vy = JUMP_FORCE;
          p.onGround = false;
        }
        
        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        
        if (Math.abs(p.vx) > 0) {
          if (frameCount % 8 === 0) p.frame = (p.frame + 1) % 4;
        } else p.frame = 0;
        
        if (Math.abs(p.vx) > 0 && p.onGround && !mapData.noEncounters) {
          p.stepCounter++;
          if (p.stepCounter >= ENCOUNTER_STEPS) {
            p.stepCounter = 0;
            // Save position right before encounter
            updatePosition(p.x, p.y, currentMap);
            if (Math.random() < ENCOUNTER_CHANCE) {
               startEncounter(mapData.encounterZone || 'forest');
            }
          }
        }
        
        p.onGround = false;
        const pWidth = 40; const pHeight = 56;
        
        for (const platform of mapData.platforms) {
          if (
            p.x + pWidth > platform.x &&
            p.x < platform.x + platform.width &&
            p.y + pHeight >= platform.y &&
            p.y + pHeight <= platform.y + platform.height + p.vy + 1 &&
            p.vy >= 0
          ) {
            p.y = platform.y - pHeight;
            p.vy = 0;
            p.onGround = true;
          }
        }
        
        // Exits logic
        for (const exit of mapData.exits) {
          if (p.x + pWidth > exit.x && p.x < exit.x + exit.width && p.y + pHeight > exit.y && p.y < exit.y + exit.height) {
            if (keys['e']) {
              const newMap = MAPS[exit.to];
              setCurrentMap(exit.to);
              p.x = exit.x < 100 ? 900 : newMap.spawnX;
              p.y = newMap.spawnY;
              updatePosition(p.x, p.y, exit.to);
              keys['e'] = false; // consume key
            }
          }
        }

        p.x = Math.max(0, Math.min(p.x, canvas.width - pWidth));
        if (p.y > canvas.height) { p.y = 100; p.vy = 0; }
        
        // Throttled Network Sync
        const now = Date.now();
        const isMoving = Math.abs(p.vx) > 0 || Math.abs(p.vy) > 0;
        
        if (isMoving && now - lastWsRef.current > 66) { // ~15 FPS WebSocket
          sendPosition(p.x, p.y, p.facing, currentMap);
          lastWsRef.current = now;
        } else if (!isMoving && now - lastWsRef.current > 500) { // Occasional idle ping
          sendPosition(p.x, p.y, p.facing, currentMap);
          lastWsRef.current = now;
        }
        
        if (now - lastSaveRef.current > 3000) { // DB Save every 3s
          updatePosition(p.x, p.y, currentMap);
          lastSaveRef.current = now;
        }


      }
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [mapData, currentMap, npcDialog, showEntityMenu, showInventory, showSkillTree, showGuildMenu, duelSetup, startEncounter, updatePosition, sendPosition]);
  // Handle canvas click
  const handleCanvasClick = async (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (1000 / rect.width);
    const clickY = (e.clientY - rect.top) * (600 / rect.height);
    
    if (mapData.npcs) {
      for (const npc of mapData.npcs) {
        if (clickX >= npc.x - 25 && clickX <= npc.x + 25 && clickY >= npc.y - 60 && clickY <= npc.y + 10) {
          const result = await interactNpc(npc.id);
          if (npc.type === 'quest_giver') {
            const questData = await fetchQuests();
            setNpcDialog({ npc, data: result, quests: questData });
          } else {
            setNpcDialog({ npc, data: result });
          }
          return;
        }
      }
    }
    
    for (const [id, other] of Object.entries(otherPlayers)) {
      if (other.current_map === currentMap &&
          clickX >= other.x && clickX <= other.x + 40 &&
          clickY >= other.y && clickY <= other.y + 56) {
        setSelectedEntity({ type: 'player', id: parseInt(id), ...other });
        setShowEntityMenu(true);
        return;
      }
    }
    
    setShowEntityMenu(false);
  };
 
  // Draw functions
  const drawCloud = (ctx, x, y) => {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 25, y - 8, 25, 0, Math.PI * 2);
    ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };
 
  const drawTree = (ctx, x, y) => {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 15, y, 20, 40);
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(x + 25, y - 15, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.arc(x + 25, y - 25, 22, 0, Math.PI * 2);
    ctx.fill();
  };
 
  const drawBush = (ctx, x, y) => {
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(x + 15, y + 10, 18, 0, Math.PI * 2);
    ctx.fill();
  };
 
  const drawStalactite = (ctx, x, y) => {
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20, y);
    ctx.lineTo(x + 10, y + 40);
    ctx.closePath();
    ctx.fill();
  };
 
  const drawNPC = useCallback((ctx, npc) => {
    ctx.fillStyle = npc.type === 'healer' ? '#ff69b4' : npc.type === 'shop' ? '#ffd700' : '#9370db';
    ctx.fillRect(npc.x - 12, npc.y - 30, 24, 30);
    ctx.fillStyle = '#ffd9b3';
    ctx.beginPath();
    ctx.arc(npc.x, npc.y - 42, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText(npc.name, npc.x, npc.y - 58);
    ctx.fillText(npc.name, npc.x, npc.y - 58);
    const nearNpc = checkNpcInteraction();
    if (nearNpc && nearNpc.id === npc.id) {
      ctx.fillStyle = '#ffd700';
      ctx.fillText('[Click to talk]', npc.x, npc.y - 68);
    }
  }, [checkNpcInteraction]);
 
  const drawPlayer = (ctx, x, y, facing, frame, name, isMain = true) => {
    const flip = facing === 'left' ? -1 : 1;
    ctx.save();
    ctx.translate(x + 20, y);
    ctx.scale(flip, 1);
    
    ctx.fillStyle = isMain ? '#4A90D9' : '#888888';
    ctx.fillRect(-15, 20, 30, 30);
    ctx.fillStyle = isMain ? '#FFD9B3' : '#CCCCCC';
    ctx.beginPath();
    ctx.arc(0, 12, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isMain ? '#4A2800' : '#555555';
    ctx.beginPath();
    ctx.arc(0, 6, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.fillRect(3, 10, 4, 4);
    ctx.fillStyle = isMain ? '#2D5A87' : '#666666';
    const legOffset = Math.sin(frame * Math.PI / 2) * 3;
    ctx.fillRect(-10, 50, 10, 8 + legOffset);
    ctx.fillRect(0, 50, 10, 8 - legOffset);
    
    ctx.restore();
    
    ctx.fillStyle = isMain ? '#FFD700' : '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText(name, x + 20, y - 8);
    ctx.fillText(name, x + 20, y - 8);
  };
 
  // Canvas render loop — runs every frame via requestAnimationFrame, independent of React state.
  // Reads player position from playerRef.current so it reflects physics updates every frame,
  // not just when React state changes (which was causing the black screen with gameTime).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId;

    const renderFrame = () => {
      const ctx = canvas.getContext('2d');

      // Background
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      mapData.bgGradient.forEach((color, i) => {
        skyGradient.addColorStop(i / (mapData.bgGradient.length - 1), color);
      });
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Decorations
      mapData.decorations.forEach(dec => {
        if (dec.type === 'cloud') drawCloud(ctx, dec.x, dec.y);
        if (dec.type === 'tree') drawTree(ctx, dec.x, dec.y);
        if (dec.type === 'bush') drawBush(ctx, dec.x, dec.y);
        if (dec.type === 'stalactite') drawStalactite(ctx, dec.x, dec.y);
      });

      // Platforms
      mapData.platforms.forEach(platform => {
        if (platform.type === 'ground') {
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(platform.x, platform.y + 10, platform.width, platform.height - 10);
          ctx.fillStyle = '#228B22';
          ctx.fillRect(platform.x, platform.y, platform.width, 15);
        } else if (platform.type === 'grass') {
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(platform.x, platform.y + 6, platform.width, platform.height - 6);
          ctx.fillStyle = '#228B22';
          ctx.fillRect(platform.x, platform.y, platform.width, 10);
        } else if (platform.type === 'stone') {
          ctx.fillStyle = '#708090';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        }
      });

      // Exits — read position from ref so the [Press E] prompt updates every frame
      const p = playerRef.current;
      const pWidth = 40; const pHeight = 56;
      mapData.exits.forEach(exit => {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(exit.label, exit.x + exit.width / 2, exit.y - 5);

        if (p.x + pWidth > exit.x && p.x < exit.x + exit.width &&
            p.y + pHeight > exit.y && p.y < exit.y + exit.height) {
          ctx.fillStyle = '#ffffff';
          ctx.fillText('[Press E]', exit.x + exit.width / 2, exit.y - 18);
        }
      });

      // NPCs
      if (mapData.npcs) {
        mapData.npcs.forEach(npc => drawNPC(ctx, npc));
      }

      // Other players
      Object.values(otherPlayersRef.current).forEach(other => {
        if (other.current_map === currentMap) {
          drawPlayer(ctx, other.x, other.y, other.facing || 'right', 0, other.name, false);
        }
      });

      // Main player — always read from ref for up-to-date physics position
      drawPlayer(ctx, p.x, p.y, p.facing, p.frame, playerDetailsRef.current?.name || 'Player', true);

      animationId = requestAnimationFrame(renderFrame);
    };

    animationId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animationId);
  }, [mapData, currentMap, checkNpcInteraction, drawNPC]); // Removed otherPlayers and player from dependencies
 
  const PlayerHUDSprite = () => (
    <svg viewBox="0 0 64 64" width={40} height={40}>
      <rect x="24" y="36" width="16" height="20" fill="#4a90d9"/>
      <circle cx="32" cy="24" r="12" fill="#ffd9b3"/>
      <path d="M20 20 Q32 8 44 20 L44 24 Q32 20 20 24 Z" fill="#4a2800"/>
      <circle cx="28" cy="24" r="2" fill="#000"/>
      <circle cx="36" cy="24" r="2" fill="#000"/>
    </svg>
  );
 
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-900 relative" data-testid="overworld">
      {/* HUD */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-slate-900/90 border-2 border-amber-400 rounded-xl p-3 shadow-lg w-48">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center border-2 border-white">
              <PlayerHUDSprite />
            </div>
            <div>
              <div className="text-amber-400 font-bold text-sm">{player?.name}</div>
              <div className="text-slate-400 text-xs">Lv{player?.level} | {player?.gold || 0}G</div>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-red-400 text-[10px] w-4">HP</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: `${player ? (player.hp / player.max_hp) * 100 : 100}%` }} />
              </div>
              <span className="text-[10px] text-slate-300 w-12 text-right">{player?.hp}/{player?.max_hp}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-cyan-400 text-[10px] w-4">MP</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500" style={{ width: `${player ? (player.mp / player.max_mp) * 100 : 100}%` }} />
              </div>
              <span className="text-[10px] text-slate-300 w-12 text-right">{player?.mp}/{player?.max_mp}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-amber-400 text-[10px] w-4">XP</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${player ? (player.xp / player.xp_to_next) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
 
      {/* Map name & Territory Control */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 pointer-events-none">
        <div className="bg-slate-900/90 px-6 py-1 rounded-lg border-2 border-slate-600 shadow-xl">
          <span className="text-white font-black tracking-wider text-sm">{mapData.name}</span>
        </div>
        {currentMap === 'tundra' && (
           <div className="bg-amber-900/90 px-4 py-0.5 rounded-b-lg border-b-2 border-x-2 border-amber-500 text-[10px] text-amber-400 font-bold tracking-widest mt-[-2px] shadow-lg animate-pulse">
             🛡️ CLAIMED BY: APEX LEGION 🛡️
           </div>
        )}
      </div>
 
      {/* Skill Tree Modal */}
      {showSkillTree && (
        <div className="absolute inset-8 bg-slate-950 border-4 border-amber-500 rounded-2xl z-50 p-6 flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.2)]">
           <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl text-amber-400 font-black uppercase tracking-widest">Skill Tree</h2>
              <div className="text-white bg-slate-800 px-4 py-1 rounded-full font-bold">Unspent Points: <span className="text-amber-400 text-lg">{player?.skill_points || 0}</span></div>
           </div>
           <div className="flex-1 relative bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-700 p-8">
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                 <line x1="50%" y1="20%" x2="30%" y2="50%" stroke="#475569" strokeWidth="6" />
                 <line x1="50%" y1="20%" x2="70%" y2="50%" stroke="#475569" strokeWidth="6" />
                 <line x1="30%" y1="50%" x2="50%" y2="80%" stroke="#1e293b" strokeWidth="6" />
              </svg>
              <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                 <button 
                   onClick={() => spendSkillPoint && spendSkillPoint('crit')}
                   className="w-20 h-20 bg-gradient-to-br from-amber-600 to-amber-900 border-4 border-amber-400 rounded-full text-3xl shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:scale-110 transition-all">⚔️</button>
                 <span className="text-amber-400 text-xs mt-2 font-black tracking-wider bg-black/50 px-2 py-1 rounded">+2 STR</span>
              </div>
              <div className="absolute top-[50%] left-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                 <button 
                   onClick={() => spendSkillPoint && spendSkillPoint('hp')}
                   className="w-16 h-16 bg-slate-800 border-4 border-slate-500 rounded-full text-2xl hover:scale-110 transition-all hover:border-amber-400">❤️</button>
                 <span className="text-white text-[10px] mt-2 font-bold bg-black/50 px-2 py-1 rounded">+20 MAX HP</span>
              </div>
              <div className="absolute top-[50%] left-[70%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                 <button 
                   onClick={() => spendSkillPoint && spendSkillPoint('cleave')}
                   className="w-16 h-16 bg-slate-800 border-4 border-slate-500 rounded-full text-2xl hover:scale-110 transition-all hover:border-amber-400">🌪️</button>
                 <span className="text-white text-[10px] mt-2 font-bold bg-black/50 px-2 py-1 rounded">CLEAVE (HIT 2)</span>
              </div>
              <div className="absolute top-[80%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                 <button className="w-16 h-16 bg-slate-900 border-4 border-slate-700 rounded-full text-xl opacity-50 cursor-not-allowed">🔒</button>
                 <span className="text-slate-500 text-[10px] mt-2 font-bold">LOCKED</span>
              </div>
           </div>
           <button onClick={() => setShowSkillTree(false)} className="mt-4 bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-700 border border-slate-600 uppercase tracking-widest">Close Tree (K)</button>
        </div>
      )}
 
      {/* Duel Wager Setup Modal */}
      {duelSetup && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 bg-slate-950 border-4 border-red-500 rounded-xl z-50 p-6 shadow-[0_0_40px_rgba(239,68,68,0.3)] flex flex-col">
           <h2 className="text-xl text-red-400 font-black uppercase tracking-widest text-center mb-2">Challenge {duelSetup.target.name}</h2>
           <p className="text-slate-400 text-xs text-center mb-4">Set a gold wager. Winner takes it all.</p>
           <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 mb-4 flex justify-between items-center">
             <span className="text-white font-bold text-sm">Wager:</span>
             <div className="flex items-center gap-2">
               <button onClick={() => setDuelSetup(p => ({...p, wager: Math.max(0, p.wager - 100)}))} className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-white font-bold">-</button>
               <span className="text-amber-400 font-bold w-12 text-center">{duelSetup.wager}G</span>
               <button onClick={() => setDuelSetup(p => ({...p, wager: Math.min(player?.gold || 0, p.wager + 100)}))} className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-white font-bold">+</button>
             </div>
           </div>
           <div className="flex gap-2">
             <button className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded uppercase text-xs tracking-widest"
                onClick={() => { 
                  sendMultiplayerRequest('duel_request', duelSetup.target.id, { wager: duelSetup.wager }); 
                  setDuelSetup(null); 
                }}>Send Challenge</button>
             <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded uppercase text-xs" onClick={() => setDuelSetup(null)}>Cancel</button>
           </div>
        </div>
      )}
 
      {/* Trade Modal */}
      {selectedEntity?.type === 'player' && showEntityMenu && selectedEntity.inTrade && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 bg-slate-950 border-4 border-green-500 rounded-xl z-50 p-6 shadow-[0_0_40px_rgba(34,197,94,0.3)] flex flex-col">
           <h2 className="text-xl text-green-400 font-black uppercase tracking-widest text-center mb-2">Trade with {selectedEntity.name}</h2>
           <div className="grid grid-cols-2 gap-4 mb-4">
             <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
               <div className="text-green-400 text-sm font-bold mb-2">Your Offer</div>
               <div className="space-y-1 max-h-32 overflow-y-auto text-xs text-slate-300">
                 <p>Your party is ready</p>
                 <p className="text-amber-400">Gold: {player?.gold || 0}G</p>
               </div>
             </div>
             <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
               <div className="text-green-400 text-sm font-bold mb-2">Their Offer</div>
               <div className="space-y-1 max-h-32 overflow-y-auto text-xs text-slate-300">
                 <p>Waiting for trade details...</p>
               </div>
             </div>
           </div>
           <div className="flex gap-2">
             <button className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded uppercase text-xs tracking-widest" onClick={() => { sendMultiplayerRequest('trade_accept', selectedEntity.id); setShowEntityMenu(false); }}>Accept Trade</button>
             <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded uppercase text-xs" onClick={() => setShowEntityMenu(false)}>Decline</button>
           </div>
        </div>
      )}

      {/* Guilds Menu */}
      {showGuildMenu && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[450px] bg-slate-950 border-4 border-indigo-500 rounded-xl z-50 p-6 shadow-[0_0_40px_rgba(99,102,241,0.3)] flex flex-col">
           <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
              <h2 className="text-2xl text-indigo-400 font-black uppercase tracking-widest">Apex Legion</h2>
              <div className="text-right">
                <div className="text-white text-xs font-bold bg-slate-800 px-3 py-1 rounded">Bank: <span className="text-amber-400">14,250 G</span></div>
              </div>
           </div>
           <div className="space-y-4">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                 <div>
                   <div className="text-amber-400 font-bold text-xs uppercase tracking-wider">Passive Income</div>
                   <div className="text-slate-400 text-[10px]">From 5% Tax on Claimed Zones</div>
                 </div>
                 <div className="text-right">
                   <div className="text-green-400 font-black text-lg">+ 3,420 G</div>
                   <div className="text-slate-500 text-[9px]">Total Generated This Week</div>
                 </div>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                 <h3 className="text-indigo-400 font-bold text-xs uppercase mb-3">Guild Perks & Upgrades</h3>
                 <div className="space-y-2">
                   <div className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-600 hover:border-amber-400 transition-colors">
                     <div className="flex items-center gap-3">
                       <span className="text-2xl">⚡</span>
                       <div>
                         <div className="text-white font-bold text-xs">Expedition Buff</div>
                         <div className="text-slate-400 text-[10px]">+10% XP for all members (2 hours)</div>
                       </div>
                     </div>
                     <button className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1 px-3 rounded text-[10px] shadow-lg">BUY (2,000G)</button>
                   </div>
                   <div className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-600 hover:border-amber-400 transition-colors">
                     <div className="flex items-center gap-3">
                       <span className="text-2xl">💰</span>
                       <div>
                         <div className="text-white font-bold text-xs">Tax Collector II</div>
                         <div className="text-slate-400 text-[10px]">Increase Map Tax to 7%</div>
                       </div>
                     </div>
                     <button className="bg-slate-700 text-slate-400 font-bold py-1 px-3 rounded text-[10px] cursor-not-allowed">LOCKED (10,000G)</button>
                   </div>
                 </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                 <h3 className="text-amber-400 font-bold text-xs uppercase mb-2 border-b border-slate-700 pb-1">Territory Control</h3>
                 <div className="flex justify-between text-xs text-white my-1"><span>Tundra:</span><span className="text-amber-400">Apex Legion</span></div>
                 <div className="flex justify-between text-xs text-white my-1"><span>Lava Forge:</span><span className="text-slate-500">Unclaimed</span></div>
              </div>
           </div>
           <button onClick={() => setShowGuildMenu(false)} className="mt-4 bg-slate-800 text-white font-bold py-2 rounded-lg hover:bg-slate-700 border border-slate-600 uppercase tracking-widest text-xs">Close Registry (G)</button>
        </div>
      )}
 
      {/* Day/Night Visual Overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-colors duration-1000 z-0
        ${gameTime > 300 && gameTime < 450 ? 'bg-orange-900/20' : ''} 
        ${gameTime >= 450 ? 'bg-blue-950/40' : ''}`} 
      />
 
      {/* Quest Tracker HUD */}
      {quests?.active?.length > 0 && (
        <div className="absolute top-32 right-4 w-64 bg-black/50 border border-slate-700/50 rounded-lg p-3 z-10 backdrop-blur-sm pointer-events-none shadow-lg">
          <h3 className="text-amber-400 font-bold text-[10px] tracking-widest uppercase mb-2 border-b border-slate-700 pb-1">Active Quests</h3>
          {quests.active.map(q => (
            <div key={q.id} className="text-white text-[10px] mb-1 flex justify-between">
              <span>• {q.name || q.title}</span>
              <span className="text-amber-400">({q.progress}/{q.required_count})</span>
            </div>
          ))}
        </div>
      )}
 
      {/* Inventory Modal */}
      {showInventory && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-slate-900 border-4 border-slate-700 rounded-xl z-50 p-4 shadow-2xl flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
            <h2 className="text-amber-500 font-bold text-lg">Inventory</h2>
            <button onClick={() => setShowInventory(false)} className="text-white hover:text-red-500 font-bold">X</button>
          </div>
          <div className="grid grid-cols-4 gap-2 flex-1 overflow-y-auto">
            <div className="col-span-4 text-center text-slate-500 text-sm mt-10">Your bag is empty. Go hunt!</div>
          </div>
        </div>
      )}
 
      {/* Notifications - Top Right */}
      <div className="absolute top-4 right-20 flex flex-col gap-2 z-50 pointer-events-none">
        {notifications.length > 0 && (
          <div className="flex items-center justify-end mb-2 pointer-events-auto">
            <div className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-1 mr-2">
              {notifications.length}
            </div>
            <span className="text-2xl">🔔</span>
          </div>
        )}
        {notifications.map((n, i) => {
          const borderColor = n.type === 'duel_request' ? 'border-l-4 border-red-500' : n.type === 'trade_request' ? 'border-l-4 border-green-500' : 'border-l-4 border-amber-500';
          const titleColor = n.type === 'duel_request' ? 'text-red-400' : n.type === 'trade_request' ? 'text-green-400' : 'text-amber-400';
          return (
            <div key={n.id || i} className={'w-72 bg-slate-900/95 ' + borderColor + ' p-4 shadow-2xl pointer-events-auto rounded'}>
              <div className={titleColor + ' font-bold text-[10px] uppercase tracking-widest'}>{n.type.replace(/_/g, ' ')}</div>
              <div className="text-white text-sm font-semibold mt-1">{n.from_name}</div>
              {n.type === 'duel_request' && <div className="text-amber-300 text-xs mt-1">Wager: {n.wager || 100}G</div>}
              <div className="flex gap-2 mt-3">
                <button className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-bold py-1 rounded" onClick={() => { clearNotification(i); }}>ACCEPT</button>
                <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-[9px] font-bold py-1 rounded" onClick={() => clearNotification(i)}>DECLINE</button>
              </div>
            </div>
          );
        })}
      </div>
 
      {/* Controls & Sound */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-1 text-white text-xs hover:bg-slate-800"
        >
          {isMuted ? '🔈 Unmute' : '🔊 Muting'}
        </button>
        <div className="bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-1 text-slate-300 text-xs">
          <span className="text-amber-400">WASD</span>: Move | <span className="text-amber-400">M</span>: Menu
        </div>
      </div>
 
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1000}
        height={600}
        className="border-4 border-slate-800 rounded-lg shadow-2xl cursor-pointer relative z-0"
        onClick={handleCanvasClick}
        data-testid="game-canvas"
      />
 
      {/* Chat */}
      <div className="absolute bottom-16 left-4 w-72">
        <div className="bg-slate-900/90 border border-slate-600 rounded-lg overflow-hidden">
          <div className="bg-slate-800 px-2 py-1 text-xs text-slate-300 flex justify-between">
            <span>💬 Chat</span>
          </div>
          <div className="h-24 overflow-y-auto p-1 text-xs">
            {chatMessages.length === 0 ? (
              <div className="text-slate-500 text-center py-2">No messages</div>
            ) : (
              chatMessages.slice(-20).map((msg, idx) => (
                <div key={idx} className="mb-0.5">
                  <span className="text-amber-400 font-bold">{msg.sender_name}:</span>
                  <span className="text-white ml-1">{msg.message}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex border-t border-slate-700">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-slate-800 px-2 py-1 text-white text-xs focus:outline-none"
              placeholder="Type message, Enter to send..."
            />
          </div>
        </div>
      </div>
 
      {/* Player Menu */}
      {showEntityMenu && selectedEntity?.type === 'player' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border-2 border-amber-400 rounded-xl p-4 z-20 min-w-[180px]">
          <div className="text-amber-400 font-bold text-center mb-2">{selectedEntity.name}</div>
          <div className="space-y-1">
            <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 rounded text-sm"
              onClick={() => { sendMultiplayerRequest('friend_request', selectedEntity.id); setShowEntityMenu(false); }}>
              👋 Add Friend
            </button>
            <button className="w-full bg-red-600 hover:bg-red-500 text-white py-1.5 rounded text-sm"
              onClick={() => { 
                setDuelSetup({ target: selectedEntity, wager: 100 }); 
                setShowEntityMenu(false); 
              }}>
              ⚔️ Duel (Wager)
            </button>
            <button className="w-full bg-green-600 hover:bg-green-500 text-white py-1.5 rounded text-sm"
              onClick={() => { sendMultiplayerRequest('trade_request', selectedEntity.id); setShowEntityMenu(false); }}>
              🔄 Trade
            </button>
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-1.5 rounded text-sm"
              onClick={() => setShowEntityMenu(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
 
      {/* NPC Dialog */}
      {npcDialog && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border-2 border-amber-400 rounded-xl p-4 z-20 min-w-[280px] max-w-sm">
          <div className="text-amber-400 font-bold text-center mb-2">{npcDialog.npc.name}</div>
          <p className="text-slate-300 text-sm mb-3">{npcDialog.data?.npc?.dialogue || 'Hello, adventurer!'}</p>
          
          {npcDialog.data?.type === 'healer' && (
            <div className="text-green-400 text-sm text-center mb-3">Your party has been healed!</div>
          )}
          
          {npcDialog.data?.type === 'quest_giver' && npcDialog.quests && (
            <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
              {npcDialog.quests.active?.length > 0 && (
                <div className="mb-2">
                  <div className="text-cyan-400 text-[10px] font-bold mb-1">ACTIVE QUESTS:</div>
                  {npcDialog.quests.active.map(q => (
                    <div key={q.id} className="bg-cyan-900/30 border border-cyan-500/30 rounded px-2 py-1 text-xs text-slate-300 mb-1">
                      <div className="font-bold text-cyan-300">{q.name}</div>
                      <div>{q.description}</div>
                      <div className="text-amber-400 mt-0.5">Progress: {q.progress}/{q.required_count}</div>
                    </div>
                  ))}
                </div>
              )}
              {npcDialog.quests.available?.length > 0 && (
                <div>
                  <div className="text-amber-400 text-[10px] font-bold mb-1">AVAILABLE QUESTS:</div>
                  {npcDialog.quests.available.map(q => (
                    <button key={q.id} className="w-full bg-slate-800 hover:bg-slate-700 rounded px-2 py-1 text-xs text-left mb-1"
                      onClick={async () => {
                        await acceptQuest(q.id);
                        const newQuests = await fetchQuests();
                        setNpcDialog(prev => ({ ...prev, quests: newQuests, questMsg: `Accepted: ${q.name}!` }));
                      }}>
                      <div className="text-white font-bold">{q.name}</div>
                      <div className="text-slate-400">{q.description}</div>
                      <div className="text-amber-400 mt-0.5">Reward: {q.reward_gold}G + {q.reward_xp}XP</div>
                    </button>
                  ))}
                </div>
              )}
              {npcDialog.questMsg && <div className="text-green-400 text-xs text-center mt-1">{npcDialog.questMsg}</div>}
              {(!npcDialog.quests.available?.length && !npcDialog.quests.active?.length) && (
                <div className="text-slate-500 text-xs text-center">No quests available right now.</div>
              )}
            </div>
          )}
          
          {npcDialog.data?.type === 'shop' && npcDialog.data?.npc?.shop_items && (
            <div className="space-y-1 mb-3">
              {npcDialog.data.npc.shop_items.map((item, i) => (
                <button key={i} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-1 px-2 rounded text-sm flex justify-between"
                  onClick={async () => {
                    const result = await buyFromNpc(npcDialog.npc.id, i);
                    if (result.success) {
                      setNpcDialog(prev => ({ ...prev, buyMsg: result.message }));
                    } else {
                      setNpcDialog(prev => ({ ...prev, buyMsg: result.error || 'Not enough gold!' }));
                    }
                  }}>
                  <span>{item.name}</span>
                  <span className="text-amber-400">{item.price}G</span>
                </button>
              ))}
              {npcDialog.buyMsg && <div className="text-amber-300 text-xs text-center mt-1">{npcDialog.buyMsg}</div>}
            </div>
          )}
          
          <button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-1.5 rounded text-sm"
            onClick={() => setNpcDialog(null)}>
            Close [E]
          </button>
        </div>
      )}
    </div>
  );
};
 
export default Overworld;