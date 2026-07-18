import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '@/app.module';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@auth.e2e.test`;
}

describe('auth (e2e, real Postgres, real HTTP)', () => {
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

  it('registers a new agency + owner and returns a usable token', async () => {
    const server = app.getHttpServer();
    const email = uniqueEmail('register');

    const res = await request(server)
      .post('/auth/register')
      .send({ agencyName: 'Register Test Agency', email, password: 'password123' })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('OWNER');
  });

  it('rejects login with the wrong password', async () => {
    const server = app.getHttpServer();
    const email = uniqueEmail('badlogin');

    await request(server)
      .post('/auth/register')
      .send({ agencyName: 'Bad Login Agency', email, password: 'password123' })
      .expect(201);

    await request(server)
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects a protected endpoint with no token', async () => {
    const server = app.getHttpServer();
    await request(server).get('/creators').expect(401);
  });

  it("a second agency's user cannot read the first agency's creator by id (IDOR closed)", async () => {
    const server = app.getHttpServer();

    const agencyA = await request(server)
      .post('/auth/register')
      .send({ agencyName: 'Tenant A', email: uniqueEmail('tenant-a'), password: 'password123' });
    const agencyB = await request(server)
      .post('/auth/register')
      .send({ agencyName: 'Tenant B', email: uniqueEmail('tenant-b'), password: 'password123' });

    const tokenA = agencyA.body.accessToken;
    const tokenB = agencyB.body.accessToken;

    const creator = await request(server)
      .post('/creators')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Tenant A Creator', type: 'KOL', platform: 'YOUTUBE', externalHandle: '@a' })
      .expect(201);

    await request(server)
      .get(`/creators/${creator.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const ownList = await request(server)
      .get('/creators')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(ownList.body).toEqual([]);

    await request(server)
      .get(`/creators/${creator.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
  });
});
