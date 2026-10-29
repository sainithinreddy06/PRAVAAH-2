import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, FileImage, FileUp, LoaderCircle, Search, ShieldCheck, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, formatStatus, type Application } from '../lib/api';
import { useAuth } from '../components/AuthGate';

const uploadRoles = ['applicant', 'institution_admin', 'institution_coordinator', 'platform_admin'];
const normaliseRole = (role: string) => role.trim().toLowerCase().replace(/[ -]+/g, '_');

export default function DocumentUploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [documentType, setDocumentType] = useState('Supporting evidence');
  const [description, setDescription] = useState('');
  const [policyId, setPolicyId] = useState('');
  const [policies, setPolicies] = useState<Array<{id:number;policy_key:string;version:number;title:string}>>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);
  const [uploadedName, setUploadedName] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [apps, policyRows] = await Promise.all([api.listApplications(), api.listPolicies()]);
      setApplications(apps);
      setPolicies(policyRows);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.detail : 'Could not load applications. Please check your connection and sign-in.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const matchedApplication = useMemo(() => {
    const query = applicationNumber.trim().toLowerCase();
    if (!query) return null;
    return applications.find(app => app.reference_code.toLowerCase() === query || String(app.id) === query) || null;
  }, [applications, applicationNumber]);

  const chooseApplication = () => {
    setError(''); setNotice(''); setSelectedApplication(matchedApplication);
    if (!matchedApplication) setError('No application matched that number. Enter the exact application reference or numeric application ID from the Application register.');
    else setNotice('Application found. You can attach a document to ' + matchedApplication.reference_code + '.');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!uploadRoles.includes(normaliseRole(user.role))) { setError('Your account role does not have document upload permission.'); return; }
    if (!selectedApplication) { setError('Find and confirm an application number first.'); return; }
    if (!file) { setError('Choose a photo or document to upload.'); return; }
    if (!['draft', 'changes_requested'].includes(selectedApplication.status)) {
      setError('Documents can only be uploaded while the application is Draft or Changes requested. Current status: ' + formatStatus(selectedApplication.status) + '.');
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a PDF, JPG, PNG, or WebP file.');
      return;
    }
    setWorking(true);
    try {
      const result = await api.uploadEvidence(selectedApplication.id, file, policyId ? Number(policyId) : undefined);
      setUploadedName(result.original_filename);
      setNotice('File uploaded successfully and linked to ' + selectedApplication.reference_code + '. Evidence ID: ' + result.id + '.');
      setFile(null);
      setDescription('');
      setPolicyId('');
      const input = document.getElementById('document-upload-file') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.detail : 'Upload failed. Please try again.');
    } finally { setWorking(false); }
  };

  if (!uploadRoles.includes(normaliseRole(user.role))) return <div className="v3-upload-page"><section className="v3-upload-card"><AlertCircle size={24}/><h1>Upload permission required</h1><p>Your current role cannot upload evidence. Ask an authorised institution coordinator or administrator.</p></section></div>;

  return <div className="v3-upload-page">
    <div className="v3-upload-heading"><div><span className="v3-kicker"><span className="v3-kicker-line"/>DOCUMENT MANAGEMENT</span><h1>Document upload centre</h1><p>Attach a photo, scanned document, or PDF to an existing application and set its review priority.</p></div><div className="v3-upload-heading-icon"><UploadCloud size={25}/></div></div>
    <div className="v3-upload-stats"><div><span>SUPPORTED FILES</span><strong>PDF · JPG · PNG · WebP</strong></div><div><span>UPLOAD ACCESS</span><strong>Authorised roles only</strong></div><div><span>REVIEW PRIORITY</span><strong>High · Medium · Low</strong></div></div>
    {error&&<div className="v3-upload-feedback error" role="alert"><AlertCircle size={17}/><span>{error}</span></div>}
    {notice&&<div className="v3-upload-feedback success" role="status"><CheckCircle2 size={17}/><span>{notice}{uploadedName&&<small>Latest file: {uploadedName}</small>}</span></div>}
    <form className="v3-upload-layout" onSubmit={submit}>
      <section className="v3-upload-card">
        <div className="v3-upload-card-heading"><span className="v3-upload-step">01</span><div><h2>Identify application</h2><p>Use the exact application reference or its numeric ID.</p></div></div>
        <label className="v3-upload-label" htmlFor="document-application-number">Application number <b>*</b></label>
        <div className="v3-upload-lookup"><Search size={17}/><input id="document-application-number" value={applicationNumber} onChange={e=>{setApplicationNumber(e.target.value);setSelectedApplication(null);setNotice('');}} placeholder="e.g. APP-2026-0142 or application ID" required/><button type="button" onClick={chooseApplication} disabled={loading||!applicationNumber.trim()}>Find application</button></div>
        {loading&&<p className="v3-upload-muted"><LoaderCircle size={14}/> Loading your accessible applications…</p>}
        {selectedApplication&&<div className="v3-upload-application-match"><CheckCircle2 size={19}/><div><strong>{selectedApplication.reference_code}</strong><span>Application ID #{selectedApplication.id} · Institution #{selectedApplication.institution_id}</span><small>Status: {formatStatus(selectedApplication.status)}</small></div><button type="button" onClick={()=>navigate('/applications/'+selectedApplication.id)}>Open application</button></div>}
        {!loading&&applications.length===0&&!error&&<p className="v3-upload-muted">No applications are available to this account. Create or request access to an application first.</p>}
        <div className="v3-upload-field-grid">
          <div><label className="v3-upload-label" htmlFor="document-type">Document category <b>*</b></label><select id="document-type" value={documentType} onChange={e=>setDocumentType(e.target.value)} required><option>Supporting evidence</option><option>Institution photograph</option><option>Land / lease document</option><option>Financial instrument</option><option>Faculty / infrastructure proof</option><option>Compliance certificate</option><option>Other supporting document</option></select></div>
          <div><label className="v3-upload-label" htmlFor="document-priority">Review priority <b>*</b></label><select id="document-priority" value={priority} onChange={e=>setPriority(e.target.value as 'High'|'Medium'|'Low')} required><option value="High">High — urgent review</option><option value="Medium">Medium — normal review</option><option value="Low">Low — routine review</option></select></div>
        </div>
        <label className="v3-upload-label" htmlFor="document-description">Document notes</label><textarea id="document-description" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe what the document proves or any details the reviewer should know." rows={3}/>
        <label className="v3-upload-label" htmlFor="document-policy">Link policy (optional)</label><select id="document-policy" value={policyId} onChange={e=>setPolicyId(e.target.value)}><option value="">No linked policy</option>{policies.map(policy=><option key={policy.id} value={policy.id}>{policy.policy_key} v{policy.version} · {policy.title}</option>)}</select>
      </section>
      <section className="v3-upload-card">
        <div className="v3-upload-card-heading"><span className="v3-upload-step">02</span><div><h2>Choose file</h2><p>Upload a clear photo, scan, or PDF document.</p></div></div>
        <label className={'v3-file-drop '+(file?'has-file':'')} htmlFor="document-upload-file"><span className="v3-file-drop-icon">{file?<FileImage size={25}/>:<UploadCloud size={27}/>}</span><strong>{file?file.name:'Choose a photo or document'}</strong><span>{file?(file.size/1024/1024).toFixed(2)+' MB · '+(file.type||'File'):'Click to browse your device'}</span><small>Accepted formats: PDF, JPG, PNG, WebP</small><input id="document-upload-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>{setFile(e.target.files?.[0]||null);setError('');}} required/></label>
        {file&&file.type.startsWith('image/')&&<div className="v3-upload-preview"><img src={URL.createObjectURL(file)} alt="Selected document preview"/><div><strong>Image selected</strong><span>Check that the text and reference numbers are readable before submitting.</span></div></div>}
        <div className="v3-upload-security-note"><ShieldCheck size={17}/><span><strong>Secure evidence handling</strong><small>The file is sent to the connected API and linked to the selected application. Do not upload passwords or unrelated personal data.</small></span></div>
        <button className="v3-upload-submit" type="submit" disabled={working||loading||!selectedApplication||!file}><FileUp size={17}/>{working?'Uploading document…':'Upload document for review'}</button>
        <button className="v3-upload-cancel" type="button" onClick={()=>{setFile(null);setDescription('');setError('');const input=document.getElementById('document-upload-file') as HTMLInputElement|null;if(input)input.value='';}}>Clear selected file</button>
      </section>
    </form>
    <p className="v3-upload-footnote">Priority, category, and notes are currently form-only labels; the existing evidence API persists the file and optional policy link. Do not treat those labels as saved metadata until backend support is added.</p>
  </div>;
}
