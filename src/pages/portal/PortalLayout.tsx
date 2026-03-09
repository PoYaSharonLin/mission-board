import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import { ShieldAlert, ClipboardList, Search, Settings, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

export const PortalLayout: React.FC = () => {
  const { unlocked, lock } = useAdmin();
  const navigate = useNavigate();

  const handleLock = () => {
    lock();
    navigate('/portal');
  };

  const navLinks = [
    { to: '/portal', label: 'Settings', mobileLabel: 'Settings', icon: Settings, end: true },
    { to: '/portal/mission_assignment', label: 'Mission Assignments', mobileLabel: 'Missions', icon: ClipboardList, end: false },
    { to: '/portal/guess_evaluation', label: 'Guess Evaluations', mobileLabel: 'Guesses', icon: Search, end: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16 md:pb-0">
      {/* Top navbar – desktop */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-sm hidden sm:inline">Admin Portal</span>
            </div>

            {/* Nav links – desktop only */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-red-50 text-red-600'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </div>

            {/* Lock button */}
            {unlocked && (
              <button
                onClick={handleLock}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Lock</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 w-full z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-lg md:hidden">
        <div className="flex justify-around items-center h-14">
          {navLinks.map(({ to, mobileLabel, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-red-500' : 'text-slate-400'
              )}
            >
              <Icon className="w-5 h-5" />
              {mobileLabel}
            </NavLink>
          ))}
          {unlocked && (
            <button
              onClick={handleLock}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              <Lock className="w-5 h-5" />
              Lock
            </button>
          )}
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full pt-14 px-2 sm:px-4">
        <Outlet />
      </main>
    </div>
  );
};
