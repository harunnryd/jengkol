import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { CurrentUserContext } from '@/modules/auth/auth.types';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get(':submissionId')
  findBySubmission(
    @Param('submissionId') submissionId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.payoutsService.findBySubmission(user.agencyId, submissionId);
  }

  @HttpCode(200)
  @Post(':submissionId/recalculate')
  recalculate(
    @Param('submissionId') submissionId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.payoutsService.recalculateOwn(user.agencyId, submissionId);
  }

  @HttpCode(200)
  @Post(':submissionId/mark-paid')
  markPaid(@Param('submissionId') submissionId: string, @CurrentUser() user: CurrentUserContext) {
    return this.payoutsService.markPaid(user.agencyId, submissionId);
  }
}
