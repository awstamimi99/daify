export type Terms = { amount: string; renewalAmount: string; currency: string; months: number; limits: { locations: number; menus: number; members: number; templates: string[]; publishing: boolean } };
export type Quote = Terms & { id: string; organizationId: string; planId: string; status: string; version: number; createdById: string; expiresAt: string; reason: string };
export type Coupon = { canRevoke?: boolean; id: string; code: string; percent: number; months: number; maxRedemptions: number; redeemedCount: number; organizationId: string | null; createdById: string; expiresAt: string; revokedAt: string | null };
export type Allowance = { maxPercent: number; maxMonths: number; freeMonths: number; version?: number };
export type Plan = { id: string; name: string; nameAr: string; amount: string; currency: string };
export type CustomerOfferState = { quotes: (Terms & { id: string; planId: string; expiresAt: string; version: number })[]; accepted: (Terms & { id: string; acceptedAt: string; activation: string }) | null; acceptanceEnabled: boolean; paymentActivation: boolean; plans: Plan[] };
export async function offerRequest<T>(path: string, method = 'GET', body?: object, reason?: string): Promise<T> {
  const response = await fetch(path, { method, headers: { 'content-type': 'application/json', ...(reason ? { 'x-support-reason': `uri:${encodeURIComponent(reason)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.detail) ? data.detail.join(' ') : data.detail ?? 'Please try again.');
  return data as T;
}
