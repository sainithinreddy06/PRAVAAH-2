import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Bell, BookOpen, CheckCircle2, ChevronRight, ClipboardCheck, FileCheck2, FileText, Menu, Search, ShieldCheck, Workflow, X } from 'lucide-react';
import { Link } from 'react-router-dom';

type LegalKind = 'privacy' | 'terms';

function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="public-header">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Link className="public-brand" to="/" aria-label="PRAVAAH home">
        <span className="public-brand-mark"><Workflow size={21} strokeWidth={1.8} /></span>
        <span><strong>PRAVAAH</strong><small>Approval &amp; Compliance</small></span>
      </Link>
      <nav id="public-navigation" className={"public-nav " + (menuOpen ? "public-nav-open" : "")} aria-label="Main navigation">
        <a href="/#services" onClick={closeMenu}>Services</a>
        <a href="/#process" onClick={closeMenu}>Process</a>
        <a href="/#trust" onClick={closeMenu}>Trust &amp; scope</a>
        <a href="/#questions" onClick={closeMenu}>FAQs</a>
      </nav>
      <Link className="public-nav-action" to="/applications">Sign in <ArrowRight size={15} /></Link>
      <button className="public-mobile-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="public-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <Link className="public-brand public-footer-brand" to="/">
        <span className="public-brand-mark"><Workflow size={19} strokeWidth={1.8} /></span>
        <span><strong>PRAVAAH</strong><small>Approval &amp; Compliance</small></span>
      </Link>
      <p>Workflow software for structured application and evidence review.</p>
      <nav aria-label="Legal and site links">
        <Link to="/privacy">Privacy policy</Link>
        <Link to="/terms">Terms and conditions</Link>
        <a href="/#services">Services</a>
      </nav>
      <small className="public-footer-note">PRAVAAH-2 is an independent demonstration platform and is not an official AICTE service.</small>
    </footer>
  );
}

function LandingPage() {
  const [query, setQuery] = useState('');
  const services = [
    { icon: FileText, title: 'Applications', text: 'Create and review application records, check current status, and request transitions allowed for your account.', href: '/applications', tag: 'Connected to API' },
    { icon: FileCheck2, title: 'Evidence & undertakings', text: 'Review application-linked evidence, record undertakings, and follow up on evidence status.', href: '/applications', tag: 'Application workspace' },
    { icon: BookOpen, title: 'Policy register', text: 'Browse policy metadata and version history with source and verification status visible.', href: '/policies', tag: 'Metadata register' },
    { icon: ClipboardCheck, title: 'Compliance obligations', text: 'See obligation records and their links to applications and supporting evidence.', href: '/compliance', tag: 'Connected workflow' },
    { icon: ShieldCheck, title: 'EVC & recommendations', text: 'Review evidence verification checks and rule-based recommendations within application context.', href: '/applications', tag: 'Rule-based support' },
    { icon: Bell, title: 'Notifications & metrics', text: 'Inspect notification queue records and workflow metrics available to your operational role.', href: '/operations', tag: 'Role-scoped' },
    { icon: Bell, title: 'Operations & audit', text: 'Review operational queues, audit events, and available workflow metrics.', href: '/operations', tag: 'Role-scoped' },
  ];
  const visibleServices = services.filter((service) => `${service.title} ${service.text}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="public-site portal-site">
      <PublicHeader />
      <div className="portal-notice"><ShieldCheck size={15} /><span>Independent workflow platform · Not an official AICTE service</span></div>
      <main id="main-content" tabIndex={-1}>
        <section className="portal-hero">
          <div className="portal-hero-copy">
            <p className="public-eyebrow"><span /> APPROVAL &amp; COMPLIANCE WORKSPACE</p>
            <h1>Every review step, <em>clear and connected.</em></h1>
            <p className="public-hero-description">A structured workspace for application records, evidence, policy metadata, and compliance follow-up. Access and workflow actions are governed by your assigned account.</p>
            <div className="public-hero-actions">
              <Link className="public-primary-action" to="/applications">Open workspace <ArrowRight size={16} /></Link>
              <a className="public-secondary-action" href="#services">Explore services <ArrowUpRight size={15} /></a>
            </div>
            <div className="portal-hero-points"><span><CheckCircle2 size={15} /> Server-validated actions</span><span><CheckCircle2 size={15} /> Role-aware access</span></div>
          </div>
          <div className="portal-hero-art" aria-label="Illustration of an application review dashboard">
            <div className="portal-art-top"><span className="portal-art-mark"><Workflow size={17} /></span><span><small>WORKSPACE OVERVIEW</small><strong>Review at a glance</strong></span><span className="portal-art-pill">Illustration</span></div>
            <div className="portal-art-stats"><div><small>APPLICATIONS</small><strong>One workspace</strong></div><div><small>EVIDENCE</small><strong>Linked records</strong></div><div><small>ACCESS</small><strong>Role aware</strong></div></div>
            <div className="portal-art-list"><div className="portal-art-list-head"><span>WORKFLOW AREA</span><span>RECORD VIEW</span><span>ACCESS</span></div><div><b><FileText size={14} /> Applications</b><span>Status &amp; transitions</span><i>Scoped</i></div><div><b><FileCheck2 size={14} /> Evidence</b><span>Linked records</span><i>Scoped</i></div><div><b><BookOpen size={14} /> Policies</b><span>Version metadata</span><i>Scoped</i></div></div>
            <div className="portal-art-foot"><span className="portal-live-dot" /> Illustration only · no live or sample case data shown</div>
          </div>
        </section>

        <section className="portal-value-strip" aria-label="Platform principles">
          <div><span>01</span><strong>One connected record</strong><p>Application context stays linked to evidence and follow-up.</p></div>
          <div><span>02</span><strong>Visible workflow state</strong><p>Reviewers can see status and permitted next actions.</p></div>
          <div><span>03</span><strong>Account-based access</strong><p>The backend enforces access for operational data.</p></div>
        </section>

        <section className="portal-services" id="services">
          <div className="portal-section-head"><div><p className="public-eyebrow">WORKFLOW DIRECTORY</p><h2>Tools for the work in front of you.</h2><p>Open a connected workspace area. Availability depends on the account and the APIs currently implemented.</p></div><label className="portal-search"><Search size={17} /><span className="sr-only">Filter workflow areas</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a workflow" /></label></div>
          <div className="portal-service-grid">{visibleServices.map(({ icon: Icon, title, text, href, tag }) => <Link className="portal-service-card" to={href} key={title}><span className="portal-service-icon"><Icon size={20} /></span><span className="portal-service-tag">{tag}</span><h3>{title}</h3><p>{text}</p><span className="portal-service-link">Open area <ChevronRight size={15} /></span></Link>)}</div>
          {visibleServices.length === 0 && <p className="portal-no-results" role="status">No workflow areas match “{query}”. Try a different search.</p>}
          <p className="portal-services-note">Institution and officer administration, a public institution directory, and persistent operator settings are not available as self-service features.</p>
        </section>

        <section className="portal-process" id="process">
          <div className="portal-process-copy"><p className="public-eyebrow">THE REVIEW PROCESS</p><h2>Move from submission to an accountable outcome.</h2><p>Each action is checked against the current application state and the signed-in account’s permissions. The available steps depend on backend rules.</p><Link className="public-text-link" to="/applications">Go to applications <ArrowRight size={15} /></Link></div>
          <ol><li><span>01</span><div><strong>Create or open a record</strong><p>Start a draft where permitted, or open an application in your assigned scope.</p></div></li><li><span>02</span><div><strong>Review evidence and policy context</strong><p>Inspect linked material and policy metadata; verify authoritative sources separately.</p></div></li><li><span>03</span><div><strong>Record the next action</strong><p>Submit an allowed transition with a reason when required. The backend validates the request.</p></div></li></ol>
        </section>

        <section className="portal-trust" id="trust"><div className="portal-trust-heading"><p className="public-eyebrow">TRUST, SCOPE &amp; LIMITS</p><h2>Know what the platform does—and what it does not.</h2></div><div className="portal-trust-grid"><article><ShieldCheck size={20} /><h3>Access controls</h3><p>Authentication and server-side authorization protect connected API operations. Interface role checks alone are not the security boundary.</p></article><article><BookOpen size={20} /><h3>Policy information</h3><p>The policy area stores metadata and source references. Entries are not represented as verified regulatory advice.</p></article><article><Bell size={20} /><h3>Notifications &amp; records</h3><p>Notification records may be queued without delivery. Audit events are application records and are not claimed to be immutable.</p></article></div></section>

        <section className="portal-faq" id="questions"><div><p className="public-eyebrow">QUESTIONS</p><h2>Clear answers before you begin.</h2></div><div className="portal-faq-list"><details><summary>Is PRAVAAH an official AICTE portal?</summary><p>No. PRAVAAH-2 is an independent demonstration platform and does not make or establish an official regulatory decision.</p></details><details><summary>Can I create an account here?</summary><p>There is no public self-registration. Sign-in requires an account provisioned by an authorized operator.</p></details><details><summary>Are policy entries official or verified?</summary><p>They are policy metadata with source and verification fields. Confirm the authoritative source before relying on any entry.</p></details><details><summary>Does a queued notification mean it was delivered?</summary><p>No. A queued record does not confirm delivery to its intended recipient.</p></details></div></section>

        <section className="portal-final-cta"><div><p className="public-eyebrow">PRAVAAH WORKSPACE</p><h2>Start with the records you are authorized to access.</h2><p>Use an account provisioned by your operator. No public demo credentials are provided.</p></div><Link className="public-primary-action" to="/applications">Continue to sign in <ArrowRight size={16} /></Link></section>
        <p className="public-disclaimer">PRAVAAH-2 is an independent demonstration platform. It does not represent an official AICTE service, and the interface does not establish an official approval or compliance outcome.</p>
      </main>
      <PublicFooter />
    </div>
  );
}
function LegalPage({ kind }: { kind: LegalKind }) {
  const isPrivacy = kind === 'privacy';
  const title = isPrivacy ? 'Privacy policy' : 'Terms and conditions';
  return (
    <div className="public-site">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="legal-page">
        <p className="public-eyebrow">PRAVAAH · POLICY DRAFT</p>
        <h1>{title}</h1>
        <div className="legal-draft-notice" role="status"><ShieldCheck size={18} /><p><strong>Publication review required.</strong> This is a working draft, not a final legal notice. PRAVAAH must not launch publicly until the operator confirms the missing details and obtains appropriate legal review.</p></div>
        {isPrivacy ? (
          <>
            <h2>Information the platform may handle</h2>
            <p>The current application includes account profile fields, authentication requests, application references and workflow status. The backend also defines evidence, policy, obligation, undertaking and audit-event records. The information actually collected in a deployed environment must be confirmed before this policy is published.</p>
            <h2>Why information is used</h2>
            <p>Information is intended to support sign-in, access control and application workflow operations. The operator must confirm the actual purposes and lawful basis that apply to the deployed service.</p>
            <h2>Details that must be confirmed before publication</h2>
            <ul>
              <li>Legal identity and contact details of the service operator and privacy contact.</li>
              <li>Production hosting, database, file storage, logging, analytics and other service providers.</li>
              <li>Actual retention and deletion schedules for accounts, applications, evidence and audit records.</li>
              <li>Applicable data-subject rights, request procedures and grievance contact.</li>
              <li>Security controls, incident handling and any cross-border data processing.</li>
            </ul>
            <h2>Contact</h2>
            <p>Operator contact details have not yet been supplied. This section must be completed before publication.</p>
          </>
        ) : (
          <>
            <h2>Service scope</h2>
            <p>PRAVAAH-2 is an independent workflow-platform demonstration. It is not an official AICTE service and does not itself establish an official regulatory approval or compliance decision.</p>
            <h2>Accounts and authorized use</h2>
            <p>The current application uses accounts provisioned by an operator. The operator must define acceptable use, account responsibilities, eligibility, suspension and support procedures before these terms are finalized.</p>
            <h2>Availability, data and responsibilities</h2>
            <p>Production availability commitments, data ownership, backup and recovery responsibilities, liability terms, dispute handling and governing law have not been supplied. They must be reviewed and completed for the actual service and jurisdiction before publication.</p>
            <h2>Operator details and effective date</h2>
            <p>The legal identity, address, contact details and effective date remain to be confirmed. This draft must not be treated as an agreement until reviewed and approved by the service operator.</p>
          </>
        )}
        <div className="legal-review-checklist"><strong>Launch blocker</strong><p>Replace this review draft with an approved policy based on the real deployment, data flows, operator identity and applicable law.</p></div>
        <Link className="public-text-link" to="/">Return to home <ArrowRight size={15} /></Link>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function PublicSite({ path }: { path: string }) {
  if (path === '/privacy') return <LegalPage kind="privacy" />;
  if (path === '/terms') return <LegalPage kind="terms" />;
  return <LandingPage />;
}
