import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { MfaSecretsService } from '../src/auth/mfa-secrets.service';
import { promotePlatformAdmin } from '../src/platform/promote-platform-admin';

async function main() {
  const email = process.argv[2];
  if (!email || process.argv.length !== 3) throw new Error('Usage: npm run admin:promote --workspace @daify/api -- user@example.com');
  const config = new ConfigService(process.env);
  const prisma = new PrismaService(config);
  try {
    const candidate = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (candidate?.mfaSecret) new MfaSecretsService(config).decrypt(candidate.mfaSecret, candidate.id);
    await promotePlatformAdmin(prisma, email);
    process.stdout.write('Platform access granted. Existing sessions revoked; sign in again with MFA.\n');
  } finally { await prisma.$disconnect(); }
}
void main().catch((error: unknown) => { process.stderr.write(error instanceof Error ? `${error.message}\n` : 'Promotion failed.\n'); process.exitCode = 1; });
