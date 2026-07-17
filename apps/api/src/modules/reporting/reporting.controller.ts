import { Controller, Get, Param } from '@nestjs/common';
import { ReportingService } from './reporting.service';

@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('campaigns/:id/summary')
  campaignSummary(@Param('id') id: string) {
    return this.reportingService.campaignSummary(id);
  }
}
