import { useEffect, useState, type FormEvent } from 'react'; // CI verification after missing Info icon import fix
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Award, Building2, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Clock, Database,
  FileCheck2, FileText, Headphones, Layers, Landmark, Lock, MapPin,
  Menu, Phone, Search, Send, ShieldCheck, Workflow, X, Eye, Scale, Users,
  BadgeCheck, Bell, Info
} from 'lucide-react';

// Reference-matched public portal: all records on this page are explicitly labelled as demonstration data.
type PolicyCategory = { id: string; title: string; subtitle: string; summary: string; items: { title: string; detail: string }[] };
const policyCategories: PolicyCategory[] = [
  { id:'land', title:'Land & Campus Infrastructure Norms', subtitle:'LAND, BUILDINGS & FACILITIES', summary:'Campus land, building, accessibility and infrastructure requirements for technical institutions.', items:[
    {title:'Land title & non-encumbrance',detail:'Ownership or lease evidence, title continuity and encumbrance status.'},
    {title:'Approved building plan',detail:'Plan approval issued by the competent local authority.'},
    {title:'Built-up area & academic blocks',detail:'Academic space, circulation and permitted built-up area.'},
    {title:'Occupancy & structural safety',detail:'Current occupancy and structural stability records.'},
    {title:'Fire safety & emergency access',detail:'Fire clearance, exits, evacuation and emergency readiness.'},
    {title:'Library, labs & learning facilities',detail:'Programme-appropriate library, laboratory and workshop facilities.'},
  ]},
  {id:'faculty',title:'Faculty Cadre Ratios & Salary Scale Norms',subtitle:'FACULTY & STAFF',summary:'Faculty strength, qualifications, cadre ratios and staff-related compliance records.',items:[
    {title:'Faculty-student ratio',detail:'Programme and level-specific faculty strength requirements.'},
    {title:'Faculty qualifications',detail:'Qualifications and experience of teaching faculty.'},
    {title:'Cadre distribution',detail:'Professor, associate professor and assistant professor structure.'},
    {title:'Technical & supporting staff',detail:'Lab, workshop, library and administrative staff records.'},
    {title:'Pay scale & service conditions',detail:'Applicable remuneration and service-related documentation.'},
    {title:'Faculty development',detail:'Professional development and training evidence.'},
  ]},
  {id:'funds',title:'Statutory Endowment Corpus & Security Deposits',subtitle:'FINANCIAL REQUIREMENTS',summary:'Financial instruments, institutional funds and evidence required for the relevant service.',items:[
    {title:'Endowment fund',detail:'Applicable corpus evidence and supporting bank documentation.'},
    {title:'Security deposit',detail:'Deposit evidence in the format required by the applicable norms.'},
    {title:'Bank guarantee / deposit instrument',detail:'Validity, issuing institution and instrument verification.'},
    {title:'Audited financial statements',detail:'Audited statements and relevant financial declarations.'},
    {title:'Fee and refund policy',detail:'Published fee details and refund provisions.'},
    {title:'Trust or society financial records',detail:'Financial records associated with the applicant organisation.'},
  ]},
  {id:'safety',title:'Society, Trust & Mandatory Legal Documentation',subtitle:'LEGAL & STATUTORY RECORDS',summary:'Institutional registration, governance records, declarations and statutory certificates.',items:[
    {title:'Society / trust registration',detail:'Registration certificate and constitution documents.'},
    {title:'Memorandum & bye-laws',detail:'Governing documents and permitted institutional objectives.'},
    {title:'Governing body details',detail:'Membership, authorisation and meeting records.'},
    {title:'Statutory affidavits',detail:'Signed declarations required for the application type.'},
    {title:'Digital signature & authorisation',detail:'Authorised signatory and declaration evidence.'},
    {title:'Certificates & approvals',detail:'Current certificates required by competent authorities.'},
  ]},
];
type Stage = {title:string; short:string; duration:string; role:string; clause:string; description:string; checks:string[]};
const stages: Stage[] = [
 {title:'Initial Statutory Proposal Filing',short:'Application Submission',duration:'7 days',role:'INSTITUTION COORDINATOR',clause:'Stage 01 · Application filing',description:'The institution coordinator completes the proposal and submits the required statutory evidence for the selected approval service.',checks:['Institution profile and eligibility details','Land title and approved building plan','Occupancy, fire and safety certificates','Faculty cadre and programme details']},
 {title:'First-Line Document Scrutiny & Verification',short:'Document Scrutiny',duration:'14 days',role:'SCRUTINY OFFICER',clause:'Stage 02 · Regional desk review',description:'The scrutiny desk reviews completeness, document validity and the consistency of submitted records.',checks:['Society / trust registration and governance records','Financial instrument validity checks','Faculty and programme evidence review','Document deficiencies and remarks recorded']},
 {title:'Automated Deficiency Alert & Cure Window',short:'Deficiency Redressal',duration:'10 days',role:'INSTITUTION COORDINATOR',clause:'Stage 03 · Clarification window',description:'Where deficiencies are raised, the applicant reviews the remarks and submits the requested clarification and supporting evidence.',checks:['Review each deficiency item','Upload updated supporting documents','Submit a response against each remark','Track the response and its review status']},
 {title:'Regional Committee Evaluation',short:'Regional Evaluation',duration:'10 days',role:'REGIONAL OFFICER',clause:'Stage 04 · Regional review',description:'The regional office evaluates the application record and scrutiny findings against the applicable service requirements.',checks:['Review scrutiny observations','Confirm statutory checklist status','Record recommendation and reasons','Escalate unresolved issues where required']},
 {title:'Expert Visit Committee Inspection',short:'EVC Verification',duration:'Scheduled',role:'EVC COORDINATOR',clause:'Stage 05 · Physical verification',description:'Where the relevant process requires a visit, an expert committee reviews facilities and evidence and records its findings.',checks:['Committee assignment and visit schedule','Verify campus and programme facilities','Record observations and evidence','Submit the inspection report']},
 {title:'Regional Endorsement & Final Review',short:'Final Review',duration:'7 days',role:'REGIONAL OFFICER',clause:'Stage 06 · Recommendation',description:'The competent reviewing officer considers the record, open issues and committee findings before recording a recommendation.',checks:['Review all stage decisions','Resolve outstanding clarifications','Record a reasoned recommendation','Prepare the decision dossier']},
 {title:'Council Decision & Letter of Approval',short:'Decision & Communication',duration:'As applicable',role:'COUNCIL ADMIN',clause:'Stage 07 · Decision and order',description:'The authorised decision-maker records the outcome and makes the resulting communication available through the supported workflow.',checks:['Review the completed application dossier','Record approval or other final outcome','Generate and verify the decision record','Notify the applicant and retain an audit trail']},
];
type Service = {category:string;title:string;description:string;icon:typeof Building2;duration:string;fee:string;prerequisites:string[];documents:string[]};
const services:Service[] = [
 {category:'APPLICATION FILING',title:'Application Filing & Workflow Routing',description:'Submit an AICTE approval application, validate required evidence, and route the case to the correct review stage with clear ownership and status tracking.',icon:Building2,duration:'Stage-based review',fee:'As per applicable official schedule',prerequisites:['Eligible sponsoring body','Available land and infrastructure plan','Programme and faculty plan'],documents:['Registration and governance documents','Land and building records','Safety certificates and declarations']},
 {category:'STAGE-WISE SCRUTINY',title:'Scrutiny & Deficiency Response',description:'Review application evidence against the applicable policy checklist, record scrutiny observations, and manage time-bound resubmissions.',icon:FileCheck2,duration:'Annual cycle',fee:'As per applicable official schedule',prerequisites:['Existing institution record','Current approval reference','Updated compliance information'],documents:['Institution profile and intake','Faculty and infrastructure updates','Applicable declarations']},
 {category:'EVC COORDINATION',title:'Expert Visit Committee (EVC) Scheduling',description:'Coordinate required expert visits, track readiness and assigned actions, and record visit outcomes when the applicable workflow requires an EVC.',icon:Layers,duration:'Service dependent',fee:'As per applicable official schedule',prerequisites:['Eligible institution','Programme readiness','Faculty and facility plan'],documents:['Programme proposal','Faculty roster','Laboratory and curriculum details']},
 {category:'OBLIGATIONS',title:'Time-Bound Undertakings & Obligations',description:'Register undertakings and compliance obligations with responsible owners, due dates, evidence requirements, reminders, and completion status.',icon:Users,duration:'Service dependent',fee:'As per applicable official schedule',prerequisites:['Existing approved programme','Capacity and compliance review','Updated resource plan'],documents:['Intake change request','Faculty and infrastructure details','Supporting declarations']},
 {category:'DOCUMENT VALIDITY',title:'Document Validity & Renewal Monitoring',description:'Monitor evidence validity periods, upcoming expiries, missing documents, and renewal actions to prevent avoidable approval delays.',icon:Landmark,duration:'Service dependent',fee:'As per applicable official schedule',prerequisites:['Existing institution record','Applicable prior approvals','Authorised request'],documents:['Legal and governance records','Updated institutional information','Supporting certificates']},
 {category:'ALERTS & AUDIT',title:'Escalations, Alerts & Audit Reporting',description:'Track stage-wise pendency, overdue actions, automated escalation events, explainable alerts, and a verifiable history of workflow decisions.',icon:ClipboardCheck,duration:'Specified in notice',fee:'No fee information inferred here',prerequisites:['Application reference','Open deficiency or notice','Authorised applicant access'],documents:['Point-by-point response','Updated evidence','Authorised declaration where required']},
];
type Institution = {name:string;city:string;state:string;type:'engineering'|'management'|'polytechnic'|'pharmacy';code:string;pid:string;status:string;intake:string;affiliation:string;programmes:string[];fire:string;updated:string;hash:string};
const institutions:Institution[] = [
 {name:'Northstar Institute of Technology',city:'Hyderabad',state:'Telangana (South-Central Region)',type:'engineering',code:'APP-2026-0142',pid:'1-3948201',status:'Stage 02 · Desk Scrutiny — Clarification Required',intake:'420 Students',affiliation:'Jawaharlal Nehru Technological University, Hyderabad',programmes:['B.Tech Computer Science & AI','B.Tech Data Science','M.Tech Cyber Security'],fire:'Fire NOC · Valid',updated:'28 Oct 2026',hash:'7A3F-19B2-6D44'},
 {name:'Sri Venkateswara College of Engineering',city:'Tirupati',state:'Andhra Pradesh (Southern Region)',type:'engineering',code:'APP-2026-0148',pid:'1-1029482',status:'Stage 03 · 10-Day Statutory Cure — Deficiency Issued',intake:'600 Students',affiliation:'Jawaharlal Nehru Technological University, Anantapur',programmes:['B.Tech Electronics & Communication','B.Tech Mechanical Engineering','B.Tech Civil Engineering'],fire:'Fire NOC · Valid',updated:'28 Oct 2026',hash:'B84E-20C1-7F19'},
 {name:'Kakatiya Technological Institute',city:'Warangal',state:'Telangana (South-Central Region)',type:'engineering',code:'APP-2026-0161',pid:'1-6219083',status:'Stage 04 · Regional Quorum — In Scrutiny',intake:'480 Students',affiliation:'Kakatiya University',programmes:['B.Tech Computer Science','B.Tech Electrical Engineering','B.Tech Mechanical Engineering'],fire:'Fire NOC · Valid',updated:'27 Oct 2026',hash:'C10D-44A8-2F63'},
 {name:'Bengaluru North Polytechnic',city:'Bengaluru',state:'Karnataka (South-Western Region)',type:'polytechnic',code:'APP-2026-0155',pid:'1-8472910',status:'Stage 05 · EVC Inspection — Panel Empanelled',intake:'300 Students',affiliation:'Department of Technical Education, Karnataka',programmes:['Diploma Mechanical Engineering','Diploma Electrical & Electronics','Diploma Mechatronics'],fire:'Fire NOC · Valid',updated:'27 Oct 2026',hash:'E21C-77D4-9A06'},
 {name:'National Institute of Management & Analytics',city:'New Delhi',state:'Delhi (Central Region)',type:'management',code:'APP-2026-0129',pid:'1-6219129',status:'Stage 06 · Letter of Approval Draft — Approval Ready',intake:'240 Students',affiliation:'Autonomous institution',programmes:['PGDM Executive 1-Year Program','MBA Business Analytics','MBA Operations'],fire:'Fire NOC · Valid',updated:'26 Oct 2026',hash:'C129-4A72-90D1'},
 {name:'Deccan College of Pharmacy & Health',city:'Hyderabad',state:'Telangana (South-Central Region)',type:'pharmacy',code:'APP-2026-0112',pid:'1-9920112',status:'Stage 07 · Promulgation — Letter Dispatched',intake:'360 Students',affiliation:'Osmania University, Hyderabad',programmes:['B.Pharm Annual Extension','Pharm.D','M.Pharm Clinical Pharmacy'],fire:'Fire NOC · Valid',updated:'26 Oct 2026',hash:'D112-8C40-2F63'},
 {name:'Eastern Technical College',city:'Bhubaneswar',state:'Odisha (Eastern Region)',type:'engineering',code:'APP-2026-0172',pid:'1-5220168',status:'Stage 01 · Application Submitted',intake:'360 Students',affiliation:'Biju Patnaik University of Technology',programmes:['B.Tech Computer Science','B.Tech Electrical Engineering'],fire:'Fire NOC · Valid',updated:'25 Oct 2026',hash:'D83A-50B1-7C20'},
 {name:'Metro Polytechnic Institute',city:'Chennai',state:'Tamil Nadu (Southern Region)',type:'polytechnic',code:'APP-2026-0184',pid:'1-9921304',status:'Stage 02 · Document Scrutiny',intake:'240 Students',affiliation:'Directorate of Technical Education',programmes:['Diploma Civil Engineering','Diploma Computer Engineering'],fire:'Fire NOC · Valid',updated:'24 Oct 2026',hash:'A19F-81E5-3D71'},
];
const faqs=[
 {q:'How do I verify a technical institution or approved intake?',a:'Use Track & Verify Status to search by institution name, application reference, city or permanent ID. This demonstration page uses sample records; verify official status with the relevant regulator before relying on it.'},
 {q:'Which documents should I prepare before filing?',a:'The required checklist depends on the service and applicable current norms. Common categories include registration, land and building records, safety certificates, faculty information and statutory declarations.'},
 {q:'How can I track the status of my application?',a:'Search the public verification section for a reference, or sign in to the assigned workspace to view records and actions available to your account.'},
 {q:'What happens if a deficiency is raised?',a:'Review each remark, attach the requested evidence and submit a response through the authorised workflow. Follow the due date and retain your reference number.'},
 {q:'When is an Expert Visit Committee required?',a:'A committee visit is required only where the applicable process calls for physical verification. Scheduling and evidence submission depend on the service and stage.'},
 {q:'Where can I read policy norms and statutory guidance?',a:'Use the Policy & Norms section to browse the reference categories. Confirm the current official handbook, notifications and amendments before filing.'},
 {q:'Is this an official AICTE portal?',a:'No. This is an independent PRAVAAH demonstration interface for a project prototype. Sample institutions, references, status values and workflow descriptions are illustrative and are not official records.'},
];
function Hero({onPortal}:{onPortal:()=>void}){
 const [query,setQuery]=useState('');
 const runSearch=(e:FormEvent)=>{e.preventDefault();const target=document.getElementById('verification');if(target){target.scrollIntoView({behavior:'smooth'});window.dispatchEvent(new CustomEvent('pravaah-search',{detail:query}));}};
 const shortcuts=[
  {icon:FileSearchIcon,title:'Track an application',desc:'Check application progress and stage status.',target:'verification'},
  {icon:Building2,title:'Institution directory',desc:'Find sample institution records and programmes.',target:'verification'},
  {icon:Scale,title:'Policies & guidelines',desc:'Explore policy categories and reference checklists.',target:'policies'},
  {icon:ClipboardCheck,title:'Application requirements',desc:'Understand evidence and documentation needs.',target:'services'}
 ];
 return <section id="main-content" className="pr-hero">
  <div className="pr-hero-copy">
   <span className="pr-hero-kicker"><i/> PUBLIC SERVICES &amp; INSTITUTIONAL INFORMATION</span>
   <h1>Public services, made clearer.</h1>
   <h2>Find institutional records, understand approval requirements and follow the application process.</h2>
   <p>Explore public information and illustrative institution records, review applicable policy guidance, and learn what to expect at each stage. No sign-in is needed to browse public resources.</p>
   <div className="pr-hero-feature-grid">
    {[{icon:Scale,title:'Policy guidance',desc:'Browse statutory reference categories and evidence checklists.'},{icon:Search,title:'Public record lookup',desc:'Search illustrative institution and application records.'},{icon:Workflow,title:'Approval process',desc:'Understand the seven stages and responsible review roles.'},{icon:Headphones,title:'Help & support',desc:'Find answers and guidance for common service questions.'}].map(({icon:Icon,title,desc})=><article key={title}><span><Icon size={16}/></span><div><b>{title}</b><p>{desc}</p></div></article>)}
   </div>
  </div>
  <div className="pr-public-services-panel">
   <div className="pr-public-services-heading"><span>PUBLIC SERVICE CENTRE</span><h3>How can we help you today?</h3><p>Search records or choose a service to get started.</p></div>
   <form className="pr-public-service-search" onSubmit={runSearch}><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Institution name, application reference or code…" aria-label="Search public records"/><button type="submit">Search records <ArrowRight size={15}/></button></form>
   <div className="pr-public-service-grid">{shortcuts.map(({icon:Icon,title,desc,target})=><button key={title} className="pr-public-service-item" onClick={()=>document.getElementById(target)?.scrollIntoView({behavior:'smooth'})}><span><Icon size={19}/></span><strong>{title}</strong><small>{desc}</small><em>Explore service <ArrowRight size={13}/></em></button>)}</div>
   <div className="pr-public-service-note"><ShieldCheck size={16}/><span><b>Public information access</b><small>Illustrative records only. Restricted documents and officer actions require authorised access.</small></span><button onClick={onPortal}>Officer login <ArrowRight size={14}/></button></div>
  </div>
  <div className="pr-hero-foot"><span><ShieldCheck size={14}/> Public information and guidance</span><span><CheckCircle2 size={14}/> Sample records clearly labelled</span><span><Workflow size={14}/> Seven-stage approval overview</span></div>
 </section>
}
const FileSearchIcon = FileCheck2;
export default function PublicSite({path}:{path:string}){const navigate=useNavigate();const onPortal=()=>navigate('/access-portal');const isPrivacy=path==='/privacy';const isTerms=path==='/terms';return <div className="pr-public"><Header onPortal={onPortal}/>{!isPrivacy&&!isTerms?<main><Hero onPortal={onPortal}/><div className="pr-announcement"><b><Bell size={13}/> PORTAL NOTICE</b><span>Independent project prototype · institution records and identifiers are illustrative demonstration data.</span><a href="#verification">View sample verification <ArrowRight size={13}/></a></div><GovernanceArchitecture/><PolicySection/><ServicesSection onPortal={onPortal}/><VerificationSection/><ProcessSection onPortal={onPortal}/><CharterSection/><RoleWorkspaces onPortal={onPortal}/><SupportSection/><Footer onPortal={onPortal}/></main>:<main className="pr-legal"><span>PRAVAAH · PUBLIC INFORMATION</span><h1>{isPrivacy?'Privacy policy':'Terms of use'}</h1><p>This page is a draft for the independent PRAVAAH demonstration interface.</p><h2>Service scope</h2><p>PRAVAAH-2 is an independent workflow-platform demonstration. It is not an official AICTE service and sample records do not represent official regulatory decisions.</p><h2>Information and use</h2><p>Actual data handling depends on the connected deployment. Production operator details, applicable law and contact information must be reviewed before launch.</p><Link to="/" className="pr-primary-btn">Return home <ArrowRight size={14}/></Link></main>}<button className="pr-floating-help" onClick={()=>document.getElementById('support')?.scrollIntoView({behavior:'smooth'})}><Headphones size={16}/><span><b>PRAVAAH MITRA</b><small>Help &amp; Support Desk</small></span><ArrowUpRight size={14}/></button></div>}
