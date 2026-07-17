import { Campaign, RateModel, Submission } from '@prisma/client';

export type PayoutInputs = Pick<Campaign, 'rateModel' | 'flatRate' | 'ratePerView'> & {
  views: Submission['views'];
};

/**
 * Pure payout math — no I/O. Kept isolated because this is the "never wrong money"
 * core of the product; every case here is directly unit-tested.
 */
export function calculatePayout(inputs: PayoutInputs): number {
  if (inputs.rateModel === RateModel.FLAT) {
    return inputs.flatRate ?? 0;
  }

  // PER_VIEW
  const views = Math.max(0, inputs.views);
  return views * (inputs.ratePerView ?? 0);
}
