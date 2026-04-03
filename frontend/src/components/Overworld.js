import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';

// Platform data for the world
const PLATFORMS = [
  { x: 0, y: 520, width: 1200, height: 80, type: 'ground' },
  { x: 150, y: 420, width: 120, height: 24, type: 'grass' },
  { x: 350, y: 350, width: 150, height: 24, type: 'grass' },
  { x: 580, y: 420, width: 120, height: 24, type: 'grass' },
  { x: 80, y: 280, width: 100, height: 24, type: 'stone' },
  { x: 280, y: 220, width: 180, height: 24, type: 'stone' },
  { x: 520, y: 280, width: 100, height: 24, type: 'stone' },
  { x: 700, y: 380, width: 140, height: 24, type: 'grass' },
  { x: 850, y: 300, width: 120, height: 24, type: 'stone' },
];

// Decorations
const DECORATIONS = [
  { x: 100, y: 480, type: 'tree' },
  { x: 300, y: 480, type: 'bush' },
  { x: 500, y: 480, type: 'tree' },
  { x: 700, y: 480, type: 'bush' },
  { x: 900, y: 480, type: 'tree' },
  { x: 200, y: 100, type: 'cloud' },
  { x: 500, y: 80, type: 'cloud' },
  { x: 800, y: 120, type: 'cloud' },
];

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ENCOUNTER_STEPS = 25;
const ENCOUNTER_CHANCE = 0.12;
const AUTO_SAVE_INTERVAL = 10000; // 10 seconds

export const Overworld = () => {
  const canvasRef = useRef(null);
  const { player, otherPlayers, sendPosition, startEncounter, healParty, setGameState, updatePosition } = useGame();
  
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
  
  const keysRef = useRef({});
  const lastSaveRef = useRef(Date.now());

  // Auto-save position periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (player && playerState) {
        updatePosition(playerState.x, playerState.y);
        lastSaveRef.current = Date.now();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(saveInterval);
  }, [player, playerState, updatePosition]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (player && playerState) {
        updatePosition(playerState.x, playerState.y);
      }
    };
  }, [player, playerState, updatePosition]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === ' ') e.preventDefault();
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
  }, []);

  // Check random encounter
  const checkEncounter = useCallback(async () => {
    if (Math.random() < ENCOUNTER_CHANCE) {
      // Save before combat
      updatePosition(playerState.x, playerState.y);
      await startEncounter();
    }
  }, [startEncounter, updatePosition, playerState.x, playerState.y]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let animationId;
    let frameCount = 0;
    
    const gameLoop = () => {
      const keys = keysRef.current;
      frameCount++;
      
      setPlayerState(prev => {
        let { x, y, vx, vy, onGround, facing, stepCounter, frame } = prev;
        
        // Horizontal movement
        vx = 0;
        if (keys['a'] || keys['arrowleft']) {
          vx = -MOVE_SPEED;
          facing = 'left';
        }
        if (keys['d'] || keys['arrowright']) {
          vx = MOVE_SPEED;
          facing = 'right';
        }
        
        // Jump
        if ((keys[' '] || keys['w'] || keys['arrowup']) && onGround) {
          vy = JUMP_FORCE;
          onGround = false;
        }
        
        // Apply gravity
        vy += GRAVITY;
        
        // Update position
        x += vx;
        y += vy;
        
        // Animation frame
        if (Math.abs(vx) > 0) {
          if (frameCount % 8 === 0) frame = (frame + 1) % 4;
        } else {
          frame = 0;
        }
        
        // Step counter for encounters
        if (Math.abs(vx) > 0 && onGround) {
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
        
        for (const platform of PLATFORMS) {
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
        
        // Boundary checks
        x = Math.max(0, Math.min(x, canvas.width - playerWidth));
        if (y > canvas.height) {
          y = 100;
          vy = 0;
        }
        
        return { x, y, vx, vy, onGround, facing, stepCounter, frame };
      });
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    animationId = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [checkEncounter]);

  // Send position updates
  useEffect(() => {
    const interval = setInterval(() => {
      sendPosition(playerState.x, playerState.y, playerState.facing);
    }, 50);
    
    return () => clearInterval(interval);
  }, [playerState.x, playerState.y, playerState.facing, sendPosition]);

  // Draw functions
  const drawCloud = (ctx, x, y) => {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 30, y - 10, 30, 0, Math.PI * 2);
    ctx.arc(x + 60, y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const drawTree = (ctx, x, y) => {
    // Trunk
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 15, y, 20, 40);
    // Leaves
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(x + 25, y - 20, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.arc(x + 25, y - 30, 25, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBush = (ctx, x, y) => {
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(x + 15, y + 10, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.arc(x + 25, y + 5, 15, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawPlayer = (ctx, x, y, facing, frame, isMain = true) => {
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
    
    // Legs with animation
    ctx.fillStyle = isMain ? '#2D5A87' : '#666666';
    const legOffset = Math.sin(frame * Math.PI / 2) * 3;
    ctx.fillRect(-10, 50, 10, 8 + legOffset);
    ctx.fillRect(0, 50, 10, 8 - legOffset);
    
    ctx.restore();
  };

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.6, '#B0E0E6');
    skyGradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw decorations (clouds, trees, bushes)
    DECORATIONS.forEach(dec => {
      if (dec.type === 'cloud') drawCloud(ctx, dec.x, dec.y);
    });
    
    // Draw distant mountains
    ctx.fillStyle = '#6B8E9F';
    ctx.beginPath();
    ctx.moveTo(0, 400);
    ctx.lineTo(150, 250);
    ctx.lineTo(300, 400);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(250, 400);
    ctx.lineTo(450, 200);
    ctx.lineTo(650, 400);
    ctx.fill();
    ctx.fillStyle = '#7FA9B8';
    ctx.beginPath();
    ctx.moveTo(500, 400);
    ctx.lineTo(700, 280);
    ctx.lineTo(900, 400);
    ctx.fill();
    
    // Draw platforms
    PLATFORMS.forEach(platform => {
      if (platform.type === 'ground') {
        // Ground with grass
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(platform.x, platform.y + 10, platform.width, platform.height - 10);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(platform.x, platform.y, platform.width, 15);
        // Grass detail
        ctx.fillStyle = '#32CD32';
        for (let i = 0; i < platform.width; i += 20) {
          ctx.fillRect(platform.x + i, platform.y - 3, 3, 8);
        }
      } else if (platform.type === 'grass') {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(platform.x, platform.y + 6, platform.width, platform.height - 6);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(platform.x, platform.y, platform.width, 10);
        // Border
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
    
    // Draw trees and bushes
    DECORATIONS.forEach(dec => {
      if (dec.type === 'tree') drawTree(ctx, dec.x, dec.y);
      if (dec.type === 'bush') drawBush(ctx, dec.x, dec.y);
    });
    
    // Draw other players
    Object.values(otherPlayers).forEach(other => {
      drawPlayer(ctx, other.x, other.y, other.facing || 'right', 0, false);
      // Name tag
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(other.name, other.x + 20, other.y - 10);
      ctx.fillText(other.name, other.x + 20, other.y - 10);
    });
    
    // Draw player
    drawPlayer(ctx, playerState.x, playerState.y, playerState.facing, playerState.frame, true);
    
    // Player name
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText(player?.name || 'Player', playerState.x + 20, playerState.y - 10);
    ctx.fillText(player?.name || 'Player', playerState.x + 20, playerState.y - 10);
    
  }, [playerState, otherPlayers, player]);

  // Handle menu key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'm') {
        updatePosition(playerState.x, playerState.y);
        setGameState('menu');
      }
      if (e.key.toLowerCase() === 'h') {
        healParty();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setGameState, healParty, updatePosition, playerState.x, playerState.y]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-400 to-sky-600" data-testid="overworld">
      {/* HUD */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-slate-900/90 border-2 border-amber-400 rounded-xl p-4 shadow-lg min-w-[220px]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-2xl border-2 border-white shadow-lg">
              🦸
            </div>
            <div>
              <div className="text-amber-400 font-bold text-lg">{player?.name || 'Player'}</div>
              <div className="text-slate-400 text-sm">Level {player?.level || 1}</div>
            </div>
          </div>
          
          {/* HP Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-red-400 font-bold">HP</span>
              <span className="text-slate-300">{player?.hp || 100}/{player?.max_hp || 100}</span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-pink-400 transition-all"
                style={{ width: `${player ? (player.hp / player.max_hp) * 100 : 100}%` }}
              />
            </div>
          </div>
          
          {/* MP Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-cyan-400 font-bold">MP</span>
              <span className="text-slate-300">{player?.mp || 50}/{player?.max_mp || 50}</span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all"
                style={{ width: `${player ? (player.mp / player.max_mp) * 100 : 100}%` }}
              />
            </div>
          </div>
          
          {/* XP Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-amber-400 font-bold">XP</span>
              <span className="text-slate-300">{player?.xp || 0}/{player?.xp_to_next || 100}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                style={{ width: `${player ? (player.xp / player.xp_to_next) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 border border-slate-600 rounded-lg px-4 py-2 text-slate-300 text-sm">
        <span className="text-amber-400">A/D</span>: Move | <span className="text-amber-400">W/Space</span>: Jump | <span className="text-amber-400">M</span>: Menu | <span className="text-amber-400">H</span>: Heal
      </div>

      {/* Auto-save indicator */}
      <div className="absolute top-4 right-4 text-slate-400 text-xs">
        Auto-save enabled
      </div>

      <canvas
        ref={canvasRef}
        width={1000}
        height={600}
        id="game-canvas"
        className="border-4 border-slate-800 rounded-lg shadow-2xl"
        data-testid="game-canvas"
      />
    </div>
  );
};

export default Overworld;
