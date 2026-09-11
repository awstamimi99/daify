import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client';

const ids = {
  user: '00000000-0000-4000-8000-000000000001',
  organization: '00000000-0000-4000-8000-000000000002',
  membership: '00000000-0000-4000-8000-000000000003',
  location: '00000000-0000-4000-8000-000000000004',
  menu: '00000000-0000-4000-8000-000000000005',
  section: '00000000-0000-4000-8000-000000000006',
  item: '00000000-0000-4000-8000-000000000007',
  theme: '00000000-0000-4000-8000-000000000008',
};

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seed is disabled in production.');
  }
  if (process.env.ALLOW_DEV_SEED !== 'true') {
    throw new Error('Set ALLOW_DEV_SEED=true to run the development seed.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    const passwordHash = await argon2.hash('ChangeMeBeforeUse!');
    await prisma.user.upsert({
      where: { id: ids.user },
      update: {},
      create: {
        id: ids.user,
        email: 'owner@daify.local',
        displayName: 'DAIFY Owner',
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.organization.upsert({
      where: { id: ids.organization },
      update: {},
      create: { id: ids.organization, name: 'DAIFY Demo', slug: 'daify-demo' },
    });
    await prisma.organizationMember.upsert({
      where: { id: ids.membership },
      update: {},
      create: {
        id: ids.membership,
        organizationId: ids.organization,
        userId: ids.user,
        role: 'OWNER',
        status: 'ACTIVE',
        allLocations: true,
        acceptedAt: new Date(),
      },
    });
    await prisma.location.upsert({
      where: { id: ids.location },
      update: {},
      create: {
        id: ids.location,
        organizationId: ids.organization,
        name: 'DAIFY Demo Restaurant',
        slug: 'demo-restaurant',
        timezone: 'Asia/Kuwait',
        currency: 'KWD',
        defaultLanguage: 'ar',
      },
    });
    await prisma.menu.upsert({
      where: { id: ids.menu },
      update: {},
      create: {
        id: ids.menu,
        locationId: ids.location,
        name: 'Demo Menu',
        slug: 'demo-menu',
        defaultLanguage: 'ar',
        supportedLanguages: ['ar', 'en'],
      },
    });
    await prisma.menuSection.upsert({
      where: { id: ids.section },
      update: {},
      create: {
        id: ids.section,
        menuId: ids.menu,
        stableKey: 'featured',
        position: 0,
      },
    });
    await prisma.menuItem.upsert({
      where: { id: ids.item },
      update: {},
      create: {
        id: ids.item,
        sectionId: ids.section,
        stableKey: 'demo-item',
        position: 0,
        price: '4.500',
        currency: 'KWD',
        allergens: [],
        dietaryTags: [],
      },
    });
    await prisma.theme.upsert({
      where: { menuId: ids.menu },
      update: {},
      create: {
        id: ids.theme,
        menuId: ids.menu,
        templateKey: 'classic-grid',
        tokens: { accent: '#9f1723' },
        layout: { family: 'classic' },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

void seed();
