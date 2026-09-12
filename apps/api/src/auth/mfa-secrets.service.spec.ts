import { ConfigService } from '@nestjs/config';
import { MfaSecretsService } from './mfa-secrets.service';
import { TotpService } from './totp.service';

describe('MFA secrets', () => {
  const service = new MfaSecretsService(new ConfigService({ MFA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64') }));
  it('encrypts with randomized user-bound authenticated encryption', () => {
    const first = service.encrypt('JBSWY3DPEHPK3PXP', 'user-1');
    expect(first).not.toContain('JBSWY3DPEHPK3PXP');
    expect(service.encrypt('JBSWY3DPEHPK3PXP', 'user-1')).not.toBe(first);
    expect(service.decrypt(first, 'user-1')).toBe('JBSWY3DPEHPK3PXP');
    expect(() => service.decrypt(first, 'user-2')).toThrow('configuration is unavailable');
    const parts = first.split('.');
    parts[3] = Buffer.alloc(16).toString('base64url');
    expect(() => service.decrypt(parts.join('.'), 'user-1')).toThrow('configuration is unavailable');
  });
  it('fails closed without a valid external encryption key', () => {
    expect(() => new MfaSecretsService(new ConfigService()).encrypt('secret', 'user')).toThrow('configuration is unavailable');
  });
  it('matches RFC 6238 SHA-1 vectors using six digits and rejects malformed codes', () => {
    const totp = new TotpService();
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    expect(totp.matchCounter(secret, '287082', 59_000)).toBe(1);
    expect(totp.verify(secret, '287082', 180_000)).toBe(false);
    expect(totp.verify(secret, '28708', 59_000)).toBe(false);
    expect(totp.generateSecret()).toMatch(/^[A-Z2-7]{32}$/);
  });
});
