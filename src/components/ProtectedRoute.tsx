import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';

export const ProtectedRoute: React.FC = () => {
  const { playerId, loading } = usePlayer();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!playerId) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const PublicRoute: React.FC = () => {
  const { playerId, loading } = usePlayer();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (playerId) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
