import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  PlatformProvider,
  VideoMetrics,
} from '@/modules/platform-integrations/platform-provider.interface';

interface YoutubeVideosListResponse {
  items: Array<{
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
}

/**
 * Real YouTube Data API v3 call: https://developers.google.com/youtube/v3/docs/videos/list
 * Works with just an API key — no OAuth needed for public video statistics.
 */
@Injectable()
export class YoutubeProvider implements PlatformProvider {
  constructor(private readonly config: ConfigService) {}

  async getVideoMetrics(externalId: string): Promise<VideoMetrics> {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'YOUTUBE_API_KEY is not configured — set it in .env to enable YouTube metric sync',
      );
    }

    const response = await axios.get<YoutubeVideosListResponse>(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          part: 'statistics',
          id: externalId,
          key: apiKey,
        },
      },
    );

    const video = response.data.items[0];
    if (!video?.statistics) {
      throw new ServiceUnavailableException(`No YouTube video found for id ${externalId}`);
    }

    return {
      views: Number(video.statistics.viewCount ?? 0),
      likes: Number(video.statistics.likeCount ?? 0),
      comments: Number(video.statistics.commentCount ?? 0),
    };
  }
}
