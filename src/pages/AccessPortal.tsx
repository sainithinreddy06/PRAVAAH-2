import { ArrowRight, Building2, Landmark, FileCheck2, MapPin, Layers, ShieldCheck, UserRoundCog, Workflow, Clock3, FileText, Search, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const portals = [
  { number: '01', title: 'Institution Dashboard', subtitle: 'Technical Institutions & Colleges', category: 'INSTITUTION', description: 'Submit FDR instruments, track bank verification status, address discrepancies, manage renewals, and submit security deposit release applications.', meta: 'Stage-based review', documents: '3 document groups', tags: ['FDR Lodgement', 'OCR Status', 'Renewal Chain'], icon: Building2, tone: 'blue' },
  { number: '02', title: 'Bank Partner Dashboard', subtitle: 'Scheduled Commercial Banks', category: 'BANK PARTNER', description: 'Review assigned verification requests, verify Core Banking (CBS) deposit balances, confirm AICTE joint lien endorsements, and record authorized confirmations.', meta: 'Verification workflow', documents: '3 document groups', tags: ['CBS Verification', 'QR & Token Gateway', 'Lien Endorsement'], icon: Landmark, tone: 'green' },
  { number: '03', title: 'AICTE Scrutiny Dashboard', subtitle: 'Regulatory Scrutiny Bureau', category: 'SCRUTINY', description: 'Review scanned FDR receipts, inspect automated OCR extractions, assess discrepancy alerts, manage institution corrections, and prepare recommendations.', meta: 'Stage-based review', documents: '3 document groups', tags: ['Side-by-Side Review', 'Discrepancy Audit', 'Correction Requests'], icon: FileCheck2, tone: 'violet' },
  { number: '04', title: 'Regional Officer Dashboard', subtitle: 'AICTE Regional Directorates', category: 'REGIONAL OFFICE', description: 'Monitor regional institutional compliance, upcoming maturities, overdue cases, track pending verifications, and supervise regional escalations.', meta: 'Regional monitoring', documents: '3 document groups', tags: ['Regional Monitoring', 'Expiring Instruments', 'Overdue Tracking'], icon: MapPin, tone: 'amber' },
  { number: '05', title: 'Regulation Bureau Dashboard', subtitle: 'AICTE HQ / Member Secretary', category: 'REGULATION BUREAU', description: 'Nationwide FDR inventory surveillance, centralized repository, compliance tracking, regional performance benchmarking, and executive analytics.', meta: 'National oversight', documents: '3 document groups', tags: ['Central Repository', 'Nationwide KPIs', 'Velocity Analytics'], icon: Layers, tone: 'blue' },
  { number: '06', title: 'Release / Refund Dashboard', subtitle: 'Deposit Discharge Cell', category: 'RELEASE & REFUND', description: 'Vet statutory lock-in compliance, inspect board resolutions and no-dues clearance, process approvals, and issue bank discharge orders.', meta: 'Eligibility review', documents: '3 document groups', tags: ['Statutory Lock-in Audit', 'Eligibility Review', 'Discharge Approval'], icon: ShieldCheck, tone: 'green' },
  { number: '07', title: 'System Administrator Dashboard', subtitle: 'IT & Infrastructure Cell', category: 'SYSTEM ADMIN', description: 'Manage user accounts, role permissions, scheduled expiry jobs, token configurations, notification schedules, and system security logs.', meta: 'System governance', documents: '3 document groups', tags: ['User Management', 'RBAC Configuration', 'Scheduler Health'], icon: UserRoundCog, tone: 'violet' },
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
    <header className="access-portal-header">
      <button className="access-portal-brand" onClick={() => navigate('/')} aria-label="PRAVAAH home">
        <span className="access-portal-emblem"><Workflow size={21}/></span>
        <span><strong>PRAVAAH</strong><small>Approval &amp; Compliance Management</small></span>
      </button>
      <div className="access-portal-header-actions"><span className="access-portal-header-status"><i/> DEMONSTRATION PORTAL</span><button onClick={() => document.getElementById('portal-help')?.scrollIntoView({behavior:'smooth'})}>Help &amp; Support</button><button onClick={() => navigate('/')}>Back to Overview <ArrowRight size={14}/></button></div>
    </header>
    <main className="access-portal-main">
      <div className="access-portal-breadcrumb"><button onClick={() => navigate('/')}>Home</button><ChevronRight size={13}/><strong>Access Portal</strong></div>
      <div className="access-portal-title-row"><div><span className="access-portal-eyebrow">WORKSPACE DIRECTORY</span><h1>Choose your PRAVAAH workspace</h1><p>Select the stakeholder workspace relevant to your responsibilities. Sign-in is handled by the connected authentication service; selecting a workspace does not grant permissions.</p></div><span className="access-portal-rbac"><ShieldCheck size={16}/> Role-aware access</span></div>
      <label className="access-portal-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dashboards, roles or responsibilities…"/><span>{filteredPortals.length} workspaces</span></label>
      <section className="access-portal-grid" aria-label="Available PRAVAAH dashboard roles">{filteredPortals.map((portal) => { const Icon = portal.icon; return <article className="access-portal-card" key={portal.number}>
        <div className="access-portal-card-top"><span className={'access-portal-icon tone-' + portal.tone}><Icon size={21}/></span><span className="access-portal-category">{portal.category}</span></div>
        <h2>{portal.title}</h2><h3>{portal.subtitle}</h3><p className="access-portal-description">{portal.description}</p>
        <div className="access-portal-meta"><span><Clock3 size={14}/>{portal.meta}</span><span><FileText size={14}/>{portal.documents}</span></div>
        <div className="access-portal-tags">{portal.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
        <button className="access-portal-select" onClick={() => choosePortal(portal)}>Continue to workspace <ArrowRight size={15}/></button>
      </article>; })}</section>
      {filteredPortals.length === 0 && <div className="access-portal-empty">No workspaces match “{query}”. Try a different role or service.</div>}
      <section className="access-portal-help" id="portal-help"><Workflow size={18}/><div><strong>Need help choosing a workspace?</strong><p>Use the account assigned to you by your institution or administrator. Your actual permissions are determined by the connected authentication service.</p></div><button onClick={() => navigate('/')}>Visit public information <ArrowRight size={14}/></button></section>
      <p className="access-portal-disclaimer">PRAVAAH-2 demonstration platform · Not an official AICTE service. Sample workflows and records are illustrative.</p>
    </main>
  </div>;
}
