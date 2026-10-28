import { ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Building2, CheckCircle2, ClipboardCheck, Clock3, FileCheck2, FileText, Landmark, MapPinned, ShieldAlert, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { User } from '../lib/api';

type DemoRow = {
  ref: string;
  institution: string;
  stage: string;
  status: string;
  updated: string;
  tone: 'blue' | 'amber' | 'green' | 'rose' | 'purple';
};
type DemoMetric = { label: string; value: string; note: string; icon: LucideIcon; tone: string };
type RoleOverview = {
  title: string;
  subtitle: string;
  scope: string;
  metrics: DemoMetric[];
  queueTitle: string;
  queueDescription: string;
  rows: DemoRow[];
  activity: string[];
  primaryLabel: string;
  primaryTo: string;
};

const sampleRows: DemoRow[] = [
  { ref: 'PRV-2026-1042', institution: 'R. V. College of Engineering', stage: 'Document scrutiny', status: 'Needs clarification', updated: 'Today, 10:42 AM', tone: 'amber' },
  { ref: 'PRV-2026-1038', institution: 'Deccan Institute of Technology', stage: 'Regional review', status: 'In review', updated: 'Today, 9:18 AM', tone: 'blue' },
  { ref: 'PRV-2026-1029', institution: 'Sri Venkateswara College of Engineering', stage: 'Evidence validation', status: 'Evidence pending', updated: 'Yesterday, 4:36 PM', tone: 'purple' },
  { ref: 'PRV-2026-1017', institution: 'Nizam Institute of Applied Sciences', stage: 'Final decision', status: 'Ready for decision', updated: 'Yesterday, 2:05 PM', tone: 'green' },
  { ref: 'PRV-2026-1008', institution: 'Aurora College of Engineering', stage: 'Institution submission', status: 'Draft', updated: 'Oct 26, 2026', tone: 'blue' },
];

const overviewByRole: Record<string, RoleOverview> = {
  institution_coordinator: {
    title: 'Institution overview', subtitle: 'Track your institution’s approval applications, evidence and pending actions.', scope: 'INSTITUTION WORKSPACE',
    metrics: [
      { label: 'My applications', value: '08', note: '+2 submitted this month', icon: FileText, tone: 'blue' },
      { label: 'In review', value: '03', note: 'With scrutiny officers', icon: Clock3, tone: 'amber' },
      { label: 'Action required', value: '02', note: 'Clarifications requested', icon: Bell, tone: 'rose' },
      { label: 'Approved', value: '03', note: 'Current cycle', icon: CheckCircle2, tone: 'green' },
    ],
    queueTitle: 'Applications requiring attention', queueDescription: 'Sample institution records for demonstration',
    rows: [sampleRows[0], sampleRows[2], sampleRows[4]], activity: ['Clarification requested for faculty qualification evidence', 'Application PRV-2026-1038 moved to regional review', 'Document checklist updated for the current approval cycle'], primaryLabel: 'View applications', primaryTo: '/applications',
  },
  scrutiny_officer: {
    title: 'Scrutiny overview', subtitle: 'Prioritise incoming applications, evidence checks and clarification requests.', scope: 'SCRUTINY WORKSPACE',
    metrics: [
      { label: 'Assigned to me', value: '14', note: 'Across current review queues', icon: ClipboardCheck, tone: 'blue' },
      { label: 'Pending scrutiny', value: '05', note: 'Awaiting first review', icon: Clock3, tone: 'amber' },
      { label: 'Clarifications', value: '03', note: 'Institution response awaited', icon: Bell, tone: 'rose' },
      { label: 'Completed this week', value: '06', note: 'Sample activity', icon: CheckCircle2, tone: 'green' },
    ],
    queueTitle: 'Scrutiny queue', queueDescription: 'Illustrative cases sorted by urgency',
    rows: [sampleRows[0], sampleRows[2], sampleRows[1]], activity: ['Faculty roster evidence flagged for clarification', 'Two evidence bundles marked ready for review', 'Daily scrutiny queue refreshed'], primaryLabel: 'Open scrutiny queue', primaryTo: '/applications',
  },
  evc_coordinator: {
    title: 'EVC coordination overview', subtitle: 'Coordinate expert visit committees, visit schedules and assessment reports.', scope: 'EVC COORDINATION',
    metrics: [
      { label: 'Active committees', value: '03', note: 'Sample committee assignments', icon: Users, tone: 'blue' },
      { label: 'Visits scheduled', value: '04', note: 'Next 14 days', icon: MapPinned, tone: 'purple' },
      { label: 'Reports pending', value: '02', note: 'Awaiting submission', icon: FileText, tone: 'amber' },
      { label: 'Ready for review', value: '05', note: 'Evidence packs complete', icon: CheckCircle2, tone: 'green' },
    ],
    queueTitle: 'Upcoming EVC visits', queueDescription: 'Illustrative schedule — dates and institutions are sample data',
    rows: [
      { ref: 'EVC-2026-021', institution: 'R. V. College of Engineering', stage: 'Nov 02 · Hyderabad', status: 'Committee assigned', updated: '2 days remaining', tone: 'blue' },
      { ref: 'EVC-2026-019', institution: 'Deccan Institute of Technology', stage: 'Nov 04 · Warangal', status: 'Visit confirmed', updated: '4 days remaining', tone: 'green' },
      { ref: 'EVC-2026-016', institution: 'Aurora College of Engineering', stage: 'Nov 06 · Nizamabad', status: 'Report pending', updated: '6 days remaining', tone: 'amber' },
    ], activity: ['Committee member availability confirmed for EVC-2026-021', 'Visit checklist prepared for Deccan Institute of Technology', 'One visit report awaits coordinator review'], primaryLabel: 'View visit queue', primaryTo: '/applications',
  },
  regional_officer: {
    title: 'Regional review overview', subtitle: 'Monitor regional application movement, service levels and escalations.', scope: 'REGIONAL WORKSPACE · TELANGANA (DEMO)',
    metrics: [
      { label: 'Regional applications', value: '42', note: 'Across the sample region', icon: Building2, tone: 'blue' },
      { label: 'Awaiting review', value: '09', note: 'Needs officer attention', icon: Clock3, tone: 'amber' },
      { label: 'SLA at risk', value: '04', note: 'Review deadlines approaching', icon: ShieldAlert, tone: 'rose' },
      { label: 'Cleared this month', value: '18', note: 'Sample monthly activity', icon: CheckCircle2, tone: 'green' },
    ],
    queueTitle: 'Regional review priorities', queueDescription: 'Sample records for a regional officer',
    rows: [sampleRows[1], sampleRows[3], sampleRows[0]], activity: ['PRV-2026-1038 assigned to regional review', 'Four records are nearing their target review date', 'Monthly regional compliance summary prepared'], primaryLabel: 'Review applications', primaryTo: '/applications',
  },
  headquarters_reviewer: {
    title: 'Headquarters decision overview', subtitle: 'Review escalations, final recommendations and policy exceptions.', scope: 'HEADQUARTERS WORKSPACE',
    metrics: [
      { label: 'Escalated cases', value: '07', note: 'Requiring central review', icon: ArrowUpRight, tone: 'purple' },
      { label: 'Decision pending', value: '04', note: 'Final decision queue', icon: Clock3, tone: 'amber' },
      { label: 'Approved this month', value: '12', note: 'Sample monthly activity', icon: CheckCircle2, tone: 'green' },
      { label: 'Policy exceptions', value: '02', note: 'Require documented reasons', icon: ShieldAlert, tone: 'rose' },
    ],
    queueTitle: 'Headquarters decision queue', queueDescription: 'Illustrative escalations and final review records',
    rows: [sampleRows[3], sampleRows[1], sampleRows[0]], activity: ['PRV-2026-1017 moved to final decision', 'A policy exception requires a recorded rationale', 'Headquarters review pack refreshed'], primaryLabel: 'Open decision queue', primaryTo: '/applications',
  },
  compliance_auditor: {
    title: 'Compliance & audit overview', subtitle: 'Review evidence integrity, outstanding obligations and audit exceptions.', scope: 'COMPLIANCE MONITORING & AUDIT',
    metrics: [
      { label: 'Open findings', value: '06', note: 'Sample audit findings', icon: ShieldAlert, tone: 'rose' },
      { label: 'Overdue obligations', value: '03', note: 'Need follow-up', icon: Clock3, tone: 'amber' },
      { label: 'Evidence checks', value: '18', note: 'Sample review population', icon: FileCheck2, tone: 'blue' },
      { label: 'Audit coverage', value: '92%', note: 'Illustrative coverage score', icon: ShieldCheck, tone: 'green' },
    ],
    queueTitle: 'Compliance watchlist', queueDescription: 'Sample findings and evidence exceptions',
    rows: [
      { ref: 'AUD-2026-006', institution: 'R. V. College of Engineering', stage: 'Evidence integrity', status: 'Review required', updated: 'Today, 10:42 AM', tone: 'rose' },
      { ref: 'OBL-2026-031', institution: 'Deccan Institute of Technology', stage: 'Obligation follow-up', status: 'Overdue', updated: '1 day overdue', tone: 'amber' },
      { ref: 'AUD-2026-004', institution: 'Nizam Institute of Applied Sciences', stage: 'Audit trail check', status: 'In progress', updated: 'Yesterday', tone: 'blue' },
    ], activity: ['Evidence digest verification queued for sample record', 'Three obligations are marked overdue in demo data', 'Audit coverage refreshed for the demonstration workspace'], primaryLabel: 'Open compliance inbox', primaryTo: '/compliance',
  },
  platform_admin: {
    title: 'Platform operations overview', subtitle: 'Monitor the sample approval pipeline, institutions, users and compliance workload.', scope: 'PLATFORM ADMINISTRATION',
    metrics: [
      { label: 'Applications', value: '128', note: 'Across sample workflow stages', icon: FileText, tone: 'blue' },
      { label: 'Institutions', value: '42', note: 'Sample registered institutions', icon: Building2, tone: 'purple' },
      { label: 'Officer accounts', value: '76', note: 'Sample active user profiles', icon: Users, tone: 'green' },
      { label: 'Overdue obligations', value: '09', note: 'Across sample workflows', icon: ShieldAlert, tone: 'rose' },
    ],
    queueTitle: 'Platform-wide workflow snapshot', queueDescription: 'Illustrative cross-workspace records',
    rows: sampleRows, activity: ['Sample workflow data refreshed', 'A new institution submission entered the queue', 'Compliance follow-up report generated for demonstration'], primaryLabel: 'View all applications', primaryTo: '/applications',
  },
  system_admin: {
    title: 'Platform operations overview', subtitle: 'A demonstration snapshot of application processing and platform operations.', scope: 'SYSTEM ADMINISTRATION · DEMO',
    metrics: [
      { label: 'Applications', value: '128', note: 'Sample workflow total', icon: FileText, tone: 'blue' },
      { label: 'Institutions', value: '42', note: 'Sample institution count', icon: Building2, tone: 'purple' },
      { label: 'Officer accounts', value: '76', note: 'Sample active profiles', icon: Users, tone: 'green' },
      { label: 'Open alerts', value: '09', note: 'Sample compliance alerts', icon: Bell, tone: 'rose' },
    ],
    queueTitle: 'Platform-wide workflow snapshot', queueDescription: 'Illustrative cross-workspace records',
    rows: sampleRows, activity: ['Sample workflow data refreshed', 'A new institution submission entered the queue', 'Compliance follow-up report generated for demonstration'], primaryLabel: 'View applications', primaryTo: '/applications',
  },
};

const defaultOverview = overviewByRole.platform_admin;

export default function DemoOverview({ user }: { user: User }) {
  const data = overviewByRole[user.role] || defaultOverview;
  const initials = user.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return (
    <section className="overview-page demo-overview">
      <div className="notice-panel demo-data-banner"><ShieldCheck size={17} /><span><strong>DEMO MODE — SAMPLE DATA</strong> · Figures and institutions on this page are illustrative, not live government or institutional records.</span></div>
      <div className="welcome-row">
        <div><p className="eyebrow">{data.scope} / OVERVIEW</p><h2>{data.title}</h2><p className="muted">{data.subtitle}</p></div>
        <div className="overview-actions"><span className="demo-user-chip"><span className="demo-user-avatar">{initials}</span><span><strong>{user.full_name}</strong><small>{user.role.replace(/_/g, ' ')}</small></span></span><NavLink className="primary-button" to={data.primaryTo}>{data.primaryLabel} <ArrowRight size={15} /></NavLink></div>
      </div>
      <div className="metric-grid demo-metric-grid">
        {data.metrics.map((metric) => { const Icon = metric.icon; return <article className={'panel metric-card demo-metric-card tone-' + metric.tone} key={metric.label}><div className="demo-metric-top"><span>{metric.label}</span><span className="demo-metric-icon"><Icon size={18} /></span></div><strong>{metric.value}</strong><small>{metric.note}</small><span className="demo-metric-foot"><ArrowDownRight size={13} /> Demo snapshot</span></article>; })}
      </div>
      <section className="panel overview-records demo-queue">
        <div className="panel-heading"><div><h3>{data.queueTitle}</h3><p>{data.queueDescription}</p></div><span className="demo-record-count">{data.rows.length} sample records</span></div>
        <div className="table-wrap"><table><thead><tr><th>Reference</th><th>Institution / item</th><th>Current stage</th><th>Status</th><th>Last activity</th></tr></thead><tbody>{data.rows.map((row) => <tr key={row.ref}><td><strong className="demo-ref">{row.ref}</strong></td><td>{row.institution}</td><td>{row.stage}</td><td><span className={'status status-' + (row.tone === 'green' ? 'green' : row.tone === 'amber' ? 'amber' : row.tone === 'rose' ? 'rose' : row.tone === 'purple' ? 'purple' : 'blue')}><i />{row.status}</span></td><td>{row.updated}</td></tr>)}</tbody></table></div>
        <div className="panel-footer"><span>Showing synthetic records for UI demonstration</span><span>Production data is not modified by this view.</span></div>
      </section>
      <div className="demo-bottom-grid">
        <section className="panel demo-activity"><div className="panel-heading"><div><h3>Recent activity</h3><p>Illustrative events for this workspace</p></div><ActivityIcon /></div><div className="demo-activity-list">{data.activity.map((item, index) => <div className="demo-activity-item" key={item}><span className="demo-activity-dot">{index + 1}</span><p>{item}<small>{['Today · 10:42 AM', 'Today · 9:18 AM', 'Yesterday · 4:36 PM'][index]}</small></p></div>)}</div></section>
        <section className="panel demo-next-actions"><div className="panel-heading"><div><h3>Next actions</h3><p>Suggested workflow steps</p></div></div><NavLink to={data.primaryTo}><span><FileText size={17} /> Review assigned records</span><ArrowUpRight size={16} /></NavLink><NavLink to="/compliance"><span><Bell size={17} /> Check obligations & inbox</span><ArrowUpRight size={16} /></NavLink><NavLink to="/policies"><span><ShieldCheck size={17} /> Review policy register</span><ArrowUpRight size={16} /></NavLink></section>
      </div>
      <p className="workspace-disclaimer"><ShieldCheck size={14} /> PRAVAAH-2 is an independent demonstration platform, not an official AICTE service. All dashboard figures shown here are synthetic demo data.</p>
    </section>
  );
}

function ActivityIcon() {
  return <span className="demo-activity-heading-icon"><Clock3 size={17} /></span>;
}
