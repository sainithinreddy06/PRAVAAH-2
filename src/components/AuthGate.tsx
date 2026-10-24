import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, ShieldCheck, Workflow } from 'lucide-react';
import { api, ApiError, hasAccessToken, setAccessToken, type User } from '../lib/api';

type AuthContextValue = {
  user: User;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthGate');
  return context;
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(hasAccessToken());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setChecking(false);
      setError('Your session has expired. Please sign in again.');
    };
    window.addEventListener('pravaah:unauthorized', onUnauthorized);
    if (hasAccessToken()) {
      api.me()
        .then(setUser)
        .catch((reason: unknown) => {
          setAccessToken(null);
          setUser(null);
          if (reason instanceof ApiError && reason.status !== 401) setError(reason.detail);
        })
        .finally(() => setChecking(false));
    }
    return () => window.removeEventListener('pravaah:unauthorized', onUnauthorized);
  }, []);

  const signOut = () => {
    setAccessToken(null);
    setUser(null);
    setPassword('');
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const token = await api.login(email.trim(), password);
      setAccessToken(token.access_token);
      const currentUser = await api.me();
      setUser(currentUser);
      setPassword('');
    } catch (reason) {
      setAccessToken(null);
      setUser(null);
      setError(reason instanceof Error ? reason.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
      setChecking(false);
    }
  };

  if (checking) {
    return <main className="auth-screen"><div className="auth-card auth-loading"><span className="auth-brand-mark"><Workflow size={22} /></span><p>Checking your session…</p></div></main>;
  }

  if (!user) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="auth-brand">
            <span className="auth-brand-mark"><Workflow size={23} /></span>
            <span><strong>PRAVAAH</strong><small>Approval &amp; Compliance Workspace</small></span>
          </div>
          <div className="auth-intro">
            <span className="auth-kicker"><ShieldCheck size={14} /> SECURE WORKSPACE</span>
            <h1>Welcome back</h1>
            <p>Sign in with your assigned PRAVAAH account to continue.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="signin-email">Work email</label>
            <input id="signin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={320} placeholder="you@organisation.in" />
            <label htmlFor="signin-password">Password</label>
            <input id="signin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={1024} placeholder="Enter your password" />
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in to workspace'} {!busy && <ArrowRight size={16} />}
            </button>
          </form>
          <p className="auth-footnote">No demo credentials are built in. Use an account provisioned in your connected backend.</p>
        </section>
        <p className="auth-disclaimer">PRAVAAH-2 demonstration platform · Not an official AICTE service</p>
      </main>
    );
  }

  return <AuthContext.Provider value={{ user, signOut }}>{children}</AuthContext.Provider>;
}
