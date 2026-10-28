import { ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Building2, CheckCircle2, ClipboardCheck, Clock3, FileCheck2, FileText, MapPinned, ShieldAlert, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
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


type WorkbenchItem = { label: string; count: number; tone: 'blue' | 'amber' | 'green' | 'rose' | 'purple' };
type ActionItem = { title: string; detail: string; tag: string; tone: 'blue' | 'amber' | 'green' | 'rose' | 'purple' };
type WorkbenchConfig = {
  heading: string;
  description: string;
  stages: WorkbenchItem[];
  actionsHeading: string;
  actions: ActionItem[];
  deadlinesHeading: string;
  deadlines: ActionItem[];
};

const workbenchByRole: Record<string, WorkbenchConfig> = {
  institution_coordinator: {
    heading: 'Application journey',
    description: 'Where your institution’s sample applications sit in the approval workflow.',
    stages: [
      { label: 'Draft / submission', count: 2, tone: 'blue' },
      { label: 'Under scrutiny', count: 3, tone: 'purple' },
      { label: 'Action required', count: 2, tone: 'amber' },
      { label: 'Approved', count: 3, tone: 'green' },
    ],
    actionsHeading: 'Your next actions',
    actions: [
      { title: 'Respond to scrutiny observations', detail: 'PRV-2026-1042 · Faculty evidence clarification', tag: 'Action required', tone: 'amber' },
      { title: 'Upload renewed supporting document', detail: 'PRV-2026-1029 · Sample document checklist', tag: 'Due soon', tone: 'rose' },
      { title: 'Review undertaking conditions', detail: 'PRV-2026-1038 · Confirm assigned compliance dates', tag: 'Pending', tone: 'blue' },
    ],
    deadlinesHeading: 'Upcoming compliance dates',
    deadlines: [
      { title: 'Faculty qualification evidence', detail: 'PRV-2026-1042 · Sample due date: 30 Oct 2026', tag: '2 days', tone: 'rose' },
      { title: 'Lease document review', detail: 'PRV-2026-1029 · Sample due date: 04 Nov 2026', tag: '7 days', tone: 'amber' },
      { title: 'Undertaking acknowledgement', detail: 'PRV-2026-1038 · Sample due date: 09 Nov 2026', tag: '12 days', tone: 'blue' },
    ],
  },
  scrutiny_officer: {
    heading: 'Scrutiny pipeline',
    description: 'Illustrative review stages for the cases assigned to this officer workspace.',
    stages: [
      { label: 'Awaiting first review', count: 5, tone: 'amber' },
      { label: 'Evidence validation', count: 4, tone: 'blue' },
      { label: 'Clarification cycle', count: 3, tone: 'rose' },
      { label: 'Ready to route', count: 2, tone: 'green' },
    ],
    actionsHeading: 'Priority scrutiny queue',
    actions: [
      { title: 'Verify faculty roster and qualifications', detail: 'PRV-2026-1042 · Compare submitted evidence with checklist', tag: 'High priority', tone: 'rose' },
      { title: 'Review infrastructure evidence bundle', detail: 'PRV-2026-1029 · Two sample evidence items awaiting review', tag: 'In queue', tone: 'amber' },
      { title: 'Record reasoned scrutiny observations', detail: 'PRV-2026-1038 · Complete the review notes before routing', tag: 'Next step', tone: 'blue' },
    ],
    deadlinesHeading: 'Review timeline watch',
    deadlines: [
      { title: 'First scrutiny target', detail: 'PRV-2026-1042 · Sample target: 29 Oct 2026', tag: '1 day', tone: 'rose' },
      { title: 'Clarification response check', detail: 'PRV-2026-1029 · Sample target: 02 Nov 2026', tag: '5 days', tone: 'amber' },
      { title: 'Regional routing readiness', detail: 'PRV-2026-1038 · Sample target: 05 Nov 2026', tag: '8 days', tone: 'blue' },
    ],
  },
  evc_coordinator: {
    heading: 'Expert Visit Committee pipeline',
    description: 'Scheduling readiness, planned visits and report submission progress.',
    stages: [
      { label: 'Ready to schedule', count: 5, tone: 'blue' },
      { label: 'Visit scheduled', count: 4, tone: 'purple' },
      { label: 'Report pending', count: 2, tone: 'amber' },
      { label: 'Visit completed', count: 7, tone: 'green' },
    ],
    actionsHeading: 'Committee coordination',
    actions: [
      { title: 'Confirm committee availability', detail: 'EVC-2026-021 · Sample visit in Hyderabad', tag: 'Priority', tone: 'amber' },
      { title: 'Prepare infrastructure verification checklist', detail: 'EVC-2026-019 · Facilities and supporting records', tag: 'In progress', tone: 'blue' },
      { title: 'Follow up on visit report', detail: 'EVC-2026-016 · Findings not yet submitted in demo data', tag: 'Report due', tone: 'rose' },
    ],
    deadlinesHeading: 'Upcoming visits & reports',
    deadlines: [
      { title: 'R. V. College of Engineering', detail: 'Sample visit: 02 Nov 2026 · Hyderabad', tag: '5 days', tone: 'amber' },
      { title: 'Deccan Institute of Technology', detail: 'Sample visit: 04 Nov 2026 · Warangal', tag: '7 days', tone: 'blue' },
      { title: 'Aurora College of Engineering report', detail: 'Sample report target: 06 Nov 2026', tag: '9 days', tone: 'rose' },
    ],
  },
  regional_officer: {
    heading: 'Regional pendency overview',
    description: 'Illustrative workload and stage ageing for the Telangana demo region.',
    stages: [
      { label: 'Scrutiny pending', count: 9, tone: 'amber' },
      { label: 'EVC coordination', count: 4, tone: 'purple' },
      { label: 'SLA at risk', count: 4, tone: 'rose' },
      { label: 'Ready to forward', count: 6, tone: 'green' },
    ],
    actionsHeading: 'Regional attention queue',
    actions: [
      { title: 'Escalate ageing scrutiny case', detail: 'PRV-2026-1038 · Sample case nearing target timeline', tag: 'SLA risk', tone: 'rose' },
      { title: 'Review EVC scheduling gaps', detail: '4 sample applications await confirmed visit dates', tag: 'Needs review', tone: 'amber' },
      { title: 'Check regional recommendation pack', detail: 'PRV-2026-1017 · Supporting notes ready for review', tag: 'Ready', tone: 'green' },
    ],
    deadlinesHeading: 'Regional deadline watch',
    deadlines: [
      { title: 'Scrutiny stage target', detail: 'PRV-2026-1038 · Sample target: 29 Oct 2026', tag: '1 day', tone: 'rose' },
      { title: 'EVC scheduling checkpoint', detail: '4 sample cases · Checkpoint: 01 Nov 2026', tag: '4 days', tone: 'amber' },
      { title: 'Monthly pendency review', detail: 'Regional summary · Sample target: 05 Nov 2026', tag: '8 days', tone: 'blue' },
    ],
  },
  headquarters_reviewer: {
    heading: 'Headquarters decision pipeline',
    description: 'Central oversight of escalations, recommendations and documented policy exceptions.',
    stages: [
      { label: 'Escalated for review', count: 7, tone: 'purple' },
      { label: 'Decision pending', count: 4, tone: 'amber' },
      { label: 'Policy exception', count: 2, tone: 'rose' },
      { label: 'Decision recorded', count: 12, tone: 'green' },
    ],
    actionsHeading: 'Central review priorities',
    actions: [
      { title: 'Review regional recommendation', detail: 'PRV-2026-1017 · Sample case awaiting central review', tag: 'Decision queue', tone: 'amber' },
      { title: 'Check policy exception rationale', detail: 'PRV-2026-1038 · Confirm reasons are recorded for audit', tag: 'Attention', tone: 'rose' },
      { title: 'Inspect stage ageing summary', detail: 'Cross-region snapshot · Identify bottlenecks for follow-up', tag: 'Monitoring', tone: 'blue' },
    ],
    deadlinesHeading: 'Central review milestones',
    deadlines: [
      { title: 'Escalated case review', detail: 'PRV-2026-1017 · Sample target: 30 Oct 2026', tag: '2 days', tone: 'amber' },
      { title: 'Exception rationale check', detail: 'PRV-2026-1038 · Sample target: 02 Nov 2026', tag: '5 days', tone: 'rose' },
      { title: 'Region-wise pendency review', detail: 'Central oversight · Sample target: 06 Nov 2026', tag: '9 days', tone: 'blue' },
    ],
  },
  compliance_auditor: {
    heading: 'Compliance lifecycle',
    description: 'Track obligations, document validity, alerts and audit follow-up in the sample workspace.',
    stages: [
      { label: 'Open obligations', count: 6, tone: 'blue' },
      { label: 'Due within 7 days', count: 8, tone: 'amber' },
      { label: 'Overdue', count: 3, tone: 'rose' },
      { label: 'Evidence verified', count: 18, tone: 'green' },
    ],
    actionsHeading: 'Compliance watchlist',
    actions: [
      { title: 'Follow up on overdue undertaking', detail: 'OBL-2026-031 · Deccan Institute of Technology', tag: 'Overdue', tone: 'rose' },
      { title: 'Validate document expiry alert', detail: 'AUD-2026-006 · Sample lease document evidence', tag: 'Verify', tone: 'amber' },
      { title: 'Inspect audit event chain', detail: 'AUD-2026-004 · Review recorded workflow changes', tag: 'Audit check', tone: 'blue' },
    ],
    deadlinesHeading: 'Upcoming compliance deadlines',
    deadlines: [
      { title: 'Lease document validity check', detail: 'Sample institution record · 30 Oct 2026', tag: '2 days', tone: 'rose' },
      { title: 'Undertaking evidence submission', detail: 'OBL-2026-031 · Sample target: 01 Nov 2026', tag: '4 days', tone: 'amber' },
      { title: 'Audit follow-up closure', detail: 'AUD-2026-004 · Sample target: 05 Nov 2026', tag: '8 days', tone: 'blue' },
    ],
  },
  platform_admin: {
    heading: 'End-to-end workflow health',
    description: 'A synthetic cross-workspace snapshot of application flow and operational pressure points.',
    stages: [
      { label: 'Institution submission', count: 18, tone: 'blue' },
      { label: 'Scrutiny / re-scrutiny', count: 36, tone: 'purple' },
      { label: 'EVC / regional review', count: 22, tone: 'amber' },
      { label: 'Final decision', count: 12, tone: 'green' },
    ],
    actionsHeading: 'Platform-wide attention queue',
    actions: [
      { title: 'Review ageing application queue', detail: '9 sample cases exceed the configured warning threshold', tag: 'SLA watch', tone: 'rose' },
      { title: 'Check notification delivery status', detail: '3 sample reminders need delivery review', tag: 'Operations', tone: 'amber' },
      { title: 'Review role access assignments', detail: 'Sample account and workspace mapping check', tag: 'Access review', tone: 'blue' },
    ],
    deadlinesHeading: 'System alert calendar',
    deadlines: [
      { title: 'Document expiry reminders', detail: '5 sample records · Next checkpoint: 30 Oct 2026', tag: '2 days', tone: 'amber' },
      { title: 'Overdue obligation escalation', detail: '3 sample records · Next checkpoint: 31 Oct 2026', tag: '3 days', tone: 'rose' },
      { title: 'Weekly regional pendency digest', detail: 'Sample scheduled report · 02 Nov 2026', tag: '5 days', tone: 'blue' },
    ],
  },
  system_admin: {
    heading: 'End-to-end workflow health',
    description: 'A synthetic cross-workspace snapshot of application flow and operational pressure points.',
    stages: [
      { label: 'Institution submission', count: 18, tone: 'blue' },
      { label: 'Scrutiny / re-scrutiny', count: 36, tone: 'purple' },
      { label: 'EVC / regional review', count: 22, tone: 'amber' },
      { label: 'Final decision', count: 12, tone: 'green' },
    ],
    actionsHeading: 'Platform-wide attention queue',
    actions: [
      { title: 'Review ageing application queue', detail: '9 sample cases exceed the configured warning threshold', tag: 'SLA watch', tone: 'rose' },
      { title: 'Check notification delivery status', detail: '3 sample reminders need delivery review', tag: 'Operations', tone: 'amber' },
      { title: 'Review role access assignments', detail: 'Sample account and workspace mapping check', tag: 'Access review', tone: 'blue' },
    ],
    deadlinesHeading: 'System alert calendar',
    deadlines: [
      { title: 'Document expiry reminders', detail: '5 sample records · Next checkpoint: 30 Oct 2026', tag: '2 days', tone: 'amber' },
      { title: 'Overdue obligation escalation', detail: '3 sample records · Next checkpoint: 31 Oct 2026', tag: '3 days', tone: 'rose' },
      { title: 'Weekly regional pendency digest', detail: 'Sample scheduled report · 02 Nov 2026', tag: '5 days', tone: 'blue' },
    ],
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

      <section className="demo-workbench-grid" aria-label="Role-specific operational dashboard">
        <section className="panel demo-workflow-panel">
          <div className="panel-heading"><div><h3>{(workbenchByRole[user.role] || workbenchByRole.platform_admin).heading}</h3><p>{(workbenchByRole[user.role] || workbenchByRole.platform_admin).description}</p></div><span className="demo-record-count">SAMPLE SNAPSHOT</span></div>
          <div className="demo-stage-list">
            {(workbenchByRole[user.role] || workbenchByRole.platform_admin).stages.map((stage) => {
              const stages = (workbenchByRole[user.role] || workbenchByRole.platform_admin).stages;
              const max = Math.max(...stages.map((item) => item.count), 1);
              return <div className="demo-stage-row" key={stage.label}>
                <div className="demo-stage-label"><span><i className={'demo-stage-dot tone-' + stage.tone} />{stage.label}</span><strong>{stage.count}</strong></div>
                <div className="demo-stage-track"><span className={'demo-stage-fill tone-' + stage.tone} style={{ width: Math.max(8, Math.round((stage.count / max) * 100)) + '%' }} /></div>
              </div>;
            })}
          </div>
          <div className="demo-panel-footnote"><ShieldCheck size={13}/> Illustrative counts only; not connected to live records.</div>
        </section>
        <section className="panel demo-priority-panel">
          <div className="panel-heading"><div><h3>{(workbenchByRole[user.role] || workbenchByRole.platform_admin).actionsHeading}</h3><p>Suggested work items for this role</p></div><ClipboardCheck size={18} /></div>
          <div className="demo-action-list">
            {(workbenchByRole[user.role] || workbenchByRole.platform_admin).actions.map((item) => <article className="demo-action-item" key={item.title}>
              <span className={'demo-action-icon tone-' + item.tone}>{item.tone === 'green' ? <CheckCircle2 size={16}/> : item.tone === 'rose' ? <ShieldAlert size={16}/> : item.tone === 'amber' ? <Clock3 size={16}/> : <FileText size={16}/>}</span>
              <div className="demo-action-copy"><strong>{item.title}</strong><p>{item.detail}</p></div>
              <span className={'demo-action-tag tone-' + item.tone}>{item.tag}</span>
            </article>)}
          </div>
        </section>
        <section className="panel demo-deadline-panel">
          <div className="panel-heading"><div><h3>{(workbenchByRole[user.role] || workbenchByRole.platform_admin).deadlinesHeading}</h3><p>Sample dates for demonstration only</p></div><Clock3 size={18} /></div>
          <div className="demo-deadline-list">
            {(workbenchByRole[user.role] || workbenchByRole.platform_admin).deadlines.map((item) => <article className="demo-deadline-item" key={item.title}>
              <span className={'demo-deadline-marker tone-' + item.tone}><CalendarDaysIcon /></span>
              <div><strong>{item.title}</strong><p>{item.detail}</p></div>
              <span className={'demo-action-tag tone-' + item.tone}>{item.tag}</span>
            </article>)}
          </div>
        </section>
      </section>
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

function CalendarDaysIcon() {\n  return <Clock3 size={15} />;\n}\n\nfunction ActivityIcon() {
  return <span className="demo-activity-heading-icon"><Clock3 size={17} /></span>;
}
