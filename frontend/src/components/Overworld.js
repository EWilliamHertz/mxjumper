import React, { useRef, useEffect, useState, useCallback } from 'react';
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
      { x: 950, y: 460, width: 50, height: 60, to: 'cave', label: 'Cave →' },
    ],
    spawnX: 100,
    spawnY: 400,
    noEncounters: true, // Forest is now safe
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
    exits: [{ x: 0, y: 460, width: 50, height: 60, to: 'wasteland', label: '← Wasteland' }],
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
};

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ENCOUNTER_STEPS = 15; // Fewer steps needed
const ENCOUNTER_CHANCE = 0.25; // Higher chance of encounter
const AUTO_SAVE_INTERVAL = 5000;

export const Overworld = () => {
  const canvasRef = useRef(null);
  const { 
    player, otherPlayers, sendPosition, startEncounter, healParty, setGameState, updatePosition,
    chatMessages, sendChatMessage, sendMultiplayerRequest, notifications, clearNotification,
    interactNpc, fetchNpcs, npcs, buyFromNpc, quests, fetchQuests, acceptQuest
  } = useGame();
  
  const [currentMap, setCurrentMap] = useState(player?.current_map || 'forest');
  const [playerState, setPlayerState] = useState({
    x: player?.position_x || 100,
    y: player?.position_y || 400,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 'right',
    stepCounter: 0,
    frame: 0
  });
  
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showEntityMenu, setShowEntityMenu] = useState(false);
  const [npcDialog, setNpcDialog] = useState(null);
  
  const keysRef = useRef({});
  const lastSaveRef = useRef(Date.now());

  const mapData = MAPS[currentMap];

  // Load saved position
  useEffect(() => {
    if (player) {
      setCurrentMap(player.current_map || 'forest');
      setPlayerState(prev => ({
        ...prev,
        x: player.position_x || 100,
        y: player.position_y || 400,
      }));
    }
  }, [player]);

  // Auto-save position and map
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (player && playerState) {
        updatePosition(playerState.x, playerState.y, currentMap);
        lastSaveRef.current = Date.now();
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(saveInterval);
  }, [player, playerState, updatePosition, currentMap]);

  // Save on map change
  useEffect(() => {
    if (player) {
      updatePosition(playerState.x, playerState.y, currentMap);
    }
  }, [currentMap, player, playerState.x, playerState.y, updatePosition]);

  // Fetch NPCs when entering village
  useEffect(() => {
    if (currentMap === 'village') {
      fetchNpcs('village');
    }
  }, [currentMap, fetchNpcs]);

  // Keyboard input - WASD only
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' '].includes(key)) {
        keysRef.current[key] = true;
        if (key === ' ') e.preventDefault();
      }
      if (key === 'enter' && !npcDialog) {
        if (showChat) {
          // Send message
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
        updatePosition(playerState.x, playerState.y, currentMap);
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
  }, [showChat, chatInput, sendChatMessage, setGameState, healParty, updatePosition, playerState, currentMap, npcDialog]);

  // Check map exits
  const checkExits = useCallback((x, y) => {
    const playerWidth = 40;
    const playerHeight = 56;
    
    for (const exit of mapData.exits) {
      if (
        x + playerWidth > exit.x &&
        x < exit.x + exit.width &&
        y + playerHeight > exit.y &&
        y < exit.y + exit.height
      ) {
        const newMap = MAPS[exit.to];
        updatePosition(newMap.spawnX, newMap.spawnY, exit.to);
        setCurrentMap(exit.to);
        setPlayerState(prev => ({
          ...prev,
          x: exit.x < 100 ? 900 : newMap.spawnX,
          y: newMap.spawnY,
        }));
        return true;
      }
    }
    return false;
  }, [mapData, updatePosition]);

  // Random encounter
  const checkEncounter = useCallback(async () => {
    if (mapData.noEncounters) return;
    if (Math.random() < ENCOUNTER_CHANCE) {
      updatePosition(playerState.x, playerState.y, currentMap);
      await startEncounter(mapData.encounterZone || 'forest');
    }
  }, [startEncounter, updatePosition, playerState.x, playerState.y, mapData, currentMap]);

  // Check NPC interaction
  const checkNpcInteraction = useCallback(() => {
    if (!mapData.npcs) return null;
    const playerWidth = 40;
    
    for (const npc of mapData.npcs) {
      if (Math.abs(playerState.x + playerWidth/2 - npc.x) < 50 && Math.abs(playerState.y - npc.y) < 60) {
        return npc;
      }
    }
    return null;
  }, [mapData, playerState]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let animationId;
    let frameCount = 0;
    
    const gameLoop = () => {
      const keys = keysRef.current;
      frameCount++;
      
      if (!npcDialog) {
        setPlayerState(prev => {
          let { x, y, vx, vy, onGround, facing, stepCounter, frame } = prev;
          
          vx = 0;
          if (keys['a']) { vx = -MOVE_SPEED; facing = 'left'; }
          if (keys['d']) { vx = MOVE_SPEED; facing = 'right'; }
          
          if ((keys[' '] || keys['w']) && onGround) {
            vy = JUMP_FORCE;
            onGround = false;
          }
          
          vy += GRAVITY;
          x += vx;
          y += vy;
          
          if (Math.abs(vx) > 0) {
            if (frameCount % 8 === 0) frame = (frame + 1) % 4;
          } else frame = 0;
          
          if (Math.abs(vx) > 0 && onGround && !mapData.noEncounters) {
            stepCounter++;
            if (stepCounter >= ENCOUNTER_STEPS) {
              stepCounter = 0;
              checkEncounter();
            }
          }
          
          onGround = false;
          const playerWidth = 40;
          const playerHeight = 56;
          
          for (const platform of mapData.platforms) {
            if (
              x + playerWidth > platform.x &&
              x < platform.x + platform.width &&
              y + playerHeight >= platform.y &&
              y + playerHeight <= platform.y + platform.height + vy + 1 &&
              vy >= 0
            ) {
              y = platform.y - playerHeight;
              vy = 0;
              onGround = true;
            }
          }
          
          if (x < 0 || x > canvas.width - playerWidth) checkExits(x, y);
          x = Math.max(0, Math.min(x, canvas.width - playerWidth));
          if (y > canvas.height) { y = 100; vy = 0; }
          
          return { x, y, vx, vy, onGround, facing, stepCounter, frame };
        });
      }
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [checkEncounter, checkExits, mapData, npcDialog]);

  // Send position
  useEffect(() => {
    const interval = setInterval(() => {
      sendPosition(playerState.x, playerState.y, playerState.facing, currentMap);
    }, 50);
    return () => clearInterval(interval);
  }, [playerState.x, playerState.y, playerState.facing, sendPosition, currentMap]);

  // Handle canvas click with scaling correction
  const handleCanvasClick = async (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    // Normalize coordinates based on internal resolution (1000x600)
    const clickX = (e.clientX - rect.left) * (1000 / rect.width);
    const clickY = (e.clientY - rect.top) * (600 / rect.height);
    
    // Check NPC click
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
    
    // Check other player click
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
    // Body
    ctx.fillStyle = npc.type === 'healer' ? '#ff69b4' : npc.type === 'shop' ? '#ffd700' : '#9370db';
    ctx.fillRect(npc.x - 12, npc.y - 30, 24, 30);
    // Head
    ctx.fillStyle = '#ffd9b3';
    ctx.beginPath();
    ctx.arc(npc.x, npc.y - 42, 12, 0, Math.PI * 2);
    ctx.fill();
    // Name
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText(npc.name, npc.x, npc.y - 58);
    ctx.fillText(npc.name, npc.x, npc.y - 58);
    // Interaction hint
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

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
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
    
    // Exits
    mapData.exits.forEach(exit => {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(exit.label, exit.x + exit.width / 2, exit.y - 5);
    });
    
    // NPCs
    if (mapData.npcs) {
      mapData.npcs.forEach(npc => drawNPC(ctx, npc));
    }
    
    // Other players (same map only)
    Object.values(otherPlayers).forEach(other => {
      if (other.current_map === currentMap) {
        drawPlayer(ctx, other.x, other.y, other.facing || 'right', 0, other.name, false);
      }
    });
    
    // Player
    drawPlayer(ctx, playerState.x, playerState.y, playerState.facing, playerState.frame, player?.name || 'Player', true);
    
  }, [playerState, otherPlayers, player, mapData, currentMap, checkNpcInteraction, drawNPC]);

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

      {/* Map name */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 px-4 py-1 rounded-lg border border-slate-600">
        <span className="text-white font-bold text-sm">{mapData.name}</span>
      </div>

      {/* Notifications - Top Right with Slide-in Animation */}
      <div className="absolute top-20 right-4 flex flex-col gap-2 z-50 pointer-events-none">
        {notifications.map((n, i) => (
          <div key={n.id || i} className="w-64 bg-slate-900/95 border-l-4 border-amber-500 p-3 shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-right-8 pointer-events-auto">
            <div className="text-amber-400 font-bold text-[10px] uppercase tracking-widest">{n.type.replace('_', ' ')}</div>
            <div className="text-white text-xs my-1">{n.from_name} wants to interact.</div>
            <div className="flex gap-1 mt-2">
              <button className="flex-1 bg-amber-600 text-white text-[9px] font-bold py-1 rounded hover:bg-amber-500" onClick={() => clearNotification(i)}>ACCEPT</button>
              <button className="flex-1 bg-slate-700 text-white text-[9px] font-bold py-1 rounded hover:bg-slate-600" onClick={() => clearNotification(i)}>IGNORE</button>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-1 text-slate-300 text-xs">
        <span className="text-amber-400">WASD</span>: Move | <span className="text-amber-400">M</span>: Menu
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1000}
        height={600}
        className="border-4 border-slate-800 rounded-lg shadow-2xl cursor-pointer"
        onClick={handleCanvasClick}
        data-testid="game-canvas"
      />

      {/* Chat - Raised for better visibility on iPad */}
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
              onClick={() => { sendMultiplayerRequest('duel_request', selectedEntity.id); setShowEntityMenu(false); }}>
              ⚔️ Duel
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
