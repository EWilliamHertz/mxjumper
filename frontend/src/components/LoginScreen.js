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
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #050505 0%, #12121c 50%, #1a1a2e 100%)',
        backgroundImage: `url('https://images.pexels.com/photos/7026467/pexels-photo-7026467.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay'
      }}
    >
      <div className="game-panel w-full max-w-md" data-testid="auth-panel">
        <div className="game-panel-inner">
          <h1 className="font-pixel text-xl text-center mb-6 text-[#FFD700]" data-testid="game-title">
            PIXEL QUEST
          </h1>
          
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`game-button flex-1 ${isLogin ? 'border-[#00E5FF] text-[#00E5FF]' : ''}`}
              data-testid="login-tab"
            >
              LOGIN
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`game-button flex-1 ${!isLogin ? 'border-[#00E5FF] text-[#00E5FF]' : ''}`}
              data-testid="register-tab"
            >
              REGISTER
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="font-pixel text-xs block mb-2">USERNAME</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="game-input w-full"
                  placeholder="Enter username..."
                  data-testid="username-input"
                />
              </div>
            )}
            
            <div>
              <label className="font-pixel text-xs block mb-2">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="game-input w-full"
                placeholder="Enter email..."
                required
                data-testid="email-input"
              />
            </div>
            
            <div>
              <label className="font-pixel text-xs block mb-2">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="game-input w-full"
                placeholder="Enter password..."
                required
                data-testid="password-input"
              />
            </div>

            {(localError || error) && (
              <div className="text-[#FF3366] font-body text-sm p-2 border border-[#FF3366] bg-[#FF336620]" data-testid="error-message">
                {localError || error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="game-button primary w-full py-3"
              data-testid="submit-button"
            >
              {loading ? 'LOADING...' : (isLogin ? 'START GAME' : 'CREATE ACCOUNT')}
            </button>
          </form>

          <div className="mt-6 text-center text-[#8b8b99] font-body text-sm">
            <p>MapleStory-style platformer × FFX combat</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
