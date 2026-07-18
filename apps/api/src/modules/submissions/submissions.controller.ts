import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { CurrentUserContext } from '@/modules/auth/auth.types';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  create(@Body() dto: CreateSubmissionDto, @CurrentUser() user: CurrentUserContext) {
    return this.submissionsService.create(user.agencyId, dto);
  }

  @Get()
  findAll(
    @Query('campaignId') campaignId: string | undefined,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.submissionsService.findAll(user.agencyId, campaignId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserContext) {
    return this.submissionsService.findOne(user.agencyId, id);
  }

  @HttpCode(200)
  @Post(':id/sync')
  syncMetrics(@Param('id') id: string, @CurrentUser() user: CurrentUserContext) {
    return this.submissionsService.syncMetrics(id, user.agencyId);
  }
}
