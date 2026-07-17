import { Controller, Get, Param, Post } from '@nestjs/common';
import { PayoutsService } from './payouts.service';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get(':submissionId')
  findBySubmission(@Param('submissionId') submissionId: string) {
    return this.payoutsService.findBySubmission(submissionId);
  }

  @Post(':submissionId/recalculate')
  recalculate(@Param('submissionId') submissionId: string) {
    return this.payoutsService.recalculate(submissionId);
  }

  @Post(':submissionId/mark-paid')
  markPaid(@Param('submissionId') submissionId: string) {
    return this.payoutsService.markPaid(submissionId);
  }
}
