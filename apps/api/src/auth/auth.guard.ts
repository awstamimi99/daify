import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppConfigService } from '../common/config/app-config.service';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedRequest } from './auth-request';
import { CryptoService } from './crypto.service';
import { SESSION_IDLE_MS } from './auth.constants';

function cookieValue(request: Request, name: string): string | undefined {
  const cookie = request.headers.cookie;
  if (!cookie) return undefined;
  for (const part of cookie.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) {
      try { return decodeURIComponent(value.join('=')); } catch { return undefined; }
    }
  }
  return undefined;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly crypto: CryptoService, private readonly config: AppConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = cookieValue(request, this.config.sessionCookieName);
    if (!token) throw new UnauthorizedException('Authentication required.');
    const now = new Date();
    const session = await this.prisma.session.findFirst({
      where: { tokenHash: this.crypto.tokenHash(token), revokedAt: null, expiresAt: { gt: now }, absoluteExpiresAt: { gt: now }, user: { status: 'ACTIVE', emailVerifiedAt: { not: null } } },
      include: { user: true },
    });
    if (!session) throw new UnauthorizedException('Session is invalid or expired.');
    if (session.user.mfaSecret && session.assuranceLevel !== 'AAL2') throw new UnauthorizedException('Please log in with two-step verification.');
    if (session.expiresAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      const rollingExpiry = new Date(
        Math.min(now.getTime() + SESSION_IDLE_MS, session.absoluteExpiresAt.getTime()),
      );
      await this.prisma.session.update({ where: { id: session.id }, data: { expiresAt: rollingExpiry, lastSeenAt: now } });
      const response = context.switchToHttp().getResponse<Response>();
      response.cookie(this.config.sessionCookieName, token, {
        httpOnly: true,
        secure: this.config.environment === 'production',
        sameSite: 'lax',
        path: '/',
        expires: session.absoluteExpiresAt,
      });
    }
    request.user = { id: session.user.id, email: session.user.email, displayName: session.user.displayName, platformAdmin: session.user.platformAdmin, sessionId: session.id, assuranceLevel: session.assuranceLevel };
    return true;
  }
}
