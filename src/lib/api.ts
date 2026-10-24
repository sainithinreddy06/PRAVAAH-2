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
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
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
