import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import CreatorsPage from './CreatorsPage';
import { listCreators } from '@/api/creators';

vi.mock('@/api/creators', () => ({
  listCreators: vi.fn().mockResolvedValue({
    data: [
      {
        id: '1',
        agencyId: 'a',
        name: 'Test Creator',
        type: 'KOL',
        platform: 'YOUTUBE',
        externalHandle: '@test',
        followers: 100,
        avgEngagementRate: 0.05,
        niche: [],
        subscriberCount: null,
        createdAt: '',
        updatedAt: '',
      },
    ],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
  createCreator: vi.fn(),
  updateCreator: vi.fn(),
  deleteCreator: vi.fn(),
}));

describe('CreatorsPage', () => {
  it('fetches and renders the creators list', async () => {
    render(<CreatorsPage />);

    await waitFor(() => expect(screen.getByText('Test Creator')).toBeInTheDocument());
    expect(listCreators).toHaveBeenCalledWith(1);
  });
});
