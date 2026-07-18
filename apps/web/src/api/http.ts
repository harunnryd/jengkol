const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_STORAGE_KEY = 'jengkol_token';
const USER_STORAGE_KEY = 'jengkol_user';

export type UserRole = 'OWNER' | 'MEMBER';

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
}

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getCurrentUser(): CurrentUser | null {
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as CurrentUser) : null;
}

export function clearAuth(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error('Invalid email or password');
  }
  const data = await response.json();
  window.localStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
}

export async function register(agencyName: string, email: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agencyName, email, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message?.message ?? body?.message ?? 'Registration failed');
  }
  const data = await response.json();
  window.localStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** Extracts a human-readable message from Nest's error response shape. */
function extractErrorMessage(body: unknown, status: number): string {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object' && 'message' in message) {
    return String((message as { message: unknown }).message);
  }
  return `Request failed with status ${status}`;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    clearAuth();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(extractErrorMessage(body, response.status));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
