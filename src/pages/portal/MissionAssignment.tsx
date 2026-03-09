import React, { useState, useEffect } from 'react';
import { supabase, type Profile, type Task } from '../../lib/supabase';
import {
  CheckCircle, XCircle, Loader2, AlertTriangle, RefreshCw, Save, Flame
} from 'lucide-react';

type UserRow = {
  profile: Profile;
  task: Task | null;
  toggling: boolean;
  saving: boolean;
};

export const MissionAssignment: React.FC = () => {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missionDrafts, setMissionDrafts] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: profiles, error: pe }, { data: tasks, error: te }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: true }),
        supabase.from('tasks').select('*'),
      ]);
      if (pe) throw pe;
      if (te) throw te;
      const merged: UserRow[] = (profiles || []).map((p: Profile) => ({
        profile: p,
        task: (tasks || []).find((t: Task) => t.user_id === p.id) ?? null,
        toggling: false,
        saving: false,
      }));
      setRows(merged);
      setMissionDrafts(prev => {
        const next = { ...prev };
        merged.forEach(r => {
          if (!(r.profile.id in next)) next[r.profile.id] = r.task?.task_text ?? '';
        });
        return next;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
      setError(err.message || 'Save failed.');
      setRows(prev => prev.map(r => r.profile.id === userId ? { ...r, saving: false } : r));
    }
  };

  const handleToggle = async (userId: string, currentTask: Task | null, markComplete: boolean) => {
    const draftText = (missionDrafts[userId] ?? '').trim();
    if (!currentTask) {
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
        setError(err.message || 'Toggle failed.');
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
      setError(err.message || 'Toggle failed.');
      setRows(prev => prev.map(r => r.profile.id === userId ? { ...r, toggling: false } : r));
    }
  };

  return (
    <div className="p-4 pt-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Mission Assignments</h1>
          <p className="text-slate-500 mt-1 text-sm">Edit mission text and toggle completion status</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
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
                        <td className="px-4 py-3 font-semibold text-slate-800 text-sm">{profile.real_name}</td>
                        <td className="px-4 py-3 text-slate-500 text-sm">{profile.nickname}</td>
                        <td className="px-4 py-3">
                          <textarea
                            value={draft}
                            onChange={e => setMissionDrafts(prev => ({ ...prev, [profile.id]: e.target.value }))}
                            placeholder="Type mission here…"
                            rows={3}
                            className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 placeholder-slate-300 outline-none transition-all resize-y
                              ${isDirty
                                ? 'border-teal-400 ring-1 ring-teal-200 bg-teal-50/30'
                                : 'border-slate-200 bg-slate-50 focus:border-teal-300 focus:ring-1 focus:ring-teal-100'
                              }`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {toggling ? (
                            <Loader2 size={16} className="animate-spin text-teal-500 mx-auto" />
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
                        <td className="px-4 py-3 text-center">
                          {saving ? (
                            <Loader2 size={16} className="animate-spin text-teal-500 mx-auto" />
                          ) : (
                            <button
                              onClick={() => handleSaveMission(profile.id, task, task?.is_completed ?? false)}
                              disabled={!isDirty || !draft.trim()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors
                                disabled:opacity-30 disabled:cursor-not-allowed
                                enabled:border-teal-400 enabled:text-teal-700 enabled:bg-teal-50 enabled:hover:bg-teal-100"
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
    </div>
  );
};
