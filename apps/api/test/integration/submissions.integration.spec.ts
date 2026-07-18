import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { PrismaModule } from '@/database/prisma.module';
import { validateEnv } from '@/config/env.validation';
import { SubmissionsModule } from '@/modules/submissions/submissions.module';
import { SubmissionsService } from '@/modules/submissions/submissions.service';
import { PlatformIntegrationsService } from '@/modules/platform-integrations/platform-integrations.service';

describe('SubmissionsService.syncMetrics (integration, real Postgres, fake platform provider)', () => {
  let prisma: PrismaService;
  let submissionsService: SubmissionsService;
  let agencyId: string;

  const fakePlatformIntegrations = {
    getVideoMetrics: jest.fn().mockResolvedValue({ views: 42_000, likes: 1_200, comments: 80 }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
        SubmissionsModule,
      ],
    })
      .overrideProvider(PlatformIntegrationsService)
      .useValue(fakePlatformIntegrations)
      .compile();

    prisma = moduleRef.get(PrismaService);
    submissionsService = moduleRef.get(SubmissionsService);

    const agency = await prisma.agency.create({ data: { name: 'Sync Test Agency' } });
    agencyId = agency.id;
  });

  afterAll(async () => {
    await prisma.payout.deleteMany({ where: { submission: { campaign: { agencyId } } } });
    await prisma.submission.deleteMany({ where: { campaign: { agencyId } } });
    await prisma.campaign.deleteMany({ where: { agencyId } });
    await prisma.creator.deleteMany({ where: { agencyId } });
    await prisma.agency.deleteMany({ where: { id: agencyId } });
    await prisma.$disconnect();
  });

  it('refreshes views from the platform provider and recalculates the payout', async () => {
    const campaign = await prisma.campaign.create({
      data: {
        agencyId,
        name: 'Sync Campaign',
        budget: 5_000_000,
        rateModel: 'PER_VIEW',
        ratePerView: 10,
      },
    });
    const creator = await prisma.creator.create({
      data: {
        agencyId,
        name: 'Sync Creator',
        type: 'CLIPPER',
        platform: 'YOUTUBE',
        externalHandle: '@sync',
      },
    });
    const submission = await prisma.submission.create({
      data: {
        campaignId: campaign.id,
        creatorId: creator.id,
        contentUrl: 'https://youtube.com/watch?v=sync',
        externalContentId: 'sync',
      },
    });

    const payout = await submissionsService.syncMetrics(submission.id);

    const updatedSubmission = await prisma.submission.findUnique({ where: { id: submission.id } });
    expect(updatedSubmission?.views).toBe(42_000);
    expect(updatedSubmission?.lastSyncedAt).not.toBeNull();
    expect(payout.amount).toBe(420_000);
    expect(fakePlatformIntegrations.getVideoMetrics).toHaveBeenCalledWith('YOUTUBE', 'sync');
  });

  it('records a metric snapshot on every sync, and captures video metadata only once', async () => {
    const campaign = await prisma.campaign.create({
      data: {
        agencyId,
        name: 'Snapshot Campaign',
        budget: 5_000_000,
        rateModel: 'PER_VIEW',
        ratePerView: 10,
      },
    });
    const creator = await prisma.creator.create({
      data: {
        agencyId,
        name: 'Snapshot Creator',
        type: 'CLIPPER',
        platform: 'YOUTUBE',
        externalHandle: '@snapshot',
      },
    });
    const submission = await prisma.submission.create({
      data: {
        campaignId: campaign.id,
        creatorId: creator.id,
        contentUrl: 'https://youtube.com/watch?v=snapshot',
        externalContentId: 'snapshot',
      },
    });

    fakePlatformIntegrations.getVideoMetrics.mockResolvedValueOnce({
      views: 100,
      likes: 10,
      comments: 1,
      title: 'First title',
      description: 'First description',
    });
    await submissionsService.syncMetrics(submission.id);

    fakePlatformIntegrations.getVideoMetrics.mockResolvedValueOnce({
      views: 200,
      likes: 20,
      comments: 2,
      title: 'Changed title (should be ignored on second sync)',
      description: 'Changed description',
    });
    await submissionsService.syncMetrics(submission.id);

    const snapshots = await prisma.submissionMetricSnapshot.findMany({
      where: { submissionId: submission.id },
      orderBy: { capturedAt: 'asc' },
    });
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].views).toBe(100);
    expect(snapshots[1].views).toBe(200);

    const updated = await prisma.submission.findUnique({ where: { id: submission.id } });
    expect(updated?.views).toBe(200);
    expect(updated?.title).toBe('First title');
  });
});
