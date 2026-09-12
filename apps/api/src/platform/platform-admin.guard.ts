import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user.platformAdmin || user.assuranceLevel !== 'AAL2') throw new ForbiddenException('Platform Admin AAL2 access is required.');
    return true;
  }
}
