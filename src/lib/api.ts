const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = (configuredApiUrl || 'http://127.0.0.1:8000').replace(/\/+$/, '');

let accessToken: string | null = null;

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  region_code: string | null;
  is_active: boolean;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected';

export type Application = {
  id: number;
  reference_code: string;
  institution_id: number;
  submitted_by_user_id: number | null;
  workflow_stage: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
};

export type Policy = { id: number; policy_key: string; version: number; title: string; description: string | null; source_reference: string | null; effective_from: string | null; effective_until: string | null; is_active: boolean; created_at: string };
export type Evidence = { id: number; application_id: number; policy_id: number | null; original_filename: string; content_type: string | null; sha256_digest: string | null; review_status: string; reviewer_notes: string | null; valid_until: string | null; created_at: string };
export type Obligation = { id: number; application_id: number | null; owner_user_id: number | null; obligation_type: string; title: string; description: string | null; due_at: string | null; status: 'open' | 'in_progress' | 'fulfilled' | 'waived'; policy_reference: string | null; created_at: string };
export type Notification = { id: number; recipient_user_id: number | null; event_key: string; channel: string; status: string; attempt_count: number; payload_json: string; last_error: string | null; created_at: string };
export type Undertaking = { id: number; application_id: number; created_by_user_id: number | null; undertaking_type: string; statement: string; status: string; version: number; submitted_at: string | null; reviewed_by_user_id: number | null; reviewed_at: string | null; reviewer_notes: string | null; created_at: string };
export type EvcAssessment = { id: number; application_id: number; assessed_by_user_id: number | null; evidence_total: number; evidence_accepted: number; evidence_pending: number; evidence_rejected: number; open_obligations: number; undertaking_count: number; outcome: string; notes: string | null; created_at: string };
export type EvcChecklistItem = { item_id: string; label: string; required: boolean };
export type EvcChecklistResult = { item_id: string; outcome: 'pass' | 'fail' | 'not_applicable'; notes?: string };
export type EvcVisit = { id: number; application_id: number; scheduled_by_user_id: number | null; assigned_to_user_id: number | null; scheduled_at: string; status: 'scheduled' | 'in_progress' | 'completed'; checklist_json: string; results_json: string; findings: string | null; report_revision: number; started_at: string | null; completed_at: string | null; created_at: string; updated_at: string };
export type EvcVisitReport = { id: number; visit_id: number; revision: number; findings: string; results_json: string; change_reason: string; created_by_user_id: number | null; created_at: string };
export type Recommendation = { code: string; severity: 'high' | 'medium' | 'low'; title: string; explanation: string; suggested_action: string; evidence_count: number };
export type ApplicationRecommendations = { application_id: number; risk_score: number; risk_level: string; assessed_at: string; factors: string[]; recommendations: Recommendation[]; disclaimer: string };
export type AuditEvent = { id: number; actor_user_id: number | null; entity_type: string; entity_id: string; action: string; reason: string | null; details_json: string; created_at: string };
export type OperationalMetrics = { applications_total: number; applications_by_status: Record<string, number>; evidence_total: number; evidence_by_review_status: Record<string, number>; obligations_total: number; obligations_by_status: Record<string, number>; undertakings_total: number; undertakings_by_status: Record<string, number>; overdue_obligations: number };

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', 'Bearer ' + accessToken);

  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Could not reach the API. Check that the backend is running and VITE_API_BASE_URL is correct.');
  }

  if (response.status === 401) {
    accessToken = null;
    window.dispatchEvent(new Event('pravaah:unauthorized'));
  }

  if (!response.ok) {
    let detail = 'Request failed (' + response.status + ').';
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'detail' in body) {
        const value = (body as { detail?: unknown }).detail;
        if (typeof value === 'string') detail = value;
        else if (Array.isArray(value)) detail = value.map((item) => {
          if (item && typeof item === 'object' && 'msg' in item) return String((item as { msg: unknown }).msg);
          return String(item);
        }).join('; ');
      }
    } catch {
      // Keep the useful status-based message when the response is not JSON.
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/api/v1/auth/me'),
  createApplication: (institution_id: number, reference_code: string) =>
    request<Application>('/api/v1/applications', {
      method: 'POST',
      body: JSON.stringify({ institution_id, reference_code }),
    }),
  listApplications: (status?: ApplicationStatus) => {
    const query = status ? '?status=' + encodeURIComponent(status) : '';
    return request<Application[]>('/api/v1/applications' + query);
  },
  transitionApplication: (id: number, target_status: ApplicationStatus, reason: string) =>
    request<Application>('/api/v1/applications/' + id + '/transitions', {
      method: 'POST',
      body: JSON.stringify({ target_status, reason }),
    }),
  getApplication: (id: number) => request<Application>('/api/v1/applications/' + id),
  listPolicies: (activeOnly = true) => request<Policy[]>('/api/v1/policies?active_only=' + activeOnly),
  createPolicy: (payload: { policy_key: string; version: number; title: string; description?: string; source_reference?: string; effective_from?: string; effective_until?: string }) => request<Policy>('/api/v1/policies', { method: 'POST', body: JSON.stringify(payload) }),
  listEvidence: (id: number) => request<Evidence[]>('/api/v1/applications/' + id + '/evidence'),
  uploadEvidence: (id: number, file: File, policyId?: number) => { const body = new FormData(); body.append('file', file); if (policyId) body.append('policy_id', String(policyId)); return request<Evidence>('/api/v1/applications/' + id + '/evidence', { method: 'POST', body }); },
  reviewEvidence: (id: number, review_status: 'accepted' | 'rejected' | 'needs_changes', reviewer_notes: string) => request<Evidence>('/api/v1/evidence/' + id + '/review', { method: 'PATCH', body: JSON.stringify({ review_status, reviewer_notes }) }),
  listObligations: (filters: { status?: string; due_before?: string; limit?: number; offset?: number } = {}) => { const query = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); }); return request<Obligation[]>('/api/v1/obligations?' + query.toString()); },
  createObligation: (payload: { application_id: number; owner_user_id?: number; obligation_type: string; title: string; description?: string; due_at?: string; policy_reference?: string }) => request<Obligation>('/api/v1/obligations', { method: 'POST', body: JSON.stringify(payload) }),
  updateObligation: (id: number, payload: Partial<Pick<Obligation, 'title' | 'description' | 'due_at' | 'status' | 'policy_reference'>>) => request<Obligation>('/api/v1/obligations/' + id, { method: 'PATCH', body: JSON.stringify(payload) }),
  listNotifications: () => request<Notification[]>('/api/v1/notifications'),
  escalateDue: () => request<{ notifications_created: number }>('/api/v1/obligations/escalate-due', { method: 'POST' }),
  listUndertakings: (id: number) => request<Undertaking[]>('/api/v1/applications/' + id + '/undertakings'),
  createUndertaking: (payload: { application_id: number; undertaking_type: string; statement: string }) => request<Undertaking>('/api/v1/undertakings', { method: 'POST', body: JSON.stringify(payload) }),
  submitUndertaking: (id: number) => request<Undertaking>('/api/v1/undertakings/' + id + '/submit', { method: 'POST' }),
  reviewUndertaking: (id: number, decision: 'accepted' | 'changes_requested' | 'rejected', reviewer_notes: string) => request<Undertaking>('/api/v1/undertakings/' + id + '/review', { method: 'POST', body: JSON.stringify({ decision, reviewer_notes }) }),
  listAssessments: (id: number) => request<EvcAssessment[]>('/api/v1/applications/' + id + '/evc-assessments'),
  listEvcVisits: (id: number) => request<EvcVisit[]>('/api/v1/applications/' + id + '/evc-visits'),
  scheduleEvcVisit: (payload: { application_id: number; assigned_to_user_id: number; scheduled_at: string; checklist_items: EvcChecklistItem[] }) => request<EvcVisit>('/api/v1/evc/visits', { method: 'POST', body: JSON.stringify(payload) }),
  startEvcVisit: (id: number) => request<EvcVisit>('/api/v1/evc/visits/' + id + '/start', { method: 'POST' }),
  completeEvcVisit: (id: number, payload: { findings: string; results: EvcChecklistResult[] }) => request<EvcVisit>('/api/v1/evc/visits/' + id + '/complete', { method: 'POST', body: JSON.stringify(payload) }),
  listEvcVisitReports: (id: number) => request<EvcVisitReport[]>('/api/v1/evc/visits/' + id + '/reports'),
  amendEvcVisitReport: (id: number, payload: { findings: string; results: EvcChecklistResult[]; change_reason: string }) => request<EvcVisitReport>('/api/v1/evc/visits/' + id + '/reports', { method: 'POST', body: JSON.stringify(payload) }),
  createAssessment: (application_id: number, notes?: string) => request<EvcAssessment>('/api/v1/evc/assessments', { method: 'POST', body: JSON.stringify({ application_id, notes }) }),
  recommendations: (id: number) => request<ApplicationRecommendations>('/api/v1/applications/' + id + '/recommendations'),
  listAuditEvents: (filters: { entity_type?: string; entity_id?: string; action?: string; actor_user_id?: number; since?: string; until?: string; limit?: number; offset?: number } = {}) => { const query = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); }); return request<AuditEvent[]>('/api/v1/audit/events?' + query.toString()); },
  metrics: () => request<OperationalMetrics>('/api/v1/operations/metrics'),
};

export const allowedTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ['submitted'],
  submitted: ['under_review'],
  under_review: ['changes_requested', 'approved', 'rejected'],
  changes_requested: ['submitted'],
  approved: [],
  rejected: [],
};

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
