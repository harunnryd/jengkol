import { apiFetch } from './http';
import { paginationQuery, type Paginated } from './pagination';

export type RateModel = 'FLAT' | 'PER_VIEW';

export interface Campaign {
  id: string;
  agencyId: string;
  name: string;
  brief: string | null;
  budget: number;
  rateModel: RateModel;
  flatRate: number | null;
  ratePerView: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignInput {
  name: string;
  brief?: string;
  budget: number;
  rateModel: RateModel;
  flatRate?: number;
  ratePerView?: number;
}

export function listCampaigns(page: number, limit = 20): Promise<Paginated<Campaign>> {
  return apiFetch(`/campaigns${paginationQuery(page, limit)}`);
}

export function createCampaign(input: CampaignInput): Promise<Campaign> {
  return apiFetch('/campaigns', { method: 'POST', body: input });
}

export function updateCampaign(id: string, input: Partial<CampaignInput>): Promise<Campaign> {
  return apiFetch(`/campaigns/${id}`, { method: 'PATCH', body: input });
}

export function deleteCampaign(id: string): Promise<void> {
  return apiFetch(`/campaigns/${id}`, { method: 'DELETE' });
}
