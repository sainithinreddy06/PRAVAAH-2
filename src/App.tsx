import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, BookOpenCheck, Building2, ChevronDown, CircleHelp,
  ClipboardCheck, FileCheck2, FileText, LayoutDashboard, LogOut, Menu, Settings2,
  ShieldCheck, Users, Workflow, X, AlertCircle, RefreshCw
} from 'lucide-react';
import AuthGate, { useAuth } from './components/AuthGate';
import ApplicationsPage from './pages/ApplicationsPage';
import PublicSite from './pages/PublicSite';
import { api, ApiError, formatStatus, type Application } from './lib/api';

const navigation = [
  { label: 'Overview', to: '/overview', icon: LayoutDashboard },
  { label: 'Applications', to: '/applications', icon: FileText },
  { label: 'Scrutiny queue', to: '/scrutiny', icon: ClipboardCheck },
  { label: 'Compliance', to: '/compliance', icon: ShieldCheck },
  { label: 'Evidence library', to: '/evidence', icon: FileCheck2 },
  { label: 'Workflow studio', to: '/workflows', icon: Workflow },
];
const administration = [
  { label: 'Institutions', to: '/institutions', icon: Building2 },
  { label: 'Officers & roles', to: '/officers', icon: Users },
  { label: 'Policy register', to: '/policies', icon: BookOpenCheck },
];

function Overview() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await api.listApplications();
      setApplications(result);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.detail : 'Could not load application records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
                  <td><strong>{application.reference_code}</strong><span className="subtext">Application #{application.id}</span></td>
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

function SectionPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="panel empty-page">
      <div className="empty-icon"><Workflow size={22} /></div>
      <p className="eyebrow">WORKSPACE / NOT CONNECTED</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="notice"><CircleHelp size={17} /><span>This screen is not connected to a live frontend workflow yet. No records or actions are simulated here.</span></div>
    </section>
  );
}

function WorkspaceApp() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const closeMobile = () => setMobileOpen(false);
  const pageLabel = [...navigation, ...administration, { label: 'Settings', to: '/settings', icon: Settings2 }]
    .find((item) => item.to === location.pathname)?.label || 'Overview';
  const initials = user.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={closeMobile} />}
      <aside className={'sidebar ' + (mobileOpen ? 'sidebar-open' : '')}>
        <div className="brand">
          <span className="brand-mark"><Workflow size={21} /></span>
          <span><strong>PRAVAAH</strong><small>Approval &amp; Compliance</small></span>
          <button className="mobile-close" aria-label="Close menu" onClick={closeMobile}><X size={18} /></button>
        </div>
        <div className="workspace-switch">
          <span className="workspace-symbol"><Building2 size={18} /></span>
          <span><strong>Assigned workspace</strong><small>{user.region_code || 'Region not specified'}</small></span>
          <ChevronDown size={15} />
        </div>
        <nav className="side-nav" aria-label="Workspace navigation">
          <p className="nav-label">WORKSPACE</p>
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/overview'} onClick={closeMobile} className={({ isActive }) => 'nav-item ' + (isActive ? 'nav-active' : '')}>
              <Icon size={18} /><span>{label}</span>
            </NavLink>
          ))}
          <p className="nav-label nav-label-spaced">ADMINISTRATION</p>
          {administration.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={closeMobile} className={({ isActive }) => 'nav-item ' + (isActive ? 'nav-active' : '')}>
              <Icon size={18} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><ShieldCheck size={16} /><p>Access is checked by the connected backend. Menu visibility does not replace server authorization.</p></div>
          <NavLink to="/settings" className={({ isActive }) => 'nav-item ' + (isActive ? 'nav-active' : '')} onClick={closeMobile}><Settings2 size={18} /><span>Settings</span></NavLink>
          <div className="profile-row">
            <span className="profile-avatar">{initials}</span>
            <span className="profile-copy"><strong>{user.full_name}</strong><small>{user.role.replace(/_/g, ' ')}</small></span>
            <button className="signout-button" type="button" onClick={signOut} aria-label="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>{pageLabel}</strong></div>
          <div className="topbar-actions">
            <span className="topbar-context">PRAVAAH workspace</span>
            <span className="topbar-divider" />
            <span className="top-avatar" aria-label={'Signed in as ' + user.full_name}>{initials}</span>
          </div>
        </header>
        <div className="page-content">
          <Routes>
            <Route path="/overview" element={<Overview />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/scrutiny" element={<SectionPage title="Scrutiny queue" description="The dedicated scrutiny queue is not connected to live records yet." />} />
            <Route path="/compliance" element={<SectionPage title="Compliance and obligations" description="The compliance workspace is not connected to live obligation and notification records yet." />} />
            <Route path="/evidence" element={<SectionPage title="Evidence library" description="Evidence endpoints exist in the backend, but this page is not connected to upload, listing or review workflows." />} />
            <Route path="/workflows" element={<SectionPage title="Workflow studio" description="A workflow configuration interface and configuration API have not been implemented." />} />
            <Route path="/institutions" element={<SectionPage title="Institutions" description="Institution management is not connected to a listing or administration API." />} />
            <Route path="/officers" element={<SectionPage title="Officers and roles" description="User and role administration is not connected to a management API." />} />
            <Route path="/policies" element={<SectionPage title="Policy register" description="Policy endpoints exist in the backend, but this page is not connected to policy listing or creation." />} />
            <Route path="/settings" element={<SectionPage title="Settings" description="Persistent workspace preferences have not been implemented." />} />
            <Route path="/sign-in" element={<Navigate to="/applications" replace />} />
            <Route path="*" element={<SectionPage title="Page not found" description="The requested workspace page does not exist." />} />
          </Routes>
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
  return <AuthGate><WorkspaceApp /></AuthGate>;
}
