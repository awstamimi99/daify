import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { MfaSecretsService } from '../src/auth/mfa-secrets.service';
import { inspectOrRotateMfaKey } from '../src/platform/mfa-key-rotation';

describe('MFA key recovery and rotation', () => {
  const prisma = new PrismaService(new ConfigService(process.env));
  const oldKey = Buffer.alloc(32, 7).toString('base64');
  const nextKey = Buffer.alloc(32, 9).toString('base64');
  const old = new MfaSecretsService(new ConfigService({ MFA_ENCRYPTION_KEY: oldKey }));
  const next = new MfaSecretsService(new ConfigService({ MFA_ENCRYPTION_KEY: nextKey }));
  let id: string;
  beforeEach(async () => {
    // Isolate the all-account operator test from other disposable fixtures.
    await prisma.user.updateMany({ data: { mfaSecret: null, mfaPendingSecret: null } });
    const user = await prisma.user.create({ data: { email: `key-${randomUUID()}@example.com`, passwordHash: 'unused-test' } }); id = user.id;
    await prisma.user.update({ where: { id }, data: { mfaSecret: old.encrypt('JBSWY3DPEHPK3PXP', id), mfaPendingSecret: old.encrypt('JBSWY3DPEHPK3PXP', id) } });
  });
  afterEach(async () => { await prisma.user.delete({ where: { id } }); });
  afterAll(async () => { await prisma.$disconnect(); });
  it('checks without mutation, rotates active and pending secrets atomically, and verifies the restored key', async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(await inspectOrRotateMfaKey(prisma, oldKey)).toEqual({ accountsChecked: 1, rotated: false });
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).mfaSecret).toBe(before.mfaSecret);
    await inspectOrRotateMfaKey(prisma, oldKey, nextKey, true);
    const after = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(next.decrypt(after.mfaSecret!, id)).toBe('JBSWY3DPEHPK3PXP');
    expect(next.decrypt(after.mfaPendingSecret!, id)).toBe('JBSWY3DPEHPK3PXP');
    expect(() => old.decrypt(after.mfaSecret!, id)).toThrow();
    expect((await inspectOrRotateMfaKey(prisma, nextKey)).accountsChecked).toBe(1);
    await expect(inspectOrRotateMfaKey(prisma, oldKey, nextKey, true)).rejects.toThrow();
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).mfaSecret).toBe(after.mfaSecret);
  });
});
