import { apiFetch } from './http';

export type PayoutStatus = 'PENDING' | 'PAID';

export interface Payout {
  id: string;
  submissionId: string;
  amount: number;
  status: PayoutStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function recalculatePayout(submissionId: string): Promise<Payout> {
  return apiFetch(`/payouts/${submissionId}/recalculate`, { method: 'POST' });
}

export function markPayoutPaid(submissionId: string): Promise<Payout> {
  return apiFetch(`/payouts/${submissionId}/mark-paid`, { method: 'POST' });
}
