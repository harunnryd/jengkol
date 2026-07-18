import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Platform } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { YoutubeProvider } from '@/modules/platform-integrations/youtube/youtube.provider';

/**
 * Refreshes channel-level stats (subscriber count, channel view count, channel age) for
 * YouTube creators. Daily, not every 30 minutes like the submission sync — channel-level
 * numbers don't move fast enough to justify more. TikTok is skipped entirely: its Display
 * API has no channel-lookup path without a creator's OAuth token, which this codebase
 * doesn't collect yet (see docs/platform-integrations.md).
 */
@Injectable()
export class CreatorProfileSyncService {
  private readonly logger = new Logger(CreatorProfileSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youtubeProvider: YoutubeProvider,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleScheduledSync() {
    this.logger.log('Starting scheduled creator profile sync');
    await this.syncAllYoutubeCreators();
    this.logger.log('Finished scheduled creator profile sync');
  }

  async syncAllYoutubeCreators() {
    const creators = await this.prisma.creator.findMany({ where: { platform: Platform.YOUTUBE } });
    for (const creator of creators) {
      try {
        await this.syncOne(creator.id, creator.externalHandle);
      } catch (error) {
        this.logger.warn(
          `Failed to sync channel profile for creator ${creator.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async syncOne(creatorId: string, handle: string) {
    const stats = await this.youtubeProvider.getChannelStats(handle);
    await this.prisma.creator.update({
      where: { id: creatorId },
      data: {
        channelTitle: stats.title,
        channelDescription: stats.description,
        channelPublishedAt: stats.publishedAt,
        subscriberCount: stats.subscriberCount,
        channelViewCount: stats.viewCount,
        lastProfileSyncAt: new Date(),
      },
    });
  }
}
