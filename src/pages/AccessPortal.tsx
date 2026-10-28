import { ArrowRight, Building2, Landmark, FileCheck2, MapPin, Layers, ShieldCheck, Workflow, Search, ChevronRight, Phone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const portals = [
  { number: '01', title: 'Institution Coordinator Dashboard', subtitle: 'Applicant Institution Workspace', category: 'APPLICATION FILING', description: 'Prepare and submit approval applications, upload required evidence, track stage-wise progress, respond to scrutiny observations, and manage assigned undertakings.', meta: 'Stage-based review', documents: '3 document groups', tags: ['Deposit instrument lodgement', 'OCR Status', 'Renewal Chain'], icon: Building2, tone: 'blue' },
  { number: '02', title: 'Scrutiny Officer Dashboard', subtitle: 'Application Review & Evidence Validation', category: 'STAGE-WISE SCRUTINY', description: 'Review application completeness, validate submitted evidence against pinned policy requirements, record reasoned observations, and manage deficiency and resubmission cycles.', meta: 'Verification workflow', documents: '3 document groups', tags: ['CBS Verification', 'QR & Token Gateway', 'Lien Endorsement'], icon: Landmark, tone: 'green' },
  { number: '03', title: 'EVC Coordination Dashboard', subtitle: 'Expert Visit Committee Workflow', category: 'EVC COORDINATION', description: 'Coordinate Expert Visit Committee scheduling when required, monitor readiness and assigned actions, record visit outcomes, and route findings to the responsible review stage.', meta: 'Stage-based review', documents: '3 document groups', tags: ['Side-by-Side Review', 'Discrepancy Audit', 'Correction Requests'], icon: FileCheck2, tone: 'violet' },
  { number: '04', title: 'Regional Officer Dashboard', subtitle: 'Regional Pendency & Escalation Review', category: 'REGIONAL REVIEW', description: 'Monitor stage-wise pendency across assigned cases, review overdue obligations, supervise regional workload, and escalate blocked applications with recorded reasons.', meta: 'Regional monitoring', documents: '3 document groups', tags: ['Regional Monitoring', 'Expiring Instruments', 'Overdue Tracking'], icon: MapPin, tone: 'amber' },
  { number: '05', title: 'AICTE Headquarters Review Dashboard', subtitle: 'Policy Oversight & Approval Decisions', category: 'HEADQUARTERS REVIEW', description: 'Review escalated cases and regional recommendations, oversee policy-version consistency, compare workflow performance, and monitor approval bottlenecks across the system.', meta: 'National oversight', documents: '3 document groups', tags: ['Central Repository', 'Nationwide KPIs', 'Velocity Analytics'], icon: Layers, tone: 'blue' },
  { number: '06', title: 'Compliance Monitoring & Audit Dashboard', subtitle: 'Obligations, Alerts & Audit Trail', category: 'COMPLIANCE & AUDIT', description: 'Track due dates and document validity, review automated reminders and escalation events, monitor explainable compliance alerts, and inspect tamper-evident workflow audit history.', meta: 'Eligibility review', documents: '3 document groups', tags: ['Statutory Lock-in Audit', 'Eligibility Review', 'Discharge Approval'], icon: ShieldCheck, tone: 'green' },
  { number: '07', title: 'Platform Administrator Dashboard', subtitle: 'Platform Operations & User Administration', category: 'PLATFORM OPERATIONS', description: 'Review platform-wide workflow status, sample institution and officer counts, operational alerts, and administration work queues in the demonstration workspace.', meta: 'Platform monitoring', documents: 'Operations overview', tags: ['Workflow Status', 'User Administration', 'Operational Alerts'], icon: ShieldCheck, tone: 'blue' },
];

export default function AccessPortal() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const filteredPortals = useMemo(() => portals.filter((portal) =>
    (portal.title + ' ' + portal.subtitle + ' ' + portal.description + ' ' + portal.category + ' ' + portal.tags.join(' ')).toLowerCase().includes(query.toLowerCase())
  ), [query]);
  const choosePortal = (portal: typeof portals[number]) => {
    sessionStorage.setItem('pravaah-selected-portal', portal.title);
    navigate('/sign-in?portal=' + encodeURIComponent(portal.title));
  };
  return <div className="access-portal-page">
    <div className="pr-top-strip access-portal-top-strip"><div><b>APPROVAL WORKFLOW PLATFORM</b><span> | </span><span>Institutional approvals, policy norms and compliance services</span></div><div><a href="/">Public Overview</a><span> | </span><button onClick={() => document.getElementById('portal-help')?.scrollIntoView({behavior:'smooth'})}><Phone size={12}/> Help &amp; Support</button></div></div>
    <header className="pr-header access-portal-pr-header">
      <button className="pr-brand access-portal-pr-brand" onClick={() => navigate('/')} aria-label="PRAVAAH home">
        <span className="pr-emblem"><b>PV</b><small>प्रवाह</small></span>
        <span><strong>PRAVAAH <em>(प्रवाह)</em> </strong><small>Integrated AICTE Approval Workflow Automation, Policy Norms &amp; Citizen Services</small><small>Approval workflow and compliance platform</small></span>
      </button>
      <div className="access-portal-return">
        <button onClick={() => navigate('/')}><ArrowRight size={15}/> Return to Public Portal</button>
      </div>
    </header>
    <main className="access-portal-main">
      <div className="access-portal-breadcrumb"><button onClick={() => navigate('/')}>Home</button><ChevronRight size={13}/><strong>Access Portal</strong></div>
      <div className="access-portal-title-row"><div><span className="access-portal-eyebrow">WORKSPACE DIRECTORY</span><h1>Choose your PRAVAAH workspace</h1><p>Select the stakeholder workspace relevant to your responsibilities. Sign-in is handled by the connected authentication service; selecting a workspace does not grant permissions.</p></div><span className="access-portal-rbac"><ShieldCheck size={16}/> Role-aware access</span></div>
      <label className="access-portal-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dashboards, roles or responsibilities…"/><span>{filteredPortals.length} workspaces</span></label>
      <section className="access-portal-grid" id="workspace-directory" aria-label="Available PRAVAAH dashboard roles">{filteredPortals.map((portal) => { const Icon = portal.icon; return <article className="access-portal-card" key={portal.number}>
        <div className="access-portal-card-top"><span className={'access-portal-icon tone-' + portal.tone}><Icon size={21}/></span><span className="access-portal-category">{portal.category}</span></div>
        <h2>{portal.title}</h2><h3>{portal.subtitle}</h3><p className="access-portal-description">{portal.description}</p>
        <button className="access-portal-select" onClick={() => choosePortal(portal)}>Continue to workspace <ArrowRight size={15}/></button>
      </article>; })}</section>
      {filteredPortals.length === 0 && <div className="access-portal-empty">No workspaces match “{query}”. Try a different role or service.</div>}
      <section className="access-portal-help" id="portal-help"><Workflow size={18}/><div><strong>Need help choosing a workspace?</strong><p>Use the account assigned to you by your institution or administrator. Your actual permissions are determined by the connected authentication service.</p></div><button onClick={() => navigate('/')}>Visit public information <ArrowRight size={14}/></button></section>
      <p className="access-portal-disclaimer">PRAVAAH-2 demonstration platform · Not an official AICTE service. Sample workflows and records are illustrative.</p>
    </main>
  </div>;
}
