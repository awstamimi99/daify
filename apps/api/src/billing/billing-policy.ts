import { BadRequestException } from '@nestjs/common';
import { templateKeys } from '@daify/menu-engine';

export const DAY = 86_400_000;
export const deniedLimits = { locations: 0, menus: 0, members: 0, templates: [] as string[], publishing: false };
export function parseLimits(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Invalid billing limits.');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).sort().join() !== 'locations,members,menus,publishing,templates' ||
      !['locations', 'menus', 'members'].every(key => Number.isSafeInteger(data[key]) && Number(data[key]) >= 0 && Number(data[key]) <= 100_000) ||
      typeof data.publishing !== 'boolean' || !Array.isArray(data.templates) || data.templates.length > templateKeys.length ||
      !data.templates.every(key => templateKeys.includes(key as typeof templateKeys[number])) || new Set(data.templates).size !== data.templates.length) {
    throw new BadRequestException('Limits require bounded location, menu and member counts, exact template keys and a publishing flag.');
  }
  return { locations: Number(data.locations), menus: Number(data.menus), members: Number(data.members), templates: (data.templates as string[]).slice(), publishing: data.publishing };
}

export function subscriptionStatus(subscription: { status: string; periodEnd: Date; graceEnd: Date | null; cancelAtEnd: boolean }, now = new Date()): string {
  if (now < subscription.periodEnd) return subscription.status === 'TRIAL' ? 'TRIAL' : subscription.status === 'PAST_DUE' ? 'PAST_DUE' : 'ACTIVE';
  if (subscription.cancelAtEnd) return 'CANCELED';
  if (subscription.status === 'PAST_DUE' && subscription.graceEnd && now < subscription.graceEnd) return 'PAST_DUE';
  return 'EXPIRED';
}

export function nextMonth(start: Date): Date {
  const result = new Date(start);
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(start.getUTCDate(), lastDay));
  return result;
}
