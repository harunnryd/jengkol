import { Controller, Get, Param } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { CurrentUserContext } from '@/modules/auth/auth.types';

@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('campaigns/:id/summary')
  campaignSummary(@Param('id') id: string, @CurrentUser() user: CurrentUserContext) {
    return this.reportingService.campaignSummary(user.agencyId, id);
  }
}
