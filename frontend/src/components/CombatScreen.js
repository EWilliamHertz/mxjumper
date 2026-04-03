import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGame } from '../contexts/GameContext';

// Calculate turn order based on agility
const calculateTurnOrder = (party, enemies, turns = 10) => {
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

// Monster sprite data with emoji representations
const MONSTER_SPRITES = {
  slime: { emoji: '🟢', color: '#44ff88', bgColor: '#225533' },
  goblin: { emoji: '👺', color: '#ff6633', bgColor: '#662211' },
  wolf: { emoji: '🐺', color: '#8899aa', bgColor: '#334455' },
  bat: { emoji: '🦇', color: '#9955ff', bgColor: '#331155' },
  skeleton: { emoji: '💀', color: '#ffffff', bgColor: '#333344' },
  mushroom: { emoji: '🍄', color: '#ff88aa', bgColor: '#552233' },
  ghost: { emoji: '👻', color: '#aabbff', bgColor: '#223355' },
  golem: { emoji: '🗿', color: '#aa7744', bgColor: '#442211' },
  player: { emoji: '⚔️', color: '#00ccff', bgColor: '#003355' }
};

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
  const [waitingForPlayer, setWaitingForPlayer] = useState(false);
  const [battleStarted, setBattleStarted] = useState(false);
  
  const enemyTurnExecutedRef = useRef(new Set());

  // Initialize combat
  useEffect(() => {
    if (combatData && !battleStarted) {
      setPartyState(combatData.party);
      setEnemyState(combatData.enemies);
      setCombatLog([`Wild ${combatData.enemies.map(e => e.name).join(', ')} appeared!`]);
      setCurrentTurn(0);
      setBattleStarted(true);
      enemyTurnExecutedRef.current = new Set();
    }
  }, [combatData, battleStarted]);

  // Calculate turn timeline when party/enemy state changes
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

  // Determine if it's player's turn
  useEffect(() => {
    if (currentActor && !currentActor.isEnemy && !isProcessing) {
      setWaitingForPlayer(true);
    } else {
      setWaitingForPlayer(false);
    }
  }, [currentActor, isProcessing]);

  // Check win/lose conditions
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

  // Handle victory
  const handleVictory = async () => {
    setShowVictory(true);
    const totalXP = enemyState.reduce((sum, e) => sum + (e.xp_reward || 25), 0);
    
    const finalParty = partyState.map(p => ({
      ...p,
      hp: p.current_hp,
      mp: p.current_mp
    }));
    
    const result = await processVictory(totalXP, finalParty);
    setVictoryData({ ...result, totalXP });
  };

  // Add damage number
  const addDamageNumber = (x, y, value, type = 'damage') => {
    const id = Date.now() + Math.random();
    setDamageNumbers(prev => [...prev, { id, x, y, value, type }]);
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== id));
    }, 1000);
  };

  // Execute attack
  const executeAttack = useCallback((attacker, target, multiplier = 1) => {
    const str = attacker.isEnemy ? attacker.base_strength : attacker.strength;
    const baseDamage = Math.floor(str * (1 + Math.random() * 0.5) * multiplier);
    const isCrit = Math.random() < 0.1;
    const finalDamage = isCrit ? baseDamage * 2 : baseDamage;
    return { damage: finalDamage, isCrit };
  }, []);

  // Advance to next turn
  const advanceTurn = useCallback(() => {
    setCurrentTurn(prev => prev + 1);
    setIsProcessing(false);
    setSelectedMenu('main');
    setSelectedAction(null);
  }, []);

  // Handle player action
  const handleAction = async (action, target) => {
    if (isProcessing || !waitingForPlayer) return;
    setIsProcessing(true);
    setWaitingForPlayer(false);

    const actor = currentActor;
    
    if (action === 'attack') {
      const { damage, isCrit } = executeAttack(actor, target);
      
      setEnemyState(prev => prev.map(e => 
        e.encounter_id === target.encounter_id 
          ? { ...e, current_hp: Math.max(0, e.current_hp - damage) }
          : e
      ));
      
      addDamageNumber(250, 200, damage, isCrit ? 'critical' : 'damage');
      setCombatLog(prev => [...prev, `${actor.name} attacks ${target.name} for ${damage}!${isCrit ? ' CRITICAL!' : ''}`]);
      
      setTimeout(() => advanceTurn(), 600);
    } 
    else if (action === 'capture') {
      setCaptureTarget(target);
      setCaptureName(target.name);
      setShowCapture(true);
      setIsProcessing(false);
      setWaitingForPlayer(true);
      return;
    }
    else if (action.type === 'ability') {
      const ability = action.ability;
      
      // Check MP
      const actorMp = actor.type === 'player' ? actor.current_mp : actor.current_mp;
      if (actorMp < ability.mp_cost) {
        setCombatLog(prev => [...prev, `Not enough MP!`]);
        setIsProcessing(false);
        setWaitingForPlayer(true);
        return;
      }
      
      // Deduct MP
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
            ...p,
            current_hp: Math.min(p.max_hp, p.current_hp + healAmount)
          })));
          addDamageNumber(650, 250, healAmount, 'heal');
          setCombatLog(prev => [...prev, `${actor.name} heals everyone for ${healAmount} HP!`]);
        } else {
          setPartyState(prev => prev.map(p => 
            (target.type === 'player' ? p.type === 'player' : p.id === target.id)
              ? { ...p, current_hp: Math.min(p.max_hp, p.current_hp + healAmount) }
              : p
          ));
          addDamageNumber(650, 250, healAmount, 'heal');
          setCombatLog(prev => [...prev, `${actor.name} heals ${target.name} for ${healAmount} HP!`]);
        }
      } else if (ability.ability_type === 'buff') {
        setCombatLog(prev => [...prev, `${actor.name} uses ${ability.name}!`]);
      } else {
        // Damage ability
        const { damage } = executeAttack(actor, target, ability.damage_multiplier);
        setEnemyState(prev => prev.map(e => 
          e.encounter_id === target.encounter_id 
            ? { ...e, current_hp: Math.max(0, e.current_hp - damage) }
            : e
        ));
        addDamageNumber(250, 200, damage, 'damage');
        setCombatLog(prev => [...prev, `${actor.name} uses ${ability.name} for ${damage}!`]);
      }
      
      setTimeout(() => advanceTurn(), 600);
    }
    else if (action === 'flee') {
      if (actor.type === 'player') {
        setCombatLog(prev => [...prev, `${actor.name} flees from battle!`]);
        setTimeout(() => {
          setGameState('overworld');
          setCombatData(null);
        }, 500);
      } else {
        setCombatLog(prev => [...prev, `${actor.name} retreats!`]);
        setPartyState(prev => prev.filter(p => p.id !== actor.id));
        setTimeout(() => advanceTurn(), 600);
      }
    }
  };

  // Enemy AI turn - with proper gating
  useEffect(() => {
    if (!currentActor || !battleStarted || showVictory || isProcessing) return;
    if (!currentActor.isEnemy) return;
    
    // Create unique key for this turn
    const turnKey = `${currentTurn}-${currentActor.turnId}`;
    if (enemyTurnExecutedRef.current.has(turnKey)) return;
    
    // Mark this turn as executing
    enemyTurnExecutedRef.current.add(turnKey);
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
        if (target.type === 'player' && p.type === 'player') {
          return { ...p, current_hp: Math.max(0, p.current_hp - finalDamage) };
        }
        if (target.id && p.id === target.id) {
          return { ...p, current_hp: Math.max(0, p.current_hp - finalDamage) };
        }
        return p;
      }));
      
      addDamageNumber(650, 250, finalDamage, isCrit ? 'critical' : 'damage');
      setCombatLog(prev => [...prev, `${currentActor.name} attacks ${target.name} for ${finalDamage}!`]);
      
      setTimeout(() => advanceTurn(), 800);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [currentTurn, currentActor, battleStarted, showVictory, isProcessing, partyState, advanceTurn]);

  // Handle capture
  const handleCapture = async () => {
    if (!captureTarget || !captureName.trim()) return;
    setIsProcessing(true);
    setWaitingForPlayer(false);
    
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

  const getSprite = (sprite) => MONSTER_SPRITES[sprite] || MONSTER_SPRITES.slime;

  return (
    <div className="w-full h-screen flex flex-col bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900" data-testid="combat-screen">
      {/* Battle Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-green-900/50 to-transparent" />
        <div className="absolute top-10 left-20 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-20 right-32 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
      </div>

      {/* CTB Timeline - Top Left */}
      <div className="absolute top-4 left-4 z-20" data-testid="ctb-timeline">
        <div className="bg-slate-900/90 border-2 border-amber-400 rounded-lg p-3 shadow-lg shadow-amber-400/20">
          <div className="text-amber-400 text-xs font-bold mb-2 tracking-wider">⚔️ TURN ORDER</div>
          <div className="flex gap-1">
            {turnTimeline.slice(currentTurn, currentTurn + 8).map((turn, idx) => (
              <div 
                key={`${turn.turnId}-${idx}`}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border-2 transition-all
                  ${idx === 0 
                    ? 'border-amber-400 bg-amber-400/20 scale-110 shadow-lg shadow-amber-400/30' 
                    : turn.isEnemy 
                      ? 'border-red-500/50 bg-red-900/30' 
                      : 'border-cyan-400/50 bg-cyan-900/30'
                  }`}
                title={turn.name}
              >
                {turn.isEnemy 
                  ? getSprite(turn.sprite).emoji 
                  : turn.type === 'player' ? '🦸' : getSprite(turn.sprite).emoji
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Turn Indicator */}
      {currentActor && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className={`px-6 py-2 rounded-full text-sm font-bold shadow-lg ${
            currentActor.isEnemy 
              ? 'bg-red-500/80 text-white' 
              : 'bg-cyan-500/80 text-white animate-pulse'
          }`}>
            {waitingForPlayer ? `${currentActor.name}'s Turn - Choose Action!` : `${currentActor.name}'s Turn`}
          </div>
        </div>
      )}

      {/* Battle Area */}
      <div className="flex-1 flex items-center justify-between px-8 relative z-10">
        {/* Enemies - Left Side */}
        <div className="flex flex-col gap-6">
          {enemyState.map((enemy, idx) => {
            const sprite = getSprite(enemy.sprite);
            return (
              <div 
                key={enemy.encounter_id}
                className={`relative transition-all duration-300 ${enemy.current_hp <= 0 ? 'opacity-30 scale-90' : 'hover:scale-105'}`}
                data-testid={`enemy-${idx}`}
              >
                <div 
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl border-3 shadow-xl"
                  style={{ 
                    backgroundColor: sprite.bgColor,
                    borderColor: sprite.color,
                    boxShadow: `0 0 20px ${sprite.color}40`
                  }}
                >
                  {sprite.emoji}
                </div>
                <div className="text-center mt-2">
                  <div className="text-white font-bold text-sm">{enemy.name}</div>
                  <div className="w-24 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-300"
                      style={{ width: `${(enemy.current_hp / enemy.base_hp) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400">{enemy.current_hp}/{enemy.base_hp}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* VS Indicator */}
        <div className="text-6xl font-black text-amber-400/30">VS</div>

        {/* Party - Right Side */}
        <div className="flex flex-col gap-4">
          {partyState.map((member, idx) => {
            const sprite = member.type === 'player' ? MONSTER_SPRITES.player : getSprite(member.sprite);
            const isCurrentTurn = currentActor && !currentActor.isEnemy && 
              ((currentActor.type === 'player' && member.type === 'player') || currentActor.id === member.id);
            
            return (
              <div 
                key={member.type === 'player' ? 'player' : member.id}
                className={`relative transition-all duration-300 ${member.current_hp <= 0 ? 'opacity-30 scale-90' : ''} ${isCurrentTurn ? 'scale-110' : ''}`}
                data-testid={`party-member-${idx}`}
              >
                {isCurrentTurn && (
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-2xl animate-bounce">👉</div>
                )}
                <div 
                  className="w-20 h-28 rounded-2xl flex items-center justify-center text-4xl border-3 shadow-xl"
                  style={{ 
                    backgroundColor: sprite.bgColor,
                    borderColor: isCurrentTurn ? '#fbbf24' : sprite.color,
                    boxShadow: isCurrentTurn ? '0 0 30px #fbbf2480' : `0 0 15px ${sprite.color}40`
                  }}
                >
                  {member.type === 'player' ? '🦸' : sprite.emoji}
                </div>
                <div className="text-center mt-2">
                  <div className="text-cyan-300 font-bold text-sm">{member.name}</div>
                  <div className="text-xs text-slate-500">LV{member.level}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Damage Numbers */}
      {damageNumbers.map(d => (
        <div 
          key={d.id}
          className={`absolute text-3xl font-black pointer-events-none z-30 animate-bounce
            ${d.type === 'heal' ? 'text-green-400' : d.type === 'critical' ? 'text-amber-400' : 'text-red-400'}`}
          style={{ left: d.x, top: d.y }}
        >
          {d.type === 'heal' ? '+' : '-'}{d.value}
        </div>
      ))}

      {/* Bottom UI */}
      <div className="h-52 flex gap-3 p-4 relative z-20">
        {/* Command Menu */}
        <div className="w-64 bg-slate-900/95 border-2 border-slate-600 rounded-xl overflow-hidden shadow-2xl" data-testid="command-menu">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2">
            <div className="text-white text-sm font-bold">
              {!waitingForPlayer ? '⏳ Waiting...' : `⚔️ ${currentActor?.name || 'Command'}`}
            </div>
          </div>
          
          <div className="p-2">
            {waitingForPlayer && selectedMenu === 'main' && (
              <div className="space-y-1">
                {[
                  { id: 'attack', label: '⚔️ Attack', action: () => setSelectedMenu('target-attack') },
                  { id: 'abilities', label: '✨ Abilities', action: () => setSelectedMenu('abilities') },
                  { id: 'capture', label: '🎯 Capture', action: () => setSelectedMenu('target-capture') },
                  { id: 'flee', label: '🏃 Flee', action: () => handleAction('flee') },
                ].map(cmd => (
                  <button 
                    key={cmd.id}
                    className="w-full text-left px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                    onClick={cmd.action}
                    data-testid={`${cmd.id}-button`}
                  >
                    {cmd.label}
                  </button>
                ))}
              </div>
            )}

            {waitingForPlayer && selectedMenu === 'abilities' && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {abilities.unlocked.length === 0 ? (
                  <div className="text-slate-400 text-sm px-4 py-2">No abilities unlocked</div>
                ) : (
                  abilities.unlocked.map(ability => {
                    const canUse = (currentActor?.current_mp || 0) >= ability.mp_cost;
                    return (
                      <button 
                        key={ability.id}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                          canUse ? 'text-white hover:bg-white/10' : 'text-slate-500 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (!canUse) return;
                          setSelectedAction({ type: 'ability', ability });
                          setSelectedMenu(ability.ability_type === 'heal' || ability.ability_type === 'heal_all' ? 'target-ally' : 'target-enemy');
                        }}
                        disabled={!canUse}
                        data-testid={`ability-${ability.id}`}
                      >
                        ✨ {ability.name} <span className="text-cyan-400">({ability.mp_cost} MP)</span>
                      </button>
                    );
                  })
                )}
                <button 
                  className="w-full text-left px-4 py-2 rounded-lg text-slate-400 hover:bg-white/10"
                  onClick={() => setSelectedMenu('main')}
                >
                  ← Back
                </button>
              </div>
            )}

            {waitingForPlayer && (selectedMenu === 'target-attack' || selectedMenu === 'target-enemy') && (
              <div className="space-y-1">
                <div className="text-red-400 text-xs px-4 py-1 font-bold">Select Target:</div>
                {enemyState.filter(e => e.current_hp > 0).map((enemy, idx) => (
                  <button 
                    key={enemy.encounter_id}
                    className="w-full text-left px-4 py-2 rounded-lg text-white hover:bg-red-500/20 transition-colors"
                    onClick={() => handleAction(selectedAction || 'attack', enemy)}
                    data-testid={`target-enemy-${idx}`}
                  >
                    {getSprite(enemy.sprite).emoji} {enemy.name} ({enemy.current_hp} HP)
                  </button>
                ))}
                <button 
                  className="w-full text-left px-4 py-2 rounded-lg text-slate-400 hover:bg-white/10"
                  onClick={() => { setSelectedMenu('main'); setSelectedAction(null); }}
                >
                  ← Back
                </button>
              </div>
            )}

            {waitingForPlayer && selectedMenu === 'target-capture' && (
              <div className="space-y-1">
                <div className="text-green-400 text-xs px-4 py-1 font-bold">Capture (HP &lt; 50%):</div>
                {enemyState.filter(e => e.current_hp > 0 && e.current_hp < e.base_hp * 0.5).length === 0 ? (
                  <div className="text-slate-400 text-sm px-4 py-2">Weaken enemies first!</div>
                ) : (
                  enemyState.filter(e => e.current_hp > 0 && e.current_hp < e.base_hp * 0.5).map((enemy, idx) => (
                    <button 
                      key={enemy.encounter_id}
                      className="w-full text-left px-4 py-2 rounded-lg text-white hover:bg-green-500/20 transition-colors"
                      onClick={() => handleAction('capture', enemy)}
                      data-testid={`capture-target-${idx}`}
                    >
                      🎯 {enemy.name} ({Math.floor(enemy.capture_rate * 100)}% chance)
                    </button>
                  ))
                )}
                <button 
                  className="w-full text-left px-4 py-2 rounded-lg text-slate-400 hover:bg-white/10"
                  onClick={() => setSelectedMenu('main')}
                >
                  ← Back
                </button>
              </div>
            )}

            {waitingForPlayer && selectedMenu === 'target-ally' && (
              <div className="space-y-1">
                <div className="text-cyan-400 text-xs px-4 py-1 font-bold">Select Ally:</div>
                {partyState.filter(p => p.current_hp > 0).map((member, idx) => (
                  <button 
                    key={member.type === 'player' ? 'player' : member.id}
                    className="w-full text-left px-4 py-2 rounded-lg text-white hover:bg-cyan-500/20 transition-colors"
                    onClick={() => handleAction(selectedAction, member)}
                    data-testid={`target-ally-${idx}`}
                  >
                    💚 {member.name} ({member.current_hp}/{member.max_hp} HP)
                  </button>
                ))}
                <button 
                  className="w-full text-left px-4 py-2 rounded-lg text-slate-400 hover:bg-white/10"
                  onClick={() => { setSelectedMenu('main'); setSelectedAction(null); }}
                >
                  ← Back
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Party Status */}
        <div className="flex-1 bg-slate-900/95 border-2 border-slate-600 rounded-xl overflow-hidden shadow-2xl" data-testid="party-status">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2">
            <div className="text-white text-sm font-bold">🛡️ Party Status</div>
          </div>
          <div className="p-3 grid grid-cols-2 gap-3">
            {partyState.map((member, idx) => (
              <div key={member.type === 'player' ? 'player' : member.id} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-sm">{member.type === 'player' ? '🦸' : getSprite(member.sprite).emoji} {member.name}</span>
                  <span className="text-slate-400 text-xs">LV{member.level}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 text-xs w-6">HP</span>
                    <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all" style={{ width: `${(member.current_hp / member.max_hp) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-300 w-16 text-right">{member.current_hp}/{member.max_hp}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 text-xs w-6">MP</span>
                    <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${(member.current_mp / member.max_mp) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-300 w-16 text-right">{member.current_mp}/{member.max_mp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Combat Log */}
        <div className="w-64 bg-slate-900/95 border-2 border-slate-600 rounded-xl overflow-hidden shadow-2xl" data-testid="combat-log">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2">
            <div className="text-white text-sm font-bold">📜 Battle Log</div>
          </div>
          <div className="p-3 h-36 overflow-y-auto">
            {combatLog.slice(-8).map((log, idx) => (
              <div key={idx} className="text-slate-300 text-sm py-0.5 border-b border-slate-700/50">{log}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Victory Modal */}
      {showVictory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="victory-modal">
          <div className="bg-gradient-to-b from-amber-900 to-amber-950 border-4 border-amber-400 rounded-2xl p-8 max-w-md shadow-2xl shadow-amber-400/30">
            <h2 className="text-4xl font-black text-amber-400 text-center mb-4">🏆 VICTORY!</h2>
            
            {victoryData && (
              <div className="space-y-3 text-center mb-6">
                <div className="text-white text-xl">XP Gained: <span className="text-amber-400 font-bold">{victoryData.totalXP}</span></div>
                {victoryData.level_ups > 0 && (
                  <div className="text-green-400 text-lg font-bold animate-pulse">
                    🎉 LEVEL UP! Now Level {victoryData.new_level}
                  </div>
                )}
                {victoryData.stat_points_gained > 0 && (
                  <div className="text-cyan-400">+{victoryData.stat_points_gained} Stat Points</div>
                )}
              </div>
            )}
            
            <button 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all"
              onClick={handleContinue}
              data-testid="continue-button"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Capture Modal */}
      {showCapture && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="capture-modal">
          <div className="bg-gradient-to-b from-green-900 to-green-950 border-4 border-green-400 rounded-2xl p-6 max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold text-green-400 mb-4">🎯 Capture {captureTarget?.name}?</h2>
            
            <div className="mb-4">
              <label className="text-slate-300 text-sm block mb-2">Name your new ally:</label>
              <input
                type="text"
                value={captureName}
                onChange={(e) => setCaptureName(e.target.value)}
                className="w-full bg-slate-800 border-2 border-green-400 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-300"
                maxLength={20}
                data-testid="capture-name-input"
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-2 rounded-lg hover:from-green-400 hover:to-emerald-400"
                onClick={handleCapture}
                data-testid="confirm-capture-button"
              >
                Capture!
              </button>
              <button 
                className="flex-1 bg-slate-700 text-white font-bold py-2 rounded-lg hover:bg-slate-600"
                onClick={() => { setShowCapture(false); setCaptureTarget(null); }}
                data-testid="cancel-capture-button"
              >
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
