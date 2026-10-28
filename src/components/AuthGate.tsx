import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, Workflow, Building2, ClipboardCheck, MapPinned, Landmark, FileSearch, Mail } from 'lucide-react';
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
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const demoEmail = 'demo@pravaah.local';
  const demoPassword = 'Demo@123';
  const selectedPortal = sessionStorage.getItem('pravaah-selected-portal') || new URLSearchParams(window.location.search).get('portal');
  const workspaceConfig: Record<string, { eyebrow: string; emailLabel: string; emailPlaceholder: string; guidance: string; icon: typeof Building2 }> = {
    'Institution Coordinator Dashboard': { eyebrow: 'INSTITUTION WORKSPACE', emailLabel: 'Institutional work email', emailPlaceholder: 'name@institution.edu.in', guidance: 'Use the email registered to your institution account.', icon: Building2 },
    'Scrutiny Officer Dashboard': { eyebrow: 'SCRUTINY WORKSPACE', emailLabel: 'Authorised officer email', emailPlaceholder: 'officer@organisation.gov.in', guidance: 'Use the officer account provisioned for application scrutiny.', icon: ClipboardCheck },
    'EVC Coordination Dashboard': { eyebrow: 'EVC COORDINATION WORKSPACE', emailLabel: 'Committee / coordinator email', emailPlaceholder: 'coordinator@organisation.gov.in', guidance: 'Use the account assigned for Expert Visit Committee coordination.', icon: MapPinned },
    'Regional Officer Dashboard': { eyebrow: 'REGIONAL REVIEW WORKSPACE', emailLabel: 'Regional officer email', emailPlaceholder: 'officer@organisation.gov.in', guidance: 'Use the officer account assigned to your regional jurisdiction.', icon: Landmark },
    'AICTE Headquarters Review Dashboard': { eyebrow: 'HEADQUARTERS WORKSPACE', emailLabel: 'Headquarters work email', emailPlaceholder: 'reviewer@organisation.gov.in', guidance: 'Use the authorised headquarters review account.', icon: FileSearch },
    'Compliance Monitoring & Audit Dashboard': { eyebrow: 'COMPLIANCE & AUDIT WORKSPACE', emailLabel: 'Compliance / audit email', emailPlaceholder: 'auditor@organisation.gov.in', guidance: 'Use the account provisioned for compliance monitoring and audit.', icon: ShieldCheck },
  };
  const activeWorkspace = selectedPortal ? workspaceConfig[selectedPortal] : undefined;
  const WorkspaceIcon = activeWorkspace?.icon || Building2;
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(hasAccessToken());
  const [email, setEmail] = useState(demoMode ? demoEmail : '');
  const [password, setPassword] = useState(demoMode ? demoPassword : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (demoMode && sessionStorage.getItem('pravaah-demo-session') === 'active') {
      setUser({ id: 0, email: demoEmail, full_name: 'PRAVAAH Demo User', role: 'system_admin', region_code: null, is_active: true, created_at: new Date().toISOString() });
      setChecking(false);
    }
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
    if (demoMode) sessionStorage.removeItem('pravaah-demo-session');
    setUser(null);
    setPassword('');
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    if (demoMode) {
      if (email.trim().toLowerCase() === demoEmail && password === demoPassword) {
        sessionStorage.setItem('pravaah-demo-session', 'active');
        setUser({ id: 0, email: demoEmail, full_name: 'PRAVAAH Demo User', role: 'system_admin', region_code: null, is_active: true, created_at: new Date().toISOString() });
        setPassword('');
      } else {
        setError('Those demo credentials do not match. Use the credentials shown below.');
      }
      setBusy(false);
      setChecking(false);
      return;
    }
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
      <main className="auth-screen auth-screen-pravaah">
        <a className="auth-back-link" href="/access-portal"><ArrowLeft size={15}/> Back to workspace directory</a>
        <section className="auth-card auth-card-pravaah">
          <div className="auth-brand">
            <span className="auth-brand-mark"><Workflow size={23} /></span>
            <span><strong>PRAVAAH</strong><small>Approval &amp; Compliance Management</small></span>\n            <span className="auth-brand-status"><i/> SECURE ACCESS</span>
          </div>
          <div className="auth-intro">
            <span className="auth-kicker"><ShieldCheck size={14} /> {activeWorkspace?.eyebrow || 'SECURE WORKSPACE AUTHENTICATION'}</span>
            <h1>{activeWorkspace ? 'Sign in to your workspace' : 'Sign in to PRAVAAH'}</h1>
            {selectedPortal && <div className="auth-selected-workspace"><span><WorkspaceIcon size={18}/></span><div><small>SELECTED WORKSPACE</small><strong>{selectedPortal}</strong><p>{activeWorkspace?.guidance || 'Use the account assigned to your organisation.'}</p></div></div>}
            {!selectedPortal && <p>Use your authorised account to access the PRAVAAH workspace.</p>}
          </div>
          {demoMode && <div className="auth-demo-notice" role="note"><strong>Demo mode enabled</strong><span>Use the sample credentials below to preview the workspace. Demo mode does not authenticate against the backend or save real records.</span><button type="button" onClick={() => { setEmail(demoEmail); setPassword(demoPassword); setError(''); }}>Fill demo credentials</button></div>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="signin-email">{activeWorkspace?.emailLabel || 'Work email'}</label>
            <div className="auth-email-field"><Mail size={16}/><input id="signin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={320} placeholder={activeWorkspace?.emailPlaceholder || 'name@organisation.in'} /></div>
            <label htmlFor="signin-password">Password</label>
            <input id="signin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={1024} placeholder="Enter your password" />
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? 'Verifying account…' : 'Continue securely'} {!busy && <ArrowRight size={16} />}
            </button>
          </form>
          <p className="auth-footnote">{demoMode ? <>Demo email: <strong>{demoEmail}</strong><br />Demo password: <strong>{demoPassword}</strong><br />UI preview only — live API data requires a configured backend.</> : 'Only an account provisioned for the selected workspace can access its authorised functions.'}</p>
        </section>
        <p className="auth-disclaimer">PRAVAAH-2 demonstration platform · Not an official AICTE service</p>
      </main>
    );
  }

  return <AuthContext.Provider value={{ user, signOut }}>{children}</AuthContext.Provider>;
}
