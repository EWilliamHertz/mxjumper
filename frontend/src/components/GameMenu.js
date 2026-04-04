import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';

const BestiarySprite = ({ type, size = 48 }) => {
  const colors = {
    slime: { body: '#44dd44', eye: '#000', glow: '#66ff66' },
    mushroom: { body: '#dd4466', eye: '#000', cap: '#ff6688', spots: '#fff' },
    wolf: { body: '#888', eye: '#ff0', mane: '#aaa' },
    bat: { body: '#664', eye: '#f00', wing: '#443' },
    skeleton: { body: '#ddd', eye: '#f00', bone: '#eee' },
    spider: { body: '#333', eye: '#f00', legs: '#555' },
    goblin: { body: '#5a5', eye: '#ff0', ear: '#494' },
    golem: { body: '#886', eye: '#0ff', crack: '#665' },
    harpy: { body: '#c8a', eye: '#f0f', wing: '#da9' },
    ghost: { body: '#aaf', eye: '#00f', glow: '#88c' },
    dragon: { body: '#d44', eye: '#ff0', wing: '#a22', horn: '#fa0' },
    phoenix: { body: '#f80', eye: '#fff', wing: '#f50', flame: '#ff0' },
  };
  const c = colors[type] || { body: '#888', eye: '#000' };
  
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className="mx-auto">
      <ellipse cx="24" cy="32" rx="14" ry="10" fill={c.body} opacity="0.8"/>
      <circle cx="24" cy="24" r="12" fill={c.body}/>
      <circle cx="20" cy="22" r="2.5" fill={c.eye}/>
      <circle cx="28" cy="22" r="2.5" fill={c.eye}/>
      <circle cx="20.5" cy="21.5" r="1" fill="#fff"/>
      <circle cx="28.5" cy="21.5" r="1" fill="#fff"/>
      {c.glow && <circle cx="24" cy="24" r="13" fill="none" stroke={c.glow} strokeWidth="0.5" opacity="0.5"/>}
    </svg>
  );
};

export const GameMenu = () => {
  const { logout } = useAuth();
  const { 
    player, 
    allies, 
    abilities, 
    setGameState, 
    toggleParty, 
    allocateStats, 
    unlockAbility,
    fetchPlayer,
    fetchAllies,
    fetchAbilities,
    healParty,
    bestiary,
    fetchBestiary
  } = useGame();
  
  const [activeTab, setActiveTab] = useState('stats');
  const [statAlloc, setStatAlloc] = useState({ strength: 0, agility: 0, intelligence: 0, vitality: 0 });
  const [message, setMessage] = useState('');
  const [selectedBestiaryEntry, setSelectedBestiaryEntry] = useState(null);

  // Close Menu with 'I' or 'Escape'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'escape') {
        setGameState('overworld');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setGameState]);

  useEffect(() => {
    fetchPlayer();
    fetchAllies();
    fetchAbilities();
    fetchBestiary();
  }, [fetchPlayer, fetchAllies, fetchAbilities, fetchBestiary]);

  const totalAllocated = statAlloc.strength + statAlloc.agility + statAlloc.intelligence + statAlloc.vitality;
  const remaining = (player?.stat_points || 0) - totalAllocated;

  const handleAllocate = async () => {
    if (totalAllocated === 0) return;
    const result = await allocateStats(statAlloc);
    if (result.success) {
      setStatAlloc({ strength: 0, agility: 0, intelligence: 0, vitality: 0 });
      setMessage('✅ Stats allocated!');
      setTimeout(() => setMessage(''), 2000);
    } else {
      setMessage(`❌ ${result.error || 'Failed to allocate'}`);
    }
  };

  const handleToggleParty = async (allyId) => {
    const result = await toggleParty(allyId);
    if (result.error) {
      setMessage(`❌ ${result.error}`);
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleUnlock = async (abilityId) => {
    const result = await unlockAbility(abilityId);
    if (result.error) {
      setMessage(`❌ ${result.error}`);
      setTimeout(() => setMessage(''), 2000);
    } else {
      setMessage('✅ Ability unlocked!');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleHeal = async () => {
    await healParty();
    setMessage('💚 Party fully healed!');
    setTimeout(() => setMessage(''), 2000);
  };

  const TABS = [
    { id: 'stats', label: 'Stats' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'party', label: 'Party' },
    { id: 'abilities', label: 'Abilities' },
    { id: 'allies', label: 'Allies' },
    { id: 'bestiary', label: 'Bestiary' },
  ];

  return (
    <div 
      className="min-h-screen p-4"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
      data-testid="game-menu"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
            ⚔️ MENU
          </h1>
          <div className="flex gap-3">
            <button 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white px-4 py-2 rounded-xl font-bold transition-all"
              onClick={handleHeal}
              data-testid="heal-button"
            >
              💚 Heal All
            </button>
            <button 
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-xl font-bold transition-all"
              onClick={() => setGameState('overworld')}
              data-testid="close-menu-button"
            >
              🎮 Return [I]
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-3 mb-4 text-center text-lg" data-testid="menu-message">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg' 
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/80 hover:text-white'
              }`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-slate-900/80 backdrop-blur border-2 border-slate-700 rounded-2xl p-6 shadow-2xl">
          
          {/* Stats Tab */}
          {activeTab === 'stats' && player && (
            <div className="grid md:grid-cols-2 gap-8" data-testid="stats-panel">
              {/* Character Info */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center border-4 border-blue-300 shadow-xl overflow-hidden">
                    <svg viewBox="0 0 64 64" width={60} height={60}>
                      <rect x="24" y="36" width="16" height="20" fill="#4a90d9"/>
                      <rect x="18" y="40" width="8" height="14" fill="#5aa0e9"/>
                      <rect x="38" y="40" width="8" height="14" fill="#5aa0e9"/>
                      <circle cx="32" cy="24" r="12" fill="#ffd9b3"/>
                      <path d="M20 20 Q32 8 44 20 L44 24 Q32 20 20 24 Z" fill="#4a2800"/>
                      <circle cx="28" cy="24" r="2" fill="#000"/>
                      <circle cx="36" cy="24" r="2" fill="#000"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">{player.name}</h2>
                    <div className="text-amber-400 font-bold">Level {player.level}</div>
                    <div className="text-slate-500 text-xs">Gold: {player.gold}G</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Experience', val: player.xp, max: player.xp_to_next, from: 'from-amber-500', to: 'to-yellow-400', color: 'text-amber-400' },
                    { label: 'Health', val: player.hp, max: player.max_hp, from: 'from-red-500', to: 'to-pink-500', color: 'text-red-400' },
                    { label: 'Mana', val: player.mp, max: player.max_mp, from: 'from-cyan-500', to: 'to-blue-500', color: 'text-cyan-400' },
                  ].map(bar => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`${bar.color} font-bold`}>{bar.label}</span>
                        <span className="text-slate-300">{bar.val} / {bar.max}</span>
                      </div>
                      <div className="h-3.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${bar.from} ${bar.to} transition-all duration-500`} style={{ width: `${(bar.val / bar.max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Current Stats Display */}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {[
                    { key: 'strength', label: 'STR', value: player.strength, color: 'text-orange-400', bg: 'bg-orange-500/10', desc: 'Physical damage' },
                    { key: 'agility', label: 'AGI', value: player.agility, color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Turn speed' },
                    { key: 'intelligence', label: 'INT', value: player.intelligence, color: 'text-purple-400', bg: 'bg-purple-500/10', desc: 'Spell power' },
                    { key: 'vitality', label: 'VIT', value: player.vitality, color: 'text-pink-400', bg: 'bg-pink-500/10', desc: 'Max HP' },
                  ].map(s => (
                    <div key={s.key} className={`${s.bg} border border-slate-700 rounded-lg px-3 py-2`}>
                      <div className="flex justify-between items-center">
                        <span className={`${s.color} text-xs font-bold`}>{s.label}</span>
                        <span className="text-white font-black text-lg">{s.value}</span>
                      </div>
                      <div className="text-slate-500 text-[10px]">{s.desc}</div>
                      <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full ${s.color.replace('text-', 'bg-')} rounded-full`} style={{ width: `${Math.min(100, (s.value / 50) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stat Allocation */}
              <div>
                <h3 className="text-xl font-bold text-amber-400 mb-4">
                  Allocate Stats
                  {player.stat_points > 0 && (
                    <span className="ml-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm animate-pulse">
                      {player.stat_points} pts
                    </span>
                  )}
                </h3>
                
                {player.stat_points > 0 ? (
                  <div className="space-y-3">
                    {[
                      { key: 'strength', label: 'STR', color: 'orange', desc: '+2 physical damage per point' },
                      { key: 'agility', label: 'AGI', color: 'green', desc: '+1 turn speed per point' },
                      { key: 'intelligence', label: 'INT', color: 'purple', desc: '+2 spell power, +1 MP per point' },
                      { key: 'vitality', label: 'VIT', color: 'pink', desc: '+5 max HP per point' },
                    ].map(stat => (
                      <div key={stat.key} className="bg-slate-800/50 rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-${stat.color}-400 font-bold w-12`}>{stat.label}</span>
                          <span className="text-white font-bold w-8">{player[stat.key]}</span>
                          <button
                            className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold"
                            onClick={() => setStatAlloc(prev => ({ ...prev, [stat.key]: Math.max(0, prev[stat.key] - 1) }))}
                            disabled={statAlloc[stat.key] === 0}
                            data-testid={`stat-minus-${stat.key}`}
                          >-</button>
                          <span className={`${statAlloc[stat.key] > 0 ? 'text-green-400' : 'text-slate-600'} font-bold w-8 text-center`}>
                            +{statAlloc[stat.key]}
                          </span>
                          <button
                            className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold"
                            onClick={() => setStatAlloc(prev => ({ ...prev, [stat.key]: prev[stat.key] + 1 }))}
                            disabled={remaining <= 0}
                            data-testid={`stat-plus-${stat.key}`}
                          >+</button>
                          {statAlloc[stat.key] > 0 && (
                            <span className="text-green-400/60 text-xs ml-2">= {player[stat.key] + statAlloc[stat.key]}</span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[10px] mt-1 ml-12">{stat.desc}</div>
                      </div>
                    ))}
                    
                    <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                      <span className="text-slate-400">Remaining: <span className="text-green-400 font-bold">{remaining}</span></span>
                      <button
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50"
                        onClick={handleAllocate}
                        disabled={totalAllocated === 0}
                        data-testid="allocate-stats-button"
                      >
                        Apply Stats
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 bg-slate-800/50 rounded-xl p-6 text-center">
                    Level up to earn stat points!<br/>
                    <span className="text-xs text-slate-500">Gain 5 stat points per level</span>
                  </div>
                )}
              </div>
            </div>
          )}




          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div data-testid="inventory-panel">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-amber-500">🎒 Your Inventory</h2>
                <div className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-xl font-bold">
                  Gold: {player?.gold || 0}G
                </div>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 min-h-[300px]">
                {player?.inventory && player.inventory.length > 0 ? (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                    {player.inventory.map((item, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-600 rounded-lg p-2 flex flex-col items-center justify-center hover:border-amber-400 cursor-pointer group relative">
                        <div className="text-2xl mb-1">{item.icon || '📦'}</div>
                        <div className="text-white text-[10px] font-bold text-center truncate w-full">{item.name}</div>
                        {item.quantity > 1 && (
                          <div className="absolute -bottom-2 -right-2 bg-slate-700 text-white text-[10px] px-1.5 rounded-full font-bold">
                            x{item.quantity}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full pt-12 text-slate-500">
                    <div className="text-6xl mb-4 opacity-50">🎒</div>
                    <h3 className="text-xl font-bold text-slate-400 mb-2">Your bag is empty</h3>
                    <p className="text-sm">Defeat monsters or visit shops in the village to get items.</p>
                  </div>
                )}
              </div>
            </div>
          )}




          {/* Party Tab */}
          {activeTab === 'party' && (
            <div data-testid="party-panel">
              <h2 className="text-xl font-bold text-cyan-400 mb-4">👥 Current Party (Max 4 members)</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Player */}
                {player && (
                  <div className="bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border-2 border-blue-500/50 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center overflow-hidden">
                        <svg viewBox="0 0 64 64" width={48} height={48}>
                          <rect x="24" y="36" width="16" height="20" fill="#4a90d9"/>
                          <rect x="18" y="40" width="8" height="14" fill="#5aa0e9"/>
                          <rect x="38" y="40" width="8" height="14" fill="#5aa0e9"/>
                          <circle cx="32" cy="24" r="12" fill="#ffd9b3"/>
                          <path d="M20 20 Q32 8 44 20 L44 24 Q32 20 20 24 Z" fill="#4a2800"/>
                          <circle cx="28" cy="24" r="2" fill="#000"/>
                          <circle cx="36" cy="24" r="2" fill="#000"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-amber-400 font-bold text-lg">{player.name}</div>
                        <div className="text-slate-400 text-sm">Level {player.level} - Leader</div>
                        <div className="text-xs text-slate-500">HP: {player.hp}/{player.max_hp} | MP: {player.mp}/{player.max_mp}</div>
                      </div>
                      <div className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold">
                        LEADER
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Party Allies */}
                {allies.filter(a => a.in_party).map(ally => (
                  <div key={ally.id} className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center overflow-hidden">
                        <svg viewBox="0 0 64 64" width={48} height={48}>
                          <ellipse cx="32" cy="48" rx="24" ry="12" fill="#1a5a1a"/>
                          <ellipse cx="32" cy="38" rx="22" ry="22" fill="#44dd44"/>
                          <ellipse cx="26" cy="32" rx="4" ry="5" fill="#000"/>
                          <ellipse cx="38" cy="32" rx="4" ry="5" fill="#000"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-bold">{ally.name}</div>
                        <div className="text-slate-400 text-sm">Level {ally.level}</div>
                        <div className="text-xs text-slate-500">HP: {ally.hp}/{ally.max_hp}</div>
                      </div>
                      <button
                        className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-2 rounded-lg text-sm font-bold"
                        onClick={() => handleToggleParty(ally.id)}
                        data-testid={`remove-party-${ally.id}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Empty Slots */}
                {Array.from({ length: 3 - allies.filter(a => a.in_party).length }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl p-4 flex items-center justify-center h-24">
                    <span className="text-slate-600">Empty Slot</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Abilities Tab - Visual Skill Tree */}
          {activeTab === 'abilities' && (
            <div data-testid="abilities-panel">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-cyan-400">Ability Tree</h2>
                <div className="text-sm text-slate-400">
                  Player Level: <span className="text-amber-400 font-bold">{player?.level || 1}</span>
                </div>
              </div>

              {/* Skill Tree - Tiered Layout */}
              {(() => {
                const allAbilities = [...(abilities.unlocked || []), ...(abilities.available || []), ...(abilities.locked || [])];
                const unlockedIds = new Set((abilities.unlocked || []).map(a => a.id));
                
                // Group by required level tiers
                const tiers = {};
                allAbilities.forEach(a => {
                  const tier = a.required_level;
                  if (!tiers[tier]) tiers[tier] = [];
                  tiers[tier].push(a);
                });
                const tierKeys = Object.keys(tiers).sort((a, b) => Number(a) - Number(b));
                
                const elementColors = {
                  fire: { bg: 'bg-red-900/30', border: 'border-red-500', text: 'text-red-400', glow: 'shadow-red-500/20' },
                  ice: { bg: 'bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
                  lightning: { bg: 'bg-yellow-900/30', border: 'border-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
                  poison: { bg: 'bg-emerald-900/30', border: 'border-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
                  default: { bg: 'bg-slate-800/50', border: 'border-slate-500', text: 'text-slate-300', glow: '' },
                };
                
                return (
                  <div className="space-y-6">
                    {tierKeys.map((tier, tierIdx) => (
                      <div key={tier}>
                        {/* Tier Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`h-px flex-1 ${Number(tier) <= (player?.level || 1) ? 'bg-amber-500/40' : 'bg-slate-700'}`} />
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            Number(tier) <= (player?.level || 1) 
                              ? 'bg-amber-500/20 text-amber-400' 
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            TIER {tierIdx + 1} - Lv.{tier}+
                          </span>
                          <div className={`h-px flex-1 ${Number(tier) <= (player?.level || 1) ? 'bg-amber-500/40' : 'bg-slate-700'}`} />
                        </div>
                        
                        {/* Abilities in this tier */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {tiers[tier].map(ability => {
                            const isUnlocked = unlockedIds.has(ability.id);
                            const canUnlock = !isUnlocked && Number(tier) <= (player?.level || 1);
                            const isLocked = !isUnlocked && Number(tier) > (player?.level || 1);
                            const ec = elementColors[ability.element] || elementColors.default;
                            
                            return (
                              <div key={ability.id} 
                                className={`relative rounded-xl p-3 border-2 transition-all ${
                                  isUnlocked 
                                    ? `${ec.bg} ${ec.border} shadow-lg ${ec.glow}` 
                                    : canUnlock
                                      ? 'bg-slate-800/50 border-amber-500/50 hover:border-amber-400'
                                      : 'bg-slate-900/50 border-slate-700/50 opacity-60'
                                }`}
                                data-testid={`ability-${ability.id}`}
                              >
                                {isUnlocked && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                                    <svg viewBox="0 0 16 16" width="10" height="10" fill="white">
                                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
                                    </svg>
                                  </div>
                                )}
                                
                                <div className={`text-sm font-bold mb-1 ${isUnlocked ? ec.text : canUnlock ? 'text-amber-400' : 'text-slate-500'}`}>
                                  {ability.name}
                                </div>
                                <div className="text-slate-400 text-[10px] mb-2 line-clamp-2">{ability.description}</div>
                                
                                <div className="flex items-center gap-2 text-[10px]">
                                  <span className="text-cyan-400">{ability.mp_cost} MP</span>
                                  {ability.damage_multiplier > 0 && (
                                    <span className="text-red-400">{ability.damage_multiplier}x DMG</span>
                                  )}
                                  {ability.element && (
                                    <span className={`${ec.text} capitalize`}>{ability.element}</span>
                                  )}
                                </div>
                                
                                {canUnlock && (
                                  <button
                                    className="w-full mt-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 py-1 rounded-lg text-xs font-bold transition-all"
                                    onClick={() => handleUnlock(ability.id)}
                                    data-testid={`unlock-ability-${ability.id}`}
                                  >
                                    Unlock
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {tierKeys.length === 0 && (
                      <div className="text-slate-400 bg-slate-800/50 rounded-xl p-8 text-center">
                        No abilities available yet. Level up to unlock the ability tree!
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          {/* Allies Tab */}
          {activeTab === 'allies' && (
            <div data-testid="allies-panel">
              <h2 className="text-xl font-bold text-cyan-400 mb-4">🐾 Captured Allies ({allies.length})</h2>
              
              {allies.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <svg viewBox="0 0 64 64" width={64} height={64} className="mx-auto mb-4 opacity-50">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#666" strokeWidth="2" strokeDasharray="8 4"/>
                    <text x="32" y="38" textAnchor="middle" fill="#666" fontSize="20">?</text>
                  </svg>
                  <p className="text-lg">No allies captured yet</p>
                  <p className="text-sm">Weaken enemies in battle and use Capture!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {allies.map(ally => (
                    <div key={ally.id} className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center overflow-hidden">
                          <svg viewBox="0 0 64 64" width={48} height={48}>
                            <ellipse cx="32" cy="48" rx="24" ry="12" fill="#1a5a1a"/>
                            <ellipse cx="32" cy="38" rx="22" ry="22" fill="#44dd44"/>
                            <ellipse cx="26" cy="32" rx="4" ry="5" fill="#000"/>
                            <ellipse cx="38" cy="32" rx="4" ry="5" fill="#000"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-bold text-lg">{ally.name}</div>
                          <div className="text-slate-400 text-sm">Level {ally.level}</div>
                          <div className="grid grid-cols-2 gap-x-4 text-xs text-slate-500 mt-1">
                            <span>HP: {ally.hp}/{ally.max_hp}</span>
                            <span>MP: {ally.mp}/{ally.max_mp}</span>
                            <span>STR: {ally.strength}</span>
                            <span>AGI: {ally.agility}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            ally.in_party 
                              ? 'bg-red-500/20 hover:bg-red-500/40 text-red-400' 
                              : 'bg-green-500/20 hover:bg-green-500/40 text-green-400'
                          }`}
                          onClick={() => handleToggleParty(ally.id)}
                          data-testid={`toggle-party-${ally.id}`}
                        >
                          {ally.in_party ? '➖ Remove from Party' : '➕ Add to Party'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Bestiary Tab */}
          {activeTab === 'bestiary' && (
            <div data-testid="bestiary-panel">
              {/* Bestiary Header Stats */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="bg-slate-800 border border-amber-500/30 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
                  <div className="text-amber-400 text-xs font-bold">DISCOVERED</div>
                  <div className="text-white text-2xl font-black">{bestiary.discovered} / {bestiary.total}</div>
                </div>
                <div className="bg-slate-800 border border-green-500/30 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
                  <div className="text-green-400 text-xs font-bold">CAPTURED</div>
                  <div className="text-white text-2xl font-black">{bestiary.captured_count} / {bestiary.total}</div>
                </div>
                <div className="bg-slate-800 border border-cyan-500/30 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
                  <div className="text-cyan-400 text-xs font-bold">COMPLETION</div>
                  <div className="text-white text-2xl font-black">
                    {bestiary.total > 0 ? Math.round((bestiary.discovered / bestiary.total) * 100) : 0}%
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Monster Grid */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">Monster Collection</h3>
                  <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
                    {bestiary.monsters?.map(m => (
                      <button
                        key={m.id}
                        className={`rounded-xl p-2 border-2 transition-all text-center ${
                          m.encountered 
                            ? selectedBestiaryEntry?.id === m.id
                              ? 'bg-amber-900/40 border-amber-400 shadow-lg shadow-amber-400/20'
                              : m.captured
                                ? 'bg-green-900/20 border-green-500/40 hover:border-green-400'
                                : 'bg-slate-800 border-slate-600 hover:border-amber-400/50'
                            : 'bg-slate-900 border-slate-700/50 opacity-50'
                        }`}
                        onClick={() => m.encountered && setSelectedBestiaryEntry(m)}
                        data-testid={`bestiary-entry-${m.id}`}
                      >
                        {m.encountered ? (
                          <>
                            <BestiarySprite type={m.sprite} size={48} />
                            <div className="text-white text-[10px] font-bold mt-1 truncate">{m.name}</div>
                            {m.captured && <div className="text-green-400 text-[8px]">CAPTURED</div>}
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 mx-auto rounded-lg bg-slate-800 flex items-center justify-center">
                              <span className="text-slate-600 text-xl">?</span>
                            </div>
                            <div className="text-slate-600 text-[10px] font-bold mt-1">???</div>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monster Details */}
                <div>
                  {selectedBestiaryEntry ? (
                    <div className="bg-slate-800 border border-slate-600 rounded-xl p-4" data-testid="bestiary-detail">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-20 h-20 rounded-xl flex items-center justify-center border-2 ${
                          selectedBestiaryEntry.captured ? 'border-green-400 bg-green-900/20' : 'border-slate-500 bg-slate-900'
                        }`}>
                          <BestiarySprite type={selectedBestiaryEntry.sprite} size={64} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white">{selectedBestiaryEntry.name}</h3>
                          <div className="text-sm text-slate-400 capitalize">Zone: {selectedBestiaryEntry.zone}</div>
                          {selectedBestiaryEntry.captured && (
                            <span className="inline-block bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full mt-1">CAPTURED</span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-slate-300 text-sm mb-4 italic">{selectedBestiaryEntry.description}</p>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {[
                          { label: 'HP', value: selectedBestiaryEntry.base_hp, color: 'text-red-400' },
                          { label: 'MP', value: selectedBestiaryEntry.base_mp, color: 'text-blue-400' },
                          { label: 'STR', value: selectedBestiaryEntry.base_strength, color: 'text-orange-400' },
                          { label: 'AGI', value: selectedBestiaryEntry.base_agility, color: 'text-green-400' },
                          { label: 'INT', value: selectedBestiaryEntry.base_intelligence, color: 'text-purple-400' },
                          { label: 'VIT', value: selectedBestiaryEntry.base_vitality, color: 'text-yellow-400' },
                        ].map(stat => (
                          <div key={stat.label} className="bg-slate-900 rounded-lg px-3 py-1.5 flex justify-between">
                            <span className="text-slate-400 text-xs font-bold">{stat.label}</span>
                            <span className={`${stat.color} text-sm font-bold`}>{stat.value}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-900 rounded-lg px-3 py-2">
                          <span className="text-slate-400">Times Defeated</span>
                          <div className="text-white font-bold text-lg">{selectedBestiaryEntry.times_defeated}</div>
                        </div>
                        <div className="bg-slate-900 rounded-lg px-3 py-2">
                          <span className="text-slate-400">Capture Rate</span>
                          <div className="text-white font-bold text-lg">{Math.round(selectedBestiaryEntry.capture_rate * 100)}%</div>
                        </div>
                        <div className="bg-slate-900 rounded-lg px-3 py-2">
                          <span className="text-slate-400">XP Reward</span>
                          <div className="text-amber-400 font-bold text-lg">{selectedBestiaryEntry.xp_reward}</div>
                        </div>
                        {selectedBestiaryEntry.first_seen && (
                          <div className="bg-slate-900 rounded-lg px-3 py-2">
                            <span className="text-slate-400">First Seen</span>
                            <div className="text-white font-bold text-sm">{new Date(selectedBestiaryEntry.first_seen).toLocaleDateString()}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800 border border-slate-700 border-dashed rounded-xl p-8 text-center text-slate-500">
                      <div className="text-4xl mb-3">?</div>
                      <p className="text-sm">Select a discovered monster to view details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="mt-4 text-center">
          <button 
            className="text-slate-500 hover:text-slate-300 text-sm"
            onClick={logout}
            data-testid="logout-button"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameMenu;
