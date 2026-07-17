import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { calculatePayout } from './payout-calculator';

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySubmission(submissionId: string) {
    const payout = await this.prisma.payout.findUnique({ where: { submissionId } });
    if (!payout) {
      throw new NotFoundException(`Payout for submission ${submissionId} not found`);
    }
    return payout;
  }

  /**
   * Recompute (or create) the payout row for a submission from current campaign
   * rate model + submission view count. Idempotent — safe to call after every view sync.
   */
  async recalculate(submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { campaign: true },
    });
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    const amount = calculatePayout({
      rateModel: submission.campaign.rateModel,
      flatRate: submission.campaign.flatRate,
      ratePerView: submission.campaign.ratePerView,
      views: submission.views,
    });

    return this.prisma.payout.upsert({
      where: { submissionId },
      create: { submissionId, amount },
      update: { amount },
    });
  }

  async markPaid(submissionId: string) {
    await this.findBySubmission(submissionId);
    return this.prisma.payout.update({
      where: { submissionId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }
}
