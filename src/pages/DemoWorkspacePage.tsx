import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCircle2, FileCheck2, Plus, RefreshCw, Save, Search, Settings, ShieldCheck, Workflow } from 'lucide-react';

type DemoRow = { ref: string; institution: string; stage: string; status: string; due: string; tone: 'blue' | 'green' | 'amber' | 'rose' };
const initialRows: DemoRow[] = [
  { ref: 'AICTE-2026-0142', institution: 'Deccan Institute of Technology', stage: 'Scrutiny review', status: 'Under review', due: '29 Oct 2026', tone: 'amber' },
  { ref: 'AICTE-2026-0138', institution: 'Sri Venkateswara College of Engineering', stage: 'Evidence validation', status: 'Action required', due: '30 Oct 2026', tone: 'rose' },
  { ref: 'AICTE-2026-0129', institution: 'Vidya Jyothi Institute of Technology', stage: 'EVC readiness', status: 'In progress', due: '02 Nov 2026', tone: 'blue' },
  { ref: 'AICTE-2026-0117', institution: 'Mahatma Gandhi Institute of Technology', stage: 'Headquarters review', status: 'Recommended', due: '04 Nov 2026', tone: 'green' },
  { ref: 'AICTE-2026-0106', institution: 'Aurora Engineering College', stage: 'Compliance follow-up', status: 'Overdue', due: '26 Oct 2026', tone: 'rose' },
];
const routeMeta: Record<string, { title: string; eyebrow: string; description: string; stats: [string, string, string, string]; columns: string[] }> = {
  '/applications': { title: 'Application workbench', eyebrow: 'WORKSPACE / APPLICATIONS', description: 'Review the synthetic application queue, inspect workflow stages, and record demo-only actions.', stats: ['12', 'Assigned cases', '4', 'Need attention'], columns: ['Reference', 'Institution', 'Workflow stage', 'Status', 'Due date'] },
  '/policies': { title: 'Policy register', eyebrow: 'GOVERNANCE / POLICY CONTROL', description: 'Browse illustrative policy versions and see how a policy can be pinned to a review workflow.', stats: ['18', 'Policy records', '3', 'Recently updated'], columns: ['Policy key', 'Policy / requirement', 'Version', 'Effective date', 'Status'] },
  '/compliance': { title: 'Obligations & alert inbox', eyebrow: 'COMPLIANCE / DEADLINES', description: 'Track undertaking deadlines, expiring evidence, reminder delivery and escalation queues.', stats: ['23', 'Open obligations', '5', 'Overdue'], columns: ['Obligation', 'Application', 'Owner', 'Due date', 'Status'] },
  '/operations': { title: 'Audit & operational metrics', eyebrow: 'OPERATIONS / ASSURANCE', description: 'Inspect sample workflow metrics, audit events and a tamper-evident checkpoint preview.', stats: ['148', 'Workflow events', '99.2%', 'Sample SLA'], columns: ['Timestamp', 'Actor', 'Event', 'Entity', 'Result'] },
  '/institutions': { title: 'Institution directory', eyebrow: 'ADMINISTRATION / INSTITUTIONS', description: 'Illustrative institution directory. Changes in this view are local to this demo session.', stats: ['42', 'Institutions', '7', 'Regional groups'], columns: ['Institution', 'Region', 'Active applications', 'Compliance', 'Status'] },
  '/officers': { title: 'Officers & users', eyebrow: 'ADMINISTRATION / ACCESS CONTROL', description: 'Review demo user roles and their workspace access. This does not provision real accounts.', stats: ['31', 'Demo users', '8', 'Role groups'], columns: ['User', 'Email', 'Role', 'Region', 'Access'] },
  '/settings': { title: 'Workspace settings', eyebrow: 'ADMINISTRATION / PREFERENCES', description: 'Adjust local display preferences for this demonstration. No server configuration is changed.', stats: ['8', 'Role workspaces', '3', 'Alert channels'], columns: [] },
};
const policyRows = [
  ['POL-APH-2024', 'Approval Process Handbook', 'v2024–27', '01 Apr 2024', 'Active'],
  ['POL-DEP-008', 'Fixed Deposit Receipt verification', 'v3.2', '15 Jun 2026', 'Active'],
  ['POL-LSE-014', 'Land / lease evidence validity', 'v2.1', '01 Jul 2026', 'Review due'],
  ['POL-EVC-006', 'Expert Visit Committee checklist', 'v1.8', '10 Aug 2026', 'Active'],
  ['POL-UND-002', 'Institution undertaking obligations', 'v2.0', '01 Sep 2026', 'Active'],
];
const obligationRows = [
  ['Renewed deposit evidence', 'AICTE-2026-0138', 'Institution coordinator', '30 Oct 2026', 'Due soon'],
  ['Submit EVC visit report', 'AICTE-2026-0129', 'EVC coordinator', '29 Oct 2026', 'Due today'],
  ['Lease validity confirmation', 'AICTE-2026-0106', 'Institution coordinator', '26 Oct 2026', 'Overdue'],
  ['Annual compliance undertaking', 'AICTE-2026-0117', 'Regional officer', '05 Nov 2026', 'In progress'],
  ['Review discrepancy response', 'AICTE-2026-0142', 'Scrutiny officer', '31 Oct 2026', 'Open'],
];
const eventRows = [
  ['28 Oct · 10:42', 'Scrutiny Officer', 'Evidence marked for clarification', 'AICTE-2026-0138', 'Recorded'],
  ['28 Oct · 09:18', 'EVC Coordinator', 'Visit report revision submitted', 'AICTE-2026-0129', 'Recorded'],
  ['27 Oct · 16:36', 'Regional Officer', 'Deadline escalation created', 'OBL-2026-0091', 'Recorded'],
  ['27 Oct · 14:05', 'Policy Administrator', 'Policy version pinned', 'POL-DEP-008', 'Recorded'],
  ['27 Oct · 11:21', 'Platform Service', 'Notification delivery retried', 'NTF-2026-0184', 'Retried'],
];
const institutionRows = [
  ['Deccan Institute of Technology', 'Telangana', '4', '92%', 'Active'],
  ['Sri Venkateswara College of Engineering', 'Andhra Pradesh', '3', '78%', 'Attention'],
  ['Vidya Jyothi Institute of Technology', 'Telangana', '2', '96%', 'Active'],
  ['Mahatma Gandhi Institute of Technology', 'Telangana', '1', '100%', 'Active'],
  ['Aurora Engineering College', 'Telangana', '2', '64%', 'Attention'],
];
const userRows = [
  ['Ananya Rao', 'institution.demo@pravaah.local', 'Institution coordinator', 'Telangana', 'Demo'],
  ['R. Sharma', 'scrutiny.demo@pravaah.local', 'Scrutiny officer', 'National', 'Demo'],
  ['K. Iyer', 'evc.demo@pravaah.local', 'EVC coordinator', 'South zone', 'Demo'],
  ['P. Reddy', 'regional.demo@pravaah.local', 'Regional officer', 'Telangana', 'Demo'],
  ['Platform Admin', 'platform-admin.demo@pravaah.local', 'Platform administrator', 'National', 'Demo'],
];

export default function DemoWorkspacePage() {
  const location = useLocation();
  const { id } = useParams();
  const path = location.pathname.startsWith('/applications/') ? '/application-detail' : location.pathname;
  const meta = routeMeta[path] || routeMeta['/applications'];
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [draftRef, setDraftRef] = useState('');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [digestEnabled, setDigestEnabled] = useState(false);
  const filtered = useMemo(() => rows.filter(r => (r.ref + ' ' + r.institution + ' ' + r.stage + ' ' + r.status).toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const record = rows.find(r => r.ref.endsWith(id || '')) || rows[0];
  const setStatus = (ref: string, status: string, stage: string, tone: DemoRow['tone']) => {
    setRows(current => current.map(row => row.ref === ref ? { ...row, status, stage, tone } : row));
    setNotice(ref + ' updated in this demo session only.');
  };
  const actionButton = (label: string, onClick: () => void) => <button className="secondary-button" type="button" onClick={onClick}>{label}</button>;
  const renderRows = (items: string[][]) => <div className="table-wrap"><table><thead><tr>{meta.columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{items.map((r,i)=><tr key={r[0]+i}>{r.map((v,j)=><td key={j}>{j===0?<strong>{v}</strong>:v}</td>)}</tr>)}</tbody></table></div>;

  if (path === '/application-detail') return <section className="workflow-page">
    <Link to="/applications" className="text-link"><ArrowLeft size={15}/> Back to application queue</Link>
    <div className="welcome-row"><div><p className="eyebrow">APPLICATION / DEMO RECORD</p><h2>{record.ref}</h2><p className="muted">{record.institution} · Record ID {id || '142'}</p></div><span className={'status status-'+record.tone}><i/>{record.status}</span></div>
    {notice && <div className="notice-panel"><CheckCircle2 size={17}/>{notice}</div>}
    <div className="metric-grid">{[['Current stage',record.stage],['Evidence pack','8 of 10 checked'],['Open obligations','3'],['Policy version','APH 2024–27']].map(([k,v])=><article className="panel metric-card" key={k}><small>{k}</small><strong>{v}</strong></article>)}</div>
    <section className="panel"><div className="panel-heading"><div><h3>Workflow actions</h3><p>All actions below are simulated and do not change backend records.</p></div><Workflow size={18}/></div><div className="button-row">{actionButton('Mark under review',()=>setStatus(record.ref,'Under review','Scrutiny review','amber'))}{actionButton('Request clarification',()=>setStatus(record.ref,'Action required','Institution response','rose'))}{actionButton('Route to EVC',()=>setStatus(record.ref,'EVC readiness','EVC coordination','blue'))}{actionButton('Recommend approval',()=>setStatus(record.ref,'Recommended','Headquarters review','green'))}</div></section>
    <div className="panel workflow-list"><div className="panel-heading"><div><h3>Evidence checklist</h3><p>Illustrative evidence checks for this record</p></div></div>{[['Deposit instrument / bank guarantee','Verified'],['Land and building documents','Needs clarification'],['Faculty and infrastructure data','Pending review'],['Institution undertaking','Submitted']].map(([a,b])=><article className="workflow-item" key={a}><div><strong>{a}</strong><p>{b}</p></div><span className="status status-blue"><i/>{b}</span></article>)}</div>
    <div className="panel workflow-list"><div className="panel-heading"><div><h3>Audit trail</h3><p>Demo-only chronological activity</p></div><ShieldCheck size={18}/></div>{eventRows.slice(0,3).map(r=><article className="workflow-item" key={r[0]}><div><strong>{r[2]}</strong><p>{r[0]} · {r[1]} · {r[3]}</p></div></article>)}</div>
  </section>;

  if (path === '/settings') return <section className="workflow-page">
    <p className="eyebrow">{meta.eyebrow}</p><h2>{meta.title}</h2><p className="muted">{meta.description}</p>
    <div className="metric-grid">{meta.stats.reduce<string[][]>((a,_,i,arr)=>i%2===0&&arr[i+1]?[...a,[arr[i],arr[i+1]]]:a,[]).map(([v,l])=><article className="panel metric-card" key={l}><small>{l}</small><strong>{v}</strong></article>)}</div>
    <section className="panel workflow-list"><div className="panel-heading"><div><h3>Notification preferences</h3><p>Local to this browser session</p></div><Settings size={18}/></div><article className="workflow-item"><div><strong>Deadline and escalation alerts</strong><p>Show in-workspace reminders for approaching due dates.</p></div><input type="checkbox" checked={alertsEnabled} onChange={e=>setAlertsEnabled(e.target.checked)} aria-label="Toggle deadline alerts"/></article><article className="workflow-item"><div><strong>Daily summary digest</strong><p>Simulate a daily summary of pending work.</p></div><input type="checkbox" checked={digestEnabled} onChange={e=>setDigestEnabled(e.target.checked)} aria-label="Toggle daily summary"/></article><button className="primary-button" type="button" onClick={()=>setNotice('Preferences saved for this browser session only.')}><Save size={15}/> Save preferences</button>{notice&&<p className="feedback feedback-success">{notice}</p>}</section>
  </section>;

  const title = path === '/policies' ? 'Policies' : path === '/compliance' ? 'Obligations' : path === '/operations' ? 'Audit events' : path === '/institutions' ? 'Institutions' : path === '/officers' ? 'Workspace users' : 'Applications';
  let table: JSX.Element;
  if(path==='/policies') table=renderRows(policyRows);
  else if(path==='/compliance') table=renderRows(obligationRows);
  else if(path==='/operations') table=renderRows(eventRows);
  else if(path==='/institutions') table=renderRows(institutionRows);
  else if(path==='/officers') table=renderRows(userRows);
  else table=<div className="table-wrap"><table><thead><tr>{meta.columns.map(c=><th key={c}>{c}</th>)}<th>Demo actions</th></tr></thead><tbody>{filtered.map(row=><tr key={row.ref}><td><Link to={'/applications/'+row.ref.slice(-3)} className="application-reference-link"><strong>{row.ref}</strong></Link></td><td>{row.institution}</td><td>{row.stage}</td><td><span className={'status status-'+row.tone}><i/>{row.status}</span></td><td>{row.due}</td><td><div className="application-actions"><button className="table-action" onClick={()=>setStatus(row.ref,'Under review','Scrutiny review','amber')}>Review</button><button className="table-action" onClick={()=>setStatus(row.ref,'Action required','Institution response','rose')}>Clarify</button><button className="table-action" onClick={()=>setStatus(row.ref,'Recommended','Next-stage review','green')}>Route</button></div></td></tr>)}</tbody></table></div>;

  return <section className="workflow-page">
    <div className="welcome-row"><div><p className="eyebrow">{meta.eyebrow}</p><h2>{meta.title}</h2><p className="muted">{meta.description}</p></div><span className="demo-record-count">SYNTHETIC DATA</span></div>
    {notice&&<div className="notice-panel"><CheckCircle2 size={17}/>{notice}</div>}
    <div className="metric-grid">{meta.stats.reduce<string[][]>((a,_,i,arr)=>i%2===0&&arr[i+1]?[...a,[arr[i],arr[i+1]]]:a,[]).map(([v,l])=><article className="panel metric-card" key={l}><small>{l}</small><strong>{v}</strong></article>)}</div>
    {path==='/applications'&&<div className="overview-actions"><label className="access-portal-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search reference, institution, stage…"/></label><button className="primary-button" type="button" onClick={()=>setShowCreate(v=>!v)}><Plus size={15}/> New demo application</button></div>}
    {showCreate&&<form className="panel form-grid" onSubmit={e=>{e.preventDefault();if(!draftRef.trim())return;setRows(current=>[{ref:draftRef.trim(),institution:'New sample institution',stage:'Draft preparation',status:'Draft',due:'06 Nov 2026',tone:'blue'},...current]);setDraftRef('');setShowCreate(false);setNotice('Demo application added locally; no backend record was created.');}}><label>Reference code<input value={draftRef} onChange={e=>setDraftRef(e.target.value)} required placeholder="AICTE-2026-0150"/></label><button className="primary-button" type="submit">Create sample record</button></form>}
    <section className="panel"><div className="panel-heading"><div><h3>{title} work queue</h3><p>Use the available actions to walk through a sample workflow.</p></div><span className="demo-record-count">{path==='/applications'?filtered.length:path==='/policies'?policyRows.length:path==='/compliance'?obligationRows.length:path==='/operations'?eventRows.length:path==='/institutions'?institutionRows.length:userRows.length} records</span></div>{table}<div className="panel-footer"><span>Illustrative workspace data</span><span>No production records are changed by this demo.</span></div></section>
    {path==='/compliance'&&<section className="panel workflow-list"><div className="panel-heading"><div><h3>Alert delivery queue</h3><p>Sample reminders and escalation events</p></div><Bell size={18}/></div>{[['Due-date reminder','Scheduled · Email'],['Overdue obligation escalation','Queued · In-app'],['Evidence expiry notice','Delivered · Email']].map(([a,b])=><article className="workflow-item" key={a}><div><strong>{a}</strong><p>{b}</p></div><button className="table-action" onClick={()=>setNotice(a+' simulated successfully.')}>Simulate</button></article>)}</section>}
    {path==='/operations'&&<section className="panel workflow-list"><div className="panel-heading"><div><h3>Audit integrity preview</h3><p>Illustrative chain verification, not a cryptographic server checkpoint</p></div><ShieldCheck size={18}/></div><article className="workflow-item"><div><strong>Sample chain status</strong><p>5 displayed events · all demo hashes omitted from this preview.</p></div><span className="status status-green"><i/>Preview only</span></article><button className="secondary-button" onClick={()=>setNotice('Demo audit preview refreshed; no backend checkpoint was created.')}><RefreshCw size={15}/> Refresh preview</button></section>}
    {path==='/policies'&&<section className="panel workflow-list"><div className="panel-heading"><div><h3>Policy pinning workflow</h3><p>Choose a policy to simulate pinning to a sample review.</p></div><FileCheck2 size={18}/></div><article className="workflow-item"><div><strong>POL-APH-2024 · Approval Process Handbook</strong><p>Version v2024–27 · sample pinned policy for a demo application.</p></div><button className="table-action" onClick={()=>setNotice('Policy version pinned in the local demo view only.')}>Simulate pin</button></article></section>}
    <p className="workspace-disclaimer"><ShieldCheck size={14}/> Independent PRAVAAH-2 demonstration. Synthetic records and local-only actions; no official AICTE decisions are made here.</p>
  </section>;
}
