import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
 
// ─── Turn Order ────────────────────────────────────────────────────────────────
const buildTimeline = (party, enemies, count = 20) => {
  const alive = [
    ...party.filter(p => p.current_hp > 0).map((p, idx) => ({ ...p, isEnemy: false, unique_id: p.type === 'player' ? 'hero' : `ally_${p.id}_${idx}` })),
    ...enemies.filter(e => e.current_hp > 0).map((e, idx) => ({ ...e, isEnemy: true, unique_id: e.encounter_id || `enemy_${idx}` })),
  ];
  if (!alive.length) return [];
 
  const waiters = {};
  alive.forEach(c => {
    let agi = c.isEnemy ? (c.base_agility || 8) : (c.agility || 10);
    // Haste/Slow status effects modify turn speed
    if (c.effects) {
      if (c.effects.find(e => e.type === 'haste')) agi = Math.floor(agi * 1.5);
      if (c.effects.find(e => e.type === 'slow')) agi = Math.floor(agi * 0.6);
    }
    waiters[c.unique_id] = { c, wait: 100 / Math.max(1, agi) };
  });
 
  const result = [];
  while (result.length < count) {
    let pick = null;
    Object.values(waiters).forEach(w => {
      if (!pick || w.wait < pick.wait) pick = w;
    });
    if (!pick) break;
    result.push({ ...pick.c, turnId: pick.c.unique_id });
    const agi = pick.c.isEnemy ? (pick.c.base_agility || 8) : (pick.c.agility || 10);
    pick.wait += 100 / Math.max(1, agi);
  }
  return result;
}; 

// ─── Status Effect Config ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  poison:   { label: 'PSN', color: 'bg-purple-500', text: 'text-purple-400', tickDmg: true },
  burn:     { label: 'BRN', color: 'bg-orange-500', text: 'text-orange-400', tickDmg: true },
  stun:     { label: 'STN', color: 'bg-yellow-500', text: 'text-yellow-400' },
  slow:     { label: 'SLW', color: 'bg-blue-400',   text: 'text-blue-300' },
  protect:  { label: 'DEF', color: 'bg-cyan-500',   text: 'text-cyan-400' },
  power_up: { label: 'ATK', color: 'bg-red-500',    text: 'text-red-400' },
  haste:    { label: 'SPD', color: 'bg-green-500',   text: 'text-green-400' },
};

// ─── Sprites ───────────────────────────────────────────────────────────────────
const SPRITES = {
  slime:    <><ellipse cx="32" cy="48" rx="24" ry="12" fill="#1a5a1a"/><ellipse cx="32" cy="38" rx="22" ry="22" fill="#44dd44"/><ellipse cx="32" cy="35" rx="18" ry="18" fill="#66ff66"/><ellipse cx="26" cy="32" rx="4" ry="5" fill="#000"/><ellipse cx="38" cy="32" rx="4" ry="5" fill="#000"/><ellipse cx="27" cy="31" rx="2" ry="2" fill="#fff"/><ellipse cx="39" cy="31" rx="2" ry="2" fill="#fff"/></>,
  goblin:   <><rect x="24" y="40" width="16" height="20" fill="#2d5a27"/><circle cx="32" cy="28" r="16" fill="#7cb342"/><polygon points="16,20 24,32 16,32" fill="#7cb342"/><polygon points="48,20 40,32 48,32" fill="#7cb342"/><ellipse cx="26" cy="26" rx="4" ry="5" fill="#ff0"/><ellipse cx="38" cy="26" rx="4" ry="5" fill="#ff0"/><circle cx="26" cy="27" r="2" fill="#000"/><circle cx="38" cy="27" r="2" fill="#000"/></>,
  wolf:     <><ellipse cx="32" cy="50" rx="20" ry="10" fill="#555"/><rect x="14" y="44" width="8" height="16" fill="#666"/><rect x="42" y="44" width="8" height="16" fill="#666"/><ellipse cx="32" cy="38" rx="18" ry="14" fill="#777"/><ellipse cx="20" cy="24" rx="10" ry="14" fill="#888"/><polygon points="12,10 16,24 22,20" fill="#888"/><polygon points="28,10 24,24 18,20" fill="#888"/><circle cx="16" cy="22" r="3" fill="#ff0"/><circle cx="24" cy="22" r="3" fill="#ff0"/><ellipse cx="20" cy="30" rx="4" ry="3" fill="#333"/></>,
  bat:      <><path d="M4 24 Q16 20 24 32 L32 28 L40 32 Q48 20 60 24 Q56 36 44 40 L32 48 L20 40 Q8 36 4 24" fill="#442266"/><ellipse cx="32" cy="32" rx="10" ry="12" fill="#553388"/><circle cx="28" cy="28" r="3" fill="#ff0"/><circle cx="36" cy="28" r="3" fill="#ff0"/></>,
  skeleton: <><rect x="28" y="36" width="8" height="20" fill="#ddd"/><rect x="20" y="48" width="8" height="14" fill="#ccc"/><rect x="36" y="48" width="8" height="14" fill="#ccc"/><circle cx="32" cy="24" r="14" fill="#eee"/><ellipse cx="26" cy="22" rx="4" ry="5" fill="#000"/><ellipse cx="38" cy="22" rx="4" ry="5" fill="#000"/><rect x="26" y="32" width="12" height="2" fill="#000"/></>,
  mushroom: <><rect x="26" y="40" width="12" height="18" fill="#f5deb3"/><ellipse cx="32" cy="32" rx="22" ry="16" fill="#ff6b6b"/><circle cx="24" cy="28" r="5" fill="#fff"/><circle cx="40" cy="30" r="4" fill="#fff"/><ellipse cx="26" cy="38" rx="3" ry="4" fill="#000"/><ellipse cx="38" cy="38" rx="3" ry="4" fill="#000"/></>,
  ghost:    <><path d="M16 32 Q16 12 32 12 Q48 12 48 32 L48 56 L42 50 L36 56 L32 50 L28 56 L22 50 L16 56 Z" fill="rgba(200,200,255,0.8)"/><ellipse cx="26" cy="28" rx="5" ry="6" fill="#000"/><ellipse cx="38" cy="28" rx="5" ry="6" fill="#000"/></>,
  golem:    <><rect x="20" y="32" width="24" height="28" fill="#8b7355" rx="4"/><rect x="12" y="36" width="10" height="20" fill="#9b8365" rx="3"/><rect x="42" y="36" width="10" height="20" fill="#9b8365" rx="3"/><rect x="18" y="12" width="28" height="24" fill="#a89375" rx="4"/><rect x="22" y="18" width="8" height="6" fill="#ff6"/><rect x="34" y="18" width="8" height="6" fill="#ff6"/></>,
  spider:   <><ellipse cx="32" cy="40" rx="16" ry="12" fill="#333"/><ellipse cx="32" cy="28" rx="10" ry="10" fill="#444"/><circle cx="28" cy="26" r="3" fill="#f00"/><circle cx="36" cy="26" r="3" fill="#f00"/><line x1="16" y1="36" x2="4" y2="28" stroke="#333" strokeWidth="3"/><line x1="48" y1="36" x2="60" y2="28" stroke="#333" strokeWidth="3"/><line x1="18" y1="44" x2="6" y2="52" stroke="#333" strokeWidth="3"/><line x1="46" y1="44" x2="58" y2="52" stroke="#333" strokeWidth="3"/></>,
  harpy:    <><path d="M8 30 Q20 20 28 35 L32 32 L36 35 Q44 20 56 30 Q50 42 40 44 L32 50 L24 44 Q14 42 8 30" fill="#9966cc"/><circle cx="32" cy="24" r="10" fill="#ffd9b3"/><circle cx="29" cy="22" r="2" fill="#000"/><circle cx="35" cy="22" r="2" fill="#000"/></>,
  dragon:   <><ellipse cx="32" cy="48" rx="20" ry="12" fill="#8b0000"/><ellipse cx="32" cy="36" rx="18" ry="16" fill="#b22222"/><circle cx="26" cy="20" r="12" fill="#cd5c5c"/><polygon points="20,8 26,20 14,16" fill="#cd5c5c"/><polygon points="32,8 26,20 38,16" fill="#cd5c5c"/><circle cx="22" cy="18" r="3" fill="#ff0"/><circle cx="30" cy="18" r="3" fill="#ff0"/></>,
  phoenix:  <><path d="M10 35 Q25 15 32 30 Q39 15 54 35 Q45 45 32 40 Q19 45 10 35" fill="#ff6600"/><ellipse cx="32" cy="42" rx="12" ry="14" fill="#ff8c00"/><circle cx="32" cy="28" r="8" fill="#ffd700"/><circle cx="29" cy="26" r="2" fill="#000"/><circle cx="35" cy="26" r="2" fill="#000"/></>,
  // New zone sprites
  frost_wolf:     <><ellipse cx="32" cy="50" rx="20" ry="10" fill="#8ac"/><rect x="14" y="44" width="8" height="16" fill="#9bd"/><rect x="42" y="44" width="8" height="16" fill="#9bd"/><ellipse cx="32" cy="38" rx="18" ry="14" fill="#adf"/><ellipse cx="20" cy="24" rx="10" ry="14" fill="#bef"/><circle cx="16" cy="22" r="3" fill="#0ff"/><circle cx="24" cy="22" r="3" fill="#0ff"/><ellipse cx="20" cy="30" rx="4" ry="3" fill="#68a"/></>,
  ice_elemental:  <><polygon points="32,8 48,48 16,48" fill="#6cf"/><polygon points="32,14 44,44 20,44" fill="#9df"/><circle cx="28" cy="30" r="3" fill="#fff"/><circle cx="36" cy="30" r="3" fill="#fff"/><circle cx="28" cy="30" r="1.5" fill="#06f"/><circle cx="36" cy="30" r="1.5" fill="#06f"/></>,
  yeti:           <><ellipse cx="32" cy="50" rx="22" ry="12" fill="#ccc"/><rect x="14" y="40" width="10" height="20" fill="#ddd"/><rect x="40" y="40" width="10" height="20" fill="#ddd"/><ellipse cx="32" cy="30" rx="18" ry="20" fill="#eee"/><circle cx="26" cy="26" r="4" fill="#333"/><circle cx="38" cy="26" r="4" fill="#333"/><rect x="22" y="38" width="20" height="4" fill="#000" rx="2"/></>,
  shadow_wraith:  <><path d="M16 32 Q16 12 32 12 Q48 12 48 32 L48 56 L42 50 L36 56 L32 50 L28 56 L22 50 L16 56 Z" fill="rgba(40,10,60,0.9)"/><ellipse cx="26" cy="28" rx="5" ry="6" fill="#a0f"/><ellipse cx="38" cy="28" rx="5" ry="6" fill="#a0f"/></>,
  abyssal_leech:  <><ellipse cx="32" cy="40" rx="20" ry="16" fill="#2a0030"/><ellipse cx="32" cy="38" rx="16" ry="12" fill="#3a0050"/><circle cx="26" cy="34" r="4" fill="#f0f"/><circle cx="38" cy="34" r="4" fill="#f0f"/><ellipse cx="32" cy="48" rx="12" ry="4" fill="#1a0020"/></>,
  void_lord:      <><rect x="16" y="20" width="32" height="36" fill="#100020" rx="4"/><rect x="8" y="24" width="12" height="24" fill="#180030" rx="3"/><rect x="44" y="24" width="12" height="24" fill="#180030" rx="3"/><ellipse cx="26" cy="32" rx="5" ry="6" fill="#f0f"/><ellipse cx="38" cy="32" rx="5" ry="6" fill="#f0f"/><polygon points="24,14 28,22 20,22" fill="#a0f"/><polygon points="40,14 44,22 36,22" fill="#a0f"/></>,
  stone_guardian: <><rect x="18" y="24" width="28" height="32" fill="#998877" rx="4"/><rect x="10" y="28" width="10" height="24" fill="#887766" rx="3"/><rect x="44" y="28" width="10" height="24" fill="#887766" rx="3"/><rect x="18" y="10" width="28" height="18" fill="#aa9988" rx="4"/><rect x="24" y="16" width="6" height="4" fill="#ff6"/><rect x="34" y="16" width="6" height="4" fill="#ff6"/></>,
  cursed_mage:    <><rect x="26" y="36" width="12" height="22" fill="#224"/><circle cx="32" cy="24" r="12" fill="#446"/><polygon points="22,12 32,2 42,12 38,14 32,6 26,14" fill="#448"/><circle cx="28" cy="22" r="3" fill="#f0f"/><circle cx="36" cy="22" r="3" fill="#f0f"/></>,
  ancient_sentinel:<><rect x="16" y="20" width="32" height="36" fill="#b8a070" rx="4"/><rect x="8" y="24" width="10" height="24" fill="#c0a878" rx="3"/><rect x="46" y="24" width="10" height="24" fill="#c0a878" rx="3"/><circle cx="32" cy="16" r="14" fill="#d0b888"/><rect x="24" y="10" width="4" height="8" fill="#ff6"/><rect x="36" y="10" width="4" height="8" fill="#ff6"/><circle cx="32" cy="20" r="6" fill="#ff6" opacity="0.6"/></>,
  magma_slug:     <><ellipse cx="32" cy="48" rx="24" ry="10" fill="#800"/><ellipse cx="32" cy="40" rx="20" ry="16" fill="#c40"/><ellipse cx="32" cy="38" rx="16" ry="12" fill="#f60"/><circle cx="26" cy="34" r="3" fill="#ff0"/><circle cx="38" cy="34" r="3" fill="#ff0"/></>,
  fire_imp:       <><ellipse cx="32" cy="50" rx="12" ry="8" fill="#a00"/><rect x="24" y="32" width="16" height="20" fill="#d22"/><circle cx="32" cy="24" r="10" fill="#f44"/><polygon points="24,14 28,24 20,20" fill="#f80"/><polygon points="40,14 36,24 44,20" fill="#f80"/><circle cx="28" cy="22" r="2.5" fill="#ff0"/><circle cx="36" cy="22" r="2.5" fill="#ff0"/></>,
  inferno_titan:  <><rect x="14" y="20" width="36" height="38" fill="#8b0000" rx="4"/><rect x="6" y="24" width="12" height="28" fill="#a00" rx="3"/><rect x="46" y="24" width="12" height="28" fill="#a00" rx="3"/><rect x="16" y="8" width="32" height="18" fill="#c00" rx="4"/><circle cx="26" cy="14" r="4" fill="#ff0"/><circle cx="38" cy="14" r="4" fill="#ff0"/><path d="M20 4 Q26 -2 32 6 Q38 -2 44 4" stroke="#f80" strokeWidth="3" fill="none"/></>,
};
const MonsterSprite = ({ type, size = 64 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    {SPRITES[(type||'slime').toLowerCase()] || SPRITES.slime}
  </svg>
);
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

// ─── Status Effect Badges ──────────────────────────────────────────────────────
const StatusBadges = ({ effects }) => {
  if (!effects?.length) return null;
  return (
    <div className="flex gap-0.5 justify-center mt-0.5">
      {effects.map((e, i) => {
        const cfg = STATUS_CONFIG[e.type] || { label: '?', color: 'bg-slate-500' };
        return (
          <span key={`${e.type}-${i}`} className={`${cfg.color} text-[7px] text-white font-bold px-1 rounded-sm`}>
            {cfg.label}{e.turns}
          </span>
        );
      })}
    </div>
  );
};
 
// ─── Component ─────────────────────────────────────────────────────────────────
export const CombatScreen = () => {
  const { combatData, setCombatData, processVictory, captureMonster, setGameState, abilities, fetchAbilities, fetchQuests, fetchPlayer } = useGame();
 
  const [party,    setParty]    = useState([]);
  const [enemies,  setEnemies]  = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [phase,    setPhase]    = useState('idle');
  const [menu,     setMenu]     = useState('main');
  const [queued,   setQueued]   = useState(null);
  const [log,      setLog]      = useState([]);
  const [floats,   setFloats]   = useState([]);
  const [victory,  setVictory]  = useState(null);
  const [capture,  setCapture]  = useState(null);
  const [defeated, setDefeated] = useState([]);
  const [hasBoss,  setHasBoss]  = useState(false);
 
  const partyRef    = useRef([]);
  const enemiesRef  = useRef([]);
  const defeatedRef = useRef([]);
  const timerRef    = useRef(null);
  const initDone    = useRef(false);
  const victoryFired = useRef(false);
 
  useEffect(() => { partyRef.current   = party;    }, [party]);
  useEffect(() => { enemiesRef.current = enemies;  }, [enemies]);
  useEffect(() => { defeatedRef.current = defeated; }, [defeated]);
 
  // ── helpers ──
  const addLog = msg => setLog(p => [...p.slice(-40), msg]);
 
  const addFloat = (val, type, x, y) => {
    const id = Date.now() + Math.random();
    const fx = x || (type === 'heal' ? 680 : 430);
    const fy = y || (180 + Math.random() * 100);
    setFloats(p => [...p, { id, x: fx, y: fy, val, type }]);
    setTimeout(() => setFloats(p => p.filter(f => f.id !== id)), 900);
  };
 
  const calcDmg = (attacker, target, mult = 1) => {
    let str = attacker.isEnemy ? (attacker.base_strength || 10) : (attacker.strength || 10);
    let def = target.isEnemy   ? (target.base_vitality  ||  5) : (target.vitality  ||  5);
    
    // Power Up buff doubles STR
    if (attacker.effects?.find(e => e.type === 'power_up')) str = Math.floor(str * 1.8);
    // Protect buff doubles DEF
    if (target.effects?.find(e => e.type === 'protect')) def = Math.floor(def * 2.5);
    
    const raw = Math.max(1, Math.floor(str * (0.9 + Math.random() * 0.4) * mult - def * 0.5));
    const crit = Math.random() < 0.1;
    return { dmg: crit ? raw * 2 : raw, crit };
  };

  // ── Process status effects at start of turn ──
  const processStatusEffects = (actor, currentParty, currentEnemies) => {
    let newParty = [...currentParty];
    let newEnemies = [...currentEnemies];
    
    const effects = actor.effects || [];
    if (!effects.length) return { newParty, newEnemies, stunned: false };
    
    let stunned = false;
    
    for (const effect of effects) {
      if (effect.type === 'stun') {
        stunned = true;
        addLog(`${actor.name} is stunned!`);
        addFloat('STUN', 'status');
      }
      if (effect.type === 'poison' || effect.type === 'burn') {
        const tickDmg = Math.max(1, Math.floor((actor.isEnemy ? actor.base_hp : actor.max_hp) * 0.08));
        const label = effect.type === 'poison' ? 'poison' : 'burn';
        addLog(`${actor.name} takes ${tickDmg} ${label} damage!`);
        addFloat(tickDmg, 'damage');
        
        if (actor.isEnemy) {
          newEnemies = newEnemies.map(e => 
            e.encounter_id === actor.encounter_id 
              ? { ...e, current_hp: Math.max(0, e.current_hp - tickDmg) } 
              : e
          );
        } else {
          newParty = newParty.map(p => {
            const isThis = actor.type === 'player' ? p.type === 'player' : p.id === actor.id;
            return isThis ? { ...p, current_hp: Math.max(0, p.current_hp - tickDmg) } : p;
          });
        }
      }
    }
    
    // Decrement effect durations
    const tickEffects = entity => ({
      ...entity,
      effects: (entity.effects || [])
        .map(e => ({ ...e, turns: e.turns - 1 }))
        .filter(e => e.turns > 0)
    });
    
    if (actor.isEnemy) {
      newEnemies = newEnemies.map(e => 
        e.encounter_id === actor.encounter_id ? tickEffects(e) : e
      );
    } else {
      newParty = newParty.map(p => {
        const isThis = actor.type === 'player' ? p.type === 'player' : p.id === actor.id;
        return isThis ? tickEffects(p) : p;
      });
    }
    
    return { newParty, newEnemies, stunned };
  };

  // ── Apply status effect to target ──
  const applyEffect = (targets, effectType, duration, isTargetEnemy) => {
    if (!effectType || !duration) return targets;
    return targets.map(t => {
      const isMatch = isTargetEnemy 
        ? targets.includes(t) 
        : true;
      if (!isMatch) return t;
      const existing = (t.effects || []).filter(e => e.type !== effectType);
      return { ...t, effects: [...existing, { type: effectType, turns: duration }] };
    });
  };
 
  // ── advance: the single place that moves to the next turn ──
  const advance = useCallback((newParty, newEnemies, newDefeated, forceRecalculate = false) => {
    if (victoryFired.current) return;
 
    const aliveP = newParty.filter(m => m.current_hp > 0);
    const aliveE = newEnemies.filter(m => m.current_hp > 0);
 
    if (aliveP.length === 0) {
      addLog('Party was defeated...');
      setPhase('done');
      setTimeout(() => { 
        if (fetchQuests) fetchQuests();
        if (fetchPlayer) fetchPlayer();
        setGameState('overworld'); 
        setCombatData(null); 
      }, 2000);
      return;
    }
    if (aliveE.length === 0) {
      victoryFired.current = true;
      setPhase('done');
      return;
    }
 
    setTimeline(prevTimeline => {
      let nextTimeline = forceRecalculate ? [] : [...prevTimeline].slice(1);
      
      nextTimeline = nextTimeline.filter(t => {
        if (t.isEnemy) return aliveE.some(e => e.encounter_id === t.encounter_id);
        if (t.type === 'player') return aliveP.some(p => p.type === 'player');
        return aliveP.some(p => p.id === t.id);
      });
 
      if (nextTimeline.length < 5) {
        nextTimeline = buildTimeline(aliveP, aliveE, 20);
      }
      
      const nextActor = nextTimeline[0];
      if (nextActor) {
        setPhase(nextActor.isEnemy ? 'enemy' : 'player');
        if (!nextActor.isEnemy) { setMenu('main'); setQueued(null); }
      }
      
      return nextTimeline;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setGameState, setCombatData]);
 
  // ── init ──
  useEffect(() => {
    if (!combatData || initDone.current) return;
    initDone.current = true;
    victoryFired.current = false;
    fetchAbilities();
    const p = combatData.party.map(m => ({ ...m, current_hp: m.hp, current_mp: m.mp, effects: [] }));
    const e = combatData.enemies.map(m => ({ ...m, current_hp: m.base_hp, effects: [] }));
    setParty(p);
    setEnemies(e);
    setDefeated([]);
    setHasBoss(e.some(m => m.is_boss));
    const bossNames = e.filter(m => m.is_boss).map(m => m.name);
    const encounterMsg = bossNames.length > 0 
      ? `BOSS ENCOUNTER: ${bossNames.join(', ')}!`
      : `Encountered ${e.map(x => x.name).join(', ')}!`;
    setLog([encounterMsg]);
    const tl = buildTimeline(p, e);
    setTimeline(tl);
    const first = tl[0];
    setPhase(first?.isEnemy ? 'enemy' : 'player');
    if (first && !first.isEnemy) { setMenu('main'); setQueued(null); }
  }, [combatData]);
 
  // ── victory fire ──
  useEffect(() => {
    if (phase !== 'done' || !victoryFired.current || victory) return;
    const p = partyRef.current;
    const e = enemiesRef.current;
    const d = defeatedRef.current;
    const totalXP = e.reduce((s, x) => s + (x.xp_reward || 25), 0);
    const save    = p.map(m => ({ ...m, hp: m.current_hp, mp: m.current_mp }));
    processVictory(totalXP, save, d).then(res => setVictory({ ...res, totalXP }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
 
  // ── enemy AI ──
  useEffect(() => {
    if (phase !== 'enemy') return;
    const tl = timeline;
    if (!tl.length) return;
    const actor = tl[0];
    if (!actor?.isEnemy) return;
 
    timerRef.current = setTimeout(() => {
      const liveParty = partyRef.current;
      const liveEnemies = enemiesRef.current;
      const liveDefeated = defeatedRef.current;
 
      // Process status effects first
      const { newParty: postEffectParty, newEnemies: postEffectEnemies, stunned } = 
        processStatusEffects(actor, liveParty, liveEnemies);
      
      if (stunned) {
        setParty(postEffectParty);
        setEnemies(postEffectEnemies);
        setTimeout(() => advance(postEffectParty, postEffectEnemies, liveDefeated), 600);
        return;
      }

      const aliveParty = postEffectParty.filter(p => p.current_hp > 0);
      if (!aliveParty.length) { 
        setParty(postEffectParty);
        setEnemies(postEffectEnemies);
        advance(postEffectParty, postEffectEnemies, liveDefeated); 
        return; 
      }
 
      const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
      const { dmg, crit } = calcDmg({ ...actor, isEnemy: true, effects: actor.effects }, target);
 
      addLog(`${actor.name} attacks ${target.name} for ${dmg}!${crit ? ' CRITICAL!' : ''}`);
      addFloat(dmg, crit ? 'critical' : 'damage');
 
      const updatedParty = postEffectParty.map(p => {
        const hit = target.type === 'player' ? p.type === 'player' : p.id === target.id;
        return hit ? { ...p, current_hp: Math.max(0, p.current_hp - dmg) } : p;
      });
 
      setParty(updatedParty);
      setEnemies(postEffectEnemies);
      setTimeout(() => advance(updatedParty, postEffectEnemies, liveDefeated), 500);
    }, 850);
 
    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeline]);
 
  // ── player actions ──
  const doAttack = (target) => {
    if (phase !== 'player') return;
    setPhase('animating');
    const actor = timeline[0];
    
    // Process status effects on player turn
    const { newParty: postP, newEnemies: postE, stunned } = processStatusEffects(actor, party, enemies);
    if (stunned) {
      setParty(postP); setEnemies(postE);
      setTimeout(() => advance(postP, postE, defeated), 600);
      return;
    }

    const { dmg, crit } = calcDmg(actor, target);
    const newHp = Math.max(0, target.current_hp - dmg);
    addLog(`${actor.name} attacks ${target.name} for ${dmg}!${crit ? ' CRITICAL!' : ''}`);
    addFloat(dmg, crit ? 'critical' : 'damage');
    const newDefeated = newHp <= 0 ? [...defeated, target.id] : defeated;
    if (newHp <= 0) { setDefeated(newDefeated); addLog(`${target.name} defeated!`); }
    const newEnemies = postE.map(e => e.encounter_id === target.encounter_id ? { ...e, current_hp: newHp } : e);
    setEnemies(newEnemies);
    setParty(postP);
    setTimeout(() => advance(postP, newEnemies, newDefeated, newHp <= 0), 500);
  };
 
  const doAbility = (ability, target) => {
    if (phase !== 'player') return;
    setPhase('animating');
    const actor = timeline[0];
    if ((actor.current_mp || 0) < ability.mp_cost) {
      addLog('Not enough MP!'); setPhase('player'); return;
    }
    
    // Process status effects
    const { newParty: postP, newEnemies: postE, stunned } = processStatusEffects(actor, party, enemies);
    if (stunned) {
      setParty(postP); setEnemies(postE);
      setTimeout(() => advance(postP, postE, defeated), 600);
      return;
    }

    let newParty = postP.map(p => {
      const isActor = actor.type === 'player' ? p.type === 'player' : p.id === actor.id;
      return isActor ? { ...p, current_mp: Math.max(0, p.current_mp - ability.mp_cost) } : p;
    });
 
    // HEAL abilities
    if (ability.ability_type === 'heal' || ability.ability_type === 'heal_all') {
      const amt = Math.floor((actor.intelligence || 10) * 2 + 20);
      let healed;
      if (ability.ability_type === 'heal_all' || ability.target_type === 'all_ally') {
        healed = newParty.map(p => p.current_hp > 0 ? { ...p, current_hp: Math.min(p.max_hp, p.current_hp + amt) } : p);
        addLog(`${actor.name} heals everyone for ${amt}!`);
      } else {
        healed = newParty.map(p => {
          const hit = target.type === 'player' ? p.type === 'player' : p.id === target.id;
          return hit ? { ...p, current_hp: Math.min(p.max_hp, p.current_hp + amt) } : p;
        });
        addLog(`${actor.name} heals ${target.name} for ${amt}!`);
      }
      addFloat(amt, 'heal');
      setParty(healed);
      setTimeout(() => advance(healed, postE, defeated), 500);
      return;
    }
    
    // BUFF abilities (self-target)
    if (ability.ability_type === 'buff') {
      if (ability.status_effect) {
        newParty = newParty.map(p => {
          const isActor = actor.type === 'player' ? p.type === 'player' : p.id === actor.id;
          if (!isActor) return p;
          const existing = (p.effects || []).filter(e => e.type !== ability.status_effect);
          return { ...p, effects: [...existing, { type: ability.status_effect, turns: ability.effect_duration || 3 }] };
        });
        const cfg = STATUS_CONFIG[ability.status_effect] || {};
        addLog(`${actor.name} uses ${ability.name}! (${cfg.label || ability.status_effect} for ${ability.effect_duration} turns)`);
        addFloat(cfg.label || 'BUFF', 'heal');
      }
      setParty(newParty);
      setTimeout(() => advance(newParty, postE, defeated), 500);
      return;
    }
    
    // DRAIN abilities
    if (ability.ability_type === 'drain') {
      const { dmg, crit } = calcDmg(actor, target, ability.damage_multiplier);
      const newHp = Math.max(0, target.current_hp - dmg);
      const healAmt = Math.floor(dmg * 0.5);
      addLog(`${actor.name} drains ${target.name} for ${dmg}! Heals ${healAmt}!`);
      addFloat(dmg, crit ? 'critical' : 'damage');
      const newDefeated = newHp <= 0 ? [...defeated, target.id] : defeated;
      if (newHp <= 0) { setDefeated(newDefeated); addLog(`${target.name} defeated!`); }
      let updatedEnemies = postE.map(e => e.encounter_id === target.encounter_id ? { ...e, current_hp: newHp } : e);
      newParty = newParty.map(p => {
        const isActor = actor.type === 'player' ? p.type === 'player' : p.id === actor.id;
        return isActor ? { ...p, current_hp: Math.min(p.max_hp, p.current_hp + healAmt) } : p;
      });
      setParty(newParty); setEnemies(updatedEnemies);
      setTimeout(() => advance(newParty, updatedEnemies, newDefeated, newHp <= 0), 500);
      return;
    }

    // DAMAGE abilities (single or AoE)
    const isAoE = ability.target_type === 'all';
    const targets = isAoE ? enemies.filter(e => e.current_hp > 0) : [target];
    
    let newEnemies = [...postE];
    let newDefeated = [...defeated];
    let totalDmg = 0;
    
    for (const t of targets) {
      const { dmg, crit } = calcDmg(actor, t, ability.damage_multiplier * (isAoE ? 0.8 : 1));
      const newHp = Math.max(0, t.current_hp - dmg);
      totalDmg += dmg;
      
      if (newHp <= 0 && !newDefeated.includes(t.id)) {
        newDefeated.push(t.id);
        addLog(`${t.name} defeated!`);
      }
      
      newEnemies = newEnemies.map(e => e.encounter_id === t.encounter_id ? { ...e, current_hp: newHp } : e);
      
      // Apply status effect
      if (ability.status_effect && ability.effect_duration && newHp > 0) {
        newEnemies = newEnemies.map(e => {
          if (e.encounter_id !== t.encounter_id) return e;
          const existing = (e.effects || []).filter(ef => ef.type !== ability.status_effect);
          return { ...e, effects: [...existing, { type: ability.status_effect, turns: ability.effect_duration }] };
        });
      }
    }
    
    const aoeSuffix = isAoE ? ` (hits ${targets.length} enemies)` : '';
    addLog(`${actor.name} uses ${ability.name} for ${totalDmg}!${aoeSuffix}`);
    addFloat(totalDmg, 'damage');
    
    setDefeated(newDefeated);
    setEnemies(newEnemies);
    setParty(newParty);
    const anyKilled = targets.some(t => {
      const e = newEnemies.find(en => en.encounter_id === t.encounter_id);
      return e && e.current_hp <= 0;
    });
    setTimeout(() => advance(newParty, newEnemies, newDefeated, anyKilled), 500);
  };
 
  const doCapture = async () => {
    if (!capture) return;
    setPhase('animating');
    const result = await captureMonster(capture.target.id, capture.name.trim());
    if (result.success) {
      addLog(`Captured ${capture.name}!`);
      const newDefeated = [...defeated, capture.target.id];
      setDefeated(newDefeated);
      const newEnemies = enemies.filter(e => e.encounter_id !== capture.target.encounter_id);
      setEnemies(newEnemies);
      setCapture(null);
      setTimeout(() => advance(party, newEnemies, newDefeated), 400);
    } else {
      addLog(result.message || 'Capture failed!');
      setCapture(null);
      setTimeout(() => advance(party, enemies, defeated), 400);
    }
  };
 
  const doFlee = async () => {
    if (hasBoss) {
      addLog('Cannot flee from a Boss!');
      return;
    }
    setPhase('animating');
    const maxEnemyAgi = Math.max(...enemies.map(e => e.base_agility || 8));
    try {
      const API = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/combat/flee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ enemy_agility: maxEnemyAgi, has_boss: hasBoss })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Escaped! (${data.flee_chance}% chance)`);
        setTimeout(() => { 
          if (fetchQuests) fetchQuests();
          if (fetchPlayer) fetchPlayer();
          setGameState('overworld'); 
          setCombatData(null); 
        }, 500);
      } else {
        addLog(`Failed to flee! (${data.flee_chance}% chance) Lost your turn!`);
        setTimeout(() => advance(party, enemies, defeated), 500);
      }
    } catch {
      addLog('Fled from battle!');
      setTimeout(() => { setGameState('overworld'); setCombatData(null); }, 500);
    }
  };
 
  if (!combatData) return null;
 
  const actor      = timeline[0] || null;
  const isMyTurn   = phase === 'player';
  const liveEnemies = enemies.filter(e => e.current_hp > 0);
 
  const visibleTL = timeline.slice(0, 12).filter(t => {
    if (t.isEnemy) return enemies.find(e => e.encounter_id === t.encounter_id)?.current_hp > 0;
    if (t.type === 'player') return party.find(p => p.type === 'player')?.current_hp > 0;
    return party.find(p => p.id === t.id)?.current_hp > 0;
  });
 
  return (
    <div className="w-full h-full flex bg-slate-800 relative overflow-hidden" data-testid="combat-screen">
 
      {/* Turn order sidebar */}
      <div className="w-20 bg-slate-900/90 border-r-2 border-slate-700 p-1 flex flex-col" data-testid="ctb-timeline">
        <div className="text-amber-400 text-[10px] font-bold mb-1 text-center">TURNS</div>
        <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
          {visibleTL.map((t, i) => {
            const key = t.unique_id || t.encounter_id;
            return (
              <div key={`${key}-${i}`}
                className={`w-full h-12 rounded flex items-center justify-center border transition-all
                  ${i === 0 ? 'border-amber-400 bg-amber-400/20 scale-105'
                    : t.isEnemy ? 'border-red-500/40 bg-red-900/20'
                    : 'border-cyan-400/40 bg-cyan-900/20'}`}>
                <div className="w-8 h-8">
                  {t.isEnemy ? <MonsterSprite type={t.sprite} size={32}/> : (t.type === 'player' ? <PlayerSprite size={32}/> : <MonsterSprite type={t.sprite} size={32}/>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
 
      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Banner */}
        <div className="h-10 flex items-center justify-center bg-slate-900/50">
          {hasBoss && <span className="absolute left-24 text-red-500 text-xs font-bold animate-pulse">BOSS</span>}
          {actor && (
            <div className={`px-4 py-1 rounded-full text-sm font-bold
              ${isMyTurn ? 'bg-cyan-500/80 text-white animate-pulse' : 'bg-red-500/80 text-white'}`}>
              {isMyTurn ? `${actor.name} — Choose Action!` : `${actor.name}'s Turn`}
            </div>
          )}
        </div>
 
        {/* Battlefield */}
        <div className="flex-1 flex items-center justify-around px-6 relative">
          {/* Enemies */}
          <div className="flex flex-col gap-4">
            {liveEnemies.map((e, i) => (
              <div key={e.encounter_id} className="relative" data-testid={`enemy-${i}`}>
                {e.is_boss && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-bold px-2 rounded-full">BOSS</div>}
                <div className={`w-20 h-20 flex items-center justify-center bg-slate-800/50 rounded-xl border-2 ${e.is_boss ? 'border-red-500 shadow-lg shadow-red-500/30' : 'border-slate-600'}`}>
                  <MonsterSprite type={e.sprite} size={60}/>
                </div>
                <div className="text-center mt-1">
                  <div className="text-white font-bold text-xs">{e.name}</div>
                  <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 transition-all" style={{width:`${(e.current_hp/e.base_hp)*100}%`}}/>
                  </div>
                  <div className="text-[10px] text-slate-400">{e.current_hp}/{e.base_hp}</div>
                  <StatusBadges effects={e.effects} />
                </div>
              </div>
            ))}
          </div>
 
          <div className="text-3xl font-black text-amber-400/30">VS</div>
 
          {/* Party */}
          <div className="flex flex-col gap-3">
            {party.filter(p => p.current_hp > 0).map(m => {
              const active = actor && !actor.isEnemy &&
                (actor.type === 'player' ? m.type === 'player' : actor.id === m.id);
              return (
                <div key={m.type === 'player' ? 'hero' : m.id}
                  className={`relative transition-all duration-300 ${active ? 'scale-110' : ''}`}>
                  {active && <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-lg animate-bounce">▶</div>}
                  <div className={`w-20 h-20 flex items-center justify-center bg-slate-800/50 rounded-xl border-2
                    ${active ? 'border-amber-400 shadow-lg shadow-amber-400/30' : 'border-cyan-500/40'}`}>
                    {m.type === 'player' ? <PlayerSprite size={48}/> : <MonsterSprite type={m.sprite} size={48}/>}
                  </div>
                  <div className="text-center mt-1">
                    <div className="text-cyan-300 font-bold text-[10px]">{m.name}</div>
                    <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300
                        ${(m.current_hp/m.max_hp)>.5?'bg-green-500':(m.current_hp/m.max_hp)>.25?'bg-yellow-500':'bg-red-500'}`}
                        style={{width:`${(m.current_hp/m.max_hp)*100}%`}}/>
                    </div>
                    <div className="text-[9px] text-slate-400">{m.current_hp}/{m.max_hp}</div>
                    <StatusBadges effects={m.effects} />
                  </div>
                </div>
              );
            })}
          </div>
 
          {/* Floats */}
          {floats.map(f => (
            <div key={f.id}
              className={`absolute text-xl font-black pointer-events-none animate-bounce
                ${f.type==='heal'?'text-green-400':f.type==='critical'?'text-amber-400':f.type==='status'?'text-yellow-400':'text-red-400'}`}
              style={{left:f.x, top:f.y}}>
              {f.type==='heal'?'+':f.type==='status'?'':'-'}{f.val}
            </div>
          ))}
        </div>
 
        {/* Bottom HUD */}
        <div className="h-44 flex gap-2 p-2 bg-slate-900/80 border-t-2 border-slate-700">
 
          {/* Command panel */}
          <div className="w-52 bg-slate-800/80 rounded-lg overflow-hidden border border-slate-600">
            <div className={`px-2 py-1 text-white text-xs font-bold ${isMyTurn?'bg-indigo-600':'bg-slate-700'}`}>
              {isMyTurn ? `${actor?.name}` : 'Waiting...'}
            </div>
            <div className="p-1 max-h-32 overflow-y-auto">
              {isMyTurn && menu === 'main' && (
                <div className="space-y-0.5">
                  <button className="w-full text-left px-2 py-1.5 rounded text-white text-sm hover:bg-white/10"
                    onClick={()=>setMenu('target-attack')} data-testid="attack-button">Attack</button>
                  <button className="w-full text-left px-2 py-1.5 rounded text-white text-sm hover:bg-white/10"
                    onClick={()=>setMenu('abilities')} data-testid="abilities-button">Abilities</button>
                  <button className="w-full text-left px-2 py-1.5 rounded text-white text-sm hover:bg-white/10"
                    onClick={()=>setMenu('target-capture')} data-testid="capture-button">Capture</button>
                  <button className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-white/10 ${hasBoss ? 'text-slate-500 line-through' : 'text-white'}`}
                    onClick={doFlee} disabled={hasBoss} data-testid="flee-button">
                    Flee {hasBoss && '(Boss!)'}
                  </button>
                </div>
              )}
              {isMyTurn && menu === 'abilities' && (
                <div className="space-y-0.5">
                  {!(abilities?.unlocked?.length) && <div className="text-slate-400 text-xs px-2 py-1">No abilities</div>}
                  {(abilities?.unlocked||[]).map(ab => {
                    const ok = (actor?.current_mp||0) >= ab.mp_cost;
                    const isAoE = ab.target_type === 'all';
                    const isSelf = ab.target_type === 'self';
                    const isAlly = ab.ability_type === 'heal' || ab.ability_type === 'heal_all' || ab.target_type === 'single_ally' || ab.target_type === 'all_ally';
                    const effectLabel = ab.status_effect ? ` [${(STATUS_CONFIG[ab.status_effect]?.label || ab.status_effect)}]` : '';
                    return (
                      <button key={ab.id}
                        className={`w-full text-left px-2 py-1 rounded text-xs ${ok?'text-white hover:bg-white/10':'text-slate-500'}`}
                        onClick={()=>{
                          if (!ok) return;
                          if (isSelf || ab.ability_type === 'buff') {
                            doAbility(ab, actor);
                          } else if (isAoE && !isAlly) {
                            doAbility(ab, null);
                          } else {
                            setQueued({type:'ability', ability:ab});
                            setMenu(isAlly ? 'target-ally' : 'target-enemy');
                          }
                        }}>
                        {ab.name} ({ab.mp_cost}MP){isAoE ? ' [AOE]' : ''}{effectLabel}
                      </button>
                    );
                  })}
                  <button className="w-full text-left px-2 py-1 rounded text-slate-400 text-xs hover:bg-white/10"
                    onClick={()=>{setMenu('main');setQueued(null);}}>← Back</button>
                </div>
              )}
              {isMyTurn && (menu==='target-attack'||menu==='target-enemy') && (
                <div className="space-y-0.5">
                  <div className="text-red-400 text-[10px] px-2">Select target:</div>
                  {liveEnemies.map((e,i)=>(
                    <button key={e.encounter_id}
                      className="w-full text-left px-2 py-1 rounded text-white text-xs hover:bg-red-500/20"
                      onClick={()=>{ menu==='target-attack' ? doAttack(e) : queued && doAbility(queued.ability,e); }}
                      data-testid={`target-enemy-${i}`}>
                      {e.name} ({e.current_hp}HP) {e.is_boss ? '[BOSS]' : ''}
                    </button>
                  ))}
                  <button className="w-full text-left px-2 py-1 rounded text-slate-400 text-xs hover:bg-white/10"
                    onClick={()=>{setMenu('main');setQueued(null);}}>← Back</button>
                </div>
              )}
              {isMyTurn && menu==='target-ally' && (
                <div className="space-y-0.5">
                  <div className="text-cyan-400 text-[10px] px-2">Heal target:</div>
                  {party.filter(p=>p.current_hp>0).map((m,i)=>(
                    <button key={m.type==='player'?'hero':m.id}
                      className="w-full text-left px-2 py-1 rounded text-white text-xs hover:bg-cyan-500/20"
                      onClick={()=>{ queued && doAbility(queued.ability, m); }}
                      data-testid={`target-ally-${i}`}>
                      {m.name} ({m.current_hp}/{m.max_hp})
                    </button>
                  ))}
                  <button className="w-full text-left px-2 py-1 rounded text-slate-400 text-xs hover:bg-white/10"
                    onClick={()=>{setMenu('main');setQueued(null);}}>← Back</button>
                </div>
              )}
              {isMyTurn && menu==='target-capture' && (
                <div className="space-y-0.5">
                  <div className="text-green-400 text-[10px] px-2">Capture (HP&lt;50%):</div>
                  {liveEnemies.filter(e=>e.current_hp<e.base_hp*0.5 && !e.is_boss).length===0
                    ? <div className="text-slate-400 text-xs px-2 py-1">{liveEnemies.some(e=>e.is_boss) ? 'Bosses cannot be captured!' : 'Weaken enemies first!'}</div>
                    : liveEnemies.filter(e=>e.current_hp<e.base_hp*0.5 && !e.is_boss).map(e=>(
                      <button key={e.encounter_id}
                        className="w-full text-left px-2 py-1 rounded text-white text-xs hover:bg-green-500/20"
                        onClick={()=>{setCapture({target:e,name:e.name});setMenu('main');}}>
                        {e.name} ({Math.floor(e.capture_rate*100)}%)
                      </button>
                    ))
                  }
                  <button className="w-full text-left px-2 py-1 rounded text-slate-400 text-xs hover:bg-white/10"
                    onClick={()=>setMenu('main')}>← Back</button>
                </div>
              )}
              {!isMyTurn && <div className="text-slate-500 text-xs px-2 py-4 text-center">—</div>}
            </div>
          </div>
 
          {/* Party status */}
          <div className="flex-1 bg-slate-800/80 rounded-lg overflow-hidden border border-slate-600">
            <div className="bg-cyan-600 px-2 py-1 text-white text-xs font-bold">Party</div>
            <div className="p-2 grid grid-cols-2 gap-2">
              {party.map(m => (
                <div key={m.type==='player'?'hero':m.id} className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-6">
                      {m.type==='player'?<PlayerSprite size={24}/>:<MonsterSprite type={m.sprite} size={24}/>}
                    </div>
                    <span className={`font-bold text-xs ${m.current_hp<=0?'text-slate-500 line-through':'text-white'}`}>
                      {m.name}
                    </span>
                    <StatusBadges effects={m.effects} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-red-400 text-[10px] w-4">HP</span>
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 transition-all"
                        style={{width:`${Math.max(0,(m.current_hp/m.max_hp)*100)}%`}}/>
                    </div>
                    <span className="text-[10px] text-slate-300 w-12 text-right">
                      {Math.max(0,m.current_hp)}/{m.max_hp}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-cyan-400 text-[10px] w-4">MP</span>
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 transition-all"
                        style={{width:`${(m.current_mp/m.max_mp)*100}%`}}/>
                    </div>
                    <span className="text-[10px] text-slate-300 w-12 text-right">
                      {m.current_mp}/{m.max_mp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
 
          {/* Log */}
          <div className="w-52 bg-slate-800/80 rounded-lg overflow-hidden border border-slate-600">
            <div className="bg-amber-600 px-2 py-1 text-white text-xs font-bold">Log</div>
            <div className="p-1 h-28 overflow-y-auto flex flex-col-reverse" data-testid="combat-log">
              {[...log].reverse().slice(0,20).map((l,i)=>(
                <div key={i} className="text-slate-300 text-[10px] py-0.5 border-b border-slate-700/30">{l}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
 
      {/* Victory */}
      {victory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-amber-900 to-amber-950 border-4 border-amber-400 rounded-2xl p-6 max-w-md text-center" data-testid="victory-screen">
            <h2 className="text-3xl font-black text-amber-400 mb-4">VICTORY!</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-black/30 rounded-lg p-2">
                <div className="text-amber-400 text-xs font-bold">XP Gained</div>
                <div className="text-white text-xl font-black">{victory.xp_gained || victory.totalXP}</div>
              </div>
              <div className="bg-black/30 rounded-lg p-2">
                <div className="text-yellow-400 text-xs font-bold">Gold Earned</div>
                <div className="text-yellow-300 text-xl font-black">{victory.gold_earned || 0}G</div>
              </div>
            </div>
            
            {victory.level_ups > 0 && (
              <div className="bg-green-500/20 border border-green-400 rounded-lg p-2 mb-3 animate-pulse">
                <div className="text-green-400 font-black text-lg">LEVEL UP! → Lv{victory.new_level}</div>
                {victory.stat_points_gained > 0 && (
                  <div className="text-green-300 text-xs">+{victory.stat_points_gained} Stat Points!</div>
                )}
              </div>
            )}
            
            {victory.items_dropped?.length > 0 && (
              <div className="bg-black/30 rounded-lg p-3 mb-3 text-left">
                <div className="text-purple-400 text-xs font-bold mb-1">LOOT DROPS:</div>
                <div className="space-y-1">
                  {victory.items_dropped.map((item, i) => {
                    const rarityColor = {
                      common: 'text-slate-300',
                      uncommon: 'text-green-400',
                      rare: 'text-blue-400',
                      epic: 'text-purple-400',
                    }[item.rarity] || 'text-white';
                    return (
                      <div key={i} className={`${rarityColor} text-sm`}>
                        {item.name} <span className="text-[10px] opacity-60">({item.rarity})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {victory.updated_player && (
              <div className="text-slate-400 text-xs mb-3">
                Lv{victory.updated_player.level} | {victory.updated_player.gold}G | XP: {victory.updated_player.xp}/{victory.updated_player.xp_to_next}
              </div>
            )}
            
            <button className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-2.5 rounded-lg text-lg"
              onClick={()=>{ 
                if (fetchQuests) fetchQuests();
                if (fetchPlayer) fetchPlayer();
                setGameState('overworld'); 
                setCombatData(null); 
              }}
              data-testid="continue-button">Continue</button>
          </div>
        </div>
      )}
 
      {/* Capture */}
      {capture && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-green-900 to-green-950 border-4 border-green-400 rounded-2xl p-4 max-w-xs">
            <h2 className="text-lg font-bold text-green-400 mb-3">Name your {capture.target?.name}?</h2>
            <input className="w-full bg-slate-800 border-2 border-green-400 rounded px-3 py-2 text-white mb-3 text-sm"
              value={capture.name} maxLength={20} placeholder="Enter name..."
              onChange={e=>setCapture(c=>({...c,name:e.target.value}))}
              data-testid="capture-name-input"/>
            <div className="flex gap-2">
              <button className="flex-1 bg-green-500 hover:bg-green-400 text-white font-bold py-1.5 rounded text-sm"
                onClick={doCapture} data-testid="confirm-capture-button">Capture!</button>
              <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-1.5 rounded text-sm"
                onClick={()=>{setCapture(null); setPhase('player'); setMenu('main');}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default CombatScreen;
