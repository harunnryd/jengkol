import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '@/app.module';

async function registerAndGetToken(
  server: Parameters<typeof request>[0],
  agencyName: string,
): Promise<string> {
  const email = `${agencyName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}-${Math.random().toString(36).slice(2)}@e2e.test`;
  const res = await request(server)
    .post('/auth/register')
    .send({ agencyName, email, password: 'password123' })
    .expect(201);
  return res.body.accessToken;
}

describe('golden path (e2e, real Postgres, real HTTP)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('agency -> creator -> campaign -> submission -> payout -> reporting', async () => {
    const server = app.getHttpServer();
    const token = await registerAndGetToken(server, 'E2E Agency');
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

    const creator = await auth(request(server).post('/creators'))
      .send({
        name: 'E2E Creator',
        type: 'CLIPPER',
        platform: 'YOUTUBE',
        externalHandle: '@e2e',
        followers: 50_000,
        avgEngagementRate: 0.05,
      })
      .expect(201);

    const campaign = await auth(request(server).post('/campaigns'))
      .send({
        name: 'E2E Campaign',
        budget: 10_000_000,
        rateModel: 'PER_VIEW',
        ratePerView: 15,
      })
      .expect(201);

    const submission = await auth(request(server).post('/submissions'))
      .send({
        campaignId: campaign.body.id,
        creatorId: creator.body.id,
        contentUrl: 'https://youtube.com/watch?v=e2e',
        externalContentId: 'e2e',
      })
      .expect(201);

    await auth(request(server).post(`/payouts/${submission.body.id}/recalculate`))
      .expect(200)
      .expect((res: request.Response) => expect(res.body.amount).toBe(0));

    const summary = await auth(
      request(server).get(`/reporting/campaigns/${campaign.body.id}/summary`),
    ).expect(200);

    expect(summary.body.campaignId).toBe(campaign.body.id);
    expect(summary.body.perCreator).toHaveLength(1);
    expect(summary.body.perCreator[0].creatorId).toBe(creator.body.id);
  });

  it('rejects a submission sync when no platform credentials are configured (honest failure, no fake data)', async () => {
    const server = app.getHttpServer();
    const token = await registerAndGetToken(server, 'E2E No-Key Agency');
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

    const creator = await auth(request(server).post('/creators')).send({
      name: 'No Key Creator',
      type: 'CLIPPER',
      platform: 'YOUTUBE',
      externalHandle: '@nokey',
    });
    const campaign = await auth(request(server).post('/campaigns')).send({
      name: 'No Key Campaign',
      budget: 1_000_000,
      rateModel: 'FLAT',
      flatRate: 100_000,
    });
    const submission = await auth(request(server).post('/submissions')).send({
      campaignId: campaign.body.id,
      creatorId: creator.body.id,
      contentUrl: 'https://youtube.com/watch?v=nokey',
      externalContentId: 'nokey',
    });

    await auth(request(server).post(`/submissions/${submission.body.id}/sync`)).expect(503);
  });
});
