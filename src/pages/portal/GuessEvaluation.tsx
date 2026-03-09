import React, { useState, useEffect } from 'react';
import { supabase, type Profile, type Task, type Guess } from '../../lib/supabase';
import {
  CheckCircle, XCircle, Loader2, AlertTriangle, RefreshCw
} from 'lucide-react';

type UserRow = { profile: Profile; task: Task | null };

export const GuessEvaluation: React.FC = () => {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: profiles, error: pe }, { data: tasks, error: te }, { data: guessesData, error: ge }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: true }),
        supabase.from('tasks').select('*'),
        supabase.from('guesses').select('*').order('created_at', { ascending: true }),
      ]);
      if (pe) throw pe;
      if (te) throw te;
      if (ge) throw ge;
      setRows((profiles || []).map((p: Profile) => ({
        profile: p,
        task: (tasks || []).find((t: Task) => t.user_id === p.id) ?? null,
      })));
      if (guessesData) setGuesses(guessesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
      setError(err.message || 'Evaluation failed.');
    } finally {
      setEvaluating(null);
    }
  };

  return (
    <div className="p-4 pt-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Guess Evaluations</h1>
          <p className="text-slate-500 mt-1 text-sm">Review each player's guesses and mark them correct or incorrect</p>
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
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : guesses.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">No guesses submitted yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map(({ profile, task }) => {
              const myGuesses = guesses.filter(g => g.guesser_id === profile.id);
              if (myGuesses.length === 0) return null;
              return (
                <div key={profile.id} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-100 to-violet-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                      {profile.nickname.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-800">{profile.nickname}</span>
                    <span className="text-slate-400 text-xs">({profile.real_name})</span>
                    <span className="ml-auto text-xs text-slate-400">{myGuesses.length} guess{myGuesses.length !== 1 ? 'es' : ''}</span>
                  </div>

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
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                              Guess for <span className="text-slate-600">{targetProfile?.nickname ?? '?'}</span>
                            </p>
                            <p className="text-sm text-slate-700 italic">"{g.guessed_task_text}"</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Real Mission</p>
                            {realMission
                              ? <p className="text-sm text-slate-700">{realMission}</p>
                              : <p className="text-xs text-slate-300 italic">Not assigned yet</p>
                            }
                          </div>
                          <div className="flex gap-1.5 justify-end sm:justify-start items-center pt-1">
                            {isEvaluating ? (
                              <Loader2 size={16} className="animate-spin text-teal-500" />
                            ) : (
                              <>
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
                                {(g.is_correct !== null || g.is_half_correct === true) && (
                                  <button
                                    onClick={() => handleEvaluateGuess(g.id, 'clear')}
                                    title="Clear evaluation"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors border bg-white border-slate-200 text-slate-300 hover:text-slate-500">
                                    <span className="text-xs font-bold">?</span>
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
    </div>
  );
};
