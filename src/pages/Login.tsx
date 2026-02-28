import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePlayer } from '../contexts/PlayerContext';
import { ShieldCheck, ArrowRight, Loader2, AlertCircle, PartyPopper, Eye, EyeOff } from 'lucide-react';

// SHA-256 hash using the Web Crypto API (built into all modern browsers)
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const Login: React.FC = () => {
  const { login } = usePlayer();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'register' | 'login'>('register');

  // Shared fields
  const [realName, setRealName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Register-only field
  const [nickname, setNickname] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState('');

  const resetForm = () => {
    setRealName(''); setPassword(''); setNickname(''); setError(null); setShowPw(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      // Check real name not already taken
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('real_name', realName.trim()).maybeSingle();
      if (existing) throw new Error('That real name is already registered. Try logging in instead.');

      // Check spy name not already taken
      const { data: existingNick } = await supabase
        .from('profiles').select('id').eq('nickname', nickname.trim()).maybeSingle();
      if (existingNick) throw new Error('That secret spy name is already taken. Choose another.');

      const pw_hash = await hashPassword(password);
      const playerId = crypto.randomUUID();
      const { error: insertError } = await supabase.from('profiles').insert({
        id: playerId,
        real_name: realName.trim(),
        nickname: nickname.trim(),
        password_hash: pw_hash,
      });
      if (insertError) throw insertError;

      setRegisteredName(realName.trim());
      setRegistered(true);
      login(playerId);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { data: profile } = await supabase
        .from('profiles').select('id, password_hash')
        .eq('real_name', realName.trim()).maybeSingle();

      if (!profile) throw new Error('No account found with that real name.');

      const pw_hash = await hashPassword(password);
      if (profile.password_hash !== pw_hash) throw new Error('Incorrect password.');

      login(profile.id);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
              Next time you visit, use your <span className="font-medium">real name</span> and{' '}
              <span className="font-medium">password</span> to log back in.
            </p>
            <button
              onClick={() => { window.location.href = '/#/dashboard'; }}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 group"
            >
              <span>Enter Mission Board</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isRegister = tab === 'register';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse delay-1000"></div>

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-violet-500 text-white mb-6 shadow-lg -rotate-6">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Mission Board</h1>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            <button
              onClick={() => { setTab('register'); resetForm(); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                isRegister ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              New Player
            </button>
            <button
              onClick={() => { setTab('login'); resetForm(); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                !isRegister ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Returning Player
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 text-red-600 border border-red-100 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            {/* Real Name */}
            <div className="space-y-1.5">
              <label htmlFor="realName" className="block text-sm font-semibold text-slate-700">Your Real Name</label>
              <input
                id="realName" type="text" required
                value={realName} onChange={e => setRealName(e.target.value)}
                className="input-field py-3" placeholder="e.g. Jane Doe"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  id="password" type={showPw ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field py-3 pr-11" placeholder="Enter a password"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Secret Spy Name — register only */}
            {isRegister && (
              <div className="space-y-1.5">
                <label htmlFor="nickname" className="block text-sm font-semibold text-slate-700">Secret Spy Name</label>
                <input
                  id="nickname" type="text" required={isRegister}
                  value={nickname} onChange={e => setNickname(e.target.value)}
                  className="input-field py-3" placeholder="e.g. Shadow Ninja"
                />
                <p className="text-xs text-slate-400">Others will try to guess your identity from this name!</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !realName.trim() || !password.trim() || (isRegister && !nickname.trim())}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 group mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Create Account' : 'Log In'}</span>
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
