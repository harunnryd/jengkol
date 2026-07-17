import { Module } from '@nestjs/common';
import { PlatformIntegrationsModule } from '@/modules/platform-integrations/platform-integrations.module';
import { PayoutsModule } from '@/modules/payouts/payouts.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { SubmissionsSyncService } from './submissions-sync.service';

@Module({
  imports: [PlatformIntegrationsModule, PayoutsModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionsSyncService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
