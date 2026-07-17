import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  create(@Body() dto: CreateSubmissionDto) {
    return this.submissionsService.create(dto);
  }

  @Get()
  findAll(@Query('campaignId') campaignId?: string) {
    return this.submissionsService.findAll(campaignId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.submissionsService.findOne(id);
  }

  @Post(':id/sync')
  syncMetrics(@Param('id') id: string) {
    return this.submissionsService.syncMetrics(id);
  }
}
