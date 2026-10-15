import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { Reflector } from '@nestjs/core';
import { canPlatform, type StaffPermission } from './staff-policy';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    const permission = this.reflector.getAllAndOverride<StaffPermission | undefined>('platform.permission', [context.getHandler(), context.getClass()]);
    if (permission ? !canPlatform(user, permission) : !user.platformAdmin || user.assuranceLevel !== 'AAL2') throw new ForbiddenException('Platform permission and MFA are required.');
    return true;
  }
}
