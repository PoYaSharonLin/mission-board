import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';
import { LayoutDashboard, Target, Search, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

export const Navbar: React.FC = () => {
  const { playerId, logout } = usePlayer();
  const location = useLocation();

  if (!playerId) return null;

  const links = [
    { to: '/dashboard', label: 'Dashboard', mobileLabel: 'Board', icon: LayoutDashboard },
    { to: '/profile', label: 'My Mission', mobileLabel: 'Mission', icon: Target },
    { to: '/guess', label: 'Guess Tasks', mobileLabel: 'Guess', icon: Search },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/#/login';
  };

  return (
    <nav className="fixed bottom-0 w-full md:top-0 md:bottom-auto glass-panel z-50 md:rounded-none md:border-x-0 md:border-t-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="hidden md:flex items-center">
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-violet-600 bg-clip-text text-transparent">
              🎯 Mission Board
            </span>
          </div>

          <div className="flex w-full md:w-auto justify-around md:justify-end items-center md:space-x-8">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'flex flex-col md:flex-row items-center justify-center md:space-x-2 w-full md:w-auto py-2 px-1 font-medium transition-colors duration-200 min-w-0',
                    isActive
                      ? 'text-teal-600 border-t-2 md:border-t-0 md:border-b-2 border-teal-600'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  <Icon className="w-5 h-5 md:w-4 md:h-4 mb-0.5 md:mb-0 shrink-0" />
                  <span className="text-[10px] leading-tight md:hidden truncate">{link.mobileLabel}</span>
                  <span className="hidden md:inline text-sm">{link.label}</span>
                </Link>
              );
            })}

            <button
              onClick={handleLogout}
              className="flex flex-col md:flex-row items-center justify-center md:space-x-2 w-full md:w-auto py-2 px-1 font-medium text-slate-500 hover:text-red-500 transition-colors duration-200"
            >
              <LogOut className="w-5 h-5 md:w-4 md:h-4 mb-0.5 md:mb-0 shrink-0" />
              <span className="text-[10px] leading-tight md:hidden">Logout</span>
              <span className="hidden md:inline text-sm">Log out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
