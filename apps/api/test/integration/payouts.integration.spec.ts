import { Test } from '@nestjs/testing';
import { RateModel } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { PrismaModule } from '@/database/prisma.module';
import { PayoutsModule } from '@/modules/payouts/payouts.module';
import { PayoutsService } from '@/modules/payouts/payouts.service';

describe('PayoutsService (integration, real Postgres)', () => {
  let prisma: PrismaService;
  let payoutsService: PayoutsService;
  let agencyId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, PayoutsModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    payoutsService = moduleRef.get(PayoutsService);

    const agency = await prisma.agency.create({ data: { name: 'Integration Test Agency' } });
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

  it.each([
    {
      description: 'flat campaign pays the flat rate regardless of views',
      rateModel: RateModel.FLAT,
      flatRate: 750_000,
      ratePerView: null,
      views: 999,
      expected: 750_000,
    },
    {
      description: 'per-view campaign multiplies rate by real synced views',
      rateModel: RateModel.PER_VIEW,
      flatRate: null,
      ratePerView: 20,
      views: 5_000,
      expected: 100_000,
    },
  ])('$description', async ({ rateModel, flatRate, ratePerView, views, expected }) => {
    const campaign = await prisma.campaign.create({
      data: {
        agencyId,
        name: 'Integration Campaign',
        budget: 10_000_000,
        rateModel,
        flatRate,
        ratePerView,
      },
    });
    const creator = await prisma.creator.create({
      data: {
        agencyId,
        name: 'Integration Creator',
        type: 'CLIPPER',
        platform: 'YOUTUBE',
        externalHandle: '@integration',
      },
    });
    const submission = await prisma.submission.create({
      data: {
        campaignId: campaign.id,
        creatorId: creator.id,
        contentUrl: 'https://youtube.com/watch?v=integration',
        externalContentId: 'integration',
        views,
      },
    });

    const payout = await payoutsService.recalculate(submission.id);

    expect(payout.amount).toBe(expected);

    const persisted = await prisma.payout.findUnique({ where: { submissionId: submission.id } });
    expect(persisted?.amount).toBe(expected);
  });
});
