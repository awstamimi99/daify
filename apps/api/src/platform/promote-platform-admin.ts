import type { PrismaService } from '../database/prisma.service';

// Operator-only utility. Never expose this through a tenant or public HTTP endpoint.
export async function promotePlatformAdmin(prisma: PrismaService, email: string) {
  return prisma.$transaction(async tx => {
    const candidate = await tx.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!candidate) throw new Error('Account was not found.');
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${candidate.id}::uuid FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: candidate.id } });
    if (user.status !== 'ACTIVE' || !user.emailVerifiedAt || !user.mfaSecret?.startsWith('v1.') || user.mfaRecoveryHashes.length === 0) throw new Error('A verified, active account with confirmed encrypted MFA and unused recovery codes is required.');
    await tx.user.update({ where: { id: user.id }, data: { platformAdmin: true, mfaPendingSecret: null, mfaPendingSessionId: null, mfaPendingExpiresAt: null } });
    await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.securityEvent.create({ data: { type: 'PLATFORM_ACCESS', targetType: 'User', targetId: user.id, outcome: 'SUCCESS', reason: 'platform-admin.granted by operator CLI', metadata: { channel: 'operator-cli' } } });
    return { promoted: true };
  });
}
