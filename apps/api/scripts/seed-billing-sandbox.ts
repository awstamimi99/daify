import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { templateKeys } from '@daify/menu-engine';
import { PrismaService } from '../src/database/prisma.service';

async function main() {
  if (!['test', 'development'].includes(process.env.NODE_ENV ?? '') || process.env.BILLING_MODE !== 'sandbox' || process.env.ALLOW_DEV_SEED !== 'true') throw new Error('Sandbox fixtures require NODE_ENV=test/development, BILLING_MODE=sandbox and ALLOW_DEV_SEED=true.');
  const prisma = new PrismaService(new ConfigService());
  const plans = [
    { code: 'starter-sandbox', name: 'Starter · Sandbox', nameAr: 'بداية · تجريبي', amount: '3.000', limits: { locations: 1, menus: 1, members: 2, templates: ['atelier', 'verde', 'souk'], publishing: true } },
    { code: 'pro-sandbox', name: 'Pro · Sandbox', nameAr: 'احترافي · تجريبي', amount: '5.000', limits: { locations: 1, menus: 3, members: 5, templates: [...templateKeys], publishing: true } },
    { code: 'business-sandbox', name: 'Business · Sandbox', nameAr: 'أعمال · تجريبي', amount: '15.000', limits: { locations: 5, menus: 20, members: 20, templates: [...templateKeys], publishing: true } },
  ];
  try {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(6062026)::text`;
      for (const data of plans) {
        if (await tx.billingPlan.findUnique({ where: { code_version: { code: data.code, version: 1 } } })) continue;
        const plan = await tx.billingPlan.create({ data: { ...data, version: 1 } });
        await tx.securityEvent.create({ data: { type: 'BILLING_UPDATED', outcome: 'SUCCESS', targetType: 'BillingPlan', targetId: plan.id, reason: 'Explicit sandbox fixture installation', metadata: { action: 'plan.seeded', code: data.code, version: 1 } } });
      }
    });
    console.log('Sandbox plans installed. Existing workspaces were not enrolled.');
  } finally { await prisma.$disconnect(); }
}
void main();
