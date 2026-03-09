import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import { supabase } from '../../lib/supabase';
import {
  ShieldAlert, Lock, Eye, EyeOff, XCircle, CheckCircle,
  KeyRound, Save, Trash2, AlertTriangle, Loader2
} from 'lucide-react';

export const PortalSettings: React.FC = () => {
  const { unlocked, unlock, changePassword } = useAdmin();
  const navigate = useNavigate();

  // ── Login gate state ──────────────────────────────────────────
  const [pwInput, setPwInput] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState(false);

  // ── Change password state ─────────────────────────────────────
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwChangeMsg, setPwChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Danger zone state ─────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Handlers ──────────────────────────────────────────────────
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = unlock(pwInput);
    if (ok) {
      navigate('/portal/mission_assignment');
    } else {
      setPwError(true);
      setPwInput('');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) {
      setPwChangeMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwChangeMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    changePassword(newPw);
    setNewPw('');
    setConfirmPw('');
    setPwChangeMsg({ type: 'success', text: 'Password updated! Use it next time you log in.' });
  };

  const handleDeleteAll = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    setDeleteMsg(null);
    try {
      const { error: ge } = await supabase.from('guesses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (ge) throw ge;
      const { error: te } = await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (te) throw te;
      const { error: pe } = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (pe) throw pe;
      setDeleteMsg({ type: 'success', text: 'All users, tasks and guesses have been deleted.' });
      setDeleteConfirm('');
    } catch (err: any) {
      setDeleteMsg({ type: 'error', text: err.message || 'Delete failed.' });
    } finally {
      setDeleting(false);
    }
  };

  // ── Login gate ────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
        <div className="glass-panel max-w-sm w-full p-8 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-red-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-violet-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40" />
          <div className="relative z-10">
            <div className="flex flex-col items-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-500 to-orange-500 text-white mb-4 shadow-lg">
                <ShieldAlert size={32} />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">Admin Portal</h1>
              <p className="text-slate-500 text-sm mt-1">Enter the admin password to continue</p>
            </div>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwInput}
                  onChange={e => { setPwInput(e.target.value); setPwError(false); }}
                  placeholder="Password"
                  className={`input-field pr-12 ${pwError ? 'border-red-400 bg-red-50' : ''}`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {pwError && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <XCircle size={14} /> Incorrect password.
                </p>
              )}
              <button
                type="submit"
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(to right, #ef4444, #f97316)' }}
              >
                <Lock size={16} /> Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Settings dashboard ────────────────────────────────────────
  return (
    <div className="p-4 pt-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
          <ShieldAlert className="text-red-500 w-7 h-7" />
          Portal Settings
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Manage admin access and game data</p>
      </div>

      {/* Change Password */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-500 text-white flex items-center justify-center flex-shrink-0">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Change Admin Password</h2>
            <p className="text-slate-500 text-sm">Updates immediately — use the new password next login.</p>
          </div>
        </div>

        {pwChangeMsg && (
          <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
            pwChangeMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {pwChangeMsg.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {pwChangeMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New Password</label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => { setNewPw(e.target.value); setPwChangeMsg(null); }}
                placeholder="Min. 6 characters"
                className="input-field pr-10"
              />
              <button type="button" onClick={() => setShowNewPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex-1 space-y-2 w-full">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Confirm Password</label>
            <input
              type={showNewPw ? 'text' : 'password'}
              value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setPwChangeMsg(null); }}
              placeholder="Re-enter new password"
              className="input-field"
            />
          </div>
          <button
            type="submit"
            disabled={!newPw || !confirmPw}
            className="btn-primary flex items-center gap-2 whitespace-nowrap disabled:opacity-40"
            style={{ background: 'linear-gradient(to right, #7c3aed, #6366f1)' }}
          >
            <Save size={15} /> Update Password
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center flex-shrink-0">
            <Trash2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-700">Danger Zone</h2>
            <p className="text-red-500 text-sm">This action permanently deletes all users, tasks and guesses.</p>
          </div>
        </div>

        {deleteMsg && (
          <div className={`rounded-xl p-4 text-sm flex items-start gap-2 ${
            deleteMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-100 border border-red-200 text-red-700'
          }`}>
            {deleteMsg.type === 'success'
              ? <CheckCircle size={15} className="shrink-0 mt-0.5" />
              : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
            {deleteMsg.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <input
            type="text"
            value={deleteConfirm}
            onChange={e => { setDeleteConfirm(e.target.value); setDeleteMsg(null); }}
            placeholder="Type DELETE to confirm"
            className="input-field max-w-xs border-red-300 text-red-700 placeholder-red-300 focus:ring-red-400"
          />
          <button
            onClick={handleDeleteAll}
            disabled={deleteConfirm !== 'DELETE' || deleting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete All Users
          </button>
        </div>
        <p className="text-red-400 text-xs">
          This cannot be undone. All profiles, missions and guesses will be permanently removed.
        </p>
      </div>
    </div>
  );
};
