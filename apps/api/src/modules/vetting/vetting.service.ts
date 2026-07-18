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

    const result = await runVettingAgent(this.llmRouter, {
      name: creator.name,
      externalHandle: creator.externalHandle,
      platform: creator.platform,
      followers: creator.followers ?? 0,
      avgEngagementRate: creator.avgEngagementRate ?? 0,
    });

    return this.prisma.creatorScore.create({
      data: {
        creatorId,
        score: result.score,
        breakdown: {
          heuristic: result.heuristic,
          llmAssessment: result.llmAssessment,
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
