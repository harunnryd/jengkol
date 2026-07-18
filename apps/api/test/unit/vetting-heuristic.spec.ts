import { computeHeuristic, VettingCreatorInput } from '@/modules/vetting/vetting-agent.graph';

function fixture(overrides: Partial<VettingCreatorInput>): VettingCreatorInput {
  return {
    name: 'Test Creator',
    externalHandle: '@test',
    platform: 'YOUTUBE',
    followers: 100_000,
    avgEngagementRate: 0.1,
    niche: [],
    subscriberCount: 0,
    channelViewCount: 0,
    channelAgeInDays: null,
    avgViewsPerSubmission: 0,
    viewsToSubscriberRatio: null,
    recentSubmissions: [],
    ...overrides,
  };
}

describe('computeHeuristic', () => {
  const cases: Array<{ description: string; input: VettingCreatorInput; expected: number }> = [
    {
      description: 'no channel-stats data yet: authenticity defaults to max, not penalized',
      input: fixture({ subscriberCount: 0, viewsToSubscriberRatio: null }),
      expected: 100, // 50 followers + 30 engagement + 20 authenticity
    },
    {
      description: 'healthy views-to-subscriber ratio (within 0.05x-3x): full authenticity score',
      input: fixture({ subscriberCount: 10_000, viewsToSubscriberRatio: 1 }),
      expected: 100,
    },
    {
      description:
        'suspiciously low ratio (near-zero views vs subscribers): authenticity penalized',
      input: fixture({ subscriberCount: 10_000, viewsToSubscriberRatio: 0.001 }),
      expected: 90.2, // 50 + 30 + (20 - 9.8)
    },
    {
      description: 'anomalously high ratio (viral outlier): authenticity partially penalized',
      input: fixture({ subscriberCount: 1_000, viewsToSubscriberRatio: 10 }),
      expected: 86, // 50 + 30 + (20 - 14)
    },
    {
      description: 'extreme viral anomaly: authenticity floors at zero, never negative',
      input: fixture({ subscriberCount: 1_000, viewsToSubscriberRatio: 100 }),
      expected: 80, // 50 + 30 + 0
    },
  ];

  it.each(cases)('$description', ({ input, expected }) => {
    const { followersComponent, engagementComponent, authenticityComponent } =
      computeHeuristic(input);
    expect(followersComponent + engagementComponent + authenticityComponent).toBeCloseTo(expected);
  });
});
