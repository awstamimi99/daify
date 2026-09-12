import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { inspectOrRotateMfaKey } from '../src/platform/mfa-key-rotation';

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--apply')) throw new Error('Usage: npm run mfa:key --workspace @daify/api -- [--apply]');
  const apply = args[0] === '--apply';
  if (apply && process.env.MFA_ROTATION_MAINTENANCE !== 'true') throw new Error('Stop all API writers, back up the database and keys, then set MFA_ROTATION_MAINTENANCE=true to apply.');
  const prisma = new PrismaService(new ConfigService(process.env));
  try { process.stdout.write(`${JSON.stringify(await inspectOrRotateMfaKey(prisma, process.env.MFA_ENCRYPTION_KEY ?? '', process.env.MFA_NEXT_ENCRYPTION_KEY, apply))}\n`); }
  finally { await prisma.$disconnect(); }
}
void main().catch(() => { process.stderr.write('MFA key check/rotation failed. Verify command arguments, maintenance mode, database access and configured keys. No key material is logged.\n'); process.exitCode = 1; });
