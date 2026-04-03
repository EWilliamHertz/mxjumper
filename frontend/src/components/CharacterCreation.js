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
        background: 'linear-gradient(135deg, #050505 0%, #12121c 50%, #1a1a2e 100%)'
      }}
    >
      <div className="game-panel w-full max-w-lg" data-testid="character-creation-panel">
        <div className="game-panel-inner">
          <h1 className="font-pixel text-lg text-center mb-2 text-[#FFD700]">
            CREATE YOUR HERO
          </h1>
          <p className="font-body text-center text-[#8b8b99] mb-6">
            Enter the world of Pixel Quest
          </p>

          {/* Preview */}
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 bg-[#1a1a2e] border-2 border-white flex items-center justify-center">
              <div className="w-16 h-24 bg-[#00E5FF] relative">
                {/* Simple character preview */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#FFD700] rounded-full"></div>
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-[#FF3B30]"></div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-pixel text-xs block mb-2">CHARACTER NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="game-input w-full text-center"
                placeholder="Enter name..."
                maxLength={20}
                data-testid="character-name-input"
              />
            </div>

            {/* Starting Stats Display */}
            <div className="game-panel bg-[#0a0a14]">
              <div className="p-3">
                <h3 className="font-pixel text-xs mb-3 text-[#00E5FF]">STARTING STATS</h3>
                <div className="grid grid-cols-2 gap-2 font-body text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8b8b99]">HP:</span>
                    <span>100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b8b99]">MP:</span>
                    <span>50</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b8b99]">STR:</span>
                    <span>10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b8b99]">AGI:</span>
                    <span>10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b8b99]">INT:</span>
                    <span>10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b8b99]">VIT:</span>
                    <span>10</span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-[#FF3366] font-body text-sm p-2 border border-[#FF3366] bg-[#FF336620]" data-testid="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="game-button primary w-full py-3"
              data-testid="create-character-button"
            >
              {loading ? 'CREATING...' : 'BEGIN ADVENTURE'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreation;
