import React, { useState, useEffect } from 'react';
import { supabase, type Profile, type Task, type Guess } from '../lib/supabase';
import {
  ShieldAlert, Trash2, CheckCircle, XCircle, Loader2,
  AlertTriangle, Lock, Eye, EyeOff, RefreshCw, Save, Flame, HelpCircle
} from 'lucide-react';

const ADMIN_PASSWORD = 'Ss20012124';
const SESSION_KEY = 'mission_admin_unlocked';

type UserRow = {
  profile: Profile;
  task: Task | null;
  toggling: boolean;
  saving: boolean;
};

export const AdminPage: React.FC = () => {
  // ── Auth gate ─────────────────────────────────────────────────
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [pwInput, setPwInput] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwInput === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setUnlocked(true);
    } else {
      setPwError(true);
      setPwInput('');
    }
  };

  // ── Data ──────────────────────────────────────────────────────
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Mission text drafts: userId -> current input value
  const [missionDrafts, setMissionDrafts] = useState<Record<string, string>>({});

  // ── Delete zone ───────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Guesses ───────────────────────────────────────────────────
  const [guesses, setGuesses] = useState<Guess[]>([]);

  const fetchData = async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const [{ data: profiles, error: pe }, { data: tasks, error: te }, { data: guessesData, error: ge }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: true }),
        supabase.from('tasks').select('*'),
        supabase.from('guesses').select('*').order('created_at', { ascending: true }),
      ]);
      if (pe) throw pe;
      if (te) throw te;
      if (ge) throw ge;
      if (guessesData) setGuesses(guessesData);
      const merged: UserRow[] = (profiles || []).map((p: Profile) => ({
        profile: p,
        task: (tasks || []).find((t: Task) => t.user_id === p.id) ?? null,
        toggling: false,
        saving: false,
      }));
      setRows(merged);
      // Seed drafts with existing task text (don't overwrite unsaved edits)
      setMissionDrafts(prev => {
        const next = { ...prev };
        merged.forEach(r => {
          if (!(r.profile.id in next)) {
            next[r.profile.id] = r.task?.task_text ?? '';
          }
        });
        return next;
      });
    } catch (err: any) {
      setDataError(err.message || 'Failed to load data.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (unlocked) fetchData();
  }, [unlocked]);

  // ── Save mission text (upsert task row) ───────────────────────
  const handleSaveMission = async (userId: string, currentTask: Task | null, isCompleted: boolean) => {
    const text = (missionDrafts[userId] ?? '').trim();
    if (!text) return;
    setRows(prev => prev.map(r => r.profile.id === userId ? { ...r, saving: true } : r));
    try {
      const { error } = await supabase.from('tasks').upsert({
        id: currentTask?.id ?? crypto.randomUUID(),
        user_id: userId,
        task_text: text,
        is_completed: isCompleted,
        completed_at: currentTask?.completed_at ?? null,
      });
      if (error) throw error;
      setMissionDrafts(prev => { const n = { ...prev }; delete n[userId]; return n; });
      await fetchData();
    } catch (err: any) {
      setDataError(err.message || 'Save failed.');
      setRows(prev => prev.map(r => r.profile.id === userId ? { ...r, saving: false } : r));
    }
  };

  // ── Toggle task completion ─────────────────────────────────────
  const handleToggle = async (userId: string, currentTask: Task | null, markComplete: boolean) => {
    const draftText = (missionDrafts[userId] ?? '').trim();

    if (!currentTask) {
      // No task row yet — create one with draft text or placeholder
      const text = draftText || '(no mission text)';
      setRows(prev => prev.map(r => r.profile.id === userId ? { ...r, toggling: true } : r));
      try {
        const { error } = await supabase.from('tasks').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          task_text: text,
          is_completed: markComplete,
          completed_at: markComplete ? new Date().toISOString() : null,
        });
        if (error) throw error;
        setMissionDrafts(prev => { const n = { ...prev }; delete n[userId]; return n; });
        await fetchData();
      } catch (err: any) {
        setDataError(err.message || 'Toggle failed.');
        setRows(prev => prev.map(r => r.profile.id === userId ? { ...r, toggling: false } : r));
      }
      return;
    }

    setRows(prev => prev.map(r => r.profile.id === userId ? { ...r, toggling: true } : r));
    try {
      const { error } = await supabase.from('tasks')
        .update(
          markComplete
            ? { is_completed: true, completed_at: new Date().toISOString() }
            : { is_completed: false, completed_at: null }
        )
        .eq('id', currentTask.id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      setDataError(err.message || 'Toggle failed.');
      setRows(prev => prev.map(r => r.profile.id === userId ? { ...r, toggling: false } : r));
    }
  };

  // ── Evaluate a guess (set is_correct) ─────────────────────────
  const [evaluating, setEvaluating] = useState<string | null>(null);

  const handleEvaluateGuess = async (guessId: string, verdict: 'correct' | 'half' | 'incorrect' | 'clear') => {
    setEvaluating(guessId);
    const update =
      verdict === 'correct'   ? { is_correct: true,  is_half_correct: null  } :
      verdict === 'half'      ? { is_correct: null,  is_half_correct: true  } :
      verdict === 'incorrect' ? { is_correct: false, is_half_correct: null  } :
                                { is_correct: null,  is_half_correct: null  };
    try {
      const { error } = await supabase.from('guesses').update(update).eq('id', guessId);
      if (error) throw error;
      setGuesses(prev => prev.map(g => g.id === guessId ? { ...g, ...update } : g));
    } catch (err: any) {
      setDataError(err.message || 'Evaluation failed.');
    } finally {
      setEvaluating(null);
    }
  };

  // ── Delete all users ──────────────────────────────────────────
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
      setMissionDrafts({});
      await fetchData();
    } catch (err: any) {
      setDeleteMsg({ type: 'error', text: err.message || 'Delete failed.' });
    } finally {
      setDeleting(false);
    }
  };

  // ── Password gate UI ──────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
              <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(to right, #ef4444, #f97316)' }}>
                <Lock size={16} /> Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin dashboard UI ────────────────────────────────────────
  return (
    <div className="p-4 pt-12 max-w-5xl mx-auto space-y-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <ShieldAlert className="text-red-500 w-8 h-8" />
            Admin Portal
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Manage users and task completions</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loadingData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          <RefreshCw size={15} className={loadingData ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {dataError && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {dataError}
        </div>
      )}

      {/* ── Section 1: Task completion table ── */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">
            Mission Assignments ({rows.length})
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Edit mission text and toggle completion status directly</p>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-slate-500 py-16">No users registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 w-32">Real Name</th>
                  <th className="px-4 py-3 w-28">Nickname</th>
                  <th className="px-4 py-3">Mission</th>
                  <th className="px-4 py-3 text-center w-32">Status</th>
                  <th className="px-4 py-3 text-center w-28">Speed Bonus</th>
                  <th className="px-4 py-3 text-center w-24">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  // Compute speed bonus map from completed tasks sorted by completed_at
                  const completed = rows
                    .filter(r => r.task?.is_completed && r.task.completed_at)
                    .sort((a, b) => new Date(a.task!.completed_at!).getTime() - new Date(b.task!.completed_at!).getTime());
                  const bonusMap: Record<string, number> = {};
                  completed.forEach((r, idx) => {
                    bonusMap[r.profile.id] = idx === 0 ? 3 : idx === 1 ? 2 : idx === 2 ? 1 : 0;
                  });

                  return rows.map(({ profile, task, toggling, saving }) => {
                    const draft = missionDrafts[profile.id] ?? task?.task_text ?? '';
                    const originalText = task?.task_text ?? '';
                    const isDirty = draft.trim() !== originalText.trim();
                    const speedBonus = bonusMap[profile.id] ?? 0;
                  return (
                    <tr key={profile.id} className="hover:bg-slate-50/40 transition-colors align-middle">
                      {/* Real name */}
                      <td className="px-4 py-3 font-semibold text-slate-800 text-sm">{profile.real_name}</td>

                      {/* Nickname */}
                      <td className="px-4 py-3 text-slate-500 text-sm">{profile.nickname}</td>

                      {/* Mission input */}
                      <td className="px-4 py-3">
                        <textarea
                          value={draft}
                          onChange={e => setMissionDrafts(prev => ({ ...prev, [profile.id]: e.target.value }))}
                          placeholder="Type mission here…"
                          rows={3}
                          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 placeholder-slate-300 outline-none transition-all resize-y
                            ${isDirty
                              ? 'border-primary-400 ring-1 ring-primary-200 bg-primary-50/30'
                              : 'border-slate-200 bg-slate-50 focus:border-primary-300 focus:ring-1 focus:ring-primary-100'
                            }`}
                        />
                      </td>

                      {/* Status toggle */}
                      <td className="px-4 py-3 text-center">
                        {toggling ? (
                          <Loader2 size={16} className="animate-spin text-primary-500 mx-auto" />
                        ) : (
                          <button
                            onClick={() => handleToggle(profile.id, task, !(task?.is_completed ?? false))}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                              task?.is_completed
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                          >
                            {task?.is_completed
                              ? <><CheckCircle size={12} /> Complete</>
                              : <><XCircle size={12} /> Pending</>
                            }
                          </button>
                        )}
                      </td>

                      {/* Speed Bonus */}
                      <td className="px-4 py-3 text-center">
                        {speedBonus > 0 ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            speedBonus === 3 ? 'bg-yellow-100 text-yellow-700' :
                            speedBonus === 2 ? 'bg-slate-200 text-slate-600' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            <Flame size={11} /> +{speedBonus}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Save button */}
                      <td className="px-4 py-3 text-center">
                        {saving ? (
                          <Loader2 size={16} className="animate-spin text-primary-500 mx-auto" />
                        ) : (
                          <button
                            onClick={() => handleSaveMission(profile.id, task, task?.is_completed ?? false)}
                            disabled={!isDirty || !draft.trim()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors
                              disabled:opacity-30 disabled:cursor-not-allowed
                              enabled:border-primary-400 enabled:text-primary-700 enabled:bg-primary-50 enabled:hover:bg-primary-100"
                          >
                            <Save size={12} /> Save
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 2: Guess Evaluations ── */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Guess Evaluations</h2>
          <p className="text-slate-500 text-sm mt-0.5">Review each player's guesses and mark them correct or incorrect</p>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : guesses.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">No guesses submitted yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map(({ profile }) => {
              const myGuesses = guesses.filter(g => g.guesser_id === profile.id);
              if (myGuesses.length === 0) return null;
              return (
                <div key={profile.id} className="p-5">
                  {/* Guesser header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-100 to-violet-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                      {profile.nickname.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-800">{profile.nickname}</span>
                    <span className="text-slate-400 text-xs">({profile.real_name})</span>
                    <span className="ml-auto text-xs text-slate-400">{myGuesses.length} guess{myGuesses.length !== 1 ? 'es' : ''}</span>
                  </div>

                  {/* Guess rows */}
                  <div className="space-y-2">
                    {myGuesses.map(g => {
                      const targetProfile = rows.find(r => r.profile.id === g.guessed_user_id)?.profile;
                      const realMission = rows.find(r => r.profile.id === g.guessed_user_id)?.task?.task_text;
                      const isEvaluating = evaluating === g.id;
                      return (
                        <div key={g.id} className={`rounded-xl border p-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-start ${
                          g.is_correct === true    ? 'bg-emerald-50 border-emerald-200' :
                          g.is_half_correct === true ? 'bg-orange-50 border-orange-200' :
                          g.is_correct === false   ? 'bg-red-50 border-red-200' :
                          'bg-slate-50 border-slate-200'
                        }`}>
                          {/* Guess */}
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                              Guess for <span className="text-slate-600">{targetProfile?.nickname ?? '?'}</span>
                            </p>
                            <p className="text-sm text-slate-700 italic">"{g.guessed_task_text}"</p>
                          </div>

                          {/* Real mission */}
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Real Mission</p>
                            {realMission
                              ? <p className="text-sm text-slate-700">{realMission}</p>
                              : <p className="text-xs text-slate-300 italic">Not assigned yet</p>
                            }
                          </div>

                          {/* Evaluate buttons */}
                          <div className="flex gap-1.5 justify-end sm:justify-start items-center pt-1">
                            {isEvaluating ? (
                              <Loader2 size={16} className="animate-spin text-primary-500" />
                            ) : (
                              <>
                                {/* ✅ Correct */}
                                <button
                                  onClick={() => handleEvaluateGuess(g.id, g.is_correct === true ? 'clear' : 'correct')}
                                  title="Mark correct (+2)"
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
                                    g.is_correct === true
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-600'
                                  }`}>
                                  <CheckCircle size={15} />
                                </button>
                                {/* ⚠️ Half-correct */}
                                <button
                                  onClick={() => handleEvaluateGuess(g.id, g.is_half_correct === true ? 'clear' : 'half')}
                                  title="Mark half-correct (+1)"
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
                                    g.is_half_correct === true
                                      ? 'bg-orange-400 border-orange-400 text-white'
                                      : 'bg-white border-slate-200 text-slate-400 hover:border-orange-400 hover:text-orange-500'
                                  }`}>
                                  <AlertTriangle size={15} />
                                </button>
                                {/* ❌ Incorrect */}
                                <button
                                  onClick={() => handleEvaluateGuess(g.id, g.is_correct === false ? 'clear' : 'incorrect')}
                                  title="Mark incorrect (+0)"
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
                                    g.is_correct === false
                                      ? 'bg-red-500 border-red-500 text-white'
                                      : 'bg-white border-slate-200 text-slate-400 hover:border-red-400 hover:text-red-500'
                                  }`}>
                                  <XCircle size={15} />
                                </button>
                                {/* ? Clear */}
                                {(g.is_correct !== null || g.is_half_correct === true) && (
                                  <button
                                    onClick={() => handleEvaluateGuess(g.id, 'clear')}
                                    title="Clear evaluation"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors border bg-white border-slate-200 text-slate-300 hover:text-slate-500">
                                    <HelpCircle size={14} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 3: Danger zone ── */}
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
            placeholder='Type DELETE to confirm'
            className="input-field max-w-xs border-red-300 text-red-700 placeholder-red-300 focus:ring-red-400"
          />
          <button
            onClick={handleDeleteAll}
            disabled={deleteConfirm !== 'DELETE' || deleting || rows.length === 0}
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

export default AdminPage;
