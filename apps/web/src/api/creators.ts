import { apiFetch } from './http';
import { paginationQuery, type Paginated } from './pagination';

export type CreatorType = 'KOL' | 'CLIPPER';
export type Platform = 'TIKTOK' | 'YOUTUBE' | 'INSTAGRAM';

export interface Creator {
  id: string;
  agencyId: string;
  name: string;
  type: CreatorType;
  platform: Platform;
  externalHandle: string;
  followers: number | null;
  avgEngagementRate: number | null;
  niche: string[];
  subscriberCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorInput {
  name: string;
  type: CreatorType;
  platform: Platform;
  externalHandle: string;
  followers?: number;
  avgEngagementRate?: number;
  niche?: string[];
}

export function listCreators(page: number, limit = 20): Promise<Paginated<Creator>> {
  return apiFetch(`/creators${paginationQuery(page, limit)}`);
}

export function createCreator(input: CreatorInput): Promise<Creator> {
  return apiFetch('/creators', { method: 'POST', body: input });
}

export function updateCreator(id: string, input: Partial<CreatorInput>): Promise<Creator> {
  return apiFetch(`/creators/${id}`, { method: 'PATCH', body: input });
}

export function deleteCreator(id: string): Promise<void> {
  return apiFetch(`/creators/${id}`, { method: 'DELETE' });
}
