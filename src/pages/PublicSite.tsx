import { useState } from 'react';
import { ArrowRight, ArrowUpRight, CheckCircle2, FileCheck2, FileText, Menu, ShieldCheck, Workflow, X } from 'lucide-react';
import { Link } from 'react-router-dom';

type LegalKind = 'privacy' | 'terms';

function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="public-header">
      <Link className="public-brand" to="/" aria-label="PRAVAAH home">
        <span className="public-brand-mark"><Workflow size={21} strokeWidth={1.8} /></span>
        <span><strong>PRAVAAH</strong><small>Approval &amp; Compliance</small></span>
      </Link>
      <nav className={"public-nav " + (menuOpen ? "public-nav-open" : "")} aria-label="Main navigation">
        <a href="/#platform" onClick={closeMenu}>Platform</a>
        <a href="/#workflow" onClick={closeMenu}>How it works</a>
        <a href="/#principles" onClick={closeMenu}>Principles</a>
      </nav>
      <Link className="public-nav-action" to="/applications">Sign in <ArrowRight size={15} /></Link>
      <button className="public-mobile-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
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
        <a href="/#platform">Platform</a>
      </nav>
      <small className="public-footer-note">PRAVAAH-2 is an independent demonstration platform and is not an official AICTE service.</small>
    </footer>
  );
}

function LandingPage() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="public-hero">
          <div className="public-hero-copy">
            <p className="public-eyebrow"><span /> APPLICATION WORKFLOW PLATFORM</p>
            <h1>Bring every approval step into <em>clear view.</em></h1>
            <p className="public-hero-description">
              PRAVAAH provides a structured workspace for application records, review transitions and evidence-linked workflows, with access governed by assigned roles.
            </p>
            <div className="public-hero-actions">
              <Link className="public-primary-action" to="/applications">Open workspace <ArrowRight size={16} /></Link>
              <a className="public-secondary-action" href="#workflow">Explore the workflow <ArrowUpRight size={15} /></a>
            </div>
            <div className="public-trust-line"><ShieldCheck size={16} /><span>Role-aware access</span><span className="public-trust-separator" /><span>Backend-validated transitions</span></div>
          </div>
          <div className="public-product-visual" aria-label="Illustration of an application workflow workspace">
            <div className="visual-window-bar"><span /><span /><span /><small>Workspace overview</small></div>
            <div className="visual-layout">
              <aside className="visual-sidebar">
                <div className="visual-logo"><Workflow size={15} /></div>
                <span className="visual-side-active"><FileText size={14} /></span>
                <span><FileCheck2 size={14} /></span>
                <span><ShieldCheck size={14} /></span>
              </aside>
              <div className="visual-main">
                <div className="visual-heading"><span><small>WORKSPACE</small><strong>Application review</strong></span><span className="visual-filter">Current records</span></div>
                <div className="visual-record visual-record-heading"><span>REFERENCE</span><span>STAGE</span><span>STATUS</span></div>
                <div className="visual-record"><span><i className="visual-dot" />Application record</span><span>Initial review</span><b>Submitted</b></div>
                <div className="visual-record"><span><i className="visual-dot visual-dot-green" />Evidence record</span><span>Evidence check</span><b>In review</b></div>
                <div className="visual-record"><span><i className="visual-dot visual-dot-amber" />Policy record</span><span>Requirements</span><b>Draft</b></div>
                <div className="visual-workflow">
                  <div><span className="workflow-step-done"><CheckCircle2 size={14} /></span><small>Created</small></div>
                  <i />
                  <div><span className="workflow-step-current">2</span><small>Review</small></div>
                  <i />
                  <div><span className="workflow-step-pending">3</span><small>Decision</small></div>
                </div>
                <p className="visual-caption">Illustrative interface · not live application data</p>
              </div>
            </div>
          </div>
        </section>

        <section className="public-principles" id="principles">
          <div><span className="principle-number">01</span><strong>Structured records</strong><p>Keep application references and workflow stages organized in one workspace.</p></div>
          <div><span className="principle-number">02</span><strong>Traceable transitions</strong><p>Record workflow changes through backend-validated actions and reasons.</p></div>
          <div><span className="principle-number">03</span><strong>Role-aware access</strong><p>Use assigned account permissions to govern access to operational records.</p></div>
        </section>

        <section className="public-platform-section" id="platform">
          <div className="public-section-heading">
            <p className="public-eyebrow">THE PLATFORM</p>
            <h2>Designed around the work that needs to happen.</h2>
            <p>The interface is organized around real workflow concepts. Availability varies by implementation phase; unfinished areas are not presented as live features.</p>
          </div>
          <div className="public-feature-grid">
            <article className="public-feature-card"><span className="public-feature-icon"><FileText size={20} /></span><h3>Application records</h3><p>View records returned by the connected API, filter by status, create draft applications where permitted, and request allowed transitions.</p><span className="feature-reference">Connected workflow</span></article>
            <article className="public-feature-card"><span className="public-feature-icon"><FileCheck2 size={20} /></span><h3>Evidence and policy</h3><p>Keep evidence review and policy management within the broader product structure. Dedicated screens still require implementation and verification.</p><span className="feature-reference feature-reference-planned">Integration in progress</span></article>
            <article className="public-feature-card"><span className="public-feature-icon"><ShieldCheck size={20} /></span><h3>Operational controls</h3><p>Authentication and server-side authorization form the access boundary. Interface-level role checks do not replace backend enforcement.</p><span className="feature-reference">Backend-controlled access</span></article>
          </div>
        </section>

        <section className="public-workflow-section" id="workflow">
          <div className="public-workflow-copy">
            <p className="public-eyebrow">HOW IT WORKS</p>
            <h2>A clear path from record creation to review.</h2>
            <p>PRAVAAH organizes application work into explicit stages. Actions depend on the current status, the signed-in user's role and the backend's transition rules.</p>
            <Link className="public-text-link" to="/applications">Continue to sign in <ArrowRight size={15} /></Link>
          </div>
          <ol className="public-steps">
            <li><span>01</span><div><strong>Sign in</strong><p>Use an account provisioned by an authorized operator.</p></div></li>
            <li><span>02</span><div><strong>Open an application</strong><p>Review records visible to your account and its assigned scope.</p></div></li>
            <li><span>03</span><div><strong>Submit an allowed action</strong><p>Provide a reason where required. The backend validates the transition.</p></div></li>
          </ol>
        </section>

        <section className="public-final-cta">
          <div><p className="public-eyebrow">PRAVAAH WORKSPACE</p><h2>Start with the records you are authorized to access.</h2><p>Sign in using your assigned account. No public self-registration or demo credentials are provided.</p></div>
          <Link className="public-primary-action" to="/applications">Sign in to PRAVAAH <ArrowRight size={16} /></Link>
        </section>
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
      <main className="legal-page">
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
