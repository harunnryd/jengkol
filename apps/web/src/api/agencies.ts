import { apiFetch } from './http';

export interface Agency {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function getOwnAgency(): Promise<Agency> {
  return apiFetch<Agency>('/agencies/me');
}

export function updateOwnAgency(name: string): Promise<Agency> {
  return apiFetch<Agency>('/agencies/me', { method: 'PATCH', body: { name } });
}

export interface InvitedMember {
  id: string;
  email: string;
  role: 'OWNER' | 'MEMBER';
}

export function inviteMember(email: string, password: string): Promise<InvitedMember> {
  return apiFetch<InvitedMember>('/auth/invite', { method: 'POST', body: { email, password } });
}
