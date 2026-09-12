import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EMAIL_VERIFICATION_MS, PASSWORD_RESET_MS, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from './auth.constants';
import { CryptoService } from './crypto.service';
import type { LoginDto, ResetPasswordDto, SignupDto } from './dto/auth.dto';
import type { RequestMetadata } from './request-metadata';
import { EmailDeliveryService } from './email-delivery.service';
import { MfaService } from './mfa.service';
import { consumeToken } from './consume-token';

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash: Promise<string>;

  constructor(private readonly prisma: PrismaService, private readonly crypto: CryptoService, private readonly emailDelivery: EmailDeliveryService, private readonly mfa: MfaService) {
    this.dummyPasswordHash = this.crypto.hashPassword('DAIFY timing equalizer only');
  }

  async signup(dto: SignupDto, metadata: RequestMetadata) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new ConflictException('An account with this email already exists.');
    const rawToken = this.crypto.opaqueToken();
    const user = await this.prisma.$transaction(async tx => {
      const created = await tx.user.create({ data: { email, displayName: dto.displayName.trim(), passwordHash: await this.crypto.hashPassword(dto.password) } });
      await tx.actionToken.create({ data: { purpose: 'EMAIL_VERIFICATION', tokenHash: this.crypto.tokenHash(rawToken), userId: created.id, locationIds: [], permissions: [], expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_MS) } });
      await tx.securityEvent.create({ data: { type: 'USER_SIGNED_UP', actorUserId: created.id, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      return created;
    });
    await this.emailDelivery.sendVerification(email, rawToken);
    return { user: this.safeUser(user), verificationRequired: true, verificationToken: process.env.NODE_ENV === 'test' ? rawToken : undefined };
  }

  async verifyEmail(rawToken: string, metadata: RequestMetadata) {
    const tokenHash = this.crypto.tokenHash(rawToken);
    const token = await this.prisma.actionToken.findFirst({ where: { tokenHash, purpose: 'EMAIL_VERIFICATION', consumedAt: null, expiresAt: { gt: new Date() }, userId: { not: null } } });
    if (!token?.userId) throw new UnauthorizedException('Verification token is invalid or expired.');
    const user = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${token.userId}::uuid FOR UPDATE`;
      const eligible = await tx.user.findFirst({ where: { id: token.userId!, status: { not: 'DISABLED' } } });
      if (!eligible || !await consumeToken(tx, token.id)) throw new UnauthorizedException('Verification token is invalid or expired.');
      const updated = await tx.user.update({ where: { id: token.userId! }, data: { status: 'ACTIVE', emailVerifiedAt: new Date() } });
      await tx.securityEvent.create({ data: { type: 'EMAIL_VERIFIED', actorUserId: updated.id, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      return updated;
    });
    return { user: this.safeUser(user) };
  }

  async login(dto: LoginDto, metadata: RequestMetadata) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordMatches = await this.crypto.verifyPassword(user?.passwordHash ?? await this.dummyPasswordHash, dto.password);
    if (!user || !passwordMatches) {
      await this.prisma.securityEvent.create({ data: { type: 'LOGIN_FAILED', actorUserId: user?.id, outcome: 'DENIED', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      throw new UnauthorizedException('Email or password is incorrect.');
    }
    if (user.status !== 'ACTIVE' || !user.emailVerifiedAt) {
      await this.recordLoginFailure(user.id, metadata);
      throw new UnauthorizedException('Email verification is required.');
    }
    let assuranceLevel: 'AAL1' | 'AAL2' = 'AAL1';
    if (user.platformAdmin || user.mfaSecret) {
      if (!user.mfaSecret || (!dto.mfaCode && !dto.recoveryCode)) {
        await this.recordLoginFailure(user.id, metadata);
        throw new UnauthorizedException('Multi-factor authentication is required.');
      }
      assuranceLevel = 'AAL2';
    }
    const rawToken = this.crypto.opaqueToken();
    const now = Date.now();
    const session = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current || current.status !== 'ACTIVE' || current.passwordHash !== user.passwordHash || current.platformAdmin !== user.platformAdmin || current.mfaSecret !== user.mfaSecret) throw new UnauthorizedException('Your account changed. Please log in again.');
      if (current.mfaSecret) await this.mfa.consumeFactor(tx, current, dto, metadata);
      if (dto.recoveryCode && current.mfaSecret) await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      const created = await tx.session.create({ data: { userId: user.id, tokenHash: this.crypto.tokenHash(rawToken), assuranceLevel, expiresAt: new Date(now + SESSION_IDLE_MS), absoluteExpiresAt: new Date(now + SESSION_ABSOLUTE_MS), ipAddress: metadata.ipAddress, userAgent: metadata.userAgent } });
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await tx.securityEvent.create({ data: { type: 'LOGIN_SUCCEEDED', actorUserId: user.id, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      return created;
    }).catch(async (error: unknown) => {
      if (error instanceof UnauthorizedException) await this.recordLoginFailure(user.id, metadata);
      throw error;
    });
    return { token: rawToken, expiresAt: session.expiresAt, absoluteExpiresAt: session.absoluteExpiresAt, user: this.safeUser(user), assuranceLevel };
  }

  async logout(sessionId: string, metadata: RequestMetadata): Promise<void> {
    const session = await this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    await this.prisma.securityEvent.create({ data: { type: 'LOGOUT', actorUserId: session.userId, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
  }

  async requestPasswordReset(emailInput: string, metadata: RequestMetadata) {
    const email = emailInput.trim().toLowerCase();
    const rawToken = this.crypto.opaqueToken();
    const created = await this.prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { email } });
      if (!user) return false;
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;
      const eligible = await tx.user.findFirst({ where: { id: user.id, status: { not: 'DISABLED' } } });
      if (!eligible) return false;
      await tx.actionToken.updateMany({ where: { userId: user.id, purpose: 'PASSWORD_RESET', consumedAt: null }, data: { consumedAt: new Date() } });
      await tx.actionToken.create({ data: { purpose: 'PASSWORD_RESET', tokenHash: this.crypto.tokenHash(rawToken), userId: user.id, locationIds: [], permissions: [], expiresAt: new Date(Date.now() + PASSWORD_RESET_MS) } });
      await tx.securityEvent.create({ data: { type: 'PASSWORD_RESET_REQUESTED', actorUserId: user.id, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      return true;
    });
    if (created) await this.emailDelivery.sendPasswordReset(email, rawToken);
    return { accepted: true, resetToken: process.env.NODE_ENV === 'test' && created ? rawToken : undefined };
  }

  async resetPassword(dto: ResetPasswordDto, metadata: RequestMetadata) {
    const token = await this.prisma.actionToken.findFirst({ where: { tokenHash: this.crypto.tokenHash(dto.token), purpose: 'PASSWORD_RESET', consumedAt: null, expiresAt: { gt: new Date() }, userId: { not: null } } });
    if (!token?.userId) throw new UnauthorizedException('Reset token is invalid or expired.');
    const userId = token.userId;
    const passwordHash = await this.crypto.hashPassword(dto.password);
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const eligible = await tx.user.findFirst({ where: { id: userId, status: { not: 'DISABLED' } } });
      if (!eligible || !await consumeToken(tx, token.id)) throw new UnauthorizedException('Reset token is invalid or expired.');
      await tx.user.update({ where: { id: userId }, data: { passwordHash, mfaPendingSecret: null, mfaPendingSessionId: null, mfaPendingExpiresAt: null } });
      await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.securityEvent.create({ data: { type: 'PASSWORD_RESET_COMPLETED', actorUserId: userId, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
    });
    return { reset: true };
  }

  async resendVerification(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const rawToken = this.crypto.opaqueToken();
    const created = await this.prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { email } });
      if (!user) return false;
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;
      const pending = await tx.user.findFirst({ where: { id: user.id, status: 'PENDING', emailVerifiedAt: null } });
      if (!pending) return false;
      await tx.actionToken.updateMany({ where: { userId: user.id, purpose: 'EMAIL_VERIFICATION', consumedAt: null }, data: { consumedAt: new Date() } });
      await tx.actionToken.create({ data: { userId: user.id, purpose: 'EMAIL_VERIFICATION', tokenHash: this.crypto.tokenHash(rawToken), locationIds: [], permissions: [], expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_MS) } });
      return true;
    });
    if (created) await this.emailDelivery.sendVerification(email, rawToken);
    return { accepted: true, verificationToken: process.env.NODE_ENV === 'test' && created ? rawToken : undefined };
  }

  private safeUser(user: { id: string; email: string; displayName: string | null; platformAdmin: boolean }) {
    return { id: user.id, email: user.email, displayName: user.displayName, platformAdmin: user.platformAdmin };
  }

  private async recordLoginFailure(actorUserId: string, metadata: RequestMetadata): Promise<void> {
    await this.prisma.securityEvent.create({ data: { type: 'LOGIN_FAILED', actorUserId, outcome: 'DENIED', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
  }
}
