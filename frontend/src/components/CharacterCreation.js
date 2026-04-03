import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';

export const CharacterCreation = () => {
  const { createPlayer } = useGame();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    setLoading(true);
    setError('');
    
    const result = await createPlayer(name.trim());
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg" data-testid="character-creation-panel">
        <div className="bg-slate-900/80 backdrop-blur-lg border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-center">
            <h1 className="text-2xl font-black text-white">🦸 CREATE YOUR HERO</h1>
            <p className="text-amber-100/80 text-sm mt-1">Enter the world of Pixel Quest</p>
          </div>

          <div className="p-6">
            {/* Character Preview */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-32 h-40 bg-gradient-to-b from-slate-700 to-slate-800 rounded-2xl border-4 border-slate-600 flex items-center justify-center shadow-xl">
                  <div className="text-center">
                    {/* Character body */}
                    <div className="w-16 h-20 relative mx-auto">
                      {/* Head */}
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-200 to-amber-300 rounded-full mx-auto relative">
                        <div className="absolute top-3 left-2 w-2 h-2 bg-slate-800 rounded-full" />
                        <div className="absolute top-3 right-2 w-2 h-2 bg-slate-800 rounded-full" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-gradient-to-r from-amber-700 to-amber-800 rounded-t-full" />
                      </div>
                      {/* Body */}
                      <div className="w-10 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg mx-auto -mt-1" />
                      {/* Legs */}
                      <div className="flex justify-center gap-1 -mt-1">
                        <div className="w-3 h-4 bg-gradient-to-b from-blue-700 to-blue-800 rounded" />
                        <div className="w-3 h-4 bg-gradient-to-b from-blue-700 to-blue-800 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-amber-900 px-3 py-1 rounded-full text-xs font-bold">
                  HERO
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-2">✏️ CHARACTER NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl px-4 py-3 text-white text-center text-lg placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="Enter your hero's name..."
                  maxLength={20}
                  data-testid="character-name-input"
                />
              </div>

              {/* Starting Stats */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <h3 className="text-cyan-400 text-sm font-bold mb-3">📊 STARTING STATS</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'HP', value: 100, color: 'text-red-400' },
                    { label: 'MP', value: 50, color: 'text-cyan-400' },
                    { label: 'STR', value: 10, color: 'text-orange-400' },
                    { label: 'AGI', value: 10, color: 'text-green-400' },
                    { label: 'INT', value: 10, color: 'text-purple-400' },
                    { label: 'VIT', value: 10, color: 'text-pink-400' },
                  ].map(stat => (
                    <div key={stat.label} className="flex justify-between items-center bg-slate-900/50 rounded-lg px-3 py-2">
                      <span className={`${stat.color} font-bold text-sm`}>{stat.label}</span>
                      <span className="text-white font-bold">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl px-4 py-3 text-red-400" data-testid="error-message">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                data-testid="create-character-button"
              >
                {loading ? '⏳ Creating...' : '⚔️ BEGIN ADVENTURE'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreation;
