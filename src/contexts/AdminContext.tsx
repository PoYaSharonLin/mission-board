import React, { createContext, useContext, useState } from 'react';

const PW_STORAGE_KEY = 'mission_admin_pw';
const DEFAULT_PASSWORD = '12345678';
const SESSION_KEY = 'mission_admin_unlocked';

export const getAdminPassword = () => localStorage.getItem(PW_STORAGE_KEY) ?? DEFAULT_PASSWORD;
export const setAdminPassword = (pw: string) => localStorage.setItem(PW_STORAGE_KEY, pw);

type AdminContextType = {
  unlocked: boolean;
  unlock: (pw: string) => boolean;
  lock: () => void;
  changePassword: (pw: string) => void;
};

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');

  const unlock = (pw: string): boolean => {
    if (pw === getAdminPassword()) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setUnlocked(true);
      return true;
    }
    return false;
  };

  const lock = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
  };

  const changePassword = (pw: string) => {
    setAdminPassword(pw);
  };

  return (
    <AdminContext.Provider value={{ unlocked, unlock, lock, changePassword }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
};
