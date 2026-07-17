import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubmissionsService } from './submissions.service';

@Injectable()
export class SubmissionsSyncService {
  private readonly logger = new Logger(SubmissionsSyncService.name);

  constructor(private readonly submissionsService: SubmissionsService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleScheduledSync() {
    this.logger.log('Starting scheduled submission view-count sync');
    await this.submissionsService.syncAllPending();
    this.logger.log('Finished scheduled submission view-count sync');
  }
}
