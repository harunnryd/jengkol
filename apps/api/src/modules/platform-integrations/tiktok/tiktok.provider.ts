import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  PlatformProvider,
  VideoMetrics,
} from '@/modules/platform-integrations/platform-provider.interface';

interface TiktokVideoQueryResponse {
  data: {
    videos: Array<{
      id: string;
      view_count?: number;
      like_count?: number;
      comment_count?: number;
    }>;
  };
  error: {
    code: string;
    message: string;
  };
}

/**
 * Real TikTok Display API v2 call: https://developers.tiktok.com/doc/display-api-get-video-list/
 *
 * There is no public "any video by URL" endpoint on TikTok. This endpoint only returns
 * stats for videos owned by the user who completed OAuth login to this app — so every
 * clipper/creator submitting TikTok content must first connect their TikTok account,
 * and `accessToken` below is *their* user access token, not an app-level secret.
 */
@Injectable()
export class TiktokProvider implements PlatformProvider {
  constructor(private readonly config: ConfigService) {}

  async getVideoMetrics(externalId: string, accessToken?: string): Promise<VideoMetrics> {
    const clientKey = this.config.get<string>('TIKTOK_CLIENT_KEY');
    if (!clientKey) {
      throw new ServiceUnavailableException(
        'TIKTOK_CLIENT_KEY is not configured — register an app at developers.tiktok.com',
      );
    }
    if (!accessToken) {
      throw new BadRequestException(
        'TikTok metrics require the creator to have connected their TikTok account (OAuth) — no access token on file',
      );
    }

    const response = await axios.post<TiktokVideoQueryResponse>(
      'https://open.tiktokapis.com/v2/video/query/',
      { filters: { video_ids: [externalId] } },
      {
        params: { fields: 'id,view_count,like_count,comment_count' },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const video = response.data.data?.videos?.[0];
    if (!video) {
      throw new ServiceUnavailableException(`No TikTok video found for id ${externalId}`);
    }

    return {
      views: video.view_count ?? 0,
      likes: video.like_count ?? 0,
      comments: video.comment_count ?? 0,
    };
  }
}
