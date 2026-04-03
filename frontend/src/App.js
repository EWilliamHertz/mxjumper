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
      <h1 className="font-pixel text-2xl text-[#FFD700] mb-4">PIXEL QUEST</h1>
      <div className="font-body text-[#8b8b99] animate-pulse">Loading...</div>
    </div>
  </div>
);

// Game content router
const GameContent = () => {
  const { player, gameState } = useGame();

  // No player created yet
  if (!player) {
    return <CharacterCreation />;
  }

  // Route based on game state
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
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
