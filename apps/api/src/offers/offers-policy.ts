import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
export const defaultSalesAllowance = { maxPercent: 25, maxMonths: 3, freeMonths: 1, version: 0 };
export function offerAuthority(actor: AuthenticatedUser) {
  if (actor.platformAdmin) return { maxPercent: 100, maxMonths: 12, freeMonths: 12 };
  if (actor.platformStaff?.role === 'MANAGER') return { maxPercent: 50, maxMonths: 6, freeMonths: 0 };
  throw new ForbiddenException('A Manager or Owner is required.');
}
export function withinAllowance(percent: number, months: number, allowance: { maxPercent: number; maxMonths: number; freeMonths: number }) {
  return percent === 100 && months <= allowance.freeMonths || percent <= allowance.maxPercent && months <= allowance.maxMonths;
}
