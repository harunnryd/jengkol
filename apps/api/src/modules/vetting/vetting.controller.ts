import { Controller, Get, Param, Post } from '@nestjs/common';
import { VettingService } from './vetting.service';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { CurrentUserContext } from '@/modules/auth/auth.types';

@Controller('vetting')
export class VettingController {
  constructor(private readonly vettingService: VettingService) {}

  @Post('creators/:creatorId/score')
  scoreCreator(@Param('creatorId') creatorId: string, @CurrentUser() user: CurrentUserContext) {
    return this.vettingService.scoreCreator(user.agencyId, creatorId);
  }

  @Get('creators/:creatorId/history')
  history(@Param('creatorId') creatorId: string, @CurrentUser() user: CurrentUserContext) {
    return this.vettingService.history(user.agencyId, creatorId);
  }
}
