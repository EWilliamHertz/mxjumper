import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';

// Calculate turn order based on agility
const calculateTurnOrder = (party, enemies, turns = 10) => {
  const allCombatants = [
    ...party.map(p => ({ ...p, isEnemy: false })),
    ...enemies.map(e => ({ ...e, isEnemy: true }))
  ].filter(c => c.current_hp > 0);

  // Each combatant gets turns based on their agility
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

// Sprite colors for different entities
const SPRITE_COLORS = {
  player: '#00E5FF',
  slime: '#00FF66',
  goblin: '#FF6633',
  wolf: '#888888',
  bat: '#9933FF',
  skeleton: '#FFFFFF',
  mushroom: '#FF69B4',
  ghost: '#AAAAFF',
  golem: '#8B4513'
};

export const CombatScreen = () => {
  const { combatData, setCombatData, processVictory, captureMonster, setGameState, abilities } = useGame();
  
  const [partyState, setPartyState] = useState([]);
  const [enemyState, setEnemyState] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [turnTimeline, setTurnTimeline] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState('main'); // main, abilities, items, target
  const [selectedAction, setSelectedAction] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const [damageNumbers, setDamageNumbers] = useState([]);
  const [showVictory, setShowVictory] = useState(false);
  const [victoryData, setVictoryData] = useState(null);
  const [showCapture, setShowCapture] = useState(false);
  const [captureTarget, setCaptureTarget] = useState(null);
  const [captureName, setCaptureName] = useState('');
  const [processing, setProcessing] = useState(false);

  // Initialize combat
  useEffect(() => {
    if (combatData) {
      setPartyState(combatData.party);
      setEnemyState(combatData.enemies);
      setCombatLog([`Encountered ${combatData.enemies.map(e => e.name).join(', ')}!`]);
    }
  }, [combatData]);

  // Calculate turn timeline
  useEffect(() => {
    if (partyState.length && enemyState.length) {
      const timeline = calculateTurnOrder(partyState, enemyState);
      setTurnTimeline(timeline);
    }
  }, [partyState, enemyState]);

  // Get current actor
  const currentActor = useMemo(() => {
    return turnTimeline[currentTurn];
  }, [turnTimeline, currentTurn]);

  // Check win/lose conditions
  useEffect(() => {
    const partyAlive = partyState.some(p => p.current_hp > 0);
    const enemiesAlive = enemyState.some(e => e.current_hp > 0);

    if (!partyAlive && partyState.length > 0) {
      // Game over
      setCombatLog(prev => [...prev, 'Party defeated...']);
      setTimeout(() => {
        setGameState('overworld');
        setCombatData(null);
      }, 2000);
    } else if (!enemiesAlive && enemyState.length > 0 && !showVictory) {
      handleVictory();
    }
  }, [partyState, enemyState]);

  // Handle victory
  const handleVictory = async () => {
    setShowVictory(true);
    const totalXP = enemyState.reduce((sum, e) => sum + (e.xp_reward || 25), 0);
    
    // Save party state and get rewards
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

  // Handle player action
  const handleAction = async (action, target) => {
    if (processing) return;
    setProcessing(true);

    const actor = currentActor;
    
    if (action === 'attack') {
      const { damage, isCrit } = executeAttack(actor, target);
      
      setEnemyState(prev => prev.map(e => 
        e.encounter_id === target.encounter_id 
          ? { ...e, current_hp: Math.max(0, e.current_hp - damage) }
          : e
      ));
      
      addDamageNumber(350 + Math.random() * 100, 250 + Math.random() * 50, damage, isCrit ? 'critical' : 'damage');
      setCombatLog(prev => [...prev, `${actor.name} attacks ${target.name} for ${damage} damage!${isCrit ? ' CRITICAL!' : ''}`]);
    } 
    else if (action === 'capture') {
      setCaptureTarget(target);
      setCaptureName(target.name);
      setShowCapture(true);
      setProcessing(false);
      return;
    }
    else if (action.type === 'ability') {
      const ability = action.ability;
      
      // Deduct MP
      if (actor.type === 'player') {
        setPartyState(prev => prev.map(p => 
          p.type === 'player' 
            ? { ...p, current_mp: Math.max(0, p.current_mp - ability.mp_cost) }
            : p
        ));
      } else {
        setPartyState(prev => prev.map(p => 
          p.id === actor.id 
            ? { ...p, current_mp: Math.max(0, p.current_mp - ability.mp_cost) }
            : p
        ));
      }

      if (ability.ability_type === 'heal') {
        const healAmount = Math.floor(actor.intelligence * 2 + 20);
        setPartyState(prev => prev.map(p => 
          (target.type === 'player' ? p.type === 'player' : p.id === target.id)
            ? { ...p, current_hp: Math.min(p.max_hp, p.current_hp + healAmount) }
            : p
        ));
        addDamageNumber(700 + Math.random() * 100, 300, healAmount, 'heal');
        setCombatLog(prev => [...prev, `${actor.name} heals ${target.name} for ${healAmount} HP!`]);
      } else {
        const { damage } = executeAttack(actor, target, ability.damage_multiplier);
        setEnemyState(prev => prev.map(e => 
          e.encounter_id === target.encounter_id 
            ? { ...e, current_hp: Math.max(0, e.current_hp - damage) }
            : e
        ));
        addDamageNumber(350 + Math.random() * 100, 250, damage, 'damage');
        setCombatLog(prev => [...prev, `${actor.name} uses ${ability.name} on ${target.name} for ${damage} damage!`]);
      }
    }
    else if (action === 'flee') {
      // Remove character from party for this battle
      if (actor.type === 'player') {
        setCombatLog(prev => [...prev, `${actor.name} flees from battle!`]);
        setPartyState(prev => prev.filter(p => p.type !== 'player'));
      } else {
        setCombatLog(prev => [...prev, `${actor.name} retreats!`]);
        setPartyState(prev => prev.filter(p => p.id !== actor.id));
      }
    }

    setSelectedMenu('main');
    setSelectedAction(null);
    
    // Next turn
    setTimeout(() => {
      advanceTurn();
      setProcessing(false);
    }, 500);
  };

  // Enemy AI turn
  const executeEnemyTurn = useCallback(() => {
    const enemy = currentActor;
    const aliveParty = partyState.filter(p => p.current_hp > 0);
    
    if (aliveParty.length === 0) return;
    
    const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
    const { damage, isCrit } = executeAttack(enemy, target);
    
    setPartyState(prev => prev.map(p => {
      if (target.type === 'player' && p.type === 'player') {
        return { ...p, current_hp: Math.max(0, p.current_hp - damage) };
      }
      if (target.id && p.id === target.id) {
        return { ...p, current_hp: Math.max(0, p.current_hp - damage) };
      }
      return p;
    }));
    
    addDamageNumber(700 + Math.random() * 100, 300 + Math.random() * 50, damage, isCrit ? 'critical' : 'damage');
    setCombatLog(prev => [...prev, `${enemy.name} attacks ${target.name} for ${damage} damage!`]);
    
    setTimeout(() => advanceTurn(), 800);
  }, [currentActor, partyState, executeAttack]);

  // Advance turn
  const advanceTurn = () => {
    setCurrentTurn(prev => prev + 1);
  };

  // Auto-execute enemy turns
  useEffect(() => {
    if (currentActor?.isEnemy && !showVictory && enemyState.some(e => e.current_hp > 0)) {
      setTimeout(() => executeEnemyTurn(), 500);
    }
  }, [currentActor, showVictory, enemyState, executeEnemyTurn]);

  // Handle capture
  const handleCapture = async () => {
    if (!captureTarget || !captureName.trim()) return;
    
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
    advanceTurn();
  };

  // Continue after victory
  const handleContinue = () => {
    setGameState('overworld');
    setCombatData(null);
  };

  if (!combatData) return null;

  return (
    <div 
      className="w-full h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #0a0a14 0%, #1a1a2e 100%)',
        backgroundImage: `url('https://images.pexels.com/photos/7026427/pexels-photo-7026427.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay'
      }}
      data-testid="combat-screen"
    >
      {/* CTB Timeline - Top Left */}
      <div className="absolute top-4 left-4 game-panel p-2" data-testid="ctb-timeline">
        <div className="font-pixel text-xs mb-2 text-[#FFD700]">TURN ORDER</div>
        <div className="flex flex-col gap-1">
          {turnTimeline.slice(currentTurn, currentTurn + 8).map((turn, idx) => (
            <div 
              key={`${turn.turnId}-${idx}`}
              className={`ctb-turn ${idx === 0 ? 'active' : ''} ${turn.isEnemy ? 'enemy' : 'ally'}`}
              data-testid={`ctb-turn-${idx}`}
            >
              <span className="text-[8px] truncate w-full text-center">
                {turn.name?.slice(0, 4)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Battle Area */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Enemies - Left Side */}
        <div className="absolute left-[15%] top-1/2 -translate-y-1/2 flex flex-col gap-4">
          {enemyState.map((enemy, idx) => (
            <div 
              key={enemy.encounter_id}
              className={`relative transition-all ${enemy.current_hp <= 0 ? 'opacity-30' : ''}`}
              data-testid={`enemy-${idx}`}
            >
              {/* Enemy Sprite */}
              <div 
                className="w-16 h-16 flex items-center justify-center"
                style={{ backgroundColor: SPRITE_COLORS[enemy.sprite] || '#666666' }}
              >
                <span className="font-pixel text-xs text-black">{enemy.name[0]}</span>
              </div>
              {/* Enemy Name & HP */}
              <div className="text-center mt-1">
                <div className="font-pixel text-[10px]">{enemy.name}</div>
                <div className="w-16 h-2 bg-[#1a1a2e] border border-white/30">
                  <div 
                    className="h-full bg-[#FF3366]"
                    style={{ width: `${(enemy.current_hp / enemy.base_hp) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Party - Right Side */}
        <div className="absolute right-[15%] top-1/2 -translate-y-1/2 flex flex-col gap-4">
          {partyState.map((member, idx) => (
            <div 
              key={member.type === 'player' ? 'player' : member.id}
              className={`relative transition-all ${member.current_hp <= 0 ? 'opacity-30' : ''}`}
              data-testid={`party-member-${idx}`}
            >
              {/* Member Sprite */}
              <div 
                className="w-16 h-20 flex items-center justify-center"
                style={{ backgroundColor: member.type === 'player' ? '#00E5FF' : SPRITE_COLORS[member.sprite] || '#00E5FF' }}
              >
                <span className="font-pixel text-xs text-black">{member.name[0]}</span>
              </div>
              {/* Member Name */}
              <div className="text-center mt-1">
                <div className="font-pixel text-[10px] text-[#00E5FF]">{member.name}</div>
              </div>
              {/* Active indicator */}
              {currentActor && !currentActor.isEnemy && 
               ((currentActor.type === 'player' && member.type === 'player') || 
                (currentActor.id === member.id)) && (
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-[#00FF66] animate-pulse">▶</div>
              )}
            </div>
          ))}
        </div>

        {/* Damage Numbers */}
        {damageNumbers.map(d => (
          <div 
            key={d.id}
            className={`damage-text ${d.type}`}
            style={{ left: d.x, top: d.y }}
          >
            {d.type === 'heal' ? '+' : '-'}{d.value}
          </div>
        ))}
      </div>

      {/* Bottom UI */}
      <div className="h-48 flex gap-2 p-4">
        {/* Command Menu */}
        <div className="game-panel w-64" data-testid="command-menu">
          <div className="game-panel-inner">
            <div className="font-pixel text-xs mb-2 text-[#FFD700]">
              {currentActor?.isEnemy ? 'ENEMY TURN' : currentActor?.name || 'COMBAT'}
            </div>
            
            {!currentActor?.isEnemy && selectedMenu === 'main' && (
              <div className="space-y-1">
                <button 
                  className="menu-item w-full text-left font-body"
                  onClick={() => setSelectedMenu('target-attack')}
                  disabled={processing}
                  data-testid="attack-button"
                >
                  Attack
                </button>
                <button 
                  className="menu-item w-full text-left font-body"
                  onClick={() => setSelectedMenu('abilities')}
                  disabled={processing}
                  data-testid="abilities-button"
                >
                  Abilities
                </button>
                <button 
                  className="menu-item w-full text-left font-body"
                  onClick={() => setSelectedMenu('target-capture')}
                  disabled={processing}
                  data-testid="capture-button"
                >
                  Capture
                </button>
                <button 
                  className="menu-item w-full text-left font-body"
                  onClick={() => handleAction('flee')}
                  disabled={processing}
                  data-testid="flee-button"
                >
                  Flee
                </button>
              </div>
            )}

            {selectedMenu === 'abilities' && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {abilities.unlocked.map(ability => (
                  <button 
                    key={ability.id}
                    className="menu-item w-full text-left font-body"
                    onClick={() => {
                      setSelectedAction({ type: 'ability', ability });
                      setSelectedMenu(ability.ability_type === 'heal' ? 'target-ally' : 'target-enemy');
                    }}
                    disabled={processing || (currentActor?.current_mp || 0) < ability.mp_cost}
                    data-testid={`ability-${ability.id}`}
                  >
                    {ability.name} ({ability.mp_cost} MP)
                  </button>
                ))}
                <button 
                  className="menu-item w-full text-left font-body text-[#8b8b99]"
                  onClick={() => setSelectedMenu('main')}
                >
                  Back
                </button>
              </div>
            )}

            {(selectedMenu === 'target-attack' || selectedMenu === 'target-enemy') && (
              <div className="space-y-1">
                <div className="font-pixel text-[10px] text-[#FF3366] mb-2">SELECT TARGET</div>
                {enemyState.filter(e => e.current_hp > 0).map((enemy, idx) => (
                  <button 
                    key={enemy.encounter_id}
                    className="menu-item w-full text-left font-body"
                    onClick={() => handleAction(selectedAction || 'attack', enemy)}
                    disabled={processing}
                    data-testid={`target-enemy-${idx}`}
                  >
                    {enemy.name}
                  </button>
                ))}
                <button 
                  className="menu-item w-full text-left font-body text-[#8b8b99]"
                  onClick={() => { setSelectedMenu('main'); setSelectedAction(null); }}
                >
                  Back
                </button>
              </div>
            )}

            {selectedMenu === 'target-capture' && (
              <div className="space-y-1">
                <div className="font-pixel text-[10px] text-[#00FF66] mb-2">CAPTURE TARGET</div>
                {enemyState.filter(e => e.current_hp > 0 && e.current_hp < e.base_hp * 0.5).map((enemy, idx) => (
                  <button 
                    key={enemy.encounter_id}
                    className="menu-item w-full text-left font-body"
                    onClick={() => handleAction('capture', enemy)}
                    disabled={processing}
                    data-testid={`capture-target-${idx}`}
                  >
                    {enemy.name} ({Math.floor(enemy.capture_rate * 100)}%)
                  </button>
                ))}
                {enemyState.filter(e => e.current_hp >= e.base_hp * 0.5).length > 0 && (
                  <div className="text-[#8b8b99] text-xs px-4">Weaken enemies first!</div>
                )}
                <button 
                  className="menu-item w-full text-left font-body text-[#8b8b99]"
                  onClick={() => setSelectedMenu('main')}
                >
                  Back
                </button>
              </div>
            )}

            {selectedMenu === 'target-ally' && (
              <div className="space-y-1">
                <div className="font-pixel text-[10px] text-[#00E5FF] mb-2">SELECT ALLY</div>
                {partyState.filter(p => p.current_hp > 0).map((member, idx) => (
                  <button 
                    key={member.type === 'player' ? 'player' : member.id}
                    className="menu-item w-full text-left font-body"
                    onClick={() => handleAction(selectedAction, member)}
                    disabled={processing}
                    data-testid={`target-ally-${idx}`}
                  >
                    {member.name} ({member.current_hp}/{member.max_hp})
                  </button>
                ))}
                <button 
                  className="menu-item w-full text-left font-body text-[#8b8b99]"
                  onClick={() => { setSelectedMenu('main'); setSelectedAction(null); }}
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Party Status */}
        <div className="game-panel flex-1" data-testid="party-status">
          <div className="game-panel-inner">
            <div className="font-pixel text-xs mb-2 text-[#00E5FF]">PARTY STATUS</div>
            <div className="grid grid-cols-2 gap-2">
              {partyState.map((member, idx) => (
                <div key={member.type === 'player' ? 'player' : member.id} className="space-y-1">
                  <div className="font-pixel text-[10px] flex justify-between">
                    <span>{member.name}</span>
                    <span>LV{member.level}</span>
                  </div>
                  <div className="bar-container">
                    <div className="hp-bar" style={{ width: `${(member.current_hp / member.max_hp) * 100}%` }} />
                    <span className="bar-label">{member.current_hp}/{member.max_hp}</span>
                  </div>
                  <div className="bar-container">
                    <div className="mp-bar" style={{ width: `${(member.current_mp / member.max_mp) * 100}%` }} />
                    <span className="bar-label">{member.current_mp}/{member.max_mp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Combat Log */}
        <div className="game-panel w-64" data-testid="combat-log">
          <div className="game-panel-inner h-full overflow-y-auto">
            <div className="font-pixel text-xs mb-2 text-[#8b8b99]">BATTLE LOG</div>
            <div className="space-y-1 font-body text-sm">
              {combatLog.slice(-6).map((log, idx) => (
                <div key={idx} className="text-[#8b8b99]">{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Victory Modal */}
      {showVictory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="victory-modal">
          <div className="game-panel w-96">
            <div className="game-panel-inner text-center">
              <h2 className="font-pixel text-xl text-[#FFD700] mb-4">VICTORY!</h2>
              
              {victoryData && (
                <div className="space-y-2 font-body text-lg mb-4">
                  <div>XP Gained: <span className="text-[#FFD700]">{victoryData.totalXP}</span></div>
                  {victoryData.level_ups > 0 && (
                    <div className="text-[#00FF66] font-pixel text-sm animate-pulse">
                      LEVEL UP! Now Level {victoryData.new_level}
                    </div>
                  )}
                  {victoryData.stat_points_gained > 0 && (
                    <div className="text-[#00E5FF]">
                      +{victoryData.stat_points_gained} Stat Points
                    </div>
                  )}
                  {victoryData.ally_level_ups?.map(ally => (
                    <div key={ally.id} className="text-[#00FF66] text-sm">
                      {ally.name} leveled up to {ally.new_level}!
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                className="game-button primary"
                onClick={handleContinue}
                data-testid="continue-button"
              >
                CONTINUE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capture Modal */}
      {showCapture && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="capture-modal">
          <div className="game-panel w-80">
            <div className="game-panel-inner">
              <h2 className="font-pixel text-sm text-[#00FF66] mb-4">CAPTURE {captureTarget?.name}?</h2>
              
              <div className="mb-4">
                <label className="font-pixel text-xs block mb-2">NAME YOUR ALLY</label>
                <input
                  type="text"
                  value={captureName}
                  onChange={(e) => setCaptureName(e.target.value)}
                  className="game-input w-full"
                  maxLength={20}
                  data-testid="capture-name-input"
                />
              </div>
              
              <div className="flex gap-2">
                <button 
                  className="game-button secondary flex-1"
                  onClick={handleCapture}
                  data-testid="confirm-capture-button"
                >
                  CAPTURE
                </button>
                <button 
                  className="game-button flex-1"
                  onClick={() => { setShowCapture(false); setCaptureTarget(null); }}
                  data-testid="cancel-capture-button"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CombatScreen;
