import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  PlatformProvider,
  VideoMetrics,
} from '@/modules/platform-integrations/platform-provider.interface';

interface YoutubeVideosListResponse {
  items: Array<{
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      tags?: string[];
    };
    contentDetails?: {
      duration?: string;
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
}

interface YoutubeChannelsListResponse {
  items: Array<{
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
    };
    statistics?: {
      subscriberCount?: string;
      viewCount?: string;
    };
  }>;
}

export interface ChannelStats {
  title?: string;
  description?: string;
  publishedAt?: Date;
  subscriberCount?: number;
  viewCount?: number;
}

/** Parses an ISO 8601 duration (e.g. "PT1H2M3S") into total seconds. */
function parseIso8601Duration(duration: string): number | undefined {
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) {
    return undefined;
  }
  const [, hours, minutes, seconds] = match;
  return Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
}

/**
 * Real YouTube Data API v3 call: https://developers.google.com/youtube/v3/docs/videos/list
 * Works with just an API key — no OAuth needed for public video statistics.
 */
@Injectable()
export class YoutubeProvider implements PlatformProvider {
  constructor(private readonly config: ConfigService) {}

  private getApiKey(): string {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'YOUTUBE_API_KEY is not configured — set it in .env to enable YouTube metric sync',
      );
    }
    return apiKey;
  }

  async getVideoMetrics(externalId: string): Promise<VideoMetrics> {
    const apiKey = this.getApiKey();

    const response = await axios.get<YoutubeVideosListResponse>(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          part: 'snippet,contentDetails,statistics',
          id: externalId,
          key: apiKey,
        },
        timeout: 10_000,
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
      title: video.snippet?.title,
      description: video.snippet?.description,
      publishedAt: video.snippet?.publishedAt ? new Date(video.snippet.publishedAt) : undefined,
      tags: video.snippet?.tags,
      durationSeconds: video.contentDetails?.duration
        ? parseIso8601Duration(video.contentDetails.duration)
        : undefined,
    };
  }

  /**
   * Channel-level stats via https://developers.google.com/youtube/v3/docs/channels/list,
   * keyed by handle (e.g. "@somecreator") — same auth as getVideoMetrics, API key only.
   */
  async getChannelStats(handle: string): Promise<ChannelStats> {
    const apiKey = this.getApiKey();

    const response = await axios.get<YoutubeChannelsListResponse>(
      'https://www.googleapis.com/youtube/v3/channels',
      {
        params: {
          part: 'snippet,statistics',
          forHandle: handle,
          key: apiKey,
        },
        timeout: 10_000,
      },
    );

    const channel = response.data.items[0];
    if (!channel) {
      throw new ServiceUnavailableException(`No YouTube channel found for handle ${handle}`);
    }

    return {
      title: channel.snippet?.title,
      description: channel.snippet?.description,
      publishedAt: channel.snippet?.publishedAt ? new Date(channel.snippet.publishedAt) : undefined,
      subscriberCount: channel.statistics?.subscriberCount
        ? Number(channel.statistics.subscriberCount)
        : undefined,
      viewCount: channel.statistics?.viewCount ? Number(channel.statistics.viewCount) : undefined,
    };
  }
}
