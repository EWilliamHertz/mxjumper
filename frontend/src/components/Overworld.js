import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';

// Map definitions
const MAPS = {
  forest: {
    name: 'Emerald Forest',
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
  },
  cave: {
    name: 'Dark Cave',
    bgGradient: ['#2a2a4a', '#1a1a3a', '#0a0a2a'],
    platforms: [
      { x: 0, y: 520, width: 1000, height: 80, type: 'stone' },
      { x: 100, y: 420, width: 150, height: 24, type: 'stone' },
      { x: 300, y: 350, width: 120, height: 24, type: 'stone' },
      { x: 500, y: 400, width: 180, height: 24, type: 'stone' },
      { x: 150, y: 250, width: 100, height: 24, type: 'stone' },
      { x: 400, y: 200, width: 150, height: 24, type: 'stone' },
      { x: 700, y: 320, width: 120, height: 24, type: 'stone' },
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
    ],
    spawnX: 80,
    spawnY: 400,
  },
  village: {
    name: 'Peaceful Village',
    bgGradient: ['#87CEEB', '#98FB98', '#F5DEB3'],
    platforms: [
      { x: 0, y: 520, width: 1000, height: 80, type: 'ground' },
      { x: 200, y: 400, width: 200, height: 120, type: 'building' },
      { x: 500, y: 380, width: 150, height: 140, type: 'building' },
      { x: 750, y: 420, width: 180, height: 100, type: 'building' },
    ],
    decorations: [
      { x: 50, y: 480, type: 'lamppost' },
      { x: 450, y: 480, type: 'bench' },
      { x: 680, y: 480, type: 'lamppost' },
    ],
    exits: [
      { x: 0, y: 460, width: 50, height: 60, to: 'mountain', label: '← Mountain' },
    ],
    spawnX: 80,
    spawnY: 400,
    noEncounters: true,
  },
};

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ENCOUNTER_STEPS = 25;
const ENCOUNTER_CHANCE = 0.12;
const AUTO_SAVE_INTERVAL = 10000;

export const Overworld = () => {
  const canvasRef = useRef(null);
  const { player, otherPlayers, sendPosition, startEncounter, healParty, setGameState, updatePosition } = useGame();
  
  const [currentMap, setCurrentMap] = useState('forest');
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
  
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);
  
  const keysRef = useRef({});
  const lastSaveRef = useRef(Date.now());

  const mapData = MAPS[currentMap];

  // Auto-save
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (player && playerState) {
        updatePosition(playerState.x, playerState.y);
        lastSaveRef.current = Date.now();
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(saveInterval);
  }, [player, playerState, updatePosition]);

  // Keyboard input - WASD only
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' '].includes(key)) {
        keysRef.current[key] = true;
        if (key === ' ') e.preventDefault();
      }
      if (key === 'enter' && !showChat) {
        setShowChat(true);
      } else if (key === 'escape') {
        setShowChat(false);
        setShowPlayerMenu(false);
      }
      if (key === 'm') {
        updatePosition(playerState.x, playerState.y);
        setGameState('menu');
      }
      if (key === 'h') {
        healParty();
      }
    };
    
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showChat, setGameState, healParty, updatePosition, playerState.x, playerState.y]);

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
  }, [mapData]);

  // Random encounter
  const checkEncounter = useCallback(async () => {
    if (mapData.noEncounters) return;
    if (Math.random() < ENCOUNTER_CHANCE) {
      updatePosition(playerState.x, playerState.y);
      await startEncounter();
    }
  }, [startEncounter, updatePosition, playerState.x, playerState.y, mapData.noEncounters]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let animationId;
    let frameCount = 0;
    
    const gameLoop = () => {
      const keys = keysRef.current;
      frameCount++;
      
      if (!showChat) {
        setPlayerState(prev => {
          let { x, y, vx, vy, onGround, facing, stepCounter, frame } = prev;
          
          // WASD movement only
          vx = 0;
          if (keys['a']) {
            vx = -MOVE_SPEED;
            facing = 'left';
          }
          if (keys['d']) {
            vx = MOVE_SPEED;
            facing = 'right';
          }
          
          // Jump with W or Space
          if ((keys[' '] || keys['w']) && onGround) {
            vy = JUMP_FORCE;
            onGround = false;
          }
          
          vy += GRAVITY;
          x += vx;
          y += vy;
          
          // Animation
          if (Math.abs(vx) > 0) {
            if (frameCount % 8 === 0) frame = (frame + 1) % 4;
          } else {
            frame = 0;
          }
          
          // Encounters
          if (Math.abs(vx) > 0 && onGround && !mapData.noEncounters) {
            stepCounter++;
            if (stepCounter >= ENCOUNTER_STEPS) {
              stepCounter = 0;
              checkEncounter();
            }
          }
          
          // Platform collision
          onGround = false;
          const playerWidth = 40;
          const playerHeight = 56;
          
          for (const platform of mapData.platforms) {
            if (platform.type === 'building') continue;
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
          
          // Boundaries & exits
          if (x < 0 || x > canvas.width - playerWidth) {
            checkExits(x, y);
          }
          x = Math.max(0, Math.min(x, canvas.width - playerWidth));
          if (y > canvas.height) {
            y = 100;
            vy = 0;
          }
          
          return { x, y, vx, vy, onGround, facing, stepCounter, frame };
        });
      }
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [checkEncounter, checkExits, mapData, showChat]);

  // Send position
  useEffect(() => {
    const interval = setInterval(() => {
      sendPosition(playerState.x, playerState.y, playerState.facing);
    }, 50);
    return () => clearInterval(interval);
  }, [playerState.x, playerState.y, playerState.facing, sendPosition]);

  // Handle chat
  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev.slice(-20), { sender: player?.name || 'You', message: chatInput, time: Date.now() }]);
    setChatInput('');
  };

  // Handle player click
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Check if clicked on another player
    for (const [id, other] of Object.entries(otherPlayers)) {
      if (
        clickX >= other.x && clickX <= other.x + 40 &&
        clickY >= other.y && clickY <= other.y + 56
      ) {
        setSelectedPlayer({ id, ...other });
        setShowPlayerMenu(true);
        return;
      }
    }
    setShowPlayerMenu(false);
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
    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.arc(x + 25, y + 5, 14, 0, Math.PI * 2);
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

  const drawBuilding = (ctx, platform) => {
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.moveTo(platform.x - 10, platform.y);
    ctx.lineTo(platform.x + platform.width / 2, platform.y - 40);
    ctx.lineTo(platform.x + platform.width + 10, platform.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(platform.x + platform.width / 2 - 15, platform.y + platform.height - 50, 30, 50);
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(platform.x + 20, platform.y + 20, 25, 25);
    ctx.fillRect(platform.x + platform.width - 45, platform.y + 20, 25, 25);
  };

  const drawPlayer = (ctx, x, y, facing, frame, name, isMain = true) => {
    const flip = facing === 'left' ? -1 : 1;
    ctx.save();
    ctx.translate(x + 20, y);
    ctx.scale(flip, 1);
    
    // Body
    ctx.fillStyle = isMain ? '#4A90D9' : '#888888';
    ctx.fillRect(-15, 20, 30, 30);
    
    // Head
    ctx.fillStyle = isMain ? '#FFD9B3' : '#CCCCCC';
    ctx.beginPath();
    ctx.arc(0, 12, 14, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair
    ctx.fillStyle = isMain ? '#4A2800' : '#555555';
    ctx.beginPath();
    ctx.arc(0, 6, 12, Math.PI, 0);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(3, 10, 4, 4);
    
    // Legs
    ctx.fillStyle = isMain ? '#2D5A87' : '#666666';
    const legOffset = Math.sin(frame * Math.PI / 2) * 3;
    ctx.fillRect(-10, 50, 10, 8 + legOffset);
    ctx.fillRect(0, 50, 10, 8 - legOffset);
    
    ctx.restore();
    
    // Name
    ctx.fillStyle = isMain ? '#FFD700' : '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 12px sans-serif';
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
      if (platform.type === 'building') {
        drawBuilding(ctx, platform);
        return;
      }
      
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
        ctx.strokeStyle = '#1a5a1a';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      } else if (platform.type === 'stone') {
        ctx.fillStyle = '#708090';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.fillStyle = '#5a6a7a';
        ctx.fillRect(platform.x, platform.y + platform.height - 6, platform.width, 6);
        ctx.strokeStyle = '#4a5a6a';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      }
    });
    
    // Exit indicators
    mapData.exits.forEach(exit => {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(exit.label, exit.x + exit.width / 2, exit.y - 5);
    });
    
    // Other players (clickable)
    Object.values(otherPlayers).forEach(other => {
      drawPlayer(ctx, other.x, other.y, other.facing || 'right', 0, other.name, false);
    });
    
    // Player
    drawPlayer(ctx, playerState.x, playerState.y, playerState.facing, playerState.frame, player?.name || 'Player', true);
    
  }, [playerState, otherPlayers, player, mapData]);

  // Player sprite for HUD
  const PlayerHUDSprite = () => (
    <svg viewBox="0 0 64 64" width={48} height={48}>
      <rect x="24" y="36" width="16" height="20" fill="#4a90d9"/>
      <rect x="18" y="40" width="8" height="14" fill="#5aa0e9"/>
      <rect x="38" y="40" width="8" height="14" fill="#5aa0e9"/>
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
        <div className="bg-slate-900/90 border-2 border-amber-400 rounded-xl p-3 shadow-lg min-w-[200px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg overflow-hidden">
              <PlayerHUDSprite />
            </div>
            <div>
              <div className="text-amber-400 font-bold">{player?.name || 'Player'}</div>
              <div className="text-slate-400 text-sm">Level {player?.level || 1}</div>
            </div>
          </div>
          
          {/* HP */}
          <div className="mb-1">
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-red-400 font-bold">HP</span>
              <span className="text-slate-300">{player?.hp || 100}/{player?.max_hp || 100}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 to-pink-400" style={{ width: `${player ? (player.hp / player.max_hp) * 100 : 100}%` }} />
            </div>
          </div>
          
          {/* MP */}
          <div className="mb-1">
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-cyan-400 font-bold">MP</span>
              <span className="text-slate-300">{player?.mp || 50}/{player?.max_mp || 50}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400" style={{ width: `${player ? (player.mp / player.max_mp) * 100 : 100}%` }} />
            </div>
          </div>
          
          {/* XP */}
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-amber-400 font-bold">XP</span>
              <span className="text-slate-300">{player?.xp || 0}/{player?.xp_to_next || 100}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400" style={{ width: `${player ? (player.xp / player.xp_to_next) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Map name */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-600">
        <span className="text-white font-bold">{mapData.name}</span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 border border-slate-600 rounded-lg px-4 py-2 text-slate-300 text-sm">
        <span className="text-amber-400">WASD</span>: Move/Jump | <span className="text-amber-400">M</span>: Menu | <span className="text-amber-400">Enter</span>: Chat
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

      {/* Chat Box */}
      <div className={`absolute bottom-20 left-4 w-80 transition-all ${showChat ? 'opacity-100' : 'opacity-70'}`}>
        <div className="bg-slate-900/90 border border-slate-600 rounded-lg overflow-hidden">
          <div className="bg-slate-800 px-3 py-1 text-sm text-slate-300 flex justify-between">
            <span>💬 Chat</span>
            <button onClick={() => setShowChat(!showChat)} className="text-slate-400 hover:text-white">
              {showChat ? '▼' : '▲'}
            </button>
          </div>
          {showChat && (
            <>
              <div className="h-32 overflow-y-auto p-2 text-sm">
                {chatMessages.length === 0 ? (
                  <div className="text-slate-500 text-center">No messages yet</div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className="mb-1">
                      <span className="text-amber-400 font-bold">{msg.sender}:</span>
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
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  className="flex-1 bg-slate-800 px-3 py-2 text-white text-sm focus:outline-none"
                  placeholder="Type message..."
                />
                <button onClick={sendChat} className="px-3 bg-cyan-600 text-white text-sm hover:bg-cyan-500">
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Player Interaction Menu */}
      {showPlayerMenu && selectedPlayer && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border-2 border-amber-400 rounded-xl p-4 z-20 min-w-[200px]">
          <div className="text-amber-400 font-bold text-center mb-3">{selectedPlayer.name}</div>
          <div className="space-y-2">
            <button 
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-sm"
              onClick={() => { setChatMessages(prev => [...prev, { sender: 'System', message: `Friend request sent to ${selectedPlayer.name}!`, time: Date.now() }]); setShowPlayerMenu(false); }}
            >
              👋 Add Friend
            </button>
            <button 
              className="w-full bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm"
              onClick={() => { setChatMessages(prev => [...prev, { sender: 'System', message: `Duel request sent to ${selectedPlayer.name}!`, time: Date.now() }]); setShowPlayerMenu(false); }}
            >
              ⚔️ Request Duel
            </button>
            <button 
              className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-sm"
              onClick={() => { setChatMessages(prev => [...prev, { sender: 'System', message: `Trade request sent to ${selectedPlayer.name}!`, time: Date.now() }]); setShowPlayerMenu(false); }}
            >
              🔄 Trade
            </button>
            <button 
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm"
              onClick={() => setShowPlayerMenu(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overworld;
