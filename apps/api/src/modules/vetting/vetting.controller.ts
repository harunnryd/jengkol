import { Controller, Get, Param, Post } from '@nestjs/common';
import { VettingService } from './vetting.service';

@Controller('vetting')
export class VettingController {
  constructor(private readonly vettingService: VettingService) {}

  @Post('creators/:creatorId/score')
  scoreCreator(@Param('creatorId') creatorId: string) {
    return this.vettingService.scoreCreator(creatorId);
  }

  @Get('creators/:creatorId/history')
  history(@Param('creatorId') creatorId: string) {
    return this.vettingService.history(creatorId);
  }
}
