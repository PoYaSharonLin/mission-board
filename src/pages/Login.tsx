import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePlayer } from '../contexts/PlayerContext';
import { ShieldCheck, ArrowRight, Loader2, AlertCircle, PartyPopper } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = usePlayer();
  const navigate = useNavigate();
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if nickname already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, real_name')
        .eq('nickname', nickname.trim())
        .maybeSingle();

      let playerId: string;

      if (existing) {
        // Returning player — verify real name matches
        if (existing.real_name.toLowerCase() !== realName.trim().toLowerCase()) {
          throw new Error('Nickname taken — or real name does not match. Check your details.');
        }
        playerId = existing.id;
      } else {
        // New player — create profile with a fresh UUID
        playerId = crypto.randomUUID();
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: playerId, real_name: realName.trim(), nickname: nickname.trim() });

        if (insertError) throw insertError;

        // Show success screen for new players
        setRegisteredName(nickname.trim());
        setRegistered(true);
        setLoading(false);
        return;
      }

      // Returning player — log straight in using context
      login(playerId);
      navigate('/dashboard');

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    setRegistered(false);
    setRealName('');
    setNickname('');
  };

  // Registration success screen
  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel max-w-md w-full p-8 text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-white mb-6 shadow-lg">
              <PartyPopper size={32} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">You're registered! 🎉</h2>
            <p className="text-slate-600 mb-2">
              Welcome, <span className="font-semibold text-teal-600">{registeredName}</span>!
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Your account is created. Next time you visit, just enter your
              <span className="font-medium"> real name</span> and
              <span className="font-medium"> nickname</span> to log back in.
            </p>
            <button
              onClick={() => { window.location.href = '/#/dashboard'; }}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 group"
            >
              <span>Enter Mission Board</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={handleGoToLogin} className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse delay-1000"></div>

        <div className="relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-violet-500 text-white mb-6 shadow-lg -rotate-6">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Mission Board</h1>
            <p className="text-slate-500">Enter your details to join the game!</p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 text-red-600 border border-red-100 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="realName" className="block text-sm font-semibold text-slate-700">
                Your Real Name
              </label>
              <input
                id="realName"
                type="text"
                required
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                className="input-field py-3"
                placeholder="e.g. Jane Doe"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="nickname" className="block text-sm font-semibold text-slate-700">
                Nickname
              </label>
              <input
                id="nickname"
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input-field py-3"
                placeholder="e.g. Shadow Ninja"
              />
              <p className="text-xs text-slate-400">
                Returning player? Same name + nickname logs you back in.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !realName.trim() || !nickname.trim()}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 group mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Join the Game</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
