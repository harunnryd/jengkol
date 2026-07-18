import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AgenciesModule } from './modules/agencies/agencies.module';
import { CreatorsModule } from './modules/creators/creators.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { PlatformIntegrationsModule } from './modules/platform-integrations/platform-integrations.module';
import { VettingModule } from './modules/vetting/vetting.module';
import { ReportingModule } from './modules/reporting/reporting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AgenciesModule,
    CreatorsModule,
    CampaignsModule,
    PlatformIntegrationsModule,
    SubmissionsModule,
    PayoutsModule,
    VettingModule,
    ReportingModule,
  ],
})
export class AppModule {}
