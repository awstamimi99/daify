import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { AuthorizationService } from '../src/authorization/authorization.service';
import { AnalyticsService } from '../src/analytics/analytics.service';

async function main() {
  if (!['development', 'test'].includes(process.env.NODE_ENV ?? '') || process.env.ANALYTICS_MODE !== 'local') throw new Error('Explicit local development/test analytics mode is required.');
  const prisma = new PrismaService(new ConfigService());
  try {
    const analytics = new AnalyticsService(prisma, new ConfigService(), new AuthorizationService(prisma));
    let count = 0;
    for (let i = 0; i < 10; i++) { const batch = await analytics.aggregate(); count += batch; if (batch < 250) break; }
    console.log(JSON.stringify({ processed: count }));
  } finally { await prisma.$disconnect(); }
}
void main();
