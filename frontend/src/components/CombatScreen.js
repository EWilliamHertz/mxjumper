import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGame } from '../contexts/GameContext';

// Calculate turn order based on agility
const calculateTurnOrder = (party, enemies, turns = 12) => {
  const allCombatants = [
    ...party.map(p => ({ ...p, isEnemy: false })),
    ...enemies.map(e => ({ ...e, isEnemy: true }))
  ].filter(c => c.current_hp > 0);

  const timeline = [];
  const turnCounters = {};
  
  allCombatants.forEach(c => {
    const id = c.isEnemy ? c.encounter_id : (c.type === 'player' ? 'player' : `ally_${c.id}`);
    turnCounters[id] = 0;
  });

  while (timeline.length < turns) {
    let fastest = null;
    let fastestId = null;
    let lowestWait = Infinity;

    allCombatants.forEach(c => {
      if (c.current_hp <= 0) return;
      const id = c.isEnemy ? c.encounter_id : (c.type === 'player' ? 'player' : `ally_${c.id}`);
      const agility = c.isEnemy ? c.base_agility : c.agility;
      const waitTime = turnCounters[id] + (100 / (agility + 1));
      
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

// Sprite SVG components for monsters
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
        <rect x="20" y="50" width="8" height="12" fill="#3d7a37"/>
        <rect x="36" y="50" width="8" height="12" fill="#3d7a37"/>
        <circle cx="32" cy="28" r="16" fill="#7cb342"/>
        <polygon points="16,20 24,32 16,32" fill="#7cb342"/>
        <polygon points="48,20 40,32 48,32" fill="#7cb342"/>
        <ellipse cx="26" cy="26" rx="4" ry="5" fill="#ff0"/>
        <ellipse cx="38" cy="26" rx="4" ry="5" fill="#ff0"/>
        <circle cx="26" cy="27" r="2" fill="#000"/>
        <circle cx="38" cy="27" r="2" fill="#000"/>
        <path d="M26 36 Q32 40 38 36" stroke="#000" strokeWidth="2" fill="none"/>
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
        <circle cx="16" cy="22" r="1.5" fill="#000"/>
        <circle cx="24" cy="22" r="1.5" fill="#000"/>
        <ellipse cx="20" cy="30" rx="4" ry="3" fill="#333"/>
      </svg>
    ),
    bat: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <path d="M4 24 Q16 20 24 32 L32 28 L40 32 Q48 20 60 24 Q56 36 44 40 L32 48 L20 40 Q8 36 4 24" fill="#442266"/>
        <ellipse cx="32" cy="32" rx="10" ry="12" fill="#553388"/>
        <circle cx="28" cy="28" r="3" fill="#ff0"/>
        <circle cx="36" cy="28" r="3" fill="#ff0"/>
        <circle cx="28" cy="28" r="1.5" fill="#f00"/>
        <circle cx="36" cy="28" r="1.5" fill="#f00"/>
        <polygon points="30,36 32,42 34,36" fill="#fff"/>
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
        <rect x="28" y="30" width="2" height="6" fill="#000"/>
        <rect x="34" y="30" width="2" height="6" fill="#000"/>
        <rect x="16" y="38" width="12" height="4" fill="#ddd"/>
        <rect x="36" y="38" width="12" height="4" fill="#ddd"/>
      </svg>
    ),
    mushroom: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <rect x="26" y="40" width="12" height="18" fill="#f5deb3"/>
        <ellipse cx="32" cy="32" rx="22" ry="16" fill="#ff6b6b"/>
        <circle cx="24" cy="28" r="5" fill="#fff"/>
        <circle cx="40" cy="30" r="4" fill="#fff"/>
        <circle cx="32" cy="22" r="3" fill="#fff"/>
        <ellipse cx="26" cy="38" rx="3" ry="4" fill="#000"/>
        <ellipse cx="38" cy="38" rx="3" ry="4" fill="#000"/>
        <ellipse cx="27" cy="37" rx="1" ry="1" fill="#fff"/>
        <ellipse cx="39" cy="37" rx="1" ry="1" fill="#fff"/>
      </svg>
    ),
    ghost: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <path d="M16 32 Q16 12 32 12 Q48 12 48 32 L48 56 L42 50 L36 56 L32 50 L28 56 L22 50 L16 56 Z" fill="rgba(200,200,255,0.8)"/>
        <ellipse cx="26" cy="28" rx="5" ry="6" fill="#000"/>
        <ellipse cx="38" cy="28" rx="5" ry="6" fill="#000"/>
        <ellipse cx="27" cy="27" rx="2" ry="2" fill="#fff"/>
        <ellipse cx="39" cy="27" rx="2" ry="2" fill="#fff"/>
        <ellipse cx="32" cy="40" rx="4" ry="6" fill="#446"/>
      </svg>
    ),
    golem: (
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <rect x="20" y="32" width="24" height="28" fill="#8b7355" rx="4"/>
        <rect x="12" y="36" width="10" height="20" fill="#9b8365" rx="3"/>
        <rect x="42" y="36" width="10" height="20" fill="#9b8365" rx="3"/>
        <rect x="22" y="52" width="8" height="12" fill="#7b6345"/>
        <rect x="34" y="52" width="8" height="12" fill="#7b6345"/>
        <rect x="18" y="12" width="28" height="24" fill="#a89375" rx="4"/>
        <rect x="22" y="18" width="8" height="6" fill="#ff6"/>
        <rect x="34" y="18" width="8" height="6" fill="#ff6"/>
        <rect x="24" cy="32" width="16" height="4" fill="#666"/>
      </svg>
    )
  };
  return sprites[type] || sprites.slime;
};

// Player sprite
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
    <path d="M28 30 Q32 34 36 30" stroke="#c96" strokeWidth="2" fill="none"/>
  </svg>
);

export const CombatScreen = () => {
  const { combatData, setCombatData, processVictory, captureMonster, setGameState, abilities } = useGame();
  
  const [partyState, setPartyState] = useState([]);
  const [enemyState, setEnemyState] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [turnTimeline, setTurnTimeline] = useState([]);
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
  
  const turnProcessedRef = useRef(new Set());

  // Initialize combat
  useEffect(() => {
    if (combatData && !battleStarted) {
      setPartyState(combatData.party);
      setEnemyState(combatData.enemies);
      setCombatLog([`Wild ${combatData.enemies.map(e => e.name).join(', ')} appeared!`]);
      setCurrentTurn(0);
      setBattleStarted(true);
      turnProcessedRef.current = new Set();
      setIsProcessing(false);
    }
  }, [combatData, battleStarted]);

  // Calculate turn timeline
  useEffect(() => {
    if (partyState.length && enemyState.length && battleStarted) {
      const timeline = calculateTurnOrder(partyState, enemyState);
      setTurnTimeline(timeline);
    }
  }, [partyState, enemyState, battleStarted]);

  // Get current actor
  const currentActor = useMemo(() => {
    if (!turnTimeline.length || currentTurn >= turnTimeline.length) return null;
    return turnTimeline[currentTurn];
  }, [turnTimeline, currentTurn]);

  // Check if it's player's turn
  const isPlayerTurn = useMemo(() => {
    return currentActor && !currentActor.isEnemy && !isProcessing;
  }, [currentActor, isProcessing]);

  // Check win/lose
  useEffect(() => {
    if (!battleStarted) return;
    
    const partyAlive = partyState.some(p => p.current_hp > 0);
    const enemiesAlive = enemyState.some(e => e.current_hp > 0);

    if (!partyAlive && partyState.length > 0) {
      setCombatLog(prev => [...prev, 'Party defeated...']);
      setTimeout(() => {
        setGameState('overworld');
        setCombatData(null);
      }, 2000);
    } else if (!enemiesAlive && enemyState.length > 0 && !showVictory) {
      handleVictory();
    }
  }, [partyState, enemyState, battleStarted, showVictory]);

  const handleVictory = async () => {
    setShowVictory(true);
    const totalXP = enemyState.reduce((sum, e) => sum + (e.xp_reward || 25), 0);
    const finalParty = partyState.map(p => ({ ...p, hp: p.current_hp, mp: p.current_mp }));
    const result = await processVictory(totalXP, finalParty);
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
    setCurrentTurn(prev => prev + 1);
    setIsProcessing(false);
    setSelectedMenu('main');
    setSelectedAction(null);
  }, []);

  // Handle player action
  const handleAction = async (action, target) => {
    if (isProcessing || !isPlayerTurn) return;
    setIsProcessing(true);

    const actor = currentActor;
    
    if (action === 'attack') {
      const { damage, isCrit } = executeAttack(actor, target);
      setEnemyState(prev => prev.map(e => 
        e.encounter_id === target.encounter_id 
          ? { ...e, current_hp: Math.max(0, e.current_hp - damage) }
          : e
      ));
      addDamageNumber(500, 200, damage, isCrit ? 'critical' : 'damage');
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
        if (actor.type === 'player' && p.type === 'player') {
          return { ...p, current_mp: Math.max(0, p.current_mp - ability.mp_cost) };
        }
        if (actor.id && p.id === actor.id) {
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
          setCombatLog(prev => [...prev, `${actor.name} heals everyone for ${healAmount} HP!`]);
        } else {
          setPartyState(prev => prev.map(p => 
            (target.type === 'player' ? p.type === 'player' : p.id === target.id)
              ? { ...p, current_hp: Math.min(p.max_hp, p.current_hp + healAmount) }
              : p
          ));
          setCombatLog(prev => [...prev, `${actor.name} heals ${target.name} for ${healAmount} HP!`]);
        }
        addDamageNumber(700, 250, healAmount, 'heal');
      } else {
        const { damage } = executeAttack(actor, target, ability.damage_multiplier);
        setEnemyState(prev => prev.map(e => 
          e.encounter_id === target.encounter_id 
            ? { ...e, current_hp: Math.max(0, e.current_hp - damage) }
            : e
        ));
        addDamageNumber(500, 200, damage, 'damage');
        setCombatLog(prev => [...prev, `${actor.name} uses ${ability.name} for ${damage}!`]);
      }
      setTimeout(() => advanceTurn(), 600);
    }
    else if (action === 'flee') {
      setCombatLog(prev => [...prev, `${actor.name} flees from battle!`]);
      setTimeout(() => {
        setGameState('overworld');
        setCombatData(null);
      }, 500);
    }
  };

  // Enemy AI - fixed to properly execute
  useEffect(() => {
    if (!battleStarted || showVictory || !currentActor || !currentActor.isEnemy) return;
    if (isProcessing) return;
    
    const turnKey = `turn-${currentTurn}`;
    if (turnProcessedRef.current.has(turnKey)) return;
    
    turnProcessedRef.current.add(turnKey);
    setIsProcessing(true);
    
    const executeEnemy = () => {
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
        if (target.type === 'player' && p.type === 'player') {
          return { ...p, current_hp: Math.max(0, p.current_hp - finalDamage) };
        }
        if (target.id && p.id === target.id) {
          return { ...p, current_hp: Math.max(0, p.current_hp - finalDamage) };
        }
        return p;
      }));
      
      addDamageNumber(700, 250, finalDamage, isCrit ? 'critical' : 'damage');
      setCombatLog(prev => [...prev, `${currentActor.name} attacks ${target.name} for ${finalDamage}!`]);
      
      setTimeout(() => advanceTurn(), 800);
    };
    
    setTimeout(executeEnemy, 800);
  }, [currentTurn, currentActor, battleStarted, showVictory, isProcessing, partyState, advanceTurn]);

  const handleCapture = async () => {
    if (!captureTarget || !captureName.trim()) return;
    setIsProcessing(true);
    
    const result = await captureMonster(captureTarget.id, captureName.trim());
    if (result.success) {
      setCombatLog(prev => [...prev, result.message]);
      setEnemyState(prev => prev.filter(e => e.encounter_id !== captureTarget.encounter_id));
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
      {/* Left Panel - Turn Order */}
      <div className="w-24 bg-slate-900/80 border-r-2 border-slate-700 p-2 flex flex-col" data-testid="ctb-timeline">
        <div className="text-amber-400 text-xs font-bold mb-2 text-center">TURNS</div>
        <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
          {turnTimeline.slice(currentTurn, currentTurn + 10).map((turn, idx) => (
            <div 
              key={`${turn.turnId}-${idx}`}
              className={`w-full aspect-square rounded-lg flex items-center justify-center border-2 transition-all
                ${idx === 0 
                  ? 'border-amber-400 bg-amber-400/20 shadow-lg shadow-amber-400/30' 
                  : turn.isEnemy 
                    ? 'border-red-500/50 bg-red-900/30' 
                    : 'border-cyan-400/50 bg-cyan-900/30'
                }`}
              title={turn.name}
            >
              <div className="w-10 h-10">
                {turn.isEnemy 
                  ? <MonsterSprite type={turn.sprite} size={40} />
                  : <PlayerSprite size={40} />
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Battle Area */}
      <div className="flex-1 flex flex-col">
        {/* Turn Indicator */}
        <div className="h-12 flex items-center justify-center bg-slate-900/50">
          {currentActor && (
            <div className={`px-6 py-2 rounded-full text-sm font-bold ${
              isPlayerTurn 
                ? 'bg-cyan-500/80 text-white animate-pulse' 
                : 'bg-red-500/80 text-white'
            }`}>
              {isPlayerTurn ? `${currentActor.name}'s Turn - Choose Action!` : `${currentActor.name}'s Turn`}
            </div>
          )}
        </div>

        {/* Battle Field */}
        <div className="flex-1 flex items-center justify-around px-8 relative">
          {/* Enemies */}
          <div className="flex flex-col gap-6">
            {enemyState.map((enemy, idx) => (
              <div 
                key={enemy.encounter_id}
                className={`relative transition-all duration-300 ${enemy.current_hp <= 0 ? 'opacity-30 scale-90' : ''}`}
                data-testid={`enemy-${idx}`}
              >
                <div className="w-24 h-24 flex items-center justify-center bg-slate-800/50 rounded-xl border-2 border-slate-600">
                  <MonsterSprite type={enemy.sprite} size={72} />
                </div>
                <div className="text-center mt-2">
                  <div className="text-white font-bold text-sm">{enemy.name}</div>
                  <div className="w-24 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all"
                      style={{ width: `${(enemy.current_hp / enemy.base_hp) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400">{enemy.current_hp}/{enemy.base_hp}</div>
                </div>
              </div>
            ))}
          </div>

          {/* VS */}
          <div className="text-4xl font-black text-amber-400/40">VS</div>

          {/* Party */}
          <div className="flex flex-col gap-4">
            {partyState.map((member, idx) => {
              const isActive = currentActor && !currentActor.isEnemy && 
                ((currentActor.type === 'player' && member.type === 'player') || currentActor.id === member.id);
              
              return (
                <div 
                  key={member.type === 'player' ? 'player' : member.id}
                  className={`relative transition-all duration-300 ${member.current_hp <= 0 ? 'opacity-30 scale-90' : ''} ${isActive ? 'scale-110' : ''}`}
                  data-testid={`party-member-${idx}`}
                >
                  {isActive && (
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-xl animate-bounce">▶</div>
                  )}
                  <div 
                    className={`w-20 h-24 flex items-center justify-center bg-slate-800/50 rounded-xl border-2 ${isActive ? 'border-amber-400 shadow-lg shadow-amber-400/30' : 'border-slate-600'}`}
                  >
                    {member.type === 'player' 
                      ? <PlayerSprite size={56} />
                      : <MonsterSprite type={member.sprite} size={56} />
                    }
                  </div>
                  <div className="text-center mt-1">
                    <div className="text-cyan-300 font-bold text-xs">{member.name}</div>
                    <div className="text-slate-500 text-xs">LV{member.level}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Damage Numbers */}
          {damageNumbers.map(d => (
            <div 
              key={d.id}
              className={`absolute text-2xl font-black pointer-events-none animate-bounce
                ${d.type === 'heal' ? 'text-green-400' : d.type === 'critical' ? 'text-amber-400' : 'text-red-400'}`}
              style={{ left: d.x, top: d.y }}
            >
              {d.type === 'heal' ? '+' : '-'}{d.value}
            </div>
          ))}
        </div>

        {/* Bottom UI */}
        <div className="h-48 flex gap-2 p-3 bg-slate-900/80 border-t-2 border-slate-700">
          {/* Command Menu */}
          <div className="w-56 bg-slate-800/80 rounded-xl overflow-hidden border border-slate-600" data-testid="command-menu">
            <div className="bg-indigo-600 px-3 py-2 text-white text-sm font-bold">
              {isPlayerTurn ? `⚔️ ${currentActor?.name}` : '⏳ Waiting...'}
            </div>
            
            <div className="p-2 max-h-36 overflow-y-auto">
              {isPlayerTurn && selectedMenu === 'main' && (
                <div className="space-y-1">
                  {[
                    { id: 'attack', label: '⚔️ Attack', action: () => setSelectedMenu('target-attack') },
                    { id: 'abilities', label: '✨ Abilities', action: () => setSelectedMenu('abilities') },
                    { id: 'capture', label: '🎯 Capture', action: () => setSelectedMenu('target-capture') },
                    { id: 'flee', label: '🏃 Flee', action: () => handleAction('flee') },
                  ].map(cmd => (
                    <button 
                      key={cmd.id}
                      className="w-full text-left px-3 py-2 rounded text-white hover:bg-white/10 transition"
                      onClick={cmd.action}
                      data-testid={`${cmd.id}-button`}
                    >
                      {cmd.label}
                    </button>
                  ))}
                </div>
              )}

              {isPlayerTurn && selectedMenu === 'abilities' && (
                <div className="space-y-1">
                  {abilities.unlocked.length === 0 ? (
                    <div className="text-slate-400 text-sm px-3 py-2">No abilities</div>
                  ) : (
                    abilities.unlocked.map(ability => {
                      const canUse = (currentActor?.current_mp || 0) >= ability.mp_cost;
                      return (
                        <button 
                          key={ability.id}
                          className={`w-full text-left px-3 py-2 rounded transition ${canUse ? 'text-white hover:bg-white/10' : 'text-slate-500'}`}
                          onClick={() => {
                            if (!canUse) return;
                            setSelectedAction({ type: 'ability', ability });
                            setSelectedMenu(ability.ability_type === 'heal' ? 'target-ally' : 'target-enemy');
                          }}
                          disabled={!canUse}
                        >
                          ✨ {ability.name} <span className="text-cyan-400 text-xs">({ability.mp_cost}MP)</span>
                        </button>
                      );
                    })
                  )}
                  <button className="w-full text-left px-3 py-2 rounded text-slate-400 hover:bg-white/10" onClick={() => setSelectedMenu('main')}>
                    ← Back
                  </button>
                </div>
              )}

              {isPlayerTurn && (selectedMenu === 'target-attack' || selectedMenu === 'target-enemy') && (
                <div className="space-y-1">
                  <div className="text-red-400 text-xs px-3 py-1">Select Target:</div>
                  {enemyState.filter(e => e.current_hp > 0).map((enemy, idx) => (
                    <button 
                      key={enemy.encounter_id}
                      className="w-full text-left px-3 py-2 rounded text-white hover:bg-red-500/20"
                      onClick={() => handleAction(selectedAction || 'attack', enemy)}
                      data-testid={`target-enemy-${idx}`}
                    >
                      {enemy.name} ({enemy.current_hp}HP)
                    </button>
                  ))}
                  <button className="w-full text-left px-3 py-2 rounded text-slate-400 hover:bg-white/10" onClick={() => { setSelectedMenu('main'); setSelectedAction(null); }}>
                    ← Back
                  </button>
                </div>
              )}

              {isPlayerTurn && selectedMenu === 'target-capture' && (
                <div className="space-y-1">
                  <div className="text-green-400 text-xs px-3 py-1">Capture (HP &lt;50%):</div>
                  {enemyState.filter(e => e.current_hp > 0 && e.current_hp < e.base_hp * 0.5).length === 0 ? (
                    <div className="text-slate-400 text-sm px-3 py-2">Weaken enemies first!</div>
                  ) : (
                    enemyState.filter(e => e.current_hp > 0 && e.current_hp < e.base_hp * 0.5).map(enemy => (
                      <button 
                        key={enemy.encounter_id}
                        className="w-full text-left px-3 py-2 rounded text-white hover:bg-green-500/20"
                        onClick={() => handleAction('capture', enemy)}
                      >
                        {enemy.name} ({Math.floor(enemy.capture_rate * 100)}%)
                      </button>
                    ))
                  )}
                  <button className="w-full text-left px-3 py-2 rounded text-slate-400 hover:bg-white/10" onClick={() => setSelectedMenu('main')}>
                    ← Back
                  </button>
                </div>
              )}

              {isPlayerTurn && selectedMenu === 'target-ally' && (
                <div className="space-y-1">
                  <div className="text-cyan-400 text-xs px-3 py-1">Select Ally:</div>
                  {partyState.filter(p => p.current_hp > 0).map((member, idx) => (
                    <button 
                      key={member.type === 'player' ? 'player' : member.id}
                      className="w-full text-left px-3 py-2 rounded text-white hover:bg-cyan-500/20"
                      onClick={() => handleAction(selectedAction, member)}
                    >
                      {member.name} ({member.current_hp}/{member.max_hp}HP)
                    </button>
                  ))}
                  <button className="w-full text-left px-3 py-2 rounded text-slate-400 hover:bg-white/10" onClick={() => { setSelectedMenu('main'); setSelectedAction(null); }}>
                    ← Back
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Party Status */}
          <div className="flex-1 bg-slate-800/80 rounded-xl overflow-hidden border border-slate-600" data-testid="party-status">
            <div className="bg-cyan-600 px-3 py-2 text-white text-sm font-bold">🛡️ Party</div>
            <div className="p-3 grid grid-cols-2 gap-3">
              {partyState.map(member => (
                <div key={member.type === 'player' ? 'player' : member.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8">
                      {member.type === 'player' ? <PlayerSprite size={32} /> : <MonsterSprite type={member.sprite} size={32} />}
                    </div>
                    <span className="text-white font-bold text-sm">{member.name}</span>
                    <span className="text-slate-400 text-xs">LV{member.level}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-red-400 text-xs w-6">HP</span>
                    <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 to-pink-500" style={{ width: `${(member.current_hp / member.max_hp) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-300 w-14 text-right">{member.current_hp}/{member.max_hp}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-cyan-400 text-xs w-6">MP</span>
                    <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${(member.current_mp / member.max_mp) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-300 w-14 text-right">{member.current_mp}/{member.max_mp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Combat Log */}
          <div className="w-56 bg-slate-800/80 rounded-xl overflow-hidden border border-slate-600" data-testid="combat-log">
            <div className="bg-amber-600 px-3 py-2 text-white text-sm font-bold">📜 Log</div>
            <div className="p-2 h-32 overflow-y-auto">
              {combatLog.slice(-8).map((log, idx) => (
                <div key={idx} className="text-slate-300 text-xs py-0.5 border-b border-slate-700/50">{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Victory Modal */}
      {showVictory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="victory-modal">
          <div className="bg-gradient-to-b from-amber-900 to-amber-950 border-4 border-amber-400 rounded-2xl p-8 max-w-md">
            <h2 className="text-4xl font-black text-amber-400 text-center mb-4">VICTORY!</h2>
            {victoryData && (
              <div className="space-y-2 text-center mb-6">
                <div className="text-white text-xl">XP: <span className="text-amber-400 font-bold">{victoryData.totalXP}</span></div>
                {victoryData.level_ups > 0 && (
                  <div className="text-green-400 font-bold animate-pulse">LEVEL UP! Now Level {victoryData.new_level}</div>
                )}
              </div>
            )}
            <button 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-amber-400 hover:to-orange-400"
              onClick={handleContinue}
              data-testid="continue-button"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Capture Modal */}
      {showCapture && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="capture-modal">
          <div className="bg-gradient-to-b from-green-900 to-green-950 border-4 border-green-400 rounded-2xl p-6 max-w-sm">
            <h2 className="text-xl font-bold text-green-400 mb-4">Capture {captureTarget?.name}?</h2>
            <input
              type="text"
              value={captureName}
              onChange={(e) => setCaptureName(e.target.value)}
              className="w-full bg-slate-800 border-2 border-green-400 rounded-lg px-4 py-2 text-white mb-4"
              placeholder="Name your ally..."
              maxLength={20}
              data-testid="capture-name-input"
            />
            <div className="flex gap-3">
              <button className="flex-1 bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-400" onClick={handleCapture} data-testid="confirm-capture-button">
                Capture!
              </button>
              <button className="flex-1 bg-slate-700 text-white py-2 rounded-lg hover:bg-slate-600" onClick={() => { setShowCapture(false); setCaptureTarget(null); }} data-testid="cancel-capture-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CombatScreen;
