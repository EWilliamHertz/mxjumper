import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../contexts/GameContext';

// Platform data
const PLATFORMS = [
  { x: 0, y: 500, width: 1200, height: 100 }, // Ground
  { x: 200, y: 400, width: 150, height: 20 },
  { x: 450, y: 320, width: 150, height: 20 },
  { x: 700, y: 400, width: 150, height: 20 },
  { x: 100, y: 250, width: 100, height: 20 },
  { x: 350, y: 200, width: 200, height: 20 },
  { x: 650, y: 250, width: 100, height: 20 },
  { x: 850, y: 350, width: 120, height: 20 },
];

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ENCOUNTER_STEPS = 30; // Steps before possible encounter
const ENCOUNTER_CHANCE = 0.15; // 15% chance per check

export const Overworld = () => {
  const canvasRef = useRef(null);
  const { player, otherPlayers, sendPosition, startEncounter, healParty, setGameState } = useGame();
  
  const [playerState, setPlayerState] = useState({
    x: player?.position_x || 100,
    y: player?.position_y || 300,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 'right',
    stepCounter: 0
  });
  
  const keysRef = useRef({});
  const gameLoopRef = useRef(null);

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
      await startEncounter();
    }
  }, [startEncounter]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationId;
    
    const gameLoop = () => {
      const keys = keysRef.current;
      
      setPlayerState(prev => {
        let { x, y, vx, vy, onGround, facing, stepCounter } = prev;
        
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
        const playerWidth = 32;
        const playerHeight = 48;
        
        for (const platform of PLATFORMS) {
          // Check if player is above platform and falling
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
        
        return { x, y, vx, vy, onGround, facing, stepCounter };
      });
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = gameLoop;
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

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background elements
    ctx.fillStyle = '#1a1a2e';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(100 + i * 200, 100 + Math.sin(i) * 50, 60, 80);
    }
    
    // Draw platforms
    ctx.fillStyle = '#2a2a4e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    for (const platform of PLATFORMS) {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      
      // Grass/detail on top
      if (platform.height === 20) {
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(platform.x, platform.y, platform.width, 4);
        ctx.fillStyle = '#2a2a4e';
      }
    }
    
    // Draw other players
    Object.values(otherPlayers).forEach(other => {
      ctx.fillStyle = '#8b8b99';
      ctx.fillRect(other.x, other.y, 32, 48);
      
      // Name tag
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(other.name, other.x + 16, other.y - 8);
    });
    
    // Draw player
    const px = playerState.x;
    const py = playerState.y;
    
    // Body
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(px, py, 32, 48);
    
    // Head
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(px + 16, py + 10, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#050505';
    if (playerState.facing === 'right') {
      ctx.fillRect(px + 18, py + 8, 4, 4);
    } else {
      ctx.fillRect(px + 10, py + 8, 4, 4);
    }
    
    // Player name
    ctx.fillStyle = '#FFD700';
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(player?.name || 'Player', px + 16, py - 8);
    
    // UI Overlay
    ctx.fillStyle = 'rgba(20, 20, 40, 0.9)';
    ctx.fillRect(10, 10, 200, 80);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 200, 80);
    
    // Player stats
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(player?.name || 'Player', 20, 30);
    ctx.font = '12px VT323';
    ctx.fillText(`LV ${player?.level || 1}`, 20, 45);
    
    // HP Bar
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(20, 52, 160, 12);
    ctx.fillStyle = '#FF3366';
    const hpPercent = player ? (player.hp / player.max_hp) : 1;
    ctx.fillRect(20, 52, 160 * hpPercent, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px VT323';
    ctx.fillText(`HP ${player?.hp || 100}/${player?.max_hp || 100}`, 25, 62);
    
    // MP Bar
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(20, 68, 160, 12);
    ctx.fillStyle = '#33CCFF';
    const mpPercent = player ? (player.mp / player.max_mp) : 1;
    ctx.fillRect(20, 68, 160 * mpPercent, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`MP ${player?.mp || 50}/${player?.max_mp || 50}`, 25, 78);
    
    // Controls hint
    ctx.fillStyle = '#8b8b99';
    ctx.font = '10px VT323';
    ctx.textAlign = 'right';
    ctx.fillText('A/D: Move | W/Space: Jump | M: Menu', canvas.width - 10, canvas.height - 10);
    
  }, [playerState, otherPlayers, player]);

  // Handle menu key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'm') {
        setGameState('menu');
      }
      if (e.key.toLowerCase() === 'h') {
        healParty();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setGameState, healParty]);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#050505]" data-testid="overworld">
      <canvas
        ref={canvasRef}
        width={1000}
        height={600}
        id="game-canvas"
        className="border-2 border-white"
        data-testid="game-canvas"
      />
    </div>
  );
};

export default Overworld;
