import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { calculatePayout } from './payout-calculator';

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySubmission(agencyId: string, submissionId: string) {
    const payout = await this.prisma.payout.findFirst({
      where: { submissionId, submission: { campaign: { agencyId } } },
    });
    if (!payout) {
      throw new NotFoundException(`Payout for submission ${submissionId} not found`);
    }
    return payout;
  }

  /**
   * Recompute (or create) the payout row for a submission from current campaign
   * rate model + submission view count. Idempotent — safe to call after every view sync.
   * Accepts an optional Prisma transaction client so callers (e.g. SubmissionsService's
   * view-sync flow) can run the view update and the payout recalculation atomically.
   */
  async recalculate(submissionId: string, client: PrismaClientOrTx = this.prisma) {
    const submission = await client.submission.findUnique({
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

    return client.payout.upsert({
      where: { submissionId },
      create: { submissionId, amount },
      update: { amount },
    });
  }

  /** Agency-scoped entry point for the HTTP endpoint — verifies ownership before recalculating. */
  async recalculateOwn(agencyId: string, submissionId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId, campaign: { agencyId } },
    });
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    return this.recalculate(submissionId);
  }

  async markPaid(agencyId: string, submissionId: string) {
    await this.findBySubmission(agencyId, submissionId);
    return this.prisma.payout.update({
      where: { submissionId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }
}
