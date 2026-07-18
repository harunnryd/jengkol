import { ServiceUnavailableException } from '@nestjs/common';
import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { CallbackHandler } from '@langfuse/langchain';
import { LlmRouterService } from '../llm/llm-router.service';

export interface VettingCreatorInput {
  name: string;
  externalHandle: string;
  platform: string;
  followers: number;
  avgEngagementRate: number;
  niche: string[];
  subscriberCount: number;
  channelViewCount: number;
  channelAgeInDays: number | null;
  avgViewsPerSubmission: number;
  viewsToSubscriberRatio: number | null;
  recentSubmissions: Array<{ title: string; description: string }>;
}

export interface HeuristicBreakdown {
  followersComponent: number;
  engagementComponent: number;
  authenticityComponent: number;
}

export interface LlmAssessment {
  qualitativeScore: number;
  reasoning: string;
  redFlags: string[];
}

export interface VettingResult {
  score: number;
  heuristic: HeuristicBreakdown;
  llmAssessment: LlmAssessment;
  contextUsed: {
    niche: string[];
    subscriberCount: number;
    channelAgeInDays: number | null;
    avgViewsPerSubmission: number;
    viewsToSubscriberRatio: number | null;
    recentSubmissionTitles: string[];
  };
}

const VettingState = Annotation.Root({
  creator: Annotation<VettingCreatorInput>,
  heuristic: Annotation<HeuristicBreakdown>,
  llmAssessment: Annotation<LlmAssessment>,
  finalScore: Annotation<number>,
});

/**
 * Views-to-subscriber ratio outside roughly 0.05x-3x per video is worth surfacing —
 * near-zero across many posts suggests bought/fake followers, unusually high (especially
 * on a young channel) suggests a viral outlier worth double-checking, not necessarily a
 * red flag. This is a cheap deterministic signal; the LLM does the actual judgment call
 * using the real content it's shown, this component just biases the heuristic baseline.
 */
function computeAuthenticityComponent(creator: VettingCreatorInput): number {
  const MAX = 20;
  if (!creator.subscriberCount || creator.viewsToSubscriberRatio === null) {
    return MAX;
  }
  const ratio = creator.viewsToSubscriberRatio;
  if (ratio >= 0.05 && ratio <= 3) {
    return MAX;
  }
  const distanceBelow = ratio < 0.05 ? 0.05 - ratio : 0;
  const distanceAbove = ratio > 3 ? ratio - 3 : 0;
  const penalty = Math.min(MAX, distanceBelow * 200 + distanceAbove * 2);
  return Math.max(0, MAX - penalty);
}

export function computeHeuristic(creator: VettingCreatorInput): HeuristicBreakdown {
  const followersComponent = Math.min(1, creator.followers / 100_000) * 50;
  const engagementComponent = Math.min(1, creator.avgEngagementRate / 0.1) * 30;
  const authenticityComponent = computeAuthenticityComponent(creator);
  return { followersComponent, engagementComponent, authenticityComponent };
}

function parseLlmAssessment(raw: string): LlmAssessment {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    throw new ServiceUnavailableException(
      'Vetting agent received a non-JSON response from the LLM — try again',
    );
  }

  const candidate = parsed as Record<string, unknown>;
  const score = Number(candidate.qualitativeScore);

  return {
    qualitativeScore: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
    reasoning: typeof candidate.reasoning === 'string' ? candidate.reasoning : '',
    redFlags: Array.isArray(candidate.redFlags) ? candidate.redFlags.map(String) : [],
  };
}

function describeCreatorForLlm(creator: VettingCreatorInput): string {
  const recentContent =
    creator.recentSubmissions.length > 0
      ? creator.recentSubmissions
          .map((s, i) => `${i + 1}. "${s.title}" — ${s.description || '(no description)'}`)
          .join('\n')
      : 'No submission history yet.';

  return (
    `Creator: ${creator.name} (${creator.externalHandle}) on ${creator.platform}. ` +
    `Followers: ${creator.followers}. Avg engagement rate: ${creator.avgEngagementRate}. ` +
    `Niche tags: ${creator.niche.length > 0 ? creator.niche.join(', ') : 'none provided'}. ` +
    `Subscribers: ${creator.subscriberCount || 'unknown'}. ` +
    `Channel age: ${creator.channelAgeInDays ?? 'unknown'} days. ` +
    `Average views per submission: ${creator.avgViewsPerSubmission.toFixed(0)}. ` +
    `Views-to-subscriber ratio: ${creator.viewsToSubscriberRatio?.toFixed(2) ?? 'unknown'}.\n` +
    `Recent content:\n${recentContent}`
  );
}

/**
 * Builds the vetting StateGraph: heuristic baseline -> LLM qualitative assessment ->
 * blended final score. Kept as three explicit nodes (rather than one function) so
 * future branching (e.g. skip the LLM call for obviously-disqualified creators) can
 * be added as an edge without restructuring the whole flow.
 */
export function buildVettingGraph(llmRouter: LlmRouterService) {
  const graph = new StateGraph(VettingState)
    .addNode('gatherProfile', async (state) => ({
      heuristic: computeHeuristic(state.creator),
    }))
    .addNode('llmAssess', async (state) => {
      const assessment = await llmRouter.invokeWithFallback(async (model) => {
        const response = await model.invoke([
          new SystemMessage(
            'You are a creator vetting analyst for an influencer marketing agency. ' +
              'Given a creator profile — including their recent content titles/descriptions — ' +
              'respond with ONLY a JSON object: ' +
              '{"qualitativeScore": number 0-100, "reasoning": string, "redFlags": string[]}. ' +
              'qualitativeScore reflects brand-safety and campaign fit, not follower count. ' +
              'Ground your reasoning in the actual content shown, not just the numbers — call ' +
              'out anything in the titles/descriptions that raises brand-safety concerns, and ' +
              'note if the views-to-subscriber ratio or channel age suggests inflated or fake ' +
              'engagement.',
          ),
          new HumanMessage(describeCreatorForLlm(state.creator)),
        ]);
        return typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      });

      return { llmAssessment: parseLlmAssessment(assessment) };
    })
    .addNode('combineScore', async (state) => ({
      finalScore:
        0.6 *
          (state.heuristic.followersComponent +
            state.heuristic.engagementComponent +
            state.heuristic.authenticityComponent) +
        0.4 * state.llmAssessment.qualitativeScore,
    }))
    .addEdge(START, 'gatherProfile')
    .addEdge('gatherProfile', 'llmAssess')
    .addEdge('llmAssess', 'combineScore')
    .addEdge('combineScore', END);

  return graph.compile();
}

export async function runVettingAgent(
  llmRouter: LlmRouterService,
  creator: VettingCreatorInput,
): Promise<VettingResult> {
  const graph = buildVettingGraph(llmRouter);

  const callbacks =
    process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
      ? [new CallbackHandler()]
      : [];

  const result = await graph.invoke({ creator }, { callbacks });

  return {
    score: result.finalScore,
    heuristic: result.heuristic,
    llmAssessment: result.llmAssessment,
    contextUsed: {
      niche: creator.niche,
      subscriberCount: creator.subscriberCount,
      channelAgeInDays: creator.channelAgeInDays,
      avgViewsPerSubmission: creator.avgViewsPerSubmission,
      viewsToSubscriberRatio: creator.viewsToSubscriberRatio,
      recentSubmissionTitles: creator.recentSubmissions.map((s) => s.title),
    },
  };
}
