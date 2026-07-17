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
}

export interface HeuristicBreakdown {
  followersComponent: number;
  engagementComponent: number;
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
}

const VettingState = Annotation.Root({
  creator: Annotation<VettingCreatorInput>,
  heuristic: Annotation<HeuristicBreakdown>,
  llmAssessment: Annotation<LlmAssessment>,
  finalScore: Annotation<number>,
});

function computeHeuristic(creator: VettingCreatorInput): HeuristicBreakdown {
  const followersComponent = Math.min(1, creator.followers / 100_000) * 60;
  const engagementComponent = Math.min(1, creator.avgEngagementRate / 0.1) * 40;
  return { followersComponent, engagementComponent };
}

function parseLlmAssessment(raw: string): LlmAssessment {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  return {
    qualitativeScore: Math.max(0, Math.min(100, Number(parsed.qualitativeScore ?? 0))),
    reasoning: String(parsed.reasoning ?? ''),
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.map(String) : [],
  };
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
              'Given a creator profile, respond with ONLY a JSON object: ' +
              '{"qualitativeScore": number 0-100, "reasoning": string, "redFlags": string[]}. ' +
              'qualitativeScore reflects brand-safety and campaign fit, not follower count.',
          ),
          new HumanMessage(
            `Creator: ${state.creator.name} (${state.creator.externalHandle}) on ${state.creator.platform}. ` +
              `Followers: ${state.creator.followers}. Avg engagement rate: ${state.creator.avgEngagementRate}.`,
          ),
        ]);
        return typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      });

      return { llmAssessment: parseLlmAssessment(assessment) };
    })
    .addNode('combineScore', async (state) => ({
      finalScore:
        0.6 * (state.heuristic.followersComponent + state.heuristic.engagementComponent) +
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
  };
}
