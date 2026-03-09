import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { ShieldAlert } from 'lucide-react';

export const AdminProtectedRoute: React.FC = () => {
  const { unlocked } = useAdmin();

  if (!unlocked) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-slate-200 to-slate-300 flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-10 h-10 text-slate-400" />
        </div>
        <h1 className="text-6xl font-black text-slate-200">404</h1>
        <p className="text-xl font-bold text-slate-700">Page Not Found</p>
        <p className="text-slate-400 text-sm max-w-xs">
          This page doesn't exist or you don't have permission to view it.
        </p>
      </div>
    );
  }

  return <Outlet />;
};
