import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { VettingController } from './vetting.controller';
import { VettingService } from './vetting.service';

@Module({
  imports: [LlmModule],
  controllers: [VettingController],
  providers: [VettingService],
  exports: [VettingService],
})
export class VettingModule {}
