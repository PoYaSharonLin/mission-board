import { useEffect, useState } from 'react';
import { supabase, type Profile, type Guess } from '../lib/supabase';
import { usePlayer } from '../contexts/PlayerContext';
import { Search, Send, CheckCircle, Loader2 } from 'lucide-react';

export const GuessPage: React.FC = () => {
  const { playerId } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [guesses, setGuesses] = useState<Map<string, Guess>>(new Map());
  const [inputs, setInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (playerId) loadData();
  }, [playerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: profilesData } = await supabase
        .from('profiles').select('*').neq('id', playerId!).order('nickname');
      if (profilesData) setUsers(profilesData);

      const { data: guessesData } = await supabase
        .from('guesses').select('*').eq('guesser_id', playerId!);
      if (guessesData) {
        const map = new Map<string, Guess>();
        guessesData.forEach(g => map.set(g.guessed_user_id, g));
        setGuesses(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time: refresh when admin evaluates a guess
  useEffect(() => {
    if (!playerId) return;
    const sub = supabase.channel(`guesses-eval-${playerId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'guesses',
        filter: `guesser_id=eq.${playerId}`,
      }, payload => {
        setGuesses(prev => {
          const next = new Map(prev);
          const updated = payload.new as Guess;
          next.set(updated.guessed_user_id, updated);
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [playerId]);

  const handleGuessSubmit = async (targetUserId: string, e: React.FormEvent) => {
    e.preventDefault();
    const guessText = inputs[targetUserId]?.trim();
    if (!guessText || !playerId) return;
    try {
      setSubmitting(targetUserId);
      const { data, error } = await supabase.from('guesses')
        .insert({ guesser_id: playerId, guessed_user_id: targetUserId, guessed_task_text: guessText })
        .select().single();
      if (error) throw error;
      setGuesses(prev => new Map(prev).set(targetUserId, data));
      setInputs(prev => ({ ...prev, [targetUserId]: '' }));
    } catch (err: any) {
      alert(err.message || 'Failed to submit guess');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return (
    <div className="min-h-[80vh] flex justify-center items-center">
      <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-4 pt-8 max-w-3xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-3">
          <Search className="w-8 h-8 text-teal-500" /> Guess Missions
        </h1>
        <p className="text-slate-500 mt-2">Can you figure out other players' missions? You can only guess once per player!</p>
      </div>

      {users.length === 0 ? (
        <div className="text-center p-12 glass-panel"><p className="text-slate-500">No other players yet.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {users.map(targetUser => {
            const hasGuessed = guesses.has(targetUser.id);
            const myGuess = guesses.get(targetUser.id);
            const isSubmitting = submitting === targetUser.id;

            // Determine evaluation state
            const isCorrect     = myGuess?.is_correct === true;
            const isHalf        = myGuess?.is_half_correct === true;
            const isIncorrect   = myGuess?.is_correct === false;
            const isEvaluated   = isCorrect || isHalf || isIncorrect;

            const cardBg =
              isCorrect   ? 'bg-emerald-50 border-emerald-300' :
              isHalf      ? 'bg-orange-50 border-orange-300' :
              isIncorrect ? 'bg-red-50 border-red-300' :
              hasGuessed  ? 'bg-slate-50/80 border-slate-200' :
                            'hover:border-teal-300';

            const badgeLabel = isCorrect ? '+2' : isHalf ? '+1' : isIncorrect ? '+0' : null;
            const badgeBg    = isCorrect ? 'bg-emerald-500' : isHalf ? 'bg-orange-400' : 'bg-red-500';

            return (
              <div key={targetUser.id} className={`glass-panel p-6 flex flex-col transition-all relative ${cardBg}`}>
                {/* Evaluation badge */}
                {badgeLabel && (
                  <span className={`absolute top-3 right-3 ${badgeBg} text-white text-xs font-bold px-2 py-0.5 rounded-full shadow`}>
                    {badgeLabel}
                  </span>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-100 to-violet-100 flex items-center justify-center text-teal-700 font-bold text-lg shadow-inner">
                    {targetUser.real_name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-semibold text-lg text-slate-800">{targetUser.real_name}</h3>
                  {hasGuessed && !isEvaluated && <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto" />}
                </div>

                {hasGuessed ? (
                  <div className={`mt-auto rounded-lg p-3 border ${
                    isCorrect   ? 'bg-emerald-100/60 border-emerald-200' :
                    isHalf      ? 'bg-orange-100/60 border-orange-200' :
                    isIncorrect ? 'bg-red-100/60 border-red-200' :
                    'bg-white border-slate-200'
                  }`}>
                    <p className="text-xs text-slate-500 font-medium mb-1">Your guess:</p>
                    <p className="text-slate-700 italic">"{myGuess?.guessed_task_text}"</p>
                    {isEvaluated && (
                      <p className={`text-xs font-semibold mt-2 ${
                        isCorrect ? 'text-emerald-600' : isHalf ? 'text-orange-600' : 'text-red-500'
                      }`}>
                        {isCorrect ? '✅ Correct!' : isHalf ? '⚠️ Partially correct' : '❌ Incorrect'}
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={(e) => handleGuessSubmit(targetUser.id, e)} className="mt-auto flex gap-2">
                    <input
                      type="text"
                      required
                      value={inputs[targetUser.id] || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, [targetUser.id]: e.target.value }))}
                      placeholder="Type your guess..."
                      className="input-field py-2 text-sm flex-1"
                    />
                    <button type="submit" disabled={isSubmitting || !inputs[targetUser.id]?.trim()}
                      className="btn-primary py-2 px-3 text-sm min-w-[44px] flex justify-center items-center">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
