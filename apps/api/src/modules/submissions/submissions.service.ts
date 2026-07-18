import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PlatformIntegrationsService } from '@/modules/platform-integrations/platform-integrations.service';
import { PayoutsService } from '@/modules/payouts/payouts.service';
import { PaginationQueryDto, buildPaginationMeta } from '@/common/dto/pagination-query.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformIntegrations: PlatformIntegrationsService,
    private readonly payouts: PayoutsService,
  ) {}

  async create(agencyId: string, dto: CreateSubmissionDto) {
    const [campaign, creator] = await Promise.all([
      this.prisma.campaign.findFirst({ where: { id: dto.campaignId, agencyId } }),
      this.prisma.creator.findFirst({ where: { id: dto.creatorId, agencyId } }),
    ]);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${dto.campaignId} not found`);
    }
    if (!creator) {
      throw new NotFoundException(`Creator ${dto.creatorId} not found`);
    }

    return this.prisma.submission.create({ data: dto });
  }

  async findAll(agencyId: string, pagination: PaginationQueryDto, campaignId?: string) {
    const where = {
      campaign: { agencyId },
      ...(campaignId ? { campaignId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: { payout: true, creator: true },
      }),
      this.prisma.submission.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(pagination, total) };
  }

  async findOne(agencyId: string, id: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { id, campaign: { agencyId } },
    });
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
   * Refresh view/like/comment counts from the source platform and recompute the payout,
   * in a single transaction so a crash between the two writes can't leave a stale payout.
   * Called by the scheduled sync job (no agencyId, internal) and by the guarded HTTP
   * endpoint (agencyId required, enforces tenant ownership).
   */
  async syncMetrics(submissionId: string, agencyId?: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { creator: true, campaign: true },
    });
    if (!submission || (agencyId && submission.campaign.agencyId !== agencyId)) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    const metrics = await this.platformIntegrations.getVideoMetrics(
      submission.creator.platform,
      submission.externalContentId,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.submission.update({
        where: { id: submissionId },
        data: {
          views: metrics.views,
          likes: metrics.likes,
          comments: metrics.comments,
          lastSyncedAt: new Date(),
          // Content metadata doesn't change after upload — only persist it once. Gated on
          // `title` (not `publishedAt`) so a sync that got a title but not a parseable
          // publishedAt doesn't re-fetch metadata forever.
          ...(submission.title === null
            ? {
                title: metrics.title,
                description: metrics.description,
                publishedAt: metrics.publishedAt,
                durationSeconds: metrics.durationSeconds,
                tags: metrics.tags ?? [],
              }
            : {}),
        },
      });

      await tx.submissionMetricSnapshot.create({
        data: {
          submissionId,
          views: metrics.views,
          likes: metrics.likes,
          comments: metrics.comments,
        },
      });

      return this.payouts.recalculate(submissionId, tx);
    });
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
