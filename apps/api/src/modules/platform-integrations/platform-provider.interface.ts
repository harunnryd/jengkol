export interface VideoMetrics {
  views: number;
  likes: number;
  comments: number;
  /** Content metadata, when the platform's API returns it in the same call (YouTube). Undefined otherwise. */
  title?: string;
  description?: string;
  publishedAt?: Date;
  durationSeconds?: number;
  tags?: string[];
}

export interface PlatformProvider {
  /**
   * Fetch current metrics for a single piece of content.
   * @param externalId platform-native content id (YouTube video id, TikTok video id, ...)
   * @param accessToken required for platforms whose API is OAuth-gated (e.g. TikTok);
   *   undefined for platforms that accept an app-level API key (e.g. YouTube).
   */
  getVideoMetrics(externalId: string, accessToken?: string): Promise<VideoMetrics>;
}

export const PLATFORM_PROVIDER_FACTORY = Symbol('PLATFORM_PROVIDER_FACTORY');
