import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';

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
    healParty
  } = useGame();
  
  const [activeTab, setActiveTab] = useState('stats');
  const [statAlloc, setStatAlloc] = useState({ strength: 0, agility: 0, intelligence: 0, vitality: 0 });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPlayer();
    fetchAllies();
    fetchAbilities();
  }, [fetchPlayer, fetchAllies, fetchAbilities]);

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
    { id: 'stats', label: '📊 Stats', icon: '📊' },
    { id: 'party', label: '👥 Party', icon: '👥' },
    { id: 'abilities', label: '✨ Abilities', icon: '✨' },
    { id: 'allies', label: '🐾 Allies', icon: '🐾' },
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
              🎮 Return [M]
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
                  </div>
                </div>

                <div className="space-y-3">
                  {/* XP */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-amber-400 font-bold">⭐ Experience</span>
                      <span className="text-slate-300">{player.xp} / {player.xp_to_next}</span>
                    </div>
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400" style={{ width: `${(player.xp / player.xp_to_next) * 100}%` }} />
                    </div>
                  </div>
                  {/* HP */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-400 font-bold">❤️ Health</span>
                      <span className="text-slate-300">{player.hp} / {player.max_hp}</span>
                    </div>
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 to-pink-500" style={{ width: `${(player.hp / player.max_hp) * 100}%` }} />
                    </div>
                  </div>
                  {/* MP */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-cyan-400 font-bold">💧 Mana</span>
                      <span className="text-slate-300">{player.mp} / {player.max_mp}</span>
                    </div>
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${(player.mp / player.max_mp) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat Allocation */}
              <div>
                <h3 className="text-xl font-bold text-amber-400 mb-4">
                  📈 Allocate Stats
                  {player.stat_points > 0 && (
                    <span className="ml-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                      {player.stat_points} points available
                    </span>
                  )}
                </h3>
                
                {player.stat_points > 0 ? (
                  <div className="space-y-3">
                    {[
                      { key: 'strength', label: 'STR', color: 'orange', icon: '💪' },
                      { key: 'agility', label: 'AGI', color: 'green', icon: '⚡' },
                      { key: 'intelligence', label: 'INT', color: 'purple', icon: '🧠' },
                      { key: 'vitality', label: 'VIT', color: 'pink', icon: '❤️' },
                    ].map(stat => (
                      <div key={stat.key} className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-3">
                        <span className={`text-${stat.color}-400 font-bold w-20`}>{stat.icon} {stat.label}</span>
                        <span className="text-white font-bold w-8">{player[stat.key]}</span>
                        <button
                          className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl"
                          onClick={() => setStatAlloc(prev => ({ ...prev, [stat.key]: Math.max(0, prev[stat.key] - 1) }))}
                          disabled={statAlloc[stat.key] === 0}
                          data-testid={`stat-minus-${stat.key}`}
                        >
                          -
                        </button>
                        <span className="text-green-400 font-bold w-8 text-center">+{statAlloc[stat.key]}</span>
                        <button
                          className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-xl"
                          onClick={() => setStatAlloc(prev => ({ ...prev, [stat.key]: prev[stat.key] + 1 }))}
                          disabled={remaining <= 0}
                          data-testid={`stat-plus-${stat.key}`}
                        >
                          +
                        </button>
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
                    🎮 Level up to earn stat points!
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

          {/* Abilities Tab */}
          {activeTab === 'abilities' && (
            <div data-testid="abilities-panel">
              {/* Unlocked */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-green-400 mb-3">✅ Unlocked Abilities</h3>
                {abilities.unlocked.length === 0 ? (
                  <div className="text-slate-400 bg-slate-800/50 rounded-xl p-4">No abilities unlocked yet</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {abilities.unlocked.map(ability => (
                      <div key={ability.id} className="bg-slate-800/50 border border-green-500/30 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-white font-bold">✨ {ability.name}</span>
                          <span className="text-cyan-400 text-sm">{ability.mp_cost} MP</span>
                        </div>
                        <p className="text-slate-400 text-sm">{ability.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Available to Unlock */}
              {abilities.available.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-amber-400 mb-3">🔓 Available to Unlock</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {abilities.available.map(ability => (
                      <div key={ability.id} className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-white font-bold">🔒 {ability.name}</span>
                          <span className="text-cyan-400 text-sm">{ability.mp_cost} MP</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-3">{ability.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Requires Level {ability.required_level}</span>
                          <button
                            className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 px-3 py-1 rounded-lg text-sm font-bold disabled:opacity-50"
                            onClick={() => handleUnlock(ability.id)}
                            disabled={player?.level < ability.required_level}
                            data-testid={`unlock-ability-${ability.id}`}
                          >
                            Unlock
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
