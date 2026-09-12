import { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../database/prisma.service';
import { MfaSecretsService } from '../auth/mfa-secrets.service';

export async function inspectOrRotateMfaKey(prisma: PrismaService, currentKey: string, nextKey?: string, apply = false) {
  const current = new MfaSecretsService(new ConfigService({ MFA_ENCRYPTION_KEY: currentKey }));
  const next = nextKey ? new MfaSecretsService(new ConfigService({ MFA_ENCRYPTION_KEY: nextKey })) : undefined;
  // Validate even when there are no enrolled users. Never output key material.
  current.decrypt(current.encrypt('validation', 'key-check'), 'key-check');
  if (next) next.decrypt(next.encrypt('validation', 'key-check'), 'key-check');
  if (apply && (!next || nextKey === currentKey)) throw new Error('Rotation requires a different valid next key.');
  return prisma.$transaction(async tx => {
    // Operators must stop all API writers before applying and keep them stopped
    // until every instance is configured with the new key.
    const users = await tx.$queryRaw<Array<{ id: string; mfaSecret: string | null; mfaPendingSecret: string | null }>>`
      SELECT id, "mfaSecret", "mfaPendingSecret" FROM users
      WHERE "mfaSecret" IS NOT NULL OR "mfaPendingSecret" IS NOT NULL ORDER BY id FOR UPDATE`;
    for (const user of users) {
      const active = user.mfaSecret ? current.decrypt(user.mfaSecret, user.id) : null;
      const pending = user.mfaPendingSecret ? current.decrypt(user.mfaPendingSecret, user.id) : null;
      if (apply) await tx.user.update({ where: { id: user.id }, data: { mfaSecret: active ? next!.encrypt(active, user.id) : null, mfaPendingSecret: pending ? next!.encrypt(pending, user.id) : null } });
    }
    if (apply) await tx.securityEvent.create({ data: { type: 'PLATFORM_ACCESS', outcome: 'SUCCESS', targetType: 'MfaEncryptionKey', reason: 'mfa-key.rotated by operator CLI', metadata: { channel: 'operator-cli', accounts: users.length } } });
    return { accountsChecked: users.length, rotated: apply };
  }, { timeout: 60_000 });
}
