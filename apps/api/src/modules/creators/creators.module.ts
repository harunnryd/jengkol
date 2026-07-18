import { Module } from '@nestjs/common';
import { PlatformIntegrationsModule } from '@/modules/platform-integrations/platform-integrations.module';
import { CreatorsController } from './creators.controller';
import { CreatorsService } from './creators.service';
import { CreatorProfileSyncService } from './creator-profile-sync.service';

@Module({
  imports: [PlatformIntegrationsModule],
  controllers: [CreatorsController],
  providers: [CreatorsService, CreatorProfileSyncService],
  exports: [CreatorsService],
})
export class CreatorsModule {}
