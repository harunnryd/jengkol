import { Module } from '@nestjs/common';
import { PlatformIntegrationsService } from './platform-integrations.service';
import { YoutubeProvider } from './youtube/youtube.provider';
import { TiktokProvider } from './tiktok/tiktok.provider';

@Module({
  providers: [PlatformIntegrationsService, YoutubeProvider, TiktokProvider],
  exports: [PlatformIntegrationsService, YoutubeProvider],
})
export class PlatformIntegrationsModule {}
