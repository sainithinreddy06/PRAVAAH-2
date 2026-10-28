import { ArrowRight, Building2, Landmark, FileCheck2, MapPin, Layers, ShieldCheck, UserRoundCog, Users, Workflow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const portals = [
  { number: '01', title: 'Institution Dashboard', subtitle: 'Technical Institutions & Colleges', description: 'Submit FDR instruments, track bank verification status, address discrepancies, manage renewals, and submit security deposit release applications.', tags: ['FDR Lodgement', 'OCR Status', 'Renewal Chain'], icon: Building2 },
  { number: '02', title: 'Bank Partner Dashboard', subtitle: 'Scheduled Commercial Banks', description: 'Review assigned verification requests, verify Core Banking (CBS) deposit balances, confirm AICTE joint lien endorsements, and record authorized confirmations.', tags: ['CBS Verification', 'QR & Token Gateway', 'Lien Endorsement'], icon: Landmark },
  { number: '03', title: 'AICTE Scrutiny Dashboard', subtitle: 'Regulatory Scrutiny Bureau', description: 'Review scanned FDR receipts, inspect automated OCR extractions, assess discrepancy alerts, manage institution corrections, and prepare recommendations.', tags: ['Side-by-Side Review', 'Discrepancy Audit', 'Correction Requests'], icon: FileCheck2 },
  { number: '04', title: 'Regional Officer Dashboard', subtitle: 'AICTE Regional Directorates', description: 'Monitor regional institutional compliance, upcoming maturities, overdue cases, track pending verifications, and supervise regional escalations.', tags: ['Regional Monitoring', 'Expiring Instruments', 'Overdue Tracking'], icon: MapPin },
  { number: '05', title: 'Regulation Bureau Dashboard', subtitle: 'AICTE HQ / Member Secretary', description: 'Nationwide FDR inventory surveillance, centralized repository, compliance tracking, regional performance benchmarking, and executive analytics.', tags: ['Central Repository', 'Nationwide KPIs', 'Velocity Analytics'], icon: Layers },
  { number: '06', title: 'Release / Refund Dashboard', subtitle: 'Deposit Discharge Cell', description: 'Vet 10-year statutory lock-in compliance, inspect board resolutions and no-dues clearance, process approvals, and issue Bank Discharge Orders.', tags: ['Statutory Lock-in Audit', 'Eligibility Review', 'Discharge Approval'], icon: ShieldCheck },
  { number: '07', title: 'System Administrator Dashboard', subtitle: 'IT & Infrastructure Cell', description: 'Manage user accounts, role permissions, scheduled expiry jobs, token configurations, notification schedules, and system security logs.', tags: ['User Management', 'RBAC Configuration', 'Scheduler Health'], icon: UserRoundCog },
];

export default function AccessPortal() {
  const navigate = useNavigate();
  const choosePortal = (portal: typeof portals[number]) => {
    sessionStorage.setItem('pravaah-selected-portal', portal.title);
    navigate('/sign-in?portal=' + encodeURIComponent(portal.title));
  };
  return <div className="access-portal-page">
    <header className="access-portal-header">
      <div className="access-portal-brand"><span className="access-portal-emblem">AI</span><span><strong>AICTE FDR PORTAL</strong><small>All India Council for Technical Education · Regulation Bureau</small></span><b>/</b><span className="access-portal-current">Access Portal</span></div>
      <div className="access-portal-header-actions"><button onClick={() => document.getElementById('portal-help')?.scrollIntoView({behavior:'smooth'})}>Help &amp; Support</button><button onClick={() => navigate('/')}>← Back to Overview</button></div>
    </header>
    <main className="access-portal-main">
      <div className="access-portal-breadcrumb"><button onClick={() => navigate('/')}>Home</button><span>/</span><strong>Access Portal</strong></div>
      <div className="access-portal-title-row"><div><h1>Select Dashboard Role</h1><p>Choose your authorized stakeholder category to proceed to role-specific authentication. Each workspace provides partitioned access and features tailored to your regulatory remit.</p></div><span className="access-portal-rbac"><ShieldCheck size={16}/> Role-Based Access Control Enforced</span></div>
      <section className="access-portal-grid" aria-label="Available dashboard roles">{portals.map((portal) => { const Icon = portal.icon; return <article className="access-portal-card" key={portal.number}>
        <div className="access-portal-card-top"><span className="access-portal-icon"><Icon size={21}/></span><span className="access-portal-number">{portal.number}<i/></span></div>
        <h2>{portal.title}</h2><h3>{portal.subtitle}</h3><p className="access-portal-description">{portal.description}</p>
        <div className="access-portal-tags">{portal.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
        <button className="access-portal-select" onClick={() => choosePortal(portal)}>Select Workspace <ArrowRight size={15}/></button>
      </article>; })}</section>
      <section className="access-portal-help" id="portal-help"><Workflow size={18}/><div><strong>Need help accessing your workspace?</strong><p>Use the account assigned to you by your institution or administrator. Your actual permissions are determined by the connected authentication service.</p></div></section>
      <p className="access-portal-disclaimer">PRAVAAH-2 demonstration platform · Not an official AICTE service. Role selection does not grant permissions by itself.</p>
    </main>
  </div>;
}
