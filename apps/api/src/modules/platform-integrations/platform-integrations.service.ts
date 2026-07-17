import { Injectable, BadRequestException } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { PlatformProvider, VideoMetrics } from './platform-provider.interface';
import { YoutubeProvider } from './youtube/youtube.provider';
import { TiktokProvider } from './tiktok/tiktok.provider';

@Injectable()
export class PlatformIntegrationsService {
  constructor(
    private readonly youtubeProvider: YoutubeProvider,
    private readonly tiktokProvider: TiktokProvider,
  ) {}

  private resolveProvider(platform: Platform): PlatformProvider {
    switch (platform) {
      case Platform.YOUTUBE:
        return this.youtubeProvider;
      case Platform.TIKTOK:
        return this.tiktokProvider;
      default:
        throw new BadRequestException(`No provider wired up for platform ${platform}`);
    }
  }

  getVideoMetrics(
    platform: Platform,
    externalId: string,
    accessToken?: string,
  ): Promise<VideoMetrics> {
    return this.resolveProvider(platform).getVideoMetrics(externalId, accessToken);
  }
}
