const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_STORAGE_KEY = 'jengkol_token';

export interface Agency {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
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
  localStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
}

async function authFetch(path: string): Promise<Response> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (response.status === 401) {
    clearToken();
  }
  return response;
}

export async function getOwnAgency(): Promise<Agency> {
  const response = await authFetch('/agencies/me');
  if (!response.ok) {
    throw new Error(`Failed to load agency: ${response.status}`);
  }
  return response.json();
}
