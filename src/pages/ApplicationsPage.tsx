import { useCallback, useEffect, useState, type FormEvent } from 'react';
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
  const [notice, setNotice] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [institutionId, setInstitutionId] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [creating, setCreating] = useState(false);

  const loadApplications = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await api.listApplications(statusFilter || undefined);
      setApplications(result);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.detail : 'Could not load applications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
          <p className="muted">Live records returned by the connected PRAVAAH API, limited to your account permissions.</p>
        </div>
        <div className="applications-heading-actions">
          {canCreate(user.role) && <button className="primary-button" type="button" onClick={() => setCreateOpen((open) => !open)}><Plus size={15} /> New application</button>}
          <button className="secondary-button" type="button" onClick={() => void loadApplications(true)} disabled={loading || refreshing}>
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="applications-toolbar panel">
        <div><strong>{loading ? 'Loading records…' : applications.length + ' application' + (applications.length === 1 ? '' : 's')}</strong><span>API-backed results · Maximum 50 records per request</span></div>
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
          <label>Reference code<input type="text" required minLength={3} maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9._/-]*" value={referenceCode} onChange={(event) => setReferenceCode(event.target.value)} placeholder="e.g. APP-2026-0201" /></label>
        </div>
        <p className="create-help">Institution records are not exposed through a listing API yet. Ask your database administrator for the correct ID; the server validates that it exists and that your role can access its region.</p>
        <div className="create-actions"><button className="secondary-button" type="button" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</button><button className="primary-button" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create draft'}</button></div>
      </form>}

      {error && <div className="feedback feedback-error" role="alert"><AlertCircle size={17} /><span>{error}</span><button type="button" onClick={() => void loadApplications(true)}>Retry</button></div>}
      {notice && <div className="feedback feedback-success" role="status"><ShieldCheck size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">Dismiss</button></div>}

      <div className="panel applications-table-panel">
        {loading ? <div className="applications-state"><span className="state-spinner" /><strong>Loading applications</strong><p>Contacting the configured API.</p></div>
          : !error && applications.length === 0 ? <div className="applications-state"><span className="state-empty"><ArrowRightLeft size={20} /></span><strong>No applications found</strong><p>There are no records for the selected status and your account scope.</p></div>
            : applications.length > 0 && <div className="table-wrap"><table className="applications-table"><thead><tr><th>Reference</th><th>Application ID</th><th>Workflow stage</th><th>Status</th><th>Created</th><th>Available action</th></tr></thead><tbody>
              {applications.map((application) => {
                const transitions = allowedTransitions[application.status] || [];
                const actionable = transitions.filter((target) => canTransition(user.role, target));
                return <tr key={application.id}>
                  <td><strong>{application.reference_code}</strong><span className="subtext">Institution #{application.institution_id}</span></td>
                  <td>#{application.id}</td>
                  <td>{formatStatus(application.workflow_stage)}</td>
                  <td><span className={'status status-' + (application.status === 'approved' ? 'green' : application.status === 'rejected' ? 'rose' : application.status === 'under_review' ? 'blue' : application.status === 'changes_requested' ? 'amber' : 'blue')}><i />{formatStatus(application.status)}</span></td>
                  <td>{new Date(application.created_at).toLocaleDateString() + ' ' + new Date(application.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{actionable.length > 0 ? <div className="application-actions">{actionable.map((target) => <button key={target} className="table-action" type="button" disabled={pendingId === application.id} onClick={() => void transition(application, target)}>{pendingId === application.id ? 'Saving…' : formatStatus(target)}</button>)}</div> : <span className="muted">No permitted action</span>}</td>
                </tr>;
              })}
            </tbody></table></div>}
      </div>
      <p className="applications-disclaimer"><ShieldCheck size={14} /> Status changes are validated by the backend. UI role checks only improve usability and do not replace server authorization.</p>
    </section>
  );
}
