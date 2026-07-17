import { RateModel } from '@prisma/client';
import { calculatePayout, PayoutInputs } from '@/modules/payouts/payout-calculator';

describe('calculatePayout', () => {
  const cases: Array<{ description: string; inputs: PayoutInputs; expected: number }> = [
    {
      description: 'flat rate regardless of views',
      inputs: { rateModel: RateModel.FLAT, flatRate: 500_000, ratePerView: null, views: 12_345 },
      expected: 500_000,
    },
    {
      description: 'flat campaign with no flat rate set falls back to 0',
      inputs: { rateModel: RateModel.FLAT, flatRate: null, ratePerView: null, views: 100 },
      expected: 0,
    },
    {
      description: 'per-view multiplies views by the rate',
      inputs: { rateModel: RateModel.PER_VIEW, flatRate: null, ratePerView: 15, views: 10_000 },
      expected: 150_000,
    },
    {
      description: 'per-view with zero views is zero, not an error',
      inputs: { rateModel: RateModel.PER_VIEW, flatRate: null, ratePerView: 15, views: 0 },
      expected: 0,
    },
    {
      description: 'per-view never goes negative even with negative views',
      inputs: { rateModel: RateModel.PER_VIEW, flatRate: null, ratePerView: 15, views: -50 },
      expected: 0,
    },
  ];

  it.each(cases)('$description', ({ inputs, expected }) => {
    expect(calculatePayout(inputs)).toBe(expected);
  });
});
