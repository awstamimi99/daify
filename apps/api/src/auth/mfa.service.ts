import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import type { Prisma, User } from '../generated/prisma/client';
import { CryptoService } from './crypto.service';
import { TotpService } from './totp.service';
import { MfaSecretsService } from './mfa-secrets.service';
import type { AuthenticatedUser } from './auth.types';
import type { MfaConfirmDto, MfaSetupDto } from './dto/auth.dto';
import type { RequestMetadata } from './request-metadata';
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from './auth.constants';

@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService, private readonly crypto: CryptoService, private readonly totp: TotpService, private readonly secrets: MfaSecretsService) {}

  async status(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { mfaSecret: true, mfaRecoveryHashes: true } });
    return { enabled: Boolean(user.mfaSecret), recoveryCodesRemaining: user.mfaRecoveryHashes.length };
  }

  // Must be called under the user's row lock, in the transaction that applies the operation.
  async consumeFactor(tx: Prisma.TransactionClient, user: User, proof: { mfaCode?: string; recoveryCode?: string }, metadata: RequestMetadata): Promise<void> {
    if (!user.mfaSecret || Boolean(proof.mfaCode) === Boolean(proof.recoveryCode)) throw new UnauthorizedException('Enter an authenticator code or an unused recovery code.');
    if (proof.recoveryCode) {
      const normalized = proof.recoveryCode.replace(/-/g, '').toLowerCase();
      if (!/^[a-f0-9]{32}$/.test(normalized)) throw new UnauthorizedException('Recovery code is invalid or already used.');
      const hash = this.crypto.tokenHash(normalized);
      if (!user.mfaRecoveryHashes.includes(hash)) throw new UnauthorizedException('Recovery code is invalid or already used.');
      await tx.user.update({ where: { id: user.id }, data: { mfaRecoveryHashes: user.mfaRecoveryHashes.filter(value => value !== hash) } });
      await tx.securityEvent.create({ data: { type: 'MFA_RECOVERY_USED', actorUserId: user.id, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      await tx.securityNotification.create({ data: { userId: user.id, kind: 'MFA_RECOVERY_USED' } });
      return;
    }
    const secret = this.secrets.decrypt(user.mfaSecret, user.id);
    const counter = this.totp.matchCounter(secret, proof.mfaCode!);
    if (counter === null || counter <= (user.mfaLastCounter ?? -1)) throw new UnauthorizedException('Authenticator code is invalid or already used. Wait for a new code.');
    await tx.user.update({ where: { id: user.id }, data: { mfaLastCounter: counter, ...(!user.mfaSecret.startsWith('v1.') ? { mfaSecret: this.secrets.encrypt(secret, user.id) } : {}) } });
  }

  private async currentUser(tx: Prisma.TransactionClient, actor: AuthenticatedUser, password: string) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${actor.id}::uuid FOR UPDATE`;
    const user = await tx.user.findFirst({ where: { id: actor.id, status: 'ACTIVE', emailVerifiedAt: { not: null } } });
    const session = await tx.session.findFirst({ where: { id: actor.sessionId, userId: actor.id, revokedAt: null, expiresAt: { gt: new Date() }, absoluteExpiresAt: { gt: new Date() } } });
    if (!user || !session || !await this.crypto.verifyPassword(user.passwordHash, password)) throw new UnauthorizedException('Your password or session is no longer valid.');
    return user;
  }

  async setup(actor: AuthenticatedUser, dto: MfaSetupDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const user = await this.currentUser(tx, actor, dto.password);
      if (user.mfaSecret) await this.consumeFactor(tx, user, dto, metadata);
      const secret = this.totp.generateSecret();
      const expiresAt = new Date(Date.now() + 10 * 60_000);
      await tx.user.update({ where: { id: user.id }, data: { mfaPendingSecret: this.secrets.encrypt(secret, user.id), mfaPendingSessionId: actor.sessionId, mfaPendingExpiresAt: expiresAt } });
      await tx.securityEvent.create({ data: { type: 'MFA_SETUP_STARTED', actorUserId: user.id, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      // This is returned only to the freshly reauthenticated user; never logged or persisted plaintext.
      return { secret, expiresAt, issuer: 'DAIFY', account: user.email };
    });
  }

  async confirm(actor: AuthenticatedUser, dto: MfaConfirmDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const user = await this.currentUser(tx, actor, dto.password);
      if (!user.mfaPendingSecret || user.mfaPendingSessionId !== actor.sessionId || !user.mfaPendingExpiresAt || user.mfaPendingExpiresAt <= new Date()) throw new UnauthorizedException('Setup expired. Start again in this session.');
      const secret = this.secrets.decrypt(user.mfaPendingSecret, user.id);
      const counter = this.totp.matchCounter(secret, dto.code);
      if (counter === null) throw new UnauthorizedException('The new authenticator code is invalid.');
      const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(16).toString('hex'));
      await tx.user.update({ where: { id: user.id }, data: { mfaSecret: user.mfaPendingSecret, mfaLastCounter: counter, mfaRecoveryHashes: recoveryCodes.map(code => this.crypto.tokenHash(code)), mfaPendingSecret: null, mfaPendingSessionId: null, mfaPendingExpiresAt: null } });
      await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      const token = this.crypto.opaqueToken();
      const absoluteExpiresAt = new Date(Date.now() + SESSION_ABSOLUTE_MS);
      await tx.session.create({ data: { userId: user.id, tokenHash: this.crypto.tokenHash(token), assuranceLevel: 'AAL2', expiresAt: new Date(Date.now() + SESSION_IDLE_MS), absoluteExpiresAt, ipAddress: metadata.ipAddress, userAgent: metadata.userAgent } });
      await tx.securityEvent.create({ data: { type: 'MFA_ENABLED', actorUserId: user.id, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      await tx.securityNotification.create({ data: { userId: user.id, kind: 'MFA_ENABLED' } });
      return { enabled: true, token, absoluteExpiresAt, recoveryCodes: recoveryCodes.map(code => code.match(/.{4}/g)!.join('-')) };
    });
  }
}
