import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { LlmRouterService } from '../llm/llm-router.service';
import { runVettingAgent } from './vetting-agent.graph';

@Injectable()
export class VettingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmRouter: LlmRouterService,
  ) {}

  async scoreCreator(agencyId: string, creatorId: string) {
    const creator = await this.prisma.creator.findFirst({ where: { id: creatorId, agencyId } });
    if (!creator) {
      throw new NotFoundException(`Creator ${creatorId} not found`);
    }

    // Enough recent history for a stable per-creator average without an unbounded scan.
    const submissions = await this.prisma.submission.findMany({
      where: { creatorId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const avgViewsPerSubmission =
      submissions.length > 0
        ? submissions.reduce((sum, s) => sum + s.views, 0) / submissions.length
        : 0;

    const viewsToSubscriberRatio =
      creator.subscriberCount && creator.subscriberCount > 0
        ? avgViewsPerSubmission / creator.subscriberCount
        : null;

    const channelAgeInDays = creator.channelPublishedAt
      ? Math.floor((Date.now() - creator.channelPublishedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const recentSubmissions = submissions.slice(0, 3).map((s) => ({
      title: s.title ?? '(no title synced yet)',
      description: (s.description ?? '').slice(0, 300),
    }));

    const result = await runVettingAgent(this.llmRouter, {
      name: creator.name,
      externalHandle: creator.externalHandle,
      platform: creator.platform,
      followers: creator.followers ?? 0,
      avgEngagementRate: creator.avgEngagementRate ?? 0,
      niche: creator.niche,
      subscriberCount: creator.subscriberCount ?? 0,
      channelViewCount: creator.channelViewCount ? Number(creator.channelViewCount) : 0,
      channelAgeInDays,
      avgViewsPerSubmission,
      viewsToSubscriberRatio,
      recentSubmissions,
    });

    return this.prisma.creatorScore.create({
      data: {
        creatorId,
        score: result.score,
        breakdown: {
          heuristic: result.heuristic,
          llmAssessment: result.llmAssessment,
          contextUsed: result.contextUsed,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async history(agencyId: string, creatorId: string) {
    const creator = await this.prisma.creator.findFirst({ where: { id: creatorId, agencyId } });
    if (!creator) {
      throw new NotFoundException(`Creator ${creatorId} not found`);
    }
    return this.prisma.creatorScore.findMany({
      where: { creatorId },
      orderBy: { computedAt: 'desc' },
    });
  }
}
