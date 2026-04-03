import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGame } from '../contexts/GameContext';

// Calculate turn order - regenerates when needed
const calculateTurnOrder = (party, enemies, startFrom = 0, turns = 15) => {
  const allCombatants = [
    ...party.map(p => ({ ...p, isEnemy: false })),
    ...enemies.map(e => ({ ...e, isEnemy: true }))
  ].filter(c => c.current_hp > 0);

  if (allCombatants.length === 0) return [];

  const timeline = [];
  const turnCounters = {};
  
  allCombatants.forEach(c => {
    const id = c.isEnemy ? c.encounter_id : (c.type === 'player' ? 'player' : `ally_${c.id}`);
    turnCounters[id] = startFrom;
  });

  while (timeline.length < turns) {
    let fastest = null;
    let fastestId = null;
    let lowestWait = Infinity;

    allCombatants.forEach(c => {
      if (c.current_hp <= 0) return;
      const id = c.isEnemy ? c.encounter_id : (c.type === 'player' ? 'player' : `ally_${c.id}`);
      const agility = c.isEnemy ? c.base_agility : c.agility;
      const waitTime = turnCounters[id] + (100 / Math.max(1, agility));
      
      if (waitTime < lowestWait) {
        lowestWait = waitTime;
        fastest = c;
        fastestId = id;
      }
    });

    if (fastest) {
      timeline.push({ ...fastest, turnId: fastestId });
      turnCounters[fastestId] = lowestWait;
    } else {
      break;
    }
  }

  return timeline;
};

// Monster SVG sprites
const MonsterSprite = ({ type, size = 64 }) => {
  const sprites = {
    slime: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <ellipse cx="32" cy="48" rx="24" ry="12" fill="#1a5a1a"/>
        <ellipse cx="32" cy="38" rx="22" ry="22" fill="#44dd44"/>
        <ellipse cx="32" cy="35" rx="18" ry="18" fill="#66ff66"/>
        <ellipse cx="26" cy="32" rx="4" ry="5" fill="#000"/>
        <ellipse cx="38" cy="32" rx="4" ry="5" fill="#000"/>
        <ellipse cx="27" cy="31" rx="2" ry="2" fill="#fff"/>
        <ellipse cx="39" cy="31" rx="2" ry="2" fill="#fff"/>
      </svg>
    ),
    goblin: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <rect x="24" y="40" width="16" height="20" fill="#2d5a27"/>
        <circle cx="32" cy="28" r="16" fill="#7cb342"/>
        <polygon points="16,20 24,32 16,32" fill="#7cb342"/>
        <polygon points="48,20 40,32 48,32" fill="#7cb342"/>
        <ellipse cx="26" cy="26" rx="4" ry="5" fill="#ff0"/>
        <ellipse cx="38" cy="26" rx="4" ry="5" fill="#ff0"/>
        <circle cx="26" cy="27" r="2" fill="#000"/>
        <circle cx="38" cy="27" r="2" fill="#000"/>
      </svg>
    ),
    wolf: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <ellipse cx="32" cy="50" rx="20" ry="10" fill="#555"/>
        <rect x="14" y="44" width="8" height="16" fill="#666"/>
        <rect x="42" y="44" width="8" height="16" fill="#666"/>
        <ellipse cx="32" cy="38" rx="18" ry="14" fill="#777"/>
        <ellipse cx="20" cy="24" rx="10" ry="14" fill="#888"/>
        <polygon points="12,10 16,24 22,20" fill="#888"/>
        <polygon points="28,10 24,24 18,20" fill="#888"/>
        <circle cx="16" cy="22" r="3" fill="#ff0"/>
        <circle cx="24" cy="22" r="3" fill="#ff0"/>
        <ellipse cx="20" cy="30" rx="4" ry="3" fill="#333"/>
      </svg>
    ),
    bat: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <path d="M4 24 Q16 20 24 32 L32 28 L40 32 Q48 20 60 24 Q56 36 44 40 L32 48 L20 40 Q8 36 4 24" fill="#442266"/>
        <ellipse cx="32" cy="32" rx="10" ry="12" fill="#553388"/>
        <circle cx="28" cy="28" r="3" fill="#ff0"/>
        <circle cx="36" cy="28" r="3" fill="#ff0"/>
      </svg>
    ),
    skeleton: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <rect x="28" y="36" width="8" height="20" fill="#ddd"/>
        <rect x="20" y="48" width="8" height="14" fill="#ccc"/>
        <rect x="36" y="48" width="8" height="14" fill="#ccc"/>
        <circle cx="32" cy="24" r="14" fill="#eee"/>
        <ellipse cx="26" cy="22" rx="4" ry="5" fill="#000"/>
        <ellipse cx="38" cy="22" rx="4" ry="5" fill="#000"/>
        <rect x="26" y="32" width="12" height="2" fill="#000"/>
      </svg>
    ),
    mushroom: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <rect x="26" y="40" width="12" height="18" fill="#f5deb3"/>
        <ellipse cx="32" cy="32" rx="22" ry="16" fill="#ff6b6b"/>
        <circle cx="24" cy="28" r="5" fill="#fff"/>
        <circle cx="40" cy="30" r="4" fill="#fff"/>
        <ellipse cx="26" cy="38" rx="3" ry="4" fill="#000"/>
        <ellipse cx="38" cy="38" rx="3" ry="4" fill="#000"/>
      </svg>
    ),
    ghost: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <path d="M16 32 Q16 12 32 12 Q48 12 48 32 L48 56 L42 50 L36 56 L32 50 L28 56 L22 50 L16 56 Z" fill="rgba(200,200,255,0.8)"/>
        <ellipse cx="26" cy="28" rx="5" ry="6" fill="#000"/>
        <ellipse cx="38" cy="28" rx="5" ry="6" fill="#000"/>
        <ellipse cx="32" cy="40" rx="4" ry="6" fill="#446"/>
      </svg>
    ),
    golem: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <rect x="20" y="32" width="24" height="28" fill="#8b7355" rx="4"/>
        <rect x="12" y="36" width="10" height="20" fill="#9b8365" rx="3"/>
        <rect x="42" y="36" width="10" height="20" fill="#9b8365" rx="3"/>
        <rect x="18" y="12" width="28" height="24" fill="#a89375" rx="4"/>
        <rect x="22" y="18" width="8" height="6" fill="#ff6"/>
        <rect x="34" y="18" width="8" height="6" fill="#ff6"/>
      </svg>
    ),
    spider: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <ellipse cx="32" cy="40" rx="16" ry="12" fill="#333"/>
        <ellipse cx="32" cy="28" rx="10" ry="10" fill="#444"/>
        <circle cx="28" cy="26" r="3" fill="#f00"/>
        <circle cx="36" cy="26" r="3" fill="#f00"/>
        <line x1="16" y1="36" x2="4" y2="28" stroke="#333" strokeWidth="3"/>
        <line x1="48" y1="36" x2="60" y2="28" stroke="#333" strokeWidth="3"/>
        <line x1="18" y1="44" x2="6" y2="52" stroke="#333" strokeWidth="3"/>
        <line x1="46" y1="44" x2="58" y2="52" stroke="#333" strokeWidth="3"/>
      </svg>
    ),
    harpy: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <path d="M8 30 Q20 20 28 35 L32 32 L36 35 Q44 20 56 30 Q50 42 40 44 L32 50 L24 44 Q14 42 8 30" fill="#9966cc"/>
        <circle cx="32" cy="24" r="10" fill="#ffd9b3"/>
        <circle cx="29" cy="22" r="2" fill="#000"/>
        <circle cx="35" cy="22" r="2" fill="#000"/>
        <path d="M28 28 Q32 32 36 28" stroke="#c96" strokeWidth="2" fill="none"/>
      </svg>
    ),
    dragon: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <ellipse cx="32" cy="48" rx="20" ry="12" fill="#8b0000"/>
        <ellipse cx="32" cy="36" rx="18" ry="16" fill="#b22222"/>
        <circle cx="26" cy="20" r="12" fill="#cd5c5c"/>
        <polygon points="20,8 26,20 14,16" fill="#cd5c5c"/>
        <polygon points="32,8 26,20 38,16" fill="#cd5c5c"/>
        <circle cx="22" cy="18" r="3" fill="#ff0"/>
        <circle cx="30" cy="18" r="3" fill="#ff0"/>
        <path d="M18 26 L22 30 L26 26" fill="#ff6600"/>
      </svg>
    ),
    phoenix: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <path d="M10 35 Q25 15 32 30 Q39 15 54 35 Q45 45 32 40 Q19 45 10 35" fill="#ff6600"/>
        <ellipse cx="32" cy="42" rx="12" ry="14" fill="#ff8c00"/>
        <circle cx="32" cy="28" r="8" fill="#ffd700"/>
        <circle cx="29" cy="26" r="2" fill="#000"/>
        <circle cx="35" cy="26" r="2" fill="#000"/>
        <polygon points="32,32 28,38 36,38" fill="#ff4500"/>
      </svg>
    )
  };
  return sprites[type] || sprites.slime;
};

const PlayerSprite = ({ size = 64 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <rect x="24" y="36" width="16" height="20" fill="#4a90d9"/>
    <rect x="18" y="40" width="8" height="14" fill="#5aa0e9"/>
    <rect x="38" y="40" width="8" height="14" fill="#5aa0e9"/>
    <rect x="22" y="52" width="8" height="12" fill="#2d5a87"/>
    <rect x="34" y="52" width="8" height="12" fill="#2d5a87"/>
    <circle cx="32" cy="24" r="12" fill="#ffd9b3"/>
    <path d="M20 20 Q32 8 44 20 L44 24 Q32 20 20 24 Z" fill="#4a2800"/>
    <circle cx="28" cy="24" r="2" fill="#000"/>
    <circle cx="36" cy="24" r="2" fill="#000"/>
  </svg>
);

export const CombatScreen = () => {
  const { combatData, setCombatData, processVictory, captureMonster, setGameState, abilities } = useGame();
  
  const [partyState, setPartyState] = useState([]);
  const [enemyState, setEnemyState] = useState([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [turnTimeline, setTurnTimeline] = useState([]);
  const [timelineOffset, setTimelineOffset] = useState(0);
  const [selectedMenu, setSelectedMenu] = useState('main');
  const [selectedAction, setSelectedAction] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const [damageNumbers, setDamageNumbers] = useState([]);
  const [showVictory, setShowVictory] = useState(false);
  const [victoryData, setVictoryData] = useState(null);
  const [showCapture, setShowCapture] = useState(false);
  const [captureTarget, setCaptureTarget] = useState(null);
  const [captureName, setCaptureName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [battleStarted, setBattleStarted] = useState(false);
  const [defeatedMonsters, setDefeatedMonsters] = useState([]);
  
  const processedTurnsRef = useRef(new Set());

  // Initialize combat
  useEffect(() => {
    if (combatData && !battleStarted) {
      setPartyState(combatData.party.map(p => ({ ...p, current_hp: p.hp, current_mp: p.mp })));
      setEnemyState(combatData.enemies);
      setCombatLog([`Encountered ${combatData.enemies.map(e => e.name).join(', ')}!`]);
      setTurnIndex(0);
      setTimelineOffset(0);
      setBattleStarted(true);
      processedTurnsRef.current = new Set();
      setDefeatedMonsters([]);
      setIsProcessing(false);
    }
  }, [combatData, battleStarted]);

  // Recalculate timeline when needed
  useEffect(() => {
    if (!battleStarted) return;
    
    const aliveParty = partyState.filter(p => p.current_hp > 0);
    const aliveEnemies = enemyState.filter(e => e.current_hp > 0);
    
    if (aliveParty.length > 0 && aliveEnemies.length > 0) {
      const newTimeline = calculateTurnOrder(aliveParty, aliveEnemies, timelineOffset, 15);
      setTurnTimeline(newTimeline);
    }
  }, [partyState, enemyState, timelineOffset, battleStarted]);

  // Get current actor
  const currentActor = useMemo(() => {
    if (!turnTimeline.length || turnIndex >= turnTimeline.length) return null;
    return turnTimeline[turnIndex];
  }, [turnTimeline, turnIndex]);

  const isPlayerTurn = useMemo(() => {
    return currentActor && !currentActor.isEnemy && !isProcessing;
  }, [currentActor, isProcessing]);

  // Check win/lose
  useEffect(() => {
    if (!battleStarted) return;
    
    const aliveParty = partyState.filter(p => p.current_hp > 0);
    const aliveEnemies = enemyState.filter(e => e.current_hp > 0);

    if (aliveParty.length === 0) {
      setCombatLog(prev => [...prev, 'Party defeated...']);
      setTimeout(() => {
        setGameState('overworld');
        setCombatData(null);
      }, 2000);
    } else if (aliveEnemies.length === 0 && !showVictory) {
      handleVictory();
    }
  }, [partyState, enemyState, battleStarted, showVictory]);

  const handleVictory = async () => {
    setShowVictory(true);
    const totalXP = enemyState.reduce((sum, e) => sum + (e.xp_reward || 25), 0);
    const finalParty = partyState.map(p => ({ ...p, hp: p.current_hp, mp: p.current_mp }));
    const result = await processVictory(totalXP, finalParty, defeatedMonsters);
    setVictoryData({ ...result, totalXP });
  };

  const addDamageNumber = (x, y, value, type = 'damage') => {
    const id = Date.now() + Math.random();
    setDamageNumbers(prev => [...prev, { id, x, y, value, type }]);
    setTimeout(() => setDamageNumbers(prev => prev.filter(d => d.id !== id)), 1000);
  };

  const executeAttack = useCallback((attacker, target, multiplier = 1) => {
    const str = attacker.isEnemy ? attacker.base_strength : attacker.strength;
    const baseDamage = Math.floor(str * (1 + Math.random() * 0.5) * multiplier);
    const isCrit = Math.random() < 0.1;
    return { damage: isCrit ? baseDamage * 2 : baseDamage, isCrit };
  }, []);

  const advanceTurn = useCallback(() => {
    const nextIndex = turnIndex + 1;
    
    // If we're running low on timeline, regenerate
    if (nextIndex >= turnTimeline.length - 2) {
      setTimelineOffset(prev => prev + 100);
      setTurnIndex(0);
    } else {
      setTurnIndex(nextIndex);
    }
    
    setIsProcessing(false);
    setSelectedMenu('main');
    setSelectedAction(null);
  }, [turnIndex, turnTimeline.length]);

  // Handle player action
  const handleAction = async (action, target) => {
    if (isProcessing || !isPlayerTurn) return;
    setIsProcessing(true);

    const actor = currentActor;
    
    if (action === 'attack') {
      const { damage, isCrit } = executeAttack(actor, target);
      const newHp = Math.max(0, target.current_hp - damage);
      
      setEnemyState(prev => prev.map(e => 
        e.encounter_id === target.encounter_id 
          ? { ...e, current_hp: newHp }
          : e
      ));
      
      if (newHp <= 0) {
        setDefeatedMonsters(prev => [...prev, target.id]);
      }
      
      addDamageNumber(450, 200, damage, isCrit ? 'critical' : 'damage');
      setCombatLog(prev => [...prev, `${actor.name} attacks ${target.name} for ${damage}!${isCrit ? ' CRITICAL!' : ''}`]);
      setTimeout(() => advanceTurn(), 600);
    } 
    else if (action === 'capture') {
      setCaptureTarget(target);
      setCaptureName(target.name);
      setShowCapture(true);
      setIsProcessing(false);
      return;
    }
    else if (action.type === 'ability') {
      const ability = action.ability;
      const actorMp = actor.current_mp || 0;
      
      if (actorMp < ability.mp_cost) {
        setCombatLog(prev => [...prev, `Not enough MP!`]);
        setIsProcessing(false);
        return;
      }
      
      setPartyState(prev => prev.map(p => {
        if ((actor.type === 'player' && p.type === 'player') || (actor.id && p.id === actor.id)) {
          return { ...p, current_mp: Math.max(0, p.current_mp - ability.mp_cost) };
        }
        return p;
      }));

      if (ability.ability_type === 'heal' || ability.ability_type === 'heal_all') {
        const healAmount = Math.floor((actor.intelligence || 10) * 2 + 20);
        if (ability.ability_type === 'heal_all') {
          setPartyState(prev => prev.map(p => ({
            ...p, current_hp: Math.min(p.max_hp, p.current_hp + healAmount)
          })));
          addDamageNumber(700, 250, healAmount, 'heal');
          setCombatLog(prev => [...prev, `${actor.name} heals everyone for ${healAmount}!`]);
        } else {
          setPartyState(prev => prev.map(p => 
            (target.type === 'player' ? p.type === 'player' : p.id === target.id)
              ? { ...p, current_hp: Math.min(p.max_hp, p.current_hp + healAmount) }
              : p
          ));
          addDamageNumber(700, 250, healAmount, 'heal');
          setCombatLog(prev => [...prev, `${actor.name} heals ${target.name} for ${healAmount}!`]);
        }
      } else {
        const { damage } = executeAttack(actor, target, ability.damage_multiplier);
        const newHp = Math.max(0, target.current_hp - damage);
        
        setEnemyState(prev => prev.map(e => 
          e.encounter_id === target.encounter_id 
            ? { ...e, current_hp: newHp }
            : e
        ));
        
        if (newHp <= 0) {
          setDefeatedMonsters(prev => [...prev, target.id]);
        }
        
        addDamageNumber(450, 200, damage, 'damage');
        setCombatLog(prev => [...prev, `${actor.name} uses ${ability.name} for ${damage}!`]);
      }
      setTimeout(() => advanceTurn(), 600);
    }
    else if (action === 'flee') {
      setCombatLog(prev => [...prev, `${actor.name} flees!`]);
      setTimeout(() => {
        setGameState('overworld');
        setCombatData(null);
      }, 500);
    }
  };

  // Enemy AI
  useEffect(() => {
    if (!battleStarted || showVictory || !currentActor || !currentActor.isEnemy || isProcessing) return;
    
    const turnKey = `${turnIndex}-${timelineOffset}`;
    if (processedTurnsRef.current.has(turnKey)) return;
    
    processedTurnsRef.current.add(turnKey);
    setIsProcessing(true);
    
    const timer = setTimeout(() => {
      const aliveParty = partyState.filter(p => p.current_hp > 0);
      if (aliveParty.length === 0) {
        setIsProcessing(false);
        return;
      }
      
      const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
      const str = currentActor.base_strength || 10;
      const baseDamage = Math.floor(str * (1 + Math.random() * 0.5));
      const isCrit = Math.random() < 0.1;
      const finalDamage = isCrit ? baseDamage * 2 : baseDamage;
      
      setPartyState(prev => prev.map(p => {
        if ((target.type === 'player' && p.type === 'player') || (target.id && p.id === target.id)) {
          return { ...p, current_hp: Math.max(0, p.current_hp - finalDamage) };
        }
        return p;
      }));
      
      addDamageNumber(700, 250, finalDamage, isCrit ? 'critical' : 'damage');
      setCombatLog(prev => [...prev, `${currentActor.name} attacks ${target.name} for ${finalDamage}!`]);
      
      setTimeout(() => advanceTurn(), 700);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [turnIndex, timelineOffset, currentActor, battleStarted, showVictory, isProcessing, partyState, advanceTurn]);

  const handleCapture = async () => {
    if (!captureTarget || !captureName.trim()) return;
    setIsProcessing(true);
    
    const result = await captureMonster(captureTarget.id, captureName.trim());
    
    if (result.success) {
      setCombatLog(prev => [...prev, `Captured ${captureName}!`]);
      // Remove from enemy list
      setEnemyState(prev => prev.filter(e => e.encounter_id !== captureTarget.encounter_id));
      setDefeatedMonsters(prev => [...prev, captureTarget.id]);
    } else {
      setCombatLog(prev => [...prev, result.message || 'Capture failed!']);
    }
    
    setShowCapture(false);
    setCaptureTarget(null);
    setCaptureName('');
    setTimeout(() => advanceTurn(), 600);
  };

  const handleContinue = () => {
    setGameState('overworld');
    setCombatData(null);
  };

  if (!combatData) return null;

  return (
    <div className="w-full h-screen flex bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950" data-testid="combat-screen">
      {/* Turn Order - Left Panel */}
      <div className="w-20 bg-slate-900/90 border-r-2 border-slate-700 p-1 flex flex-col" data-testid="ctb-timeline">
        <div className="text-amber-400 text-[10px] font-bold mb-1 text-center">TURNS</div>
        <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
          {turnTimeline.slice(turnIndex, turnIndex + 12).map((turn, idx) => (
            <div 
              key={`${turn.turnId}-${idx}`}
              className={`w-full h-12 rounded flex items-center justify-center border transition-all
                ${idx === 0 
                  ? 'border-amber-400 bg-amber-400/20 scale-105' 
                  : turn.isEnemy 
                    ? 'border-red-500/40 bg-red-900/20' 
                    : 'border-cyan-400/40 bg-cyan-900/20'
                }`}
            >
              <div className="w-8 h-8">
                {turn.isEnemy 
                  ? <MonsterSprite type={turn.sprite} size={32} />
                  : <PlayerSprite size={32} />
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Turn Banner */}
        <div className="h-10 flex items-center justify-center bg-slate-900/50">
          {currentActor && (
            <div className={`px-4 py-1 rounded-full text-sm font-bold ${
              isPlayerTurn ? 'bg-cyan-500/80 text-white animate-pulse' : 'bg-red-500/80 text-white'
            }`}>
              {isPlayerTurn ? `${currentActor.name} - Choose Action!` : `${currentActor.name}'s Turn`}
            </div>
          )}
        </div>

        {/* Battle Field */}
        <div className="flex-1 flex items-center justify-around px-6 relative">
          {/* Enemies */}
          <div className="flex flex-col gap-4">
            {enemyState.filter(e => e.current_hp > 0).map((enemy, idx) => (
              <div key={enemy.encounter_id} className="relative" data-testid={`enemy-${idx}`}>
                <div className="w-20 h-20 flex items-center justify-center bg-slate-800/50 rounded-xl border-2 border-slate-600">
                  <MonsterSprite type={enemy.sprite} size={60} />
                </div>
                <div className="text-center mt-1">
                  <div className="text-white font-bold text-xs">{enemy.name}</div>
                  <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${(enemy.current_hp / enemy.base_hp) * 100}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-400">{enemy.current_hp}/{enemy.base_hp}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-3xl font-black text-amber-400/30">VS</div>

          {/* Party */}
          <div className="flex flex-col gap-3">
            {partyState.filter(p => p.current_hp > 0).map((member, idx) => {
              const isActive = currentActor && !currentActor.isEnemy && 
                ((currentActor.type === 'player' && member.type === 'player') || currentActor.id === member.id);
              
              return (
                <div key={member.type === 'player' ? 'player' : member.id} className={`relative ${isActive ? 'scale-110' : ''}`}>
                  {isActive && <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-lg animate-bounce">▶</div>}
                  <div className={`w-16 h-20 flex items-center justify-center bg-slate-800/50 rounded-xl border-2 ${isActive ? 'border-amber-400' : 'border-slate-600'}`}>
                    {member.type === 'player' ? <PlayerSprite size={48} /> : <MonsterSprite type={member.sprite} size={48} />}
                  </div>
                  <div className="text-center mt-0.5">
                    <div className="text-cyan-300 font-bold text-[10px]">{member.name}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Damage Numbers */}
          {damageNumbers.map(d => (
            <div key={d.id} className={`absolute text-xl font-black pointer-events-none animate-bounce
              ${d.type === 'heal' ? 'text-green-400' : d.type === 'critical' ? 'text-amber-400' : 'text-red-400'}`}
              style={{ left: d.x, top: d.y }}>
              {d.type === 'heal' ? '+' : '-'}{d.value}
            </div>
          ))}
        </div>

        {/* Bottom UI */}
        <div className="h-44 flex gap-2 p-2 bg-slate-900/80 border-t-2 border-slate-700">
          {/* Commands */}
          <div className="w-48 bg-slate-800/80 rounded-lg overflow-hidden border border-slate-600">
            <div className="bg-indigo-600 px-2 py-1 text-white text-xs font-bold">
              {isPlayerTurn ? `⚔️ ${currentActor?.name}` : '⏳ Wait...'}
            </div>
            <div className="p-1 max-h-32 overflow-y-auto">
              {isPlayerTurn && selectedMenu === 'main' && (
                <div className="space-y-0.5">
                  <button className="w-full text-left px-2 py-1.5 rounded text-white text-sm hover:bg-white/10" 
                    onClick={() => setSelectedMenu('target-attack')} data-testid="attack-button">⚔️ Attack</button>
                  <button className="w-full text-left px-2 py-1.5 rounded text-white text-sm hover:bg-white/10" 
                    onClick={() => setSelectedMenu('abilities')} data-testid="abilities-button">✨ Abilities</button>
                  <button className="w-full text-left px-2 py-1.5 rounded text-white text-sm hover:bg-white/10" 
                    onClick={() => setSelectedMenu('target-capture')} data-testid="capture-button">🎯 Capture</button>
                  <button className="w-full text-left px-2 py-1.5 rounded text-white text-sm hover:bg-white/10" 
                    onClick={() => handleAction('flee')} data-testid="flee-button">🏃 Flee</button>
                </div>
              )}

              {isPlayerTurn && selectedMenu === 'abilities' && (
                <div className="space-y-0.5">
                  {abilities.unlocked.length === 0 ? (
                    <div className="text-slate-400 text-xs px-2 py-1">No abilities</div>
                  ) : abilities.unlocked.map(ability => (
                    <button key={ability.id}
                      className={`w-full text-left px-2 py-1 rounded text-xs ${(currentActor?.current_mp || 0) >= ability.mp_cost ? 'text-white hover:bg-white/10' : 'text-slate-500'}`}
                      onClick={() => {
                        if ((currentActor?.current_mp || 0) < ability.mp_cost) return;
                        setSelectedAction({ type: 'ability', ability });
                        setSelectedMenu(ability.ability_type === 'heal' ? 'target-ally' : 'target-enemy');
                      }}>
                      ✨ {ability.name} ({ability.mp_cost}MP)
                    </button>
                  ))}
                  <button className="w-full text-left px-2 py-1 rounded text-slate-400 text-xs hover:bg-white/10" onClick={() => setSelectedMenu('main')}>← Back</button>
                </div>
              )}

              {isPlayerTurn && (selectedMenu === 'target-attack' || selectedMenu === 'target-enemy') && (
                <div className="space-y-0.5">
                  <div className="text-red-400 text-[10px] px-2">Target:</div>
                  {enemyState.filter(e => e.current_hp > 0).map((e, i) => (
                    <button key={e.encounter_id} className="w-full text-left px-2 py-1 rounded text-white text-xs hover:bg-red-500/20"
                      onClick={() => handleAction(selectedAction || 'attack', e)} data-testid={`target-enemy-${i}`}>
                      {e.name} ({e.current_hp}HP)
                    </button>
                  ))}
                  <button className="w-full text-left px-2 py-1 rounded text-slate-400 text-xs hover:bg-white/10" 
                    onClick={() => { setSelectedMenu('main'); setSelectedAction(null); }}>← Back</button>
                </div>
              )}

              {isPlayerTurn && selectedMenu === 'target-capture' && (
                <div className="space-y-0.5">
                  <div className="text-green-400 text-[10px] px-2">Capture (HP&lt;50%):</div>
                  {enemyState.filter(e => e.current_hp > 0 && e.current_hp < e.base_hp * 0.5).length === 0 ? (
                    <div className="text-slate-400 text-xs px-2">Weaken enemies!</div>
                  ) : enemyState.filter(e => e.current_hp > 0 && e.current_hp < e.base_hp * 0.5).map(e => (
                    <button key={e.encounter_id} className="w-full text-left px-2 py-1 rounded text-white text-xs hover:bg-green-500/20"
                      onClick={() => handleAction('capture', e)}>
                      {e.name} ({Math.floor(e.capture_rate * 100)}%)
                    </button>
                  ))}
                  <button className="w-full text-left px-2 py-1 rounded text-slate-400 text-xs hover:bg-white/10" onClick={() => setSelectedMenu('main')}>← Back</button>
                </div>
              )}

              {isPlayerTurn && selectedMenu === 'target-ally' && (
                <div className="space-y-0.5">
                  <div className="text-cyan-400 text-[10px] px-2">Heal:</div>
                  {partyState.filter(p => p.current_hp > 0).map((m, i) => (
                    <button key={m.type === 'player' ? 'p' : m.id} className="w-full text-left px-2 py-1 rounded text-white text-xs hover:bg-cyan-500/20"
                      onClick={() => handleAction(selectedAction, m)} data-testid={`target-ally-${i}`}>
                      {m.name} ({m.current_hp}/{m.max_hp})
                    </button>
                  ))}
                  <button className="w-full text-left px-2 py-1 rounded text-slate-400 text-xs hover:bg-white/10" 
                    onClick={() => { setSelectedMenu('main'); setSelectedAction(null); }}>← Back</button>
                </div>
              )}
            </div>
          </div>

          {/* Party Status */}
          <div className="flex-1 bg-slate-800/80 rounded-lg overflow-hidden border border-slate-600">
            <div className="bg-cyan-600 px-2 py-1 text-white text-xs font-bold">🛡️ Party</div>
            <div className="p-2 grid grid-cols-2 gap-2">
              {partyState.map(m => (
                <div key={m.type === 'player' ? 'p' : m.id} className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-6">{m.type === 'player' ? <PlayerSprite size={24} /> : <MonsterSprite type={m.sprite} size={24} />}</div>
                    <span className="text-white font-bold text-xs">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-red-400 text-[10px] w-4">HP</span>
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${(m.current_hp / m.max_hp) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-300 w-12 text-right">{m.current_hp}/{m.max_hp}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-cyan-400 text-[10px] w-4">MP</span>
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{ width: `${(m.current_mp / m.max_mp) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-300 w-12 text-right">{m.current_mp}/{m.max_mp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Log */}
          <div className="w-48 bg-slate-800/80 rounded-lg overflow-hidden border border-slate-600">
            <div className="bg-amber-600 px-2 py-1 text-white text-xs font-bold">📜 Log</div>
            <div className="p-1 h-28 overflow-y-auto">
              {combatLog.slice(-10).map((log, i) => (
                <div key={i} className="text-slate-300 text-[10px] py-0.5 border-b border-slate-700/30">{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Victory */}
      {showVictory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-amber-900 to-amber-950 border-4 border-amber-400 rounded-2xl p-6 max-w-sm">
            <h2 className="text-3xl font-black text-amber-400 text-center mb-4">VICTORY!</h2>
            {victoryData && (
              <div className="space-y-2 text-center mb-4">
                <div className="text-white">XP: <span className="text-amber-400 font-bold">{victoryData.totalXP}</span></div>
                {victoryData.level_ups > 0 && <div className="text-green-400 font-bold animate-pulse">LEVEL UP! Lv{victoryData.new_level}</div>}
              </div>
            )}
            <button className="w-full bg-amber-500 text-white font-bold py-2 rounded-lg hover:bg-amber-400" onClick={handleContinue} data-testid="continue-button">Continue</button>
          </div>
        </div>
      )}

      {/* Capture Modal */}
      {showCapture && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-green-900 to-green-950 border-4 border-green-400 rounded-2xl p-4 max-w-xs">
            <h2 className="text-lg font-bold text-green-400 mb-3">Capture {captureTarget?.name}?</h2>
            <input type="text" value={captureName} onChange={(e) => setCaptureName(e.target.value)}
              className="w-full bg-slate-800 border-2 border-green-400 rounded px-3 py-2 text-white mb-3 text-sm"
              placeholder="Name..." maxLength={20} data-testid="capture-name-input" />
            <div className="flex gap-2">
              <button className="flex-1 bg-green-500 text-white font-bold py-1.5 rounded hover:bg-green-400 text-sm" onClick={handleCapture} data-testid="confirm-capture-button">Capture!</button>
              <button className="flex-1 bg-slate-700 text-white py-1.5 rounded hover:bg-slate-600 text-sm" onClick={() => { setShowCapture(false); setCaptureTarget(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CombatScreen;
