import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { Link, useParams } from 'react-router-dom';

import { AlertCircle, ArrowLeft, ClipboardCheck, FileUp, RefreshCw, ShieldCheck } from 'lucide-react';

import { useAuth } from '../components/AuthGate';

import { api, ApiError, formatStatus, type Application, type EvcAssessment, type Evidence, type Policy, type Undertaking, type ApplicationRecommendations } from '../lib/api';

const reviewRole = (role: string) => role === 'regional_officer' || role === 'platform_admin';

const uploadRole = (role: string) => ['applicant', 'institution_admin', 'regional_officer', 'platform_admin'].includes(role);

const prettyDate = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded';

export default function ApplicationDetailPage() {

  const { id: rawId } = useParams();

  const id = Number(rawId);

  const { user } = useAuth();

  const [application, setApplication] = useState<Application | null>(null);

  const [evidence, setEvidence] = useState<Evidence[]>([]);

  const [policies, setPolicies] = useState<Policy[]>([]);

  const [undertakings, setUndertakings] = useState<Undertaking[]>([]);

  const [assessments, setAssessments] = useState<EvcAssessment[]>([]);

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

    try {

      const [applicationResult, evidenceResult, policyResult, undertakingResult, assessmentResult] = await Promise.all([

        api.getApplication(id), api.listEvidence(id), api.listPolicies(), api.listUndertakings(id), api.listAssessments(id),

      ]);

      setApplication(applicationResult); setEvidence(evidenceResult); setPolicies(policyResult);

      setUndertakings(undertakingResult); setAssessments(assessmentResult);

      if (reviewRole(user.role)) {

        try { setRecommendations(await api.recommendations(id)); }

        catch { setRecommendations(null); }

      }

    } catch (reason) {

      setApplication(null);

      setError(reason instanceof ApiError ? reason.detail : 'Could not load the application details.');

    } finally { setLoading(false); }

  }, [id, user.role]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (action: () => Promise<unknown>, success: string) => {

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

      <header className="panel-heading"><div><h3>Evidence</h3><p>Application-linked files and review outcomes. Private files are not downloadable from this interface.</p></div></header>

      {uploadRole(user.role) && ['draft', 'changes_requested'].includes(application.status) && <form className="workflow-form" onSubmit={upload}>

        <label>Evidence file (PDF, JPEG, PNG)<input type="file" accept="application/pdf,image/jpeg,image/png" required onChange={event => setFile(event.target.files?.[0] || null)} /></label>

        <label>Policy metadata (optional)<select value={policyId} onChange={event => setPolicyId(event.target.value)}><option value="">No linked policy</option>{policies.map(policy => <option key={policy.id} value={policy.id}>{policy.policy_key} v{policy.version} · {policy.title}</option>)}</select></label>

        <button className="primary-button" type="submit" disabled={working || !file}><FileUp size={15} />{working ? 'Uploading…' : 'Upload evidence'}</button>

        <small>The server enforces allowed signatures and the configured size limit. A SHA-256 digest is an integrity reference, not proof of authenticity or a malware scan.</small>

      </form>}

      {evidence.length ? <div className="workflow-list">{evidence.map(item => <article className="workflow-item" key={item.id}>

        <div><strong>{item.original_filename}</strong><p>Evidence #{item.id} · {item.content_type || 'Type unavailable'} · added {prettyDate(item.created_at)}</p><p>Review: <b>{formatStatus(item.review_status)}</b>{item.policy_id ? ' · Policy #' + item.policy_id : ''}</p>{item.reviewer_notes && <p>Reviewer note: {item.reviewer_notes}</p>}{item.sha256_digest && <code className="digest">SHA-256 {item.sha256_digest}</code>}</div>

        {reviewRole(user.role) && item.review_status === 'pending' && <div className="workflow-actions"><button type="button" disabled={working} onClick={() => void reviewEvidence(item, 'accepted')}>Accept</button><button type="button" disabled={working} onClick={() => void reviewEvidence(item, 'needs_changes')}>Request changes</button><button type="button" disabled={working} onClick={() => void reviewEvidence(item, 'rejected')}>Reject</button></div>}

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

    {reviewRole(user.role) && <section className="panel workflow-section">

      <header className="panel-heading"><div><h3>EVC readiness snapshots</h3><p>Workflow aid only; not an official AICTE score or compliance verdict. Each assessment is a timestamped snapshot.</p></div><button className="secondary-button" type="button" disabled={working} onClick={() => void runAction(() => api.createAssessment(id), 'Readiness snapshot created.') }><ClipboardCheck size={15} /> Create snapshot</button></header>

      {assessments.length ? <div className="workflow-list">{assessments.map(item => <article className="workflow-item" key={item.id}><div><strong>{formatStatus(item.outcome)}</strong><p>Assessed {prettyDate(item.created_at)} · evidence {item.evidence_accepted}/{item.evidence_total} accepted · {item.evidence_pending} pending · {item.evidence_rejected} rejected</p><p>{item.open_obligations} open obligations · {item.undertaking_count} unaccepted undertakings</p>{item.notes && <p>{item.notes}</p>}</div></article>)}</div> : <p className="empty-copy">No assessment snapshots yet.</p>}

    </section>}

    {reviewRole(user.role) && <section className="panel workflow-section">

      <header className="panel-heading"><div><h3>Recommendations</h3><p>Rule-based operational guidance. Use authoritative policy sources for actual requirements.</p></div><button className="secondary-button" type="button" disabled={working} onClick={() => void runAction(async () => setRecommendations(await api.recommendations(id)), 'Recommendations refreshed.')}>Refresh guidance</button></header>

      {recommendations ? <><div className="recommendation-score"><strong>{recommendations.risk_score}</strong><span>heuristic score · {formatStatus(recommendations.risk_level)}</span><small>Assessed {prettyDate(recommendations.assessed_at)}</small></div><ul className="factor-list">{recommendations.factors.map((factor, index) => <li key={index}>{factor}</li>)}</ul><div className="workflow-list">{recommendations.recommendations.map(item => <article className="workflow-item" key={item.code}><div><strong>{item.title} · {formatStatus(item.severity)}</strong><p>{item.explanation}</p><p>Suggested follow-up: {item.suggested_action}</p></div></article>)}</div><small>{recommendations.disclaimer}</small></> : <p className="empty-copy">Guidance is unavailable for this account or could not be loaded.</p>}

    </section>}

    <p className="applications-disclaimer"><ShieldCheck size={14} /> Access checks are enforced by the API. Audit events are not established as immutable records.</p>

  </section>;

}
