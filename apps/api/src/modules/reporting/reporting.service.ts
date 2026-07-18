import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phase 1 data, exposed as a client-facing rollup — becomes the Phase 4
   * white-label deliverable once branding/access-control is layered on top.
   */
  async campaignSummary(agencyId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, agencyId },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const submissions = await this.prisma.submission.findMany({
      where: { campaignId },
      include: { payout: true, creator: true },
    });

    const totalViews = submissions.reduce((sum, s) => sum + s.views, 0);
    const totalSpend = submissions.reduce((sum, s) => sum + (s.payout?.amount ?? 0), 0);

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      budget: campaign.budget,
      totalViews,
      totalSpend,
      remainingBudget: campaign.budget - totalSpend,
      perCreator: submissions.map((s) => ({
        creatorId: s.creatorId,
        creatorName: s.creator.name,
        views: s.views,
        payoutAmount: s.payout?.amount ?? 0,
        payoutStatus: s.payout?.status ?? 'PENDING',
      })),
    };
  }
}
