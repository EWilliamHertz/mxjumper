import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { GameProvider, useGame } from "./contexts/GameContext";
import LoginScreen from "./components/LoginScreen";
import CharacterCreation from "./components/CharacterCreation";
import Overworld from "./components/Overworld";
import CombatScreen from "./components/CombatScreen";
import GameMenu from "./components/GameMenu";

// Loading component
const LoadingScreen = () => (
  <div 
    className="min-h-screen flex items-center justify-center"
    style={{ background: '#050505' }}
  >
    <div className="text-center">
      <h1 className="font-pixel text-2xl text-[#FFD700] mb-4">MXJumper</h1>
      <div className="font-body text-[#8b8b99] animate-pulse">Loading...</div>
    </div>
  </div>
);

// Game content router
const GameContent = () => {
  const { player, playerLoading, isLoadingPlayer, gameState } = useGame();

  // Block rendering until the backend confirms if the player exists or not
  if (playerLoading || isLoadingPlayer) {
    return <LoadingScreen />;
  }

  // Backend confirmed 404 - this user has no character yet
  if (!player) {
    return <CharacterCreation />;
  }

  // Player exists, route based on game state
  switch (gameState) {
    case 'combat':
      return <CombatScreen />;
    case 'menu':
      return <GameMenu />;
    case 'overworld':
    default:
      return <Overworld />;
  }
};

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <GameProvider>
      {children}
    </GameProvider>
  );
};

// Public route wrapper (redirects if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/game" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App h-screen w-screen overflow-hidden bg-[#050505] flex flex-col items-center justify-center">
          {/* Content Wrapper: Scale down slightly but ensure it fills the viewport */}
          <div className="w-full h-full transform scale-[0.98] lg:scale-100 transition-transform duration-500">
            <Routes>
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <LoginScreen />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/game" 
                element={
                  <ProtectedRoute>
                    <GameContent />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/game" replace />} />
              <Route path="*" element={<Navigate to="/game" replace />} />
            </Routes>
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
