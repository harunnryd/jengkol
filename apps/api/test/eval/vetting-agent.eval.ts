import { ClosedQA } from 'autoevals';
import { ConfigService } from '@nestjs/config';
import { LlmRouterService } from '@/modules/llm/llm-router.service';
import { runVettingAgent, VettingCreatorInput } from '@/modules/vetting/vetting-agent.graph';

/**
 * Runs the real vetting agent (real LLM calls via LlmRouterService) against a handful
 * of fixture creators, then uses autoevals' ClosedQA scorer (its own local judge model,
 * OPENAI_API_KEY) to check the agent's reasoning is actually about brand-safety/fit, and
 * asserts the score direction is sane (clearly-good > borderline > clearly-bad).
 *
 * Needs ANTHROPIC_API_KEYS/OPENAI_API_KEYS (for the agent itself) plus OPENAI_API_KEY
 * (for autoevals' judge) in .env — skipped with a clear message if absent, never faked.
 */
describe('vetting agent output quality (eval, real LLM calls)', () => {
  const hasAgentKeys = Boolean(process.env.ANTHROPIC_API_KEYS || process.env.OPENAI_API_KEYS);
  const hasJudgeKey = Boolean(process.env.OPENAI_API_KEY);
  const runIfConfigured = hasAgentKeys && hasJudgeKey ? it : it.skip;

  const fixtures: Record<'clearlyGood' | 'clearlyBad' | 'borderline', VettingCreatorInput> = {
    clearlyGood: {
      name: 'Rina Kusuma',
      externalHandle: '@rinakusuma',
      platform: 'YOUTUBE',
      followers: 500_000,
      avgEngagementRate: 0.08,
      niche: ['beauty', 'skincare'],
      subscriberCount: 500_000,
      channelViewCount: 50_000_000,
      channelAgeInDays: 1200,
      avgViewsPerSubmission: 300_000,
      viewsToSubscriberRatio: 0.6,
      recentSubmissions: [
        { title: '5 Skincare Myths Debunked', description: 'A calm, sourced explainer.' },
      ],
    },
    clearlyBad: {
      name: 'Anonim Clickbait',
      externalHandle: '@scamclips_official',
      platform: 'TIKTOK',
      followers: 1_200,
      avgEngagementRate: 0.001,
      niche: [],
      subscriberCount: 1_200,
      channelViewCount: 500,
      channelAgeInDays: 20,
      avgViewsPerSubmission: 3,
      viewsToSubscriberRatio: 0.0025,
      recentSubmissions: [
        {
          title: 'INSTANT RICH TRICK banks HATE this!!!',
          description: 'Click link in bio now before it gets taken down',
        },
      ],
    },
    borderline: {
      name: 'Budi Santoso',
      externalHandle: '@budisantoso_daily',
      platform: 'YOUTUBE',
      followers: 20_000,
      avgEngagementRate: 0.02,
      niche: ['lifestyle'],
      subscriberCount: 20_000,
      channelViewCount: 800_000,
      channelAgeInDays: 400,
      avgViewsPerSubmission: 8_000,
      viewsToSubscriberRatio: 0.4,
      recentSubmissions: [{ title: 'A day in my life', description: 'Vlog, nothing unusual.' }],
    },
  };

  runIfConfigured(
    'reasoning addresses brand-safety/campaign fit, not just follower count',
    async () => {
      const llmRouter = new LlmRouterService({
        get: (key: string) => process.env[key],
      } as unknown as ConfigService);

      const result = await runVettingAgent(llmRouter, fixtures.clearlyGood);

      const judged = await ClosedQA({
        input:
          'Does this reasoning evaluate brand-safety and campaign fit for an influencer marketing agency, rather than just restating follower count?',
        output: result.llmAssessment.reasoning,
        criteria:
          'The response discusses qualitative fit/red-flags, not just raw follower numbers.',
      });

      expect(judged.score).toBeGreaterThan(0.5);
    },
  );

  runIfConfigured('scores a clearly-good creator higher than a clearly-bad one', async () => {
    const llmRouter = new LlmRouterService({
      get: (key: string) => process.env[key],
    } as unknown as ConfigService);

    const [good, bad] = await Promise.all([
      runVettingAgent(llmRouter, fixtures.clearlyGood),
      runVettingAgent(llmRouter, fixtures.clearlyBad),
    ]);

    expect(good.score).toBeGreaterThan(bad.score);
  });

  if (!hasAgentKeys || !hasJudgeKey) {
    it('is skipped without real API keys (documented, not faked)', () => {
      // eslint-disable-next-line no-console
      console.warn(
        'Skipping vetting-agent eval: set ANTHROPIC_API_KEYS/OPENAI_API_KEYS and OPENAI_API_KEY in .env to run it for real.',
      );
    });
  }
});
