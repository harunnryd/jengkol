import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_OWNER_EMAIL = 'demo@jengkol.local';
const SEED_OWNER_PASSWORD = 'password123';

async function main() {
  const agency = await prisma.agency.upsert({
    where: { id: 'seed-agency' },
    update: {},
    create: {
      id: 'seed-agency',
      name: 'Demo Agency',
    },
  });

  await prisma.user.upsert({
    where: { email: SEED_OWNER_EMAIL },
    update: {},
    create: {
      agencyId: agency.id,
      email: SEED_OWNER_EMAIL,
      passwordHash: await bcrypt.hash(SEED_OWNER_PASSWORD, 10),
      role: 'OWNER',
    },
  });

  const creator = await prisma.creator.upsert({
    where: { id: 'seed-creator' },
    update: {},
    create: {
      id: 'seed-creator',
      agencyId: agency.id,
      name: 'Demo Clipper',
      type: 'CLIPPER',
      platform: 'YOUTUBE',
      externalHandle: '@democlipper',
      followers: 25_000,
      avgEngagementRate: 0.04,
    },
  });

  await prisma.campaign.upsert({
    where: { id: 'seed-campaign' },
    update: {},
    create: {
      id: 'seed-campaign',
      agencyId: agency.id,
      name: 'Demo Campaign',
      budget: 10_000_000,
      rateModel: 'PER_VIEW',
      ratePerView: 15,
    },
  });

  console.log(`seeded agency ${agency.id} with creator ${creator.id}`);
  console.log(`log in with ${SEED_OWNER_EMAIL} / ${SEED_OWNER_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
