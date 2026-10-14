import { deniedLimits, nextMonth, parseLimits, subscriptionStatus } from './billing-policy';
import { environmentSchema } from '../common/config/environment';
describe('sandbox billing policy', () => {
  it('rejects sandbox mode and test keys at production configuration validation', () => {
    const errors = environmentSchema.validate({ NODE_ENV: 'production', BILLING_MODE: 'sandbox', MYFATOORAH_TEST_API_KEY: 'test-only', MYFATOORAH_TEST_WEBHOOK_SECRET: 'test-webhook-secret' }, { abortEarly: false }).error?.details ?? [];
    expect(errors.map(error => error.path.join('.'))).toContain('BILLING_MODE');
    expect(errors.map(error => error.path.join('.'))).toContain('MYFATOORAH_TEST_API_KEY');
    expect(errors.map(error => error.path.join('.'))).toContain('MYFATOORAH_TEST_WEBHOOK_SECRET');
    expect(environmentSchema.validate({ NODE_ENV: 'test', DATABASE_URL: 'postgresql://localhost/daify_test', BILLING_MODE: 'sandbox' }).error).toBeUndefined();
  });
  it('clamps calendar renewals at month ends, including leap years', () => {
    expect(nextMonth(new Date('2028-01-31T10:20:30Z')).toISOString()).toBe('2028-02-29T10:20:30.000Z');
    expect(nextMonth(new Date('2027-01-31T10:20:30Z')).toISOString()).toBe('2027-02-28T10:20:30.000Z');
    expect(nextMonth(new Date('2026-12-31T10:20:30Z')).toISOString()).toBe('2027-01-31T10:20:30.000Z');
  });
  it('ends trials and cancellation exactly at the period boundary', () => {
    const periodEnd = new Date('2026-10-01Z');
    const subscription = { status: 'TRIAL', periodEnd, graceEnd: null, cancelAtEnd: false };
    expect(subscriptionStatus(subscription, new Date(periodEnd.getTime() - 1))).toBe('TRIAL');
    expect(subscriptionStatus(subscription, periodEnd)).toBe('EXPIRED');
    expect(subscriptionStatus({ ...subscription, cancelAtEnd: true }, periodEnd)).toBe('CANCELED');
  });
  it('never lets grace override cancellation or survive its expiry', () => {
    const periodEnd = new Date('2026-10-01Z'), graceEnd = new Date('2026-10-04Z');
    const subscription = { status: 'PAST_DUE', periodEnd, graceEnd, cancelAtEnd: false };
    expect(subscriptionStatus(subscription, periodEnd)).toBe('PAST_DUE');
    expect(subscriptionStatus(subscription, graceEnd)).toBe('EXPIRED');
    expect(subscriptionStatus({ ...subscription, cancelAtEnd: true }, periodEnd)).toBe('CANCELED');
  });
  it('rejects unknown template keys, unbounded limits and unknown flags', () => {
    expect(parseLimits(deniedLimits)).toEqual(deniedLimits);
    for (const limits of [{ ...deniedLimits, menus: -1 }, { ...deniedLimits, members: 1.5 }, { ...deniedLimits, locations: Infinity }, { ...deniedLimits, templates: ['unknown'] }, { ...deniedLimits, templates: ['atelier', 'atelier'] }, { ...deniedLimits, free: true }]) expect(() => parseLimits(limits)).toThrow();
  });
});
