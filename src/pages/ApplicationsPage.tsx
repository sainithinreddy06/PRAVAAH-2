import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRightLeft, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { allowedTransitions, api, ApiError, formatStatus, type Application, type ApplicationStatus } from '../lib/api';
import { useAuth } from '../components/AuthGate';

const statusOptions: Array<{ value: ApplicationStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'changes_requested', label: 'Changes requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const sampleApplications: Application[] = [
  { id: 142, reference_code: 'APP-2026-0142', institution_id: 1, submitted_by_user_id: null, workflow_stage: 'scrutiny', status: 'draft', created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z' },
  { id: 148, reference_code: 'APP-2026-0148', institution_id: 2, submitted_by_user_id: null, workflow_stage: 'scrutiny', status: 'under_review', created_at: '2026-10-27T09:30:00Z', updated_at: '2026-10-28T11:15:00Z' },
  { id: 155, reference_code: 'APP-2026-0155', institution_id: 3, submitted_by_user_id: null, workflow_stage: 'evc_coordination', status: 'submitted', created_at: '2026-10-26T08:15:00Z', updated_at: '2026-10-27T14:00:00Z' },
  { id: 161, reference_code: 'APP-2026-0161', institution_id: 4, submitted_by_user_id: null, workflow_stage: 'regional_review', status: 'changes_requested', created_at: '2026-10-25T12:00:00Z', updated_at: '2026-10-28T15:45:00Z' },
  { id: 172, reference_code: 'APP-2026-0172', institution_id: 5, submitted_by_user_id: null, workflow_stage: 'application_filing', status: 'draft', created_at: '2026-10-24T07:45:00Z', updated_at: '2026-10-24T07:45:00Z' },
];

function canReview(role: string): boolean {
  return role === 'regional_officer' || role === 'platform_admin';
}

function canCreate(role: string): boolean {
  return ['applicant', 'institution_admin', 'regional_officer', 'platform_admin'].includes(role);
}

function canSubmit(role: string): boolean {
  return ['applicant', 'institution_admin', 'regional_officer', 'platform_admin'].includes(role);
}

function canTransition(role: string, target: ApplicationStatus): boolean {
  if (target === 'submitted') return canSubmit(role);
  return canReview(role);
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [notice, setNotice] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [institutionId, setInstitutionId] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [creating, setCreating] = useState(false);
  const latestLoadId = useRef(0);

  const loadApplications = useCallback(async (quiet = false) => {
    const loadId = ++latestLoadId.current;
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await api.listApplications(statusFilter || undefined);
      // Ignore out-of-order responses so an older filter cannot overwrite newer results.
      if (loadId !== latestLoadId.current) return;
      setApplications(result);
      setUsingSampleData(false);
    } catch (reason) {
      if (loadId !== latestLoadId.current) return;
      // Keep useful illustrative records visible if the API is unavailable or the token expires.
      // Sample records are read-only; all write actions still require a successful API response.
      setUsingSampleData(true);
      setApplications(sampleApplications.filter((application) => !statusFilter || application.status === statusFilter));
      setError(reason instanceof ApiError && reason.status === 401
        ? 'API sign-in expired or credentials were rejected. Showing illustrative sample records; sign in again to make real changes.'
        : 'Could not reach the application API. Showing illustrative sample records; real changes require the API.');

    } finally {
      if (loadId === latestLoadId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const createApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedInstitutionId = Number(institutionId);
    if (!Number.isSafeInteger(parsedInstitutionId) || parsedInstitutionId < 1) {
      setError('Institution ID must be a positive whole number.');
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(referenceCode.trim())) {
      setError('Reference code must start with a letter or number and contain only letters, numbers, periods, underscores, slashes, or hyphens.');
      return;
    }
    setCreating(true);
    setError('');
    setNotice('');
    try {
      const created = await api.createApplication(parsedInstitutionId, referenceCode.trim());
      setNotice('Application ' + created.reference_code + ' was created as a draft.');
      setCreateOpen(false);
      setInstitutionId('');
      setReferenceCode('');
      setStatusFilter('');
      await loadApplications(true);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.detail : 'Could not create the application.');
    } finally {
      setCreating(false);
    }
  };

  const transition = async (application: Application, target: ApplicationStatus) => {
    const reason = window.prompt('Enter a reason for changing ' + application.reference_code + ' to ' + formatStatus(target) + ' (at least 3 characters):');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError('A reason of at least 3 characters is required. No change was submitted.');
      return;
    }
    if (reason.trim().length > 2000) {
      setError('The reason must be 2,000 characters or fewer. No change was submitted.');
      return;
    }
    setPendingId(application.id);
    setError('');
    setNotice('');
    try {
      await api.transitionApplication(application.id, target, reason.trim());
      setNotice(application.reference_code + ' updated to ' + formatStatus(target) + '.');
      await loadApplications(true);
    } catch (reasonError) {
      setError(reasonError instanceof ApiError
        ? reasonError.status === 409
          ? 'This application changed on the server. Refresh the list and try again.'
          : reasonError.detail
        : 'Could not update the application.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="applications-page">
      <div className="applications-heading">
        <div>
          <p className="eyebrow">WORKSPACE / CASE MANAGEMENT</p>
          <h2>Applications</h2>
          <p className="muted">{usingSampleData ? 'Illustrative sample records · API unavailable' : 'Live records returned by the connected PRAVAAH API, limited to your account permissions.'}</p>
        </div>
        <div className="applications-heading-actions">
          {canCreate(user.role) && <button className="primary-button" type="button" onClick={() => setCreateOpen((open) => !open)}><Plus size={15} /> New application</button>}
          <button className="secondary-button" type="button" onClick={() => void loadApplications(true)} disabled={loading || refreshing}>
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="applications-toolbar panel">
        <div><strong>{loading ? 'Loading records…' : applications.length + ' application' + (applications.length === 1 ? '' : 's')}</strong><span>{usingSampleData ? 'Demo data only · read-only fallback' : 'API-backed results · Maximum 50 records per request'}</span></div>
        <label className="status-filter">Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | '')}>
            {statusOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {createOpen && <form className="panel application-create-panel" onSubmit={createApplication}>
        <div className="create-panel-heading"><div><h3>Create application</h3><p>Creates a draft record using an existing institution ID.</p></div><button className="close-create" type="button" onClick={() => setCreateOpen(false)} aria-label="Close form"><X size={17} /></button></div>
        <div className="create-fields">
          <label>Institution ID<input type="number" min="1" step="1" required value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} placeholder="e.g. 1" /></label>
          <label>Reference code<input type="text" required minLength={3} maxLength={64}  value={referenceCode} onChange={(event) => setReferenceCode(event.target.value)} placeholder="e.g. APP-2026-0201" /></label>
        </div>
        <p className="create-help">Institution records are not exposed through a listing API yet. Ask your database administrator for the correct ID; the server validates that it exists and that your role can access its region.</p>
        <div className="create-actions"><button className="secondary-button" type="button" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</button><button className="primary-button" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create draft'}</button></div>
      </form>}

      {error && <div className={'feedback '+(usingSampleData ? 'feedback-warning' : 'feedback-error')} role="alert"><AlertCircle size={17} /><span>{error}</span><button type="button" onClick={() => void loadApplications(true)}>Retry</button></div>}
      {notice && <div className="feedback feedback-success" role="status"><ShieldCheck size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">Dismiss</button></div>}

      <div className="panel applications-table-panel">
        {loading ? <div className="applications-state"><span className="state-spinner" /><strong>Loading applications</strong><p>Contacting the configured API.</p></div>
          : error && applications.length === 0 ? <div className="applications-state"><span className="state-empty"><AlertCircle size={20} /></span><strong>Applications could not be loaded</strong><p>Check your connection and try again. The API did not return a usable record list.</p><button className="secondary-button" type="button" onClick={() => void loadApplications(true)} disabled={refreshing}>{refreshing ? 'Retrying…' : 'Retry loading records'}</button></div>
            : applications.length === 0 ? <div className="applications-state"><span className="state-empty"><ArrowRightLeft size={20} /></span><strong>No applications found</strong><p>There are no records for the selected status and your account scope.</p></div>
              : <div className="table-wrap"><table className="applications-table"><thead><tr><th>Reference</th><th>Application ID</th><th>Workflow stage</th><th>Status</th><th>Created</th><th>Available action</th></tr></thead><tbody>
              {applications.map((application) => {
                const transitions = allowedTransitions[application.status] || [];
                const actionable = transitions.filter((target) => canTransition(user.role, target));
                return <tr key={application.id}>
                  <td><Link className="application-reference-link" to={'/applications/' + application.id}><strong>{application.reference_code}</strong></Link><span className="subtext">Institution #{application.institution_id}</span></td>
                  <td>#{application.id}</td>
                  <td>{formatStatus(application.workflow_stage)}</td>
                  <td><span className={'status status-' + (application.status === 'approved' ? 'green' : application.status === 'rejected' ? 'rose' : application.status === 'under_review' ? 'blue' : application.status === 'changes_requested' ? 'amber' : 'blue')}><i />{formatStatus(application.status)}</span></td>
                  <td>{new Date(application.created_at).toLocaleDateString() + ' ' + new Date(application.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{actionable.length > 0 ? <div className="application-actions">{actionable.map((target) => <button key={target} className="table-action" type="button" disabled={pendingId !== null} onClick={() => void transition(application, target)}>{pendingId === application.id ? 'Saving…' : formatStatus(target)}</button>)}</div> : <span className="muted">No permitted action</span>}</td>
                </tr>;
              })}
            </tbody></table></div>}
      </div>
      <p className="applications-disclaimer"><ShieldCheck size={14} /> Status changes are validated by the backend. UI role checks only improve usability and do not replace server authorization.</p>
    </section>
  );
}
