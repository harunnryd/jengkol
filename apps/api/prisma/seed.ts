import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const agency = await prisma.agency.upsert({
    where: { id: 'seed-agency' },
    update: {},
    create: {
      id: 'seed-agency',
      name: 'Demo Agency',
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
