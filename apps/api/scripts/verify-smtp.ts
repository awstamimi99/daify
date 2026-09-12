import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { environmentSchema } from '../src/common/config/environment';
import { EmailDeliveryService } from '../src/auth/email-delivery.service';

async function main() {
  const result = environmentSchema.validate(process.env, { allowUnknown: true });
  if (result.error) throw new Error('Configuration is incomplete.');
  const service = new EmailDeliveryService(new ConfigService(result.value as Record<string, unknown>));
  await service.verifyConnection();
  process.stdout.write('SMTP connection, TLS policy and authentication passed. No email was sent; inbox delivery and sender verification still require a smoke test.\n');
}
void main().catch(() => { process.stderr.write('SMTP preflight failed. Check environment, provider, TLS and credentials. No credentials are logged.\n'); process.exitCode = 1; });
