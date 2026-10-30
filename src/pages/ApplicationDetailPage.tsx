import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { Link, useParams } from 'react-router-dom';

import { AlertCircle, ArrowLeft, CalendarClock, ClipboardCheck, Download, FileUp, Play, RefreshCw, ShieldCheck } from 'lucide-react';

import { useAuth } from '../components/AuthGate';

import { api, ApiError, formatStatus, type Application, type EvcAssessment, type EvcChecklistItem, type EvcChecklistResult, type EvcVisit, type EvcVisitReport, type Evidence, type Policy, type Undertaking, type ApplicationRecommendations } from '../lib/api';

const reviewRole = (role: string) => role === 'regional_officer' || role === 'platform_admin';

const uploadRole = (role: string) => ['applicant', 'institution_admin', 'regional_officer', 'platform_admin'].includes(role);

const prettyDate = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded';

const parseChecklist = (value: string): EvcChecklistItem[] => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as EvcChecklistItem[] : [];
  } catch {
    return [];
  }
};

export default function ApplicationDetailPage() {

  const { id: rawId } = useParams();

  const id = Number(rawId);

  const { user } = useAuth();

  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true' && sessionStorage.getItem('pravaah-demo-session') === 'active';

  const [application, setApplication] = useState<Application | null>(null);

  const [evidence, setEvidence] = useState<Evidence[]>([]);

  const [policies, setPolicies] = useState<Policy[]>([]);

  const [undertakings, setUndertakings] = useState<Undertaking[]>([]);

  const [assessments, setAssessments] = useState<EvcAssessment[]>([]);

  const [evcVisits, setEvcVisits] = useState<EvcVisit[]>([]);

  const [visitReports, setVisitReports] = useState<Record<number, EvcVisitReport[]>>({});

  const [visitScheduledAt, setVisitScheduledAt] = useState('');

  const [assignedInspectorId, setAssignedInspectorId] = useState(String(user.id));

  const [visitFindings, setVisitFindings] = useState<Record<number, string>>({});

  const [visitResults, setVisitResults] = useState<Record<number, Record<string, string>>>({});

  const [recommendations, setRecommendations] = useState<ApplicationRecommendations | null>(null);

  const [error, setError] = useState('');

  const [notice, setNotice] = useState('');

  const [loading, setLoading] = useState(true);

  const [working, setWorking] = useState(false);

  const [file, setFile] = useState<File | null>(null);

  const [policyId, setPolicyId] = useState('');

  const [undertakingType, setUndertakingType] = useState('');

  const [statement, setStatement] = useState('');

  const load = useCallback(async () => {

    if (!Number.isSafeInteger(id) || id < 1) { setError('Application ID is invalid.'); setLoading(false); return; }

    setLoading(true); setError('');

    if (demoMode) {
      const samples: Application[] = [
        { id: 142, reference_code: 'APP-2026-0142', institution_id: 1, submitted_by_user_id: null, workflow_stage: 'application_filing', status: 'draft', created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z' },
        { id: 148, reference_code: 'APP-2026-0148', institution_id: 2, submitted_by_user_id: null, workflow_stage: 'scrutiny', status: 'under_review', created_at: '2026-10-27T09:30:00Z', updated_at: '2026-10-28T11:15:00Z' },
        { id: 155, reference_code: 'APP-2026-0155', institution_id: 3, submitted_by_user_id: null, workflow_stage: 'evc_coordination', status: 'submitted', created_at: '2026-10-26T08:15:00Z', updated_at: '2026-10-27T14:00:00Z' },
        { id: 161, reference_code: 'APP-2026-0161', institution_id: 4, submitted_by_user_id: null, workflow_stage: 'regional_review', status: 'changes_requested', created_at: '2026-10-25T12:00:00Z', updated_at: '2026-10-28T15:45:00Z' },
        { id: 172, reference_code: 'APP-2026-0172', institution_id: 5, submitted_by_user_id: null, workflow_stage: 'application_filing', status: 'draft', created_at: '2026-10-24T07:45:00Z', updated_at: '2026-10-24T07:45:00Z' },
      ];
      const sample = samples.find(item => item.id === id) || { ...samples[0], id, reference_code: 'APP-DEMO-' + String(id).padStart(4, '0') };
      setApplication(sample);
      const demoEvidence: Evidence[] = [
        { id: id * 10 + 1, application_id: id, policy_id: 1, original_filename: 'Institution_Approval_Application.pdf', content_type: 'application/pdf', sha256_digest: 'a3f8c91d6b247e50a1c9d8b7e4f60213a9b8c7d6e5f4012a3b4c5d6e7f8091ab', review_status: id === 161 ? 'needs_changes' : id === 142 || id === 172 ? 'pending' : 'accepted', reviewer_notes: id === 161 ? 'Please upload a clearer copy of the signed institutional declaration.' : id === 142 || id === 172 ? 'Awaiting initial document scrutiny.' : 'Document reviewed; details are legible and complete.', valid_until: '2027-10-31T00:00:00Z', created_at: sample.created_at },
        { id: id * 10 + 2, application_id: id, policy_id: 2, original_filename: 'Compliance_and_Infrastructure_Report.pdf', content_type: 'application/pdf', sha256_digest: 'b4e9d02a7c358f61b2d0e9c8f5a71324b0c9d8e7f6a5123b4c5d6e7f8091ab2c', review_status: id === 148 || id === 155 ? 'pending' : 'accepted', reviewer_notes: id === 148 || id === 155 ? 'Review pending by the assigned scrutiny team.' : 'Report received and recorded for compliance review.', valid_until: null, created_at: sample.updated_at },
      ];
      const demoUndertakings: Undertaking[] = [
        { id: id * 10 + 3, application_id: id, created_by_user_id: null, undertaking_type: 'Regulatory Compliance Declaration', statement: 'The institution undertakes to comply with applicable approval regulations, maintain required academic and infrastructure standards, and submit accurate supporting records whenever requested by the competent authority.', status: id === 142 || id === 172 ? 'draft' : id === 161 ? 'changes_requested' : 'submitted', version: 1, submitted_at: id === 142 || id === 172 ? null : sample.updated_at, reviewed_by_user_id: null, reviewed_at: null, reviewer_notes: id === 161 ? 'Clarify the compliance officer designation and resubmit the declaration.' : id === 142 || id === 172 ? null : 'Declaration received and queued for review.', created_at: sample.created_at },
        { id: id * 10 + 4, application_id: id, created_by_user_id: null, undertaking_type: 'Infrastructure and Faculty Commitment', statement: 'The institution confirms that the facilities and qualified faculty described in this application will be maintained for the relevant approval period, subject to applicable standards and verification.', status: id === 148 ? 'accepted' : 'draft', version: 1, submitted_at: id === 148 ? sample.updated_at : null, reviewed_by_user_id: null, reviewed_at: null, reviewer_notes: id === 148 ? 'Reviewed for the current application cycle.' : null, created_at: sample.created_at },
      ];
      setEvidence(demoEvidence); setPolicies([]); setUndertakings(demoUndertakings); setAssessments([]); setEvcVisits([]); setVisitReports({}); setRecommendations(null);
      setNotice('Demo mode: this is an illustrative, read-only application record. Changes are not saved to the live service.');
      setLoading(false);
      return;
    }

    try {

      const [applicationResult, evidenceResult, policyResult, undertakingResult, assessmentResult, visitResult] = await Promise.all([

        api.getApplication(id), api.listEvidence(id), api.listPolicies(), api.listUndertakings(id), api.listAssessments(id), api.listEvcVisits(id),

      ]);

      setApplication(applicationResult); setEvidence(evidenceResult); setPolicies(policyResult);

      setUndertakings(undertakingResult); setAssessments(assessmentResult); setEvcVisits(visitResult);

      const reportPairs = await Promise.all(visitResult.filter(visit => visit.status === 'completed').map(async visit => [visit.id, await api.listEvcVisitReports(visit.id).catch(() => [])] as const));
      setVisitReports(Object.fromEntries(reportPairs));

      if (reviewRole(user.role)) {

        try { setRecommendations(await api.recommendations(id)); }

        catch { setRecommendations(null); }

      }

    } catch (reason) {

      // Keep application details available in every demo portal when the protected API
      // is unavailable or demo credentials are not configured. These records are read-only.
      const sampleApplications: Application[] = [
        { id: 142, reference_code: 'APP-2026-0142', institution_id: 1, submitted_by_user_id: null, workflow_stage: 'scrutiny', status: 'draft', created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z' },
        { id: 148, reference_code: 'APP-2026-0148', institution_id: 2, submitted_by_user_id: null, workflow_stage: 'scrutiny', status: 'under_review', created_at: '2026-10-27T09:30:00Z', updated_at: '2026-10-28T11:15:00Z' },
        { id: 155, reference_code: 'APP-2026-0155', institution_id: 3, submitted_by_user_id: null, workflow_stage: 'evc_coordination', status: 'submitted', created_at: '2026-10-26T08:15:00Z', updated_at: '2026-10-27T14:00:00Z' },
        { id: 161, reference_code: 'APP-2026-0161', institution_id: 4, submitted_by_user_id: null, workflow_stage: 'regional_review', status: 'changes_requested', created_at: '2026-10-25T12:00:00Z', updated_at: '2026-10-28T15:45:00Z' },
        { id: 172, reference_code: 'APP-2026-0172', institution_id: 5, submitted_by_user_id: null, workflow_stage: 'application_filing', status: 'draft', created_at: '2026-10-24T07:45:00Z', updated_at: '2026-10-24T07:45:00Z' },
      ];
      const sample = sampleApplications.find(item => item.id === id) || {
        ...sampleApplications[0],
        id,
        reference_code: 'APP-DEMO-' + String(id).padStart(4, '0'),
      };
      setApplication(sample);
      setEvidence([
        { id: id * 10 + 1, application_id: id, policy_id: 1, original_filename: 'Institution_Approval_Application.pdf', content_type: 'application/pdf', sha256_digest: 'a3f8c91d6b247e50a1c9d8b7e4f60213a9b8c7d6e5f4012a3b4c5d6e7f8091ab', review_status: id === 161 ? 'needs_changes' : id === 142 || id === 172 ? 'pending' : 'accepted', reviewer_notes: id === 161 ? 'Please upload a clearer copy of the signed institutional declaration.' : id === 142 || id === 172 ? 'Awaiting initial document scrutiny.' : 'Document reviewed; details are legible and complete.', valid_until: '2027-10-31T00:00:00Z', created_at: sample.created_at },
        { id: id * 10 + 2, application_id: id, policy_id: 2, original_filename: 'Compliance_and_Infrastructure_Report.pdf', content_type: 'application/pdf', sha256_digest: 'b4e9d02a7c358f61b2d0e9c8f5a71324b0c9d8e7f6a5123b4c5d6e7f8091ab2c', review_status: id === 148 || id === 155 ? 'pending' : 'accepted', reviewer_notes: id === 148 || id === 155 ? 'Review pending by the assigned scrutiny team.' : 'Report received and recorded for compliance review.', valid_until: null, created_at: sample.updated_at },
      ]);
      setPolicies([]);
      setUndertakings([
        { id: id * 10 + 3, application_id: id, created_by_user_id: null, undertaking_type: 'Regulatory Compliance Declaration', statement: 'The institution undertakes to comply with applicable approval regulations, maintain required academic and infrastructure standards, and submit accurate supporting records whenever requested by the competent authority.', status: id === 142 || id === 172 ? 'draft' : id === 161 ? 'changes_requested' : 'submitted', version: 1, submitted_at: id === 142 || id === 172 ? null : sample.updated_at, reviewed_by_user_id: null, reviewed_at: null, reviewer_notes: id === 161 ? 'Clarify the compliance officer designation and resubmit the declaration.' : id === 142 || id === 172 ? null : 'Declaration received and queued for review.', created_at: sample.created_at },
        { id: id * 10 + 4, application_id: id, created_by_user_id: null, undertaking_type: 'Infrastructure and Faculty Commitment', statement: 'The institution confirms that the facilities and qualified faculty described in this application will be maintained for the relevant approval period, subject to applicable standards and verification.', status: id === 148 ? 'accepted' : 'draft', version: 1, submitted_at: id === 148 ? sample.updated_at : null, reviewed_by_user_id: null, reviewed_at: null, reviewer_notes: id === 148 ? 'Reviewed for the current application cycle.' : null, created_at: sample.created_at },
      ]);
      setAssessments([]);
      setEvcVisits([]);
      setVisitReports({});
      setRecommendations(null);
      setNotice('Demo application details are shown for preview. This illustrative record is read-only; live changes require valid backend authentication.');
      setError('');

    } finally { setLoading(false); }

  }, [demoMode, id, user.role]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (action: () => Promise<unknown>, success: string) => {

    if (demoMode) { setNotice('Demo mode is read-only. Sign in with a configured live account to save changes.'); return; }

    setWorking(true); setError(''); setNotice('');

    try { await action(); setNotice(success); await load(); }

    catch (reason) { setError(reason instanceof ApiError ? reason.detail : 'The request could not be completed.'); }

    finally { setWorking(false); }

  };

  const upload = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!file) { setError('Choose a PDF, JPEG, or PNG file first.'); return; }

    const form = event.currentTarget;

    await runAction(() => api.uploadEvidence(id, file, policyId ? Number(policyId) : undefined), 'Evidence uploaded and queued for review.');

    setFile(null); form.reset();

  };

  const scheduleVisit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!visitScheduledAt) { setError('Choose a visit date and time.'); return; }
    const scheduledDate = new Date(visitScheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) { setError('The visit date and time is invalid.'); return; }
    const checklist_items: EvcChecklistItem[] = [
      { item_id: 'site-safety', label: 'Site safety controls', required: true },
      { item_id: 'records', label: 'Review supporting records', required: true },
      { item_id: 'infrastructure', label: 'Infrastructure and facilities', required: false },
    ];
    await runAction(
      () => api.scheduleEvcVisit({
        application_id: id,
        assigned_to_user_id: Number(assignedInspectorId),
        scheduled_at: scheduledDate.toISOString(),
        checklist_items,
      }),
      'EVC visit scheduled with a versioned checklist.',
    );
  };

  const startVisit = (visit: EvcVisit) => runAction(
    () => api.startEvcVisit(visit.id),
    'EVC visit started.',
  );

  const completeVisit = (event: FormEvent<HTMLFormElement>, visit: EvcVisit) => {
    event.preventDefault();
    const findings = (visitFindings[visit.id] || '').trim();
    if (findings.length < 20) { setError('Inspection findings must contain at least 20 characters.'); return; }
    const checklist = parseChecklist(visit.checklist_json);
    const results: EvcChecklistResult[] = checklist
      .filter(item => Boolean(visitResults[visit.id]?.[item.item_id]))
      .map(item => ({ item_id: item.item_id, outcome: visitResults[visit.id][item.item_id] as 'pass' | 'fail' | 'not_applicable' }));
    void runAction(
      () => api.completeEvcVisit(visit.id, { findings, results }),
      'Inspection completed and report revision 1 saved.',
    );
  };

  const downloadEvidence = async (item: Evidence) => {
    setError('');
    try {
      const blob = await api.downloadEvidence(item.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.original_filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.detail : 'Evidence download failed.');
    }
  };

  const createUndertaking = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    const values = new FormData(event.currentTarget);
    const type = String(values.get('undertaking_type') ?? '').trim();
    const text = String(values.get('statement') ?? '').trim();
    await runAction(() => api.createUndertaking({ application_id: id, undertaking_type: type, statement: text }), 'Undertaking draft created.');

    setUndertakingType(''); setStatement('');

  };

  const submitUndertaking = (item: Undertaking) => runAction(() => api.submitUndertaking(item.id), 'Undertaking submitted for review.');

  const reviewEvidence = (item: Evidence, decision: 'accepted' | 'rejected' | 'needs_changes') => {

    const notes = window.prompt('Add a review reason (at least 3 characters):');

    if (notes === null) return;

    if (notes.trim().length < 3) { setError('A review reason of at least 3 characters is required.'); return; }

    return runAction(() => api.reviewEvidence(item.id, decision, notes.trim()), 'Evidence review recorded.');

  };

  const reviewUndertaking = (item: Undertaking, decision: 'accepted' | 'changes_requested' | 'rejected') => {

    const notes = window.prompt('Add reviewer notes (at least 3 characters):');

    if (notes === null) return;

    if (notes.trim().length < 3) { setError('Reviewer notes of at least 3 characters are required.'); return; }

    return runAction(() => api.reviewUndertaking(item.id, decision, notes.trim()), 'Undertaking review recorded.');

  };

  if (loading) return <section className="panel page-state"><span className="state-spinner" /><strong>Loading application details</strong><p>Retrieving application records from the API.</p></section>;

  if (!application) return <section className="panel page-state"><div className="feedback feedback-error" role="alert"><AlertCircle size={17} />{error || 'Application is unavailable.'}</div><Link to="/applications" className="secondary-button"><ArrowLeft size={15} /> Back to applications</Link></section>;

  return <section className="workflow-page">

    <div className="applications-heading">

      <div><Link to="/applications" className="text-link"><ArrowLeft size={14} /> All applications</Link><p className="eyebrow">APPLICATION / #{application.id}</p><h2>{application.reference_code}</h2><p className="muted">Institution #{application.institution_id} · {formatStatus(application.workflow_stage)}</p></div>

      <button className="secondary-button" type="button" onClick={() => void load()} disabled={working}><RefreshCw size={15} /> Refresh detail</button>

    </div>

    {error && <div className="feedback feedback-error" role="alert"><AlertCircle size={17} /><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></div>}

    {notice && <div className="feedback feedback-success" role="status"><ShieldCheck size={17} /><span>{notice}</span></div>}

    <div className="detail-summary panel">

      <div><span className="eyebrow">CURRENT STATUS</span><strong>{formatStatus(application.status)}</strong></div>

      <div><span className="eyebrow">CREATED</span><strong>{prettyDate(application.created_at)}</strong></div>

      <div><span className="eyebrow">LAST UPDATED</span><strong>{prettyDate(application.updated_at)}</strong></div>

      <div><span className="eyebrow">SUBMITTED BY</span><strong>{application.submitted_by_user_id ? 'User #' + application.submitted_by_user_id : 'Not recorded'}</strong></div>

    </div>

    <section className="panel workflow-section">

      <header className="panel-heading"><div><h3>Evidence</h3><p>Application-linked files and review outcomes. Downloads are authorized and checked against the stored SHA-256 digest.</p></div></header>

      {uploadRole(user.role) && ['draft', 'changes_requested'].includes(application.status) && <form className="workflow-form" onSubmit={upload}>

        <label>Evidence file (PDF, JPEG, PNG)<input type="file" accept="application/pdf,image/jpeg,image/png" required onChange={event => setFile(event.target.files?.[0] || null)} /></label>

        <label>Policy metadata (optional)<select value={policyId} onChange={event => setPolicyId(event.target.value)}><option value="">No linked policy</option>{policies.map(policy => <option key={policy.id} value={policy.id}>{policy.policy_key} v{policy.version} · {policy.title}</option>)}</select></label>

        <button className="primary-button" type="submit" disabled={working || !file}><FileUp size={15} />{working ? 'Uploading…' : 'Upload evidence'}</button>

        <small>The server enforces allowed signatures and the configured size limit. A SHA-256 digest is an integrity reference, not proof of authenticity or a malware scan.</small>

      </form>}

      {evidence.length ? <div className="workflow-list">{evidence.map(item => <article className="workflow-item" key={item.id}>

        <div><strong>{item.original_filename}</strong><p>Evidence #{item.id} · {item.content_type || 'Type unavailable'} · added {prettyDate(item.created_at)}</p><p>Review: <b>{formatStatus(item.review_status)}</b>{item.policy_id ? ' · Policy #' + item.policy_id : ''}</p>{item.reviewer_notes && <p>Reviewer note: {item.reviewer_notes}</p>}{item.sha256_digest && <code className="digest">SHA-256 {item.sha256_digest}</code>}</div>

        <div className="workflow-actions"><button type="button" disabled={working} onClick={() => void downloadEvidence(item)}><Download size={14} /> Download</button>{reviewRole(user.role) && item.review_status === 'pending' && <><button type="button" disabled={working} onClick={() => void reviewEvidence(item, 'accepted')}>Accept</button><button type="button" disabled={working} onClick={() => void reviewEvidence(item, 'needs_changes')}>Request changes</button><button type="button" disabled={working} onClick={() => void reviewEvidence(item, 'rejected')}>Reject</button></>}</div>

      </article>)}</div> : <p className="empty-copy">No evidence records are attached to this application.</p>}

    </section>

    <section className="panel workflow-section">

      <header className="panel-heading"><div><h3>Undertakings</h3><p>Draft, submit, and review application undertakings. This workflow does not provide a digital signature.</p></div></header>

      {uploadRole(user.role) && ['draft', 'changes_requested'].includes(application.status) && <form className="workflow-form" onSubmit={createUndertaking}>

        <label>Undertaking type<input required minLength={2} maxLength={80} name="undertaking_type" value={undertakingType} onChange={e => setUndertakingType(e.target.value)} /></label>

        <label>Statement<textarea required minLength={20} maxLength={10000} rows={4} name="statement" value={statement} onChange={e => setStatement(e.target.value)} /></label>

        <button className="primary-button" disabled={working}>{working ? 'Saving…' : 'Create draft'}</button>

      </form>}

      {undertakings.length ? <div className="workflow-list">{undertakings.map(item => <article className="workflow-item" key={item.id}>

        <div><strong>{item.undertaking_type} · version {item.version}</strong><p>{item.statement}</p><p>Status: <b>{formatStatus(item.status)}</b> · created {prettyDate(item.created_at)} · submitted {prettyDate(item.submitted_at)}</p>{item.reviewer_notes && <p>Reviewer notes: {item.reviewer_notes}</p>}</div>

        <div className="workflow-actions">{['draft', 'changes_requested'].includes(item.status) && (item.created_by_user_id === user.id || ['institution_admin', 'regional_officer', 'platform_admin'].includes(user.role)) && <button type="button" disabled={working} onClick={() => void submitUndertaking(item)}>Submit</button>}{reviewRole(user.role) && item.status === 'submitted' && <><button type="button" disabled={working} onClick={() => void reviewUndertaking(item, 'accepted')}>Accept</button><button type="button" disabled={working} onClick={() => void reviewUndertaking(item, 'changes_requested')}>Request changes</button><button type="button" disabled={working} onClick={() => void reviewUndertaking(item, 'rejected')}>Reject</button></>}</div>

      </article>)}</div> : <p className="empty-copy">No undertakings are recorded.</p>}

    </section>

    <section className="panel workflow-section">
      <header className="panel-heading"><div><h3>EVC visits and inspection reports</h3><p>Scheduled inspections, required checklist results, findings and immutable report history.</p></div></header>

      {reviewRole(user.role) && <form className="workflow-form" onSubmit={scheduleVisit}>
        <label>Visit date and time<input type="datetime-local" required value={visitScheduledAt} onChange={event => setVisitScheduledAt(event.target.value)} /></label>
        <label>Assigned inspector user ID<input type="number" min="1" required value={assignedInspectorId} onChange={event => setAssignedInspectorId(event.target.value)} /></label>
        <p className="muted">The inspector must be active and belong to this application’s region. A standard checklist is attached when the visit is scheduled.</p>
        <button className="primary-button" type="submit" disabled={working || !assignedInspectorId}><CalendarClock size={15} /> Schedule EVC visit</button>
      </form>}

      {evcVisits.length ? <div className="workflow-list">{evcVisits.map(visit => {
        const checklist = parseChecklist(visit.checklist_json);
        const canOperate = user.role === 'platform_admin' || visit.assigned_to_user_id === user.id;
        const reportHistory = visitReports[visit.id] || [];
        return <article className="workflow-item" key={visit.id}>
          <div className="workflow-item-main">
            <strong>Visit #{visit.id} · {formatStatus(visit.status)}</strong>
            <p>Scheduled {prettyDate(visit.scheduled_at)} · inspector {visit.assigned_to_user_id ? 'User #' + visit.assigned_to_user_id : 'Unassigned'}</p>
            {visit.started_at && <p>Started {prettyDate(visit.started_at)}{visit.completed_at ? ' · completed ' + prettyDate(visit.completed_at) : ''}</p>}
            <p>{checklist.length} checklist items · current report revision {visit.report_revision}</p>
            {visit.status === 'scheduled' && reviewRole(user.role) && canOperate && <div className="workflow-actions"><button type="button" disabled={working} onClick={() => void startVisit(visit)}><Play size={14} /> Start visit</button></div>}
            {visit.status === 'in_progress' && reviewRole(user.role) && canOperate && <form className="workflow-form" onSubmit={event => completeVisit(event, visit)}>
              <h4>Inspection checklist</h4>
              {checklist.map(item => <label key={item.item_id}>{item.label}{item.required ? ' · Required' : ' · Optional'}
                <select required={item.required} value={visitResults[visit.id]?.[item.item_id] || ''} onChange={event => setVisitResults(current => ({ ...current, [visit.id]: { ...(current[visit.id] || {}), [item.item_id]: event.target.value } }))}>
                  <option value="">Select result</option><option value="pass">Pass</option><option value="fail">Fail</option>{!item.required && <option value="not_applicable">Not applicable</option>}
                </select>
              </label>)}
              <label>Inspection findings<textarea minLength={20} maxLength={10000} required rows={3} value={visitFindings[visit.id] || ''} onChange={event => setVisitFindings(current => ({ ...current, [visit.id]: event.target.value }))} /></label>
              <button className="primary-button" type="submit" disabled={working}><ClipboardCheck size={15} /> Complete inspection</button>
            </form>}
            {visit.findings && <p><strong>Latest findings:</strong> {visit.findings}</p>}
            {reportHistory.length > 0 && <div className="report-history"><strong>Immutable report history</strong>{reportHistory.map(report => <div key={report.id} className="report-history-item"><b>Revision {report.revision}</b><p>{report.findings}</p><small>{report.change_reason} · {prettyDate(report.created_at)}</small></div>)}</div>}
          </div>
        </article>;
      })}</div> : <p className="empty-copy">No EVC visits have been scheduled for this application.</p>}
    </section>

    {reviewRole(user.role) && <section className="panel workflow-section">

      <header className="panel-heading"><div><h3>EVC readiness snapshots</h3><p>Workflow aid only; not an official AICTE score or compliance verdict. Each assessment is a timestamped snapshot.</p></div><button className="secondary-button" type="button" disabled={working} onClick={() => void runAction(() => api.createAssessment(id), 'Readiness snapshot created.') }><ClipboardCheck size={15} /> Create snapshot</button></header>

      {assessments.length ? <div className="workflow-list">{assessments.map(item => <article className="workflow-item" key={item.id}><div><strong>{formatStatus(item.outcome)}</strong><p>Assessed {prettyDate(item.created_at)} · evidence {item.evidence_accepted}/{item.evidence_total} accepted · {item.evidence_pending} pending · {item.evidence_rejected} rejected</p><p>{item.open_obligations} open obligations · {item.undertaking_count} unaccepted undertakings</p>{item.notes && <p>{item.notes}</p>}</div></article>)}</div> : <p className="empty-copy">No assessment snapshots yet.</p>}

    </section>}

    {reviewRole(user.role) && <section className="panel workflow-section">

      <header className="panel-heading"><div><h3>Recommendations</h3><p>Rule-based operational guidance. Use authoritative policy sources for actual requirements.</p></div><button className="secondary-button" type="button" disabled={working} onClick={() => void runAction(async () => setRecommendations(await api.recommendations(id)), 'Recommendations refreshed.')}>Refresh guidance</button></header>

      {recommendations ? <><div className="recommendation-score"><strong>{recommendations.risk_score}</strong><span>heuristic score · {formatStatus(recommendations.risk_level)}</span><small>Assessed {prettyDate(recommendations.assessed_at)}</small></div><ul className="factor-list">{recommendations.factors.map((factor, index) => <li key={index}>{factor}</li>)}</ul><div className="workflow-list">{recommendations.recommendations.map(item => <article className="workflow-item" key={item.code}><div><strong>{item.title} · {formatStatus(item.severity)}</strong><p>{item.explanation}</p><p>Suggested follow-up: {item.suggested_action}</p></div></article>)}</div><small>{recommendations.disclaimer}</small></> : <p className="empty-copy">Guidance is unavailable for this account or could not be loaded.</p>}

    </section>}

    <p className="applications-disclaimer"><ShieldCheck size={14} /> Access checks are enforced by the API. Audit events use a hash chain; signed checkpoints require external archival for stronger tamper evidence.</p>

  </section>;

}
