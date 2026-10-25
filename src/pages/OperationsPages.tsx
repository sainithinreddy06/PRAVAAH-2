import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Bell, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, ApiError, formatStatus, type AuditEvent, type Notification, type Obligation, type OperationalMetrics, type Policy } from '../lib/api';
import { useAuth } from '../components/AuthGate';

const dateTime = (value: string | null) => value ? new Date(value).toLocaleString() : 'No due date';
const parsePayload = (value: string) => { try { const parsed: unknown = JSON.parse(value); return parsed && typeof parsed === 'object' ? JSON.stringify(parsed) : value; } catch { return value; } };
const reviewer = (role: string) => role === 'regional_officer' || role === 'platform_admin';
const administrator = (role: string) => role === 'platform_admin';

export function PoliciesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Policy[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(''); try { setItems(await api.listPolicies(!includeInactive)); } catch (reason) { setItems([]); setError(reason instanceof ApiError ? reason.detail : 'Could not load policy metadata.'); } finally { setLoading(false); } }, [includeInactive]);
  useEffect(() => { void load(); }, [load]);
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    setWorking(true); setError(''); setNotice('');
    try {
      await api.createPolicy({ policy_key: String(data.get('policy_key')).trim(), version: Number(data.get('version')), title: String(data.get('title')).trim(), description: String(data.get('description') || '').trim() || undefined, source_reference: String(data.get('source_reference') || '').trim() || undefined, effective_from: data.get('effective_from') ? new Date(String(data.get('effective_from'))).toISOString() : undefined, effective_until: data.get('effective_until') ? new Date(String(data.get('effective_until'))).toISOString() : undefined });
      setNotice('Policy version created. The record is metadata and has not been verified as authoritative policy content.'); form.reset(); await load();
    } catch (reason) { setError(reason instanceof ApiError ? reason.detail : 'Could not create policy metadata.'); } finally { setWorking(false); }
  };
  return <section className="workflow-page">
    <div className="applications-heading"><div><p className="eyebrow">REGISTER / POLICY METADATA</p><h2>Policy register</h2><p className="muted">Versioned descriptive metadata with source and effective dates.</p></div><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button></div>
    <div className="notice-panel"><ShieldCheck size={17} /><span>Policy records are metadata. Their presence does not verify an official or authoritative source.</span></div>
    {error && <div className="feedback feedback-error" role="alert"><AlertCircle size={17} />{error}</div>}
    {notice && <div className="feedback feedback-success" role="status">{notice}</div>}
    {administrator(user.role) && <form className="panel workflow-form" onSubmit={create}>
      <div><h3>Add policy version</h3><p>Only platform administrators can create versions through the API.</p></div>
      <label>Policy key<input name="policy_key" required minLength={2} maxLength={100} pattern="[A-Za-z0-9._-]+" /></label>
      <label>Version<input name="version" type="number" min="1" required /></label>
      <label>Title<input name="title" required minLength={3} maxLength={240} /></label>
      <label>Source reference<input name="source_reference" maxLength={500} placeholder="URL or document reference" /></label>
      <label>Effective from<input name="effective_from" type="datetime-local" /></label><label>Effective until<input name="effective_until" type="datetime-local" /></label>
      <label className="full-field">Description<textarea name="description" maxLength={10000} rows={3} /></label>
      <button className="primary-button" disabled={working}>{working ? 'Saving…' : 'Create version'}</button>
    </form>}
    <div className="applications-toolbar panel"><div><strong>{loading ? 'Loading…' : items.length + ' version' + (items.length === 1 ? '' : 's')}</strong><span>API metadata · grouped by key and descending version</span></div><label className="check-filter"><input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} /> Include inactive</label></div>
    <div className="panel workflow-list">{loading ? <p className="empty-copy">Loading policy metadata…</p> : items.length ? items.map(item => <article className="workflow-item" key={item.id}><div><strong>{item.policy_key} · v{item.version} · {item.title}</strong><p>{item.description || 'No description supplied.'}</p><p>Effective: {dateTime(item.effective_from)}{item.effective_until ? ' to ' + dateTime(item.effective_until) : ''} · {item.is_active ? 'Active metadata' : 'Inactive'}</p><p>Source reference: {item.source_reference || 'Not provided'} · recorded {dateTime(item.created_at)}</p></div></article>) : <p className="empty-copy">No policy records are returned.</p>}</div>
  </section>;
}

export function CompliancePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Obligation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [status, setStatus] = useState('');
  const [dueBefore, setDueBefore] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [obligations, inbox] = await Promise.all([api.listObligations({ status: status || undefined, due_before: dueBefore ? new Date(dueBefore).toISOString() : undefined, limit: 50 }), api.listNotifications()]); setItems(obligations); setNotifications(inbox); } catch (reason) { setError(reason instanceof ApiError ? reason.detail : 'Could not load compliance records.'); } finally { setLoading(false); } }, [status, dueBefore]);
  useEffect(() => { void load(); }, [load]);
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setWorking(true); setError(''); setNotice('');
    try {
      await api.createObligation({ application_id: Number(data.get('application_id')), owner_user_id: data.get('owner_user_id') ? Number(data.get('owner_user_id')) : undefined, obligation_type: String(data.get('obligation_type')).trim(), title: String(data.get('title')).trim(), description: String(data.get('description') || '').trim() || undefined, due_at: data.get('due_at') ? new Date(String(data.get('due_at'))).toISOString() : undefined, policy_reference: String(data.get('policy_reference') || '').trim() || undefined });
      setNotice('Obligation created. No notification is implied by this action.'); form.reset(); await load();
    } catch (reason) { setError(reason instanceof ApiError ? reason.detail : 'Could not create obligation.'); } finally { setWorking(false); }
  };
  const updateStatus = async (item: Obligation, next: Obligation['status']) => { setWorking(true); setError(''); setNotice(''); try { await api.updateObligation(item.id, { status: next }); setNotice('Obligation #' + item.id + ' updated.'); await load(); } catch (reason) { setError(reason instanceof ApiError ? reason.detail : 'Could not update obligation.'); } finally { setWorking(false); } };
  const escalate = async () => { setWorking(true); setError(''); setNotice(''); try { const result = await api.escalateDue(); setNotice(result.notifications_created + ' in-app notification(s) queued by this API-triggered escalation.'); await load(); } catch (reason) { setError(reason instanceof ApiError ? reason.detail : 'Could not queue overdue notifications.'); } finally { setWorking(false); } };
  return <section className="workflow-page">
    <div className="applications-heading"><div><p className="eyebrow">COMPLIANCE / FOLLOW-UP</p><h2>Obligations &amp; notifications</h2><p className="muted">Deadlines and current-user in-app notification queue.</p></div><div className="overview-actions"><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>{reviewer(user.role) && <button className="secondary-button" onClick={() => void escalate()} disabled={working}><Bell size={15} /> Queue overdue alerts</button>}</div></div>
    <div className="notice-panel"><Bell size={17} /><span>Overdue escalation is manual and API-triggered. “Pending” means queued, not delivered.</span></div>
    {error && <div className="feedback feedback-error" role="alert"><AlertCircle size={17} />{error}<button onClick={() => void load()}>Retry</button></div>}
    {notice && <div className="feedback feedback-success" role="status">{notice}</div>}
    {['regional_officer', 'platform_admin', 'institution_admin'].includes(user.role) && <form className="panel workflow-form" onSubmit={create}>
      <div><h3>Create application obligation</h3><p>Global obligations are restricted to platform administrators; this form links the record to an application.</p></div>
      <label>Application ID<input name="application_id" type="number" min="1" required /></label><label>Owner user ID<input name="owner_user_id" type="number" min="1" /></label>
      <label>Type<input name="obligation_type" required minLength={2} maxLength={60} /></label><label>Title<input name="title" required minLength={3} maxLength={240} /></label>
      <label>Due date<input name="due_at" type="datetime-local" /></label><label>Policy reference<input name="policy_reference" maxLength={240} /></label>
      <label className="full-field">Description<textarea name="description" rows={3} maxLength={5000} /></label><button className="primary-button" disabled={working}><Plus size={15} /> Create obligation</button>
    </form>}
    <div className="applications-toolbar panel"><div><strong>Obligations</strong><span>Showing up to 50 records in your account scope</span></div><div className="workflow-filters"><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['open','in_progress','fulfilled','waived'].map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}</select></label><label>Due before<input type="datetime-local" value={dueBefore} onChange={e => setDueBefore(e.target.value)} /></label></div></div>
    <div className="panel workflow-list">{loading ? <p className="empty-copy">Loading obligations…</p> : items.length ? items.map(item => {
      const overdue = item.due_at && new Date(item.due_at).getTime() < Date.now() && ['open','in_progress'].includes(item.status);
      return <article className="workflow-item" key={item.id}><div><strong>{item.title} {overdue && <span className="overdue-tag">Overdue</span>}</strong><p>#{item.id} · {item.obligation_type} · Application {item.application_id ? <Link to={'/applications/' + item.application_id}>#{item.application_id}</Link> : 'global'} · {item.owner_user_id ? 'Owner #' + item.owner_user_id : 'No owner'}</p><p>Due {dateTime(item.due_at)} · {formatStatus(item.status)}{item.policy_reference ? ' · ' + item.policy_reference : ''}</p>{item.description && <p>{item.description}</p>}</div>{['regional_officer','platform_admin','institution_admin'].includes(user.role) && <label className="inline-select">Update status<select value={item.status} disabled={working} onChange={e => void updateStatus(item, e.target.value as Obligation['status'])}>{['open','in_progress','fulfilled','waived'].map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}</select></label>}</article>;
    }) : <p className="empty-copy">No obligations match these filters in your account scope.</p>}</div>
    <section className="panel workflow-section"><header className="panel-heading"><div><h3>My notification inbox</h3><p>Records returned for the signed-in account only.</p></div></header>
      {notifications.length ? <div className="workflow-list">{notifications.map(item => <article className="workflow-item" key={item.id}><div><strong>{item.event_key}</strong><p>{formatStatus(item.channel)} · {formatStatus(item.status)} · {item.attempt_count} attempt(s) · {dateTime(item.created_at)}</p><p>{parsePayload(item.payload_json)}</p>{item.last_error && <p>Last error: {item.last_error}</p>}</div></article>)}</div> : <p className="empty-copy">{loading ? 'Loading inbox…' : 'No notifications are returned for this account.'}</p>}
    </section>
  </section>;
}

export function OperationsPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filters, setFilters] = useState({ entity_type: '', entity_id: '', action: '', actor_user_id: '', since: '', until: '' });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [m, e] = await Promise.all([api.metrics(), api.listAuditEvents({ ...filters, actor_user_id: filters.actor_user_id ? Number(filters.actor_user_id) : undefined, since: filters.since ? new Date(filters.since + 'T00:00:00').toISOString() : undefined, until: filters.until ? new Date(filters.until + 'T23:59:59.999').toISOString() : undefined, limit: 50, offset })]);
      setMetrics(m); setEvents(e);
    } catch (reason) { setMetrics(null); setEvents([]); setError(reason instanceof ApiError ? reason.detail : 'Operational data is unavailable.'); } finally { setLoading(false); }
  }, [filters, offset]);
  useEffect(() => { if (reviewer(user.role)) void load(); }, [load, user.role]);
  if (!reviewer(user.role)) return <section className="workflow-page"><h2>Access unavailable</h2><p className="muted">The API restricts operational metrics and audit events to regional officers and platform administrators.</p></section>;
  return <section className="workflow-page">
    <div className="applications-heading"><div><p className="eyebrow">OPERATIONS / AUDIT</p><h2>Audit &amp; operational metrics</h2><p className="muted">Visibility is scoped by the backend to your region or administrator policy.</p></div><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button></div>
    <div className="notice-panel"><ShieldCheck size={17} /><span>Metrics are API-scoped counts. Audit records are not established as tamper-evident or immutable.</span></div>
    {error && <div className="feedback feedback-error" role="alert"><AlertCircle size={17} />{error}</div>}
    {metrics && <div className="metric-grid">{[['Applications',metrics.applications_total],['Evidence',metrics.evidence_total],['Obligations',metrics.obligations_total],['Undertakings',metrics.undertakings_total],['Overdue obligations',metrics.overdue_obligations]].map(([label,value]) => <article className="panel metric-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>}
    {metrics && <div className="metric-breakdowns panel"><div><h3>Applications by status</h3>{Object.entries(metrics.applications_by_status).map(([k,v]) => <p key={k}>{formatStatus(k)} <strong>{v}</strong></p>)}</div><div><h3>Evidence review</h3>{Object.entries(metrics.evidence_by_review_status).map(([k,v]) => <p key={k}>{formatStatus(k)} <strong>{v}</strong></p>)}</div><div><h3>Obligations</h3>{Object.entries(metrics.obligations_by_status).map(([k,v]) => <p key={k}>{formatStatus(k)} <strong>{v}</strong></p>)}</div><div><h3>Undertakings</h3>{Object.entries(metrics.undertakings_by_status).map(([k,v]) => <p key={k}>{formatStatus(k)} <strong>{v}</strong></p>)}</div></div>}
    <form className="panel audit-filters" onSubmit={event => { event.preventDefault(); setOffset(0); void load(); }}>
      <label>Entity type<input value={filters.entity_type} onChange={e => setFilters({ ...filters, entity_type: e.target.value })} placeholder="application" /></label><label>Entity ID<input value={filters.entity_id} onChange={e => setFilters({ ...filters, entity_id: e.target.value })} /></label><label>Action<input value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })} /></label>
      {administrator(user.role) && <label>Actor user ID<input type="number" min="1" value={filters.actor_user_id} onChange={e => setFilters({ ...filters, actor_user_id: e.target.value })} /></label>}
      <label>Since<input type="date" value={filters.since} onChange={e => setFilters({ ...filters, since: e.target.value })} /></label><label>Until<input type="date" value={filters.until} onChange={e => setFilters({ ...filters, until: e.target.value })} /></label><button className="primary-button">Apply filters</button>
    </form>
    <div className="panel workflow-list"><header className="panel-heading"><div><h3>Audit events</h3><p>{loading ? 'Loading…' : events.length + ' event(s), page size 50'}</p></div></header>
      {events.length ? events.map(item => <article className="workflow-item" key={item.id}><div><strong>{item.action}</strong><p>{item.entity_type} #{item.entity_id} · Actor {item.actor_user_id ? '#' + item.actor_user_id : 'unknown'} · {dateTime(item.created_at)}</p><p>{item.reason || 'No reason recorded'}</p><code className="digest">{item.details_json}</code></div></article>) : <p className="empty-copy">{loading ? 'Loading events…' : 'No events match these filters.'}</p>}
      <div className="pagination-actions"><button className="secondary-button" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</button><span>Offset {offset}</span><button className="secondary-button" disabled={events.length < 50 || loading} onClick={() => setOffset(offset + 50)}>Next</button></div>
    </div>
  </section>;
}

export function AdminScopePage({ kind }: { kind: 'institutions' | 'officers' | 'settings' }) {
  const titles = { institutions: 'Institution administration', officers: 'Officer & user administration', settings: 'Workspace settings' };
  const descriptions = { institutions: 'The current API has no authorized institution listing or edit endpoints. Institution creation remains an operator-managed provisioning task.', officers: 'The current API has no user listing, role/region assignment, activation, or safe password setup endpoints. Account provisioning remains operator-managed.', settings: 'The current API does not expose persisted workspace settings. No changes can be saved from this screen.' };
  return <section className="workflow-page"><p className="eyebrow">ADMINISTRATION / DESIGN REQUIRED</p><h2>{titles[kind]}</h2><div className="notice-panel"><ShieldCheck size={17} /><span>{descriptions[kind]}</span></div><div className="panel admin-guidance"><h3>Why this section is not editable</h3><p>These operations need explicit server-side permissions, audit events, region safeguards, validation, and regression tests. Account and institution setup uses the documented operator scripts.</p><Link to="/applications" className="text-link">Return to applications</Link></div></section>;
}
