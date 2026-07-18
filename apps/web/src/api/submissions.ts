import { apiFetch } from './http';
import { paginationQuery, type Paginated } from './pagination';
import type { Creator } from './creators';
import type { Payout } from './payouts';

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Submission {
  id: string;
  campaignId: string;
  creatorId: string;
  contentUrl: string;
  externalContentId: string;
  views: number;
  likes: number;
  comments: number;
  status: SubmissionStatus;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator: Creator;
  payout: Payout | null;
}

export interface SubmissionInput {
  campaignId: string;
  creatorId: string;
  contentUrl: string;
  externalContentId: string;
}

export function listSubmissions(
  page: number,
  limit = 20,
  campaignId?: string,
): Promise<Paginated<Submission>> {
  const query = paginationQuery(page, limit) + (campaignId ? `&campaignId=${campaignId}` : '');
  return apiFetch(`/submissions${query}`);
}

export function createSubmission(input: SubmissionInput): Promise<Submission> {
  return apiFetch('/submissions', { method: 'POST', body: input });
}

export function syncSubmission(id: string): Promise<Payout> {
  return apiFetch(`/submissions/${id}/sync`, { method: 'POST' });
}
