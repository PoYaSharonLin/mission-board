import { useEffect, useState } from 'react';
import { supabase, type Profile, type Task } from '../lib/supabase';
import { usePlayer } from '../contexts/PlayerContext';
import { Target, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { playerId } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (playerId) loadData();
  }, [playerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: profileData, error: pe } = await supabase
        .from('profiles').select('*').eq('id', playerId!).maybeSingle();
      if (pe) throw pe;
      if (profileData) setProfile(profileData);

      const { data: taskData, error: te } = await supabase
        .from('tasks').select('*').eq('user_id', playerId!).maybeSingle();
      if (te) throw te;
      if (taskData) setTask(taskData);
    } catch (err: any) {
      setError('Failed to load your mission.');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time updates so status changes from admin are instant
  useEffect(() => {
    if (!playerId) return;
    const sub = supabase.channel(`task-${playerId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks',
        filter: `user_id=eq.${playerId}`,
      }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [playerId]);

  if (loading) return (
    <div className="min-h-[80vh] flex justify-center items-center">
      <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-4 pt-8 max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-3">
          <Target className="w-8 h-8 text-teal-500" /> My Mission
        </h1>
        {profile && (
          <p className="text-slate-500 mt-2">
            Playing as <span className="font-semibold text-slate-700">{profile.nickname}</span>
            {' '}(<span className="text-slate-500">{profile.real_name}</span>)
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 text-red-600 border border-red-100 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Mission card */}
      {task ? (
        <div className={`rounded-2xl border-2 p-6 sm:p-8 transition-all ${
          task.is_completed
            ? 'bg-emerald-50 border-emerald-300'
            : 'glass-panel border-slate-200'
        }`}>
          {/* Status badge */}
          <div className="flex items-center gap-2 mb-5">
            {task.is_completed ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                <CheckCircle className="w-4 h-4" /> Mission Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
                <Clock className="w-4 h-4" /> In Progress
              </span>
            )}
          </div>

          {/* Mission text */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Your Secret Mission</p>
            <p className="text-lg font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
              {task.task_text}
            </p>
          </div>

          {/* Completion timestamp */}
          {task.is_completed && task.completed_at && (
            <p className="text-sm text-emerald-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed on {new Date(task.completed_at).toLocaleString()}
            </p>
          )}
        </div>
      ) : (
        /* No mission assigned yet */
        <div className="glass-panel p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-teal-100 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-violet-100 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse delay-700" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-400 to-violet-400 text-white mb-5 shadow-lg">
              <Target size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">No Mission Yet</h2>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              Your mission hasn't been assigned yet. Check back soon — the admin will assign it shortly!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
