import React, { createContext, useContext, useEffect, useState } from 'react';

const PLAYER_ID_KEY = 'mission_player_id';

type PlayerContextType = {
  playerId: string | null;
  loading: boolean;
  login: (id: string) => void;
  logout: () => void;
};

const PlayerContext = createContext<PlayerContextType>({
  playerId: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(PLAYER_ID_KEY);
    setPlayerId(stored);
    setLoading(false);
  }, []);

  const login = (id: string) => {
    localStorage.setItem(PLAYER_ID_KEY, id);
    setPlayerId(id);
  };

  const logout = () => {
    localStorage.removeItem(PLAYER_ID_KEY);
    setPlayerId(null);
  };

  return (
    <PlayerContext.Provider value={{ playerId, loading, login, logout }}>
      {children}
    </PlayerContext.Provider>
  );
};

// Call this after successful login
export const setPlayerSession = (id: string) => {
  localStorage.setItem(PLAYER_ID_KEY, id);
};
