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
      setMessage('Stats allocated!');
      setTimeout(() => setMessage(''), 2000);
    } else {
      setMessage(result.error || 'Failed to allocate');
    }
  };

  const handleToggleParty = async (allyId) => {
    const result = await toggleParty(allyId);
    if (result.error) {
      setMessage(result.error);
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleUnlock = async (abilityId) => {
    const result = await unlockAbility(abilityId);
    if (result.error) {
      setMessage(result.error);
      setTimeout(() => setMessage(''), 2000);
    } else {
      setMessage('Ability unlocked!');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleHeal = async () => {
    await healParty();
    setMessage('Party fully healed!');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div 
      className="min-h-screen p-4"
      style={{ background: 'linear-gradient(135deg, #050505 0%, #12121c 50%, #1a1a2e 100%)' }}
      data-testid="game-menu"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="font-pixel text-xl text-[#FFD700]">MENU</h1>
          <div className="flex gap-2">
            <button 
              className="game-button"
              onClick={handleHeal}
              data-testid="heal-button"
            >
              HEAL ALL
            </button>
            <button 
              className="game-button secondary"
              onClick={() => setGameState('overworld')}
              data-testid="close-menu-button"
            >
              CLOSE [M]
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="game-panel mb-4 p-2 text-center font-body text-[#00FF66]" data-testid="menu-message">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {['stats', 'party', 'abilities', 'allies'].map(tab => (
            <button
              key={tab}
              className={`game-button ${activeTab === tab ? 'border-[#00E5FF] text-[#00E5FF]' : ''}`}
              onClick={() => setActiveTab(tab)}
              data-testid={`tab-${tab}`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="game-panel">
          <div className="game-panel-inner">
            
            {/* Stats Tab */}
            {activeTab === 'stats' && player && (
              <div data-testid="stats-panel">
                <div className="flex gap-8">
                  {/* Character Info */}
                  <div className="flex-1">
                    <h2 className="font-pixel text-sm text-[#00E5FF] mb-4">{player.name}</h2>
                    <div className="space-y-2 font-body">
                      <div className="flex justify-between">
                        <span className="text-[#8b8b99]">Level:</span>
                        <span className="text-[#FFD700]">{player.level}</span>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[#8b8b99]">XP:</span>
                          <span>{player.xp} / {player.xp_to_next}</span>
                        </div>
                        <div className="bar-container">
                          <div className="exp-bar" style={{ width: `${(player.xp / player.xp_to_next) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[#8b8b99]">HP:</span>
                          <span>{player.hp} / {player.max_hp}</span>
                        </div>
                        <div className="bar-container">
                          <div className="hp-bar" style={{ width: `${(player.hp / player.max_hp) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[#8b8b99]">MP:</span>
                          <span>{player.mp} / {player.max_mp}</span>
                        </div>
                        <div className="bar-container">
                          <div className="mp-bar" style={{ width: `${(player.mp / player.max_mp) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stat Allocation */}
                  <div className="flex-1">
                    <h3 className="font-pixel text-sm text-[#FFD700] mb-4">
                      ALLOCATE STATS
                      <span className="ml-2 text-[#00FF66]">({player.stat_points} pts)</span>
                    </h3>
                    
                    {player.stat_points > 0 ? (
                      <div className="space-y-3">
                        {['strength', 'agility', 'intelligence', 'vitality'].map(stat => (
                          <div key={stat} className="flex items-center gap-2">
                            <span className="font-body w-24 text-[#8b8b99] capitalize">{stat.slice(0, 3).toUpperCase()}:</span>
                            <span className="font-body w-8">{player[stat]}</span>
                            <button
                              className="game-button w-8 h-8 p-0 text-center"
                              onClick={() => setStatAlloc(prev => ({ ...prev, [stat]: Math.max(0, prev[stat] - 1) }))}
                              disabled={statAlloc[stat] === 0}
                              data-testid={`stat-minus-${stat}`}
                            >
                              -
                            </button>
                            <span className="font-body w-8 text-center text-[#00FF66]">+{statAlloc[stat]}</span>
                            <button
                              className="game-button w-8 h-8 p-0 text-center"
                              onClick={() => setStatAlloc(prev => ({ ...prev, [stat]: prev[stat] + 1 }))}
                              disabled={remaining <= 0}
                              data-testid={`stat-plus-${stat}`}
                            >
                              +
                            </button>
                          </div>
                        ))}
                        
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/20">
                          <span className="font-body text-[#8b8b99]">Remaining: {remaining}</span>
                          <button
                            className="game-button primary"
                            onClick={handleAllocate}
                            disabled={totalAllocated === 0}
                            data-testid="allocate-stats-button"
                          >
                            APPLY
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[#8b8b99] font-body">
                        Level up to earn stat points!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Party Tab */}
            {activeTab === 'party' && (
              <div data-testid="party-panel">
                <h2 className="font-pixel text-sm text-[#00E5FF] mb-4">CURRENT PARTY (Max 4)</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Player (always in party) */}
                  {player && (
                    <div className="game-panel bg-[#0a0a14] p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 bg-[#00E5FF] flex items-center justify-center">
                          <span className="font-pixel text-black text-xs">{player.name[0]}</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-pixel text-xs text-[#FFD700]">{player.name}</div>
                          <div className="font-body text-sm text-[#8b8b99]">Level {player.level} - Leader</div>
                          <div className="text-xs text-[#8b8b99]">HP: {player.hp}/{player.max_hp}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Party Allies */}
                  {allies.filter(a => a.in_party).map(ally => (
                    <div key={ally.id} className="game-panel bg-[#0a0a14] p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 bg-[#00FF66] flex items-center justify-center">
                          <span className="font-pixel text-black text-xs">{ally.name[0]}</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-pixel text-xs">{ally.name}</div>
                          <div className="font-body text-sm text-[#8b8b99]">Level {ally.level}</div>
                          <div className="text-xs text-[#8b8b99]">HP: {ally.hp}/{ally.max_hp}</div>
                        </div>
                        <button
                          className="game-button text-xs"
                          onClick={() => handleToggleParty(ally.id)}
                          data-testid={`remove-party-${ally.id}`}
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty Slots */}
                  {Array.from({ length: 3 - allies.filter(a => a.in_party).length }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="game-panel bg-[#0a0a14] p-3 opacity-50">
                      <div className="flex items-center justify-center h-16">
                        <span className="font-body text-[#8b8b99]">Empty Slot</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Abilities Tab */}
            {activeTab === 'abilities' && (
              <div data-testid="abilities-panel">
                <h2 className="font-pixel text-sm text-[#00E5FF] mb-4">ABILITIES</h2>
                
                <div className="mb-6">
                  <h3 className="font-pixel text-xs text-[#00FF66] mb-2">UNLOCKED</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {abilities.unlocked.map(ability => (
                      <div key={ability.id} className="game-panel bg-[#0a0a14] p-2">
                        <div className="font-pixel text-xs">{ability.name}</div>
                        <div className="font-body text-sm text-[#8b8b99]">{ability.description}</div>
                        <div className="text-xs text-[#33CCFF]">MP Cost: {ability.mp_cost}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {abilities.available.length > 0 && (
                  <div>
                    <h3 className="font-pixel text-xs text-[#FFD700] mb-2">AVAILABLE TO UNLOCK</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {abilities.available.map(ability => (
                        <div key={ability.id} className="game-panel bg-[#0a0a14] p-2">
                          <div className="font-pixel text-xs">{ability.name}</div>
                          <div className="font-body text-sm text-[#8b8b99]">{ability.description}</div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-[#8b8b99]">Req: LV{ability.required_level}</span>
                            <button
                              className="game-button text-xs py-1"
                              onClick={() => handleUnlock(ability.id)}
                              disabled={player?.level < ability.required_level}
                              data-testid={`unlock-ability-${ability.id}`}
                            >
                              UNLOCK
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
                <h2 className="font-pixel text-sm text-[#00E5FF] mb-4">CAPTURED ALLIES ({allies.length})</h2>
                
                {allies.length === 0 ? (
                  <div className="text-center font-body text-[#8b8b99] py-8">
                    No allies captured yet. Weaken enemies and use Capture in battle!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {allies.map(ally => (
                      <div key={ally.id} className="game-panel bg-[#0a0a14] p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-16 bg-[#00FF66] flex items-center justify-center">
                            <span className="font-pixel text-black text-xs">{ally.name[0]}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-pixel text-xs">{ally.name}</div>
                            <div className="font-body text-sm text-[#8b8b99]">Level {ally.level}</div>
                            <div className="text-xs space-y-1">
                              <div className="flex gap-2">
                                <span className="text-[#FF3366]">HP: {ally.hp}/{ally.max_hp}</span>
                                <span className="text-[#33CCFF]">MP: {ally.mp}/{ally.max_mp}</span>
                              </div>
                              <div className="text-[#8b8b99]">
                                STR:{ally.strength} AGI:{ally.agility} INT:{ally.intelligence}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            className={`game-button text-xs ${ally.in_party ? 'border-[#FF3366] text-[#FF3366]' : 'border-[#00FF66] text-[#00FF66]'}`}
                            onClick={() => handleToggleParty(ally.id)}
                            data-testid={`toggle-party-${ally.id}`}
                          >
                            {ally.in_party ? 'REMOVE' : 'ADD TO PARTY'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="mt-4 text-center">
          <button 
            className="game-button text-xs"
            onClick={logout}
            data-testid="logout-button"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameMenu;
