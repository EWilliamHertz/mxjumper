import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const LoginScreen = () => {
  const { login, register, error } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);

    let result;
    if (isLogin) {
      result = await login(email, password);
    } else {
      if (!username.trim()) {
        setLocalError('Username is required');
        setLoading(false);
        return;
      }
      result = await register(email, password, username);
    }

    if (!result.success) {
      setLocalError(result.error);
    }
    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-20 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Stars */}
        {[...Array(50)].map((_, i) => (
          <div 
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.7 + 0.3
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md" data-testid="auth-panel">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 mb-2" data-testid="game-title">
            MXJumper
          </h1>
          <p className="text-slate-400 text-lg">Adventure Awaits!</p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/80 backdrop-blur-lg border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-4 text-center font-bold transition-all ${
                isLogin 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              data-testid="login-tab"
            >
              🔑 LOGIN
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-4 text-center font-bold transition-all ${
                !isLogin 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              data-testid="register-tab"
            >
              ✨ REGISTER
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {!isLogin && (
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-2">👤 USERNAME</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Choose a username..."
                  data-testid="username-input"
                />
              </div>
            )}
            
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-2">📧 EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enter your email..."
                required
                data-testid="email-input"
              />
            </div>
            
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-2">🔒 PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enter password..."
                required
                data-testid="password-input"
              />
            </div>

            {(localError || error) && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl px-4 py-3 text-red-400" data-testid="error-message">
                ⚠️ {localError || error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                isLogin
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
                  : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500'
              } text-white shadow-lg ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              data-testid="submit-button"
            >
              {loading ? '⏳ Loading...' : (isLogin ? '🎮 START GAME' : '🚀 CREATE ACCOUNT')}
            </button>
          </form>

          <div className="bg-slate-800/50 px-6 py-4 text-center">
            <p className="text-slate-400 text-sm">
              🗡️ MapleStory-style platformer × Final Fantasy combat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
