import React, { useEffect, useState, useMemo } from 'react';
import { supabase, type Profile, type Task, type Guess } from '../lib/supabase';
import { Trophy, Users, Flame, Clock } from 'lucide-react';

type UserScoreDisplay = {
  profile: Profile;
  score: number;
  isCompleted: boolean;
};

export const Dashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    const fetchData = async () => {
      const [
        { data: pData },
        { data: tData },
        { data: gData }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('guesses').select('*')
      ]);

      if (pData) setProfiles(pData);
      if (tData) setTasks(tData);
      if (gData) setGuesses(gData);
      setLoading(false);
    };

    fetchData();

    // Subscribe to changes
    const profilesSub = supabase.channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchData)
      .subscribe();
      
    const tasksSub = supabase.channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
      .subscribe();
      
    const guessesSub = supabase.channel('guesses-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guesses' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(profilesSub);
      supabase.removeChannel(tasksSub);
      supabase.removeChannel(guessesSub);
    };
  }, []);

  // Compute stats
  const { leaderboard, pendingGuessersCount, speedySpies } = useMemo(() => {
    if (profiles.length === 0) {
      return { leaderboard: [], pendingGuessersCount: 0, speedySpies: [] };
    }

    const totalUsers = profiles.length;
    const guessesNeededPerUser = Math.max(0, totalUsers - 1);

    // Count guesses per guesser for the progress card
    const guessesByGuesser = new Map<string, number>();
    profiles.forEach(p => guessesByGuesser.set(p.id, 0));
    guesses.forEach(g => {
      const count = guessesByGuesser.get(g.guesser_id) || 0;
      guessesByGuesser.set(g.guesser_id, count + 1);
    });

    let pendingCount = 0;
    guessesByGuesser.forEach(count => {
      if (count < guessesNeededPerUser) pendingCount++;
    });

    // Speed bonus: sort completed tasks by completed_at, award +3/+2/+1 to first three
    const completedTasks = tasks
      .filter(t => t.is_completed && t.completed_at)
      .sort((a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime());
    const speedBonusMap: Record<string, number> = {};
    completedTasks.forEach((t, idx) => {
      speedBonusMap[t.user_id] = idx === 0 ? 3 : idx === 1 ? 2 : idx === 2 ? 1 : 0;
    });

    // Scoring: 0 by default; +5 base + speed bonus when admin marks complete; +2 per correct guess
    const board: UserScoreDisplay[] = profiles.map(profile => {
      const userTask = tasks.find(t => t.user_id === profile.id);
      const isCompleted = !!(userTask?.is_completed);
      const speedBonus = speedBonusMap[profile.id] ?? 0;
      const correctGuesses = guesses.filter(g => g.guesser_id === profile.id && g.is_correct === true).length;
      const halfCorrectGuesses = guesses.filter(g => g.guesser_id === profile.id && g.is_half_correct === true).length;
      const score = (isCompleted ? 5 + speedBonus : 0) + correctGuesses * 2 + halfCorrectGuesses * 1;
      return { profile, score, isCompleted };
    });

    board.sort((a, b) => b.score - a.score);

    // Top 3 fastest completers for Speedy Spy card
    const speedySpies = completedTasks.slice(0, 3).map(t => profiles.find(p => p.id === t.user_id)).filter(Boolean);

    return { leaderboard: board, pendingGuessersCount: pendingCount, speedySpies };
  }, [profiles, tasks, guesses]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-12 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 bg-clip-text text-transparent">
          Live Dashboard
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Real-time standings and game progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progress Card */}
        <div className="glass-panel p-6 flex flex-col items-center justify-center text-center col-span-1 md:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users size={120} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2 z-10">Guessing Progress</h2>
          {profiles.length <= 1 ? (
            <>
              <div className="text-4xl my-4 z-10">👥</div>
              <p className="text-slate-700 font-bold z-10">No Other Players Yet</p>
              <p className="text-slate-500 text-sm mt-1 z-10">Please invite your friends to play the game!</p>
            </>
          ) : pendingGuessersCount > 0 ? (
            <>
              <div className="text-5xl font-black text-primary-500 my-4 z-10">{pendingGuessersCount}</div>
              <p className="text-slate-600 font-medium z-10">players haven't completed their guesses</p>
            </>
          ) : (
            <>
              <div className="text-5xl font-black text-emerald-500 my-4 z-10 flex items-center gap-4">
                <Trophy className="w-12 h-12" /> All Done!
              </div>
              <p className="text-emerald-700 font-medium z-10">Everyone has guessed every other player!</p>
            </>
          )}
        </div>

        {/* Speedy Spy card */}
        <div className="glass-panel p-6 flex flex-col col-span-1">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-3">
            <Clock className="text-amber-500 w-5 h-5" />
            Speedy Spy
          </h2>
          {speedySpies.length > 0 ? (
            <ul className="space-y-3">
              {speedySpies.map((p, idx) => (
                <li key={p!.id} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                    idx === 0 ? 'bg-yellow-100' : idx === 1 ? 'bg-slate-200' : 'bg-orange-100'
                  }`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </span>
                  <span className="font-semibold text-slate-700">{p!.nickname}</span>
                  <span className="ml-auto flex items-center gap-0.5 text-amber-600 font-bold text-sm">
                    <Flame className="w-3.5 h-3.5" />+{3 - idx}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-sm text-center mt-4">No missions completed yet.</p>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass-panel overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="text-yellow-500 w-6 h-6" />
            Rankings
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Players are shown by their nickname.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Rank</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Player</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.map((userStats, index) => (
                <tr key={userStats.profile.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm">
                      #{index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-slate-800">
                        {userStats.profile.nickname || '(Unknown)'}
                      </div>
                      {userStats.isCompleted && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                          Complete
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xl font-bold text-primary-600">
                      {userStats.score}
                    </span>
                  </td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    No players have joined the game yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
