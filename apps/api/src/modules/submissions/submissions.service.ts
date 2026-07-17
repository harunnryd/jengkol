import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PlatformIntegrationsService } from '@/modules/platform-integrations/platform-integrations.service';
import { PayoutsService } from '@/modules/payouts/payouts.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformIntegrations: PlatformIntegrationsService,
    private readonly payouts: PayoutsService,
  ) {}

  create(dto: CreateSubmissionDto) {
    return this.prisma.submission.create({ data: dto });
  }

  findAll(campaignId?: string) {
    return this.prisma.submission.findMany({
      where: campaignId ? { campaignId } : undefined,
    });
  }

  async findOne(id: string) {
    const submission = await this.prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }
    return submission;
  }

  findAllPending() {
    return this.prisma.submission.findMany({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      include: { creator: true },
    });
  }

  /**
   * Refresh view/like/comment counts from the source platform and recompute the payout.
   * Called by the scheduled sync job and can also be triggered manually per submission.
   */
  async syncMetrics(submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { creator: true },
    });
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    const metrics = await this.platformIntegrations.getVideoMetrics(
      submission.creator.platform,
      submission.externalContentId,
    );

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        lastSyncedAt: new Date(),
      },
    });

    return this.payouts.recalculate(submissionId);
  }

  async syncAllPending() {
    const pending = await this.findAllPending();
    for (const submission of pending) {
      try {
        await this.syncMetrics(submission.id);
      } catch (error) {
        this.logger.warn(`Failed to sync submission ${submission.id}: ${(error as Error).message}`);
      }
    }
  }
}
