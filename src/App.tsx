import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Building2,
  FileText, LayoutDashboard, LogOut, Menu,
  ShieldCheck, Workflow, X, AlertCircle, RefreshCw, Bell, ScrollText, Activity, Settings, Users
} from 'lucide-react';
import AuthGate, { useAuth } from './components/AuthGate';
import ApplicationsPage from './pages/ApplicationsPage';
import PublicSite from './pages/PublicSite';
import AccessPortal from './pages/AccessPortal';
import DemoOverview from './pages/DemoOverview';
import DemoWorkspacePage from './pages/DemoWorkspacePage';
import WorkspaceRebuilt from './WorkspaceRebuilt';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import { AdminScopePage, CompliancePage, OperationsPage, PoliciesPage } from './pages/OperationsPages';
import { api, ApiError, formatStatus, type Application } from './lib/api';

const navigation = [
  { label: 'Overview', to: '/overview', icon: LayoutDashboard },
  { label: 'Applications', to: '/applications', icon: FileText },
  { label: 'Policy register', to: '/policies', icon: ScrollText },
  { label: 'Obligations & inbox', to: '/compliance', icon: Bell },
  { label: 'Audit & metrics', to: '/operations', icon: Activity },
  { label: 'Institutions', to: '/institutions', icon: Building2 },
  { label: 'Officers & users', to: '/officers', icon: Users },
  { label: 'Settings', to: '/settings', icon: Settings },
];
function LiveOverview() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const latestLoadId = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const loadId = ++latestLoadId.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await api.listApplications();
      if (loadId !== latestLoadId.current) return;
      setApplications(result);
    } catch (reason) {
      if (loadId !== latestLoadId.current) return;
      // Never present stale records as if they were the result of a failed refresh.
      setApplications([]);
      setError(reason instanceof ApiError ? reason.detail : 'Could not load application records.');
    } finally {
      if (loadId === latestLoadId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statusCounts = applications.reduce<Record<string, number>>((counts, application) => {
    counts[application.status] = (counts[application.status] || 0) + 1;
    return counts;
  }, {});
  const visibleCount = applications.length;
  const latestApplications = [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  return (
    <section className="overview-page">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">WORKSPACE / OVERVIEW</p>
          <h2>Application overview</h2>
          <p className="muted">A current view of application records available to your account.</p>
        </div>
        <div className="overview-actions">
          <button className="secondary-button" type="button" onClick={() => void load(true)} disabled={loading || refreshing}>
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Refresh records
          </button>
          <NavLink className="primary-button" to="/applications">Open applications <ArrowRight size={15} /></NavLink>
        </div>
      </div>

      <div className="overview-summary panel">
        <div>
          <p className="eyebrow">API RESPONSE</p>
          <strong className="overview-summary-value">{loading ? 'Loading' : error ? 'Unavailable' : visibleCount}</strong>
          <p>{error ? 'The API did not return records.' : 'Records returned by the connected API, up to the endpoint limit.'}</p>
        </div>
        <div className="overview-status-breakdown">
          <span><i className="status-dot status-dot-blue" /> Draft <strong>{statusCounts.draft || 0}</strong></span>
          <span><i className="status-dot status-dot-amber" /> In review <strong>{statusCounts.under_review || 0}</strong></span>
          <span><i className="status-dot status-dot-green" /> Approved <strong>{statusCounts.approved || 0}</strong></span>
        </div>
      </div>

      {error && <div className="feedback feedback-error" role="alert"><AlertCircle size={17} /><span>{error}</span><button type="button" onClick={() => void load(true)}>Retry</button></div>}

      <section className="panel overview-records">
        <div className="panel-heading">
          <div><h3>Recently updated applications</h3><p>Sorted by the latest update timestamp returned by the API</p></div>
          <NavLink to="/applications" className="text-link">View applications <ArrowUpRight size={14} /></NavLink>
        </div>
        {loading ? (
          <div className="overview-state"><span className="state-spinner" /><strong>Loading application records</strong><p>Contacting the configured PRAVAAH API.</p></div>
        ) : error ? (
          <div className="overview-state"><strong>Records could not be loaded</strong><p>Use retry to check the API connection again.</p></div>
        ) : latestApplications.length === 0 ? (
          <div className="overview-state"><FileText size={22} /><strong>No application records returned</strong><p>When records are available to your account, they will appear here.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Reference</th><th>Workflow stage</th><th>Status</th><th>Last updated</th></tr></thead>
              <tbody>{latestApplications.map((application) => (
                <tr key={application.id}>
                  <td><NavLink className="application-reference-link" to={'/applications/' + application.id}><strong>{application.reference_code}</strong></NavLink><span className="subtext">Application #{application.id}</span></td>
                  <td>{formatStatus(application.workflow_stage)}</td>
                  <td><span className={'status status-' + (application.status === 'approved' ? 'green' : application.status === 'rejected' ? 'rose' : application.status === 'under_review' ? 'blue' : application.status === 'changes_requested' ? 'amber' : 'blue')}><i />{formatStatus(application.status)}</span></td>
                  <td>{new Date(application.updated_at).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="panel-footer"><span>{loading ? 'Loading results' : error ? 'API unavailable' : visibleCount + ' record' + (visibleCount === 1 ? '' : 's') + ' returned in this response'}</span><span>Counts reflect this response only, not a global total.</span></div>
      </section>

      <section className="overview-guidance">
        <div><span className="guidance-number">01</span><h3>Review the record</h3><p>Open an application to inspect its current status and available actions.</p></div>
        <div><span className="guidance-number">02</span><h3>Follow allowed transitions</h3><p>Only actions supported by the backend should be submitted.</p></div>
        <div><span className="guidance-number">03</span><h3>Record a reason</h3><p>Workflow changes require a reason where the API contract specifies one.</p></div>
      </section>
      <p className="workspace-disclaimer"><ShieldCheck size={14} /> PRAVAAH-2 is an independent demonstration platform, not an official AICTE service.</p>
    </section>
  );
}


function Overview() {
  const { user } = useAuth();
  const demoSession = import.meta.env.VITE_DEMO_MODE === 'true' && sessionStorage.getItem('pravaah-demo-session') === 'active';
  if (demoSession) return <DemoOverview user={user} />;
  return <LiveOverview />;
}

function WorkspaceApp() {
  return <WorkspaceRebuilt />;
  const demoSession = import.meta.env.VITE_DEMO_MODE === 'true' && sessionStorage.getItem('pravaah-demo-session') === 'active';
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const closeMobile = () => setMobileOpen(false);
  const page = navigation.find((item) => item.to === location.pathname);
  const pageLabel = page?.label || (location.pathname.startsWith('/applications/') ? 'Application record' : location.pathname === '/scrutiny' ? 'Scrutiny queue' : 'Workspace overview');
  const initials = user.full_name.split(/\\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const roleLabel = user.role.replace(/_/g, ' ');
  const navGroups = [
    { label: 'WORKSPACE', items: navigation.slice(0, 2) },
    { label: 'GOVERNANCE', items: navigation.slice(2, 5) },
    { label: 'DIRECTORIES', items: navigation.slice(5, 7) },
    { label: 'PREFERENCES', items: navigation.slice(7) },
  ];

  return (
    <div className="app-shell workspace-redesign">
      {mobileOpen && <button className="mobile-scrim workspace-scrim" aria-label="Close navigation" onClick={closeMobile} />}
      <aside className={'sidebar workspace-sidebar ' + (mobileOpen ? 'sidebar-open' : '')}>
        <div className="workspace-brand">
          <span className="workspace-brand-mark"><Workflow size={21} strokeWidth={2.2} /></span>
          <span className="workspace-brand-copy"><strong>PRAVAAH<span>·</span></strong><small>REGULATORY WORKSPACE</small></span>
          <button className="mobile-close" aria-label="Close menu" onClick={closeMobile}><X size={18} /></button>
        </div>
        <div className="workspace-context-card">
          <span className="workspace-context-icon"><Building2 size={17} /></span>
          <span className="workspace-context-copy"><small>ACTIVE WORKSPACE</small><strong>{user.region_code || (demoSession ? 'Demo jurisdiction' : 'Assigned jurisdiction')}</strong></span>
          <span className="workspace-context-status" title="Workspace selected"><i /></span>
        </div>
        <nav className="side-nav workspace-nav" aria-label="Workspace navigation">
          {navGroups.map((group) => (
            <div className="workspace-nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map(({ label, to, icon: Icon }) => (
                <NavLink key={to} to={to} end={to === '/overview'} onClick={closeMobile} className={({ isActive }) => 'nav-item workspace-nav-item ' + (isActive ? 'nav-active' : '')}>
                  <Icon size={17} strokeWidth={1.9} /><span>{label}</span>{location.pathname === to && <span className="workspace-nav-indicator" />}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="workspace-sidebar-bottom">
          <div className="workspace-security-note"><ShieldCheck size={16} /><span><strong>Secure access</strong><small>Permissions are enforced by the connected service.</small></span></div>
          <div className="workspace-profile">
            <span className="profile-avatar">{initials}</span>
            <span className="profile-copy"><strong>{user.full_name}</strong><small>{roleLabel}</small></span>
            <button className="signout-button" type="button" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-area workspace-main">
        <header className="topbar workspace-topbar">
          <div className="workspace-topbar-left">
            <button className="mobile-menu workspace-mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19} /></button>
            <div className="workspace-breadcrumb"><span>PRAVAAH</span><span className="workspace-breadcrumb-separator">/</span><strong>{pageLabel}</strong></div>
          </div>
          <div className="workspace-topbar-right">
            <span className={'workspace-environment ' + (demoSession ? 'is-demo' : 'is-live')}><i />{demoSession ? 'DEMO ENVIRONMENT' : 'CONNECTED WORKSPACE'}</span>
            <span className="workspace-topbar-divider" />
            <div className="workspace-top-user"><span className="top-avatar">{initials}</span><span><strong>{user.full_name}</strong><small>{roleLabel}</small></span></div>
          </div>
        </header>
        <div className="workspace-content">
          <div className="workspace-page-intro">
            <div><p className="workspace-overline">WORKSPACE / {pageLabel.toUpperCase()}</p><p className="workspace-page-context">{demoSession ? 'Demonstration workspace · Sample records only' : 'Authorised operational workspace'}</p></div>
            <div className="workspace-date-stamp"><span className="workspace-date-dot" /> Workflow services {demoSession ? 'simulated' : 'connected'}</div>
          </div>
          <div className="page-content">
            <Routes>
              <Route path="/overview" element={<Overview />} />
              <Route path="/applications" element={demoSession ? <DemoWorkspacePage /> : <ApplicationsPage />} />
              <Route path="/applications/:id" element={demoSession ? <DemoWorkspacePage /> : <ApplicationDetailPage />} />
              <Route path="/scrutiny" element={demoSession ? <DemoWorkspacePage /> : <ApplicationsPage />} />
              <Route path="/compliance" element={demoSession ? <DemoWorkspacePage /> : <CompliancePage />} />
              <Route path="/evidence" element={<Navigate to="/applications" replace />} />
              <Route path="/workflows" element={<Navigate to="/applications" replace />} />
              <Route path="/operations" element={demoSession ? <DemoWorkspacePage /> : <OperationsPage />} />
              <Route path="/audit" element={<Navigate to="/operations" replace />} />
              <Route path="/institutions" element={demoSession ? <DemoWorkspacePage /> : <AdminScopePage kind="institutions" />} />
              <Route path="/officers" element={demoSession ? <DemoWorkspacePage /> : <AdminScopePage kind="officers" />} />
              <Route path="/policies" element={demoSession ? <DemoWorkspacePage /> : <PoliciesPage />} />
              <Route path="/settings" element={demoSession ? <DemoWorkspacePage /> : <AdminScopePage kind="settings" />} />
              <Route path="/sign-in" element={<Navigate to="/applications" replace />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  if (location.pathname === '/' || location.pathname === '/privacy' || location.pathname === '/terms') {
    return <PublicSite path={location.pathname} />;
  }
  if (location.pathname === '/access-portal') return <AccessPortal />;
  return <AuthGate><WorkspaceApp /></AuthGate>;
}
