import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class MfaSecretsService {
  constructor(private readonly config: ConfigService) {}

  private key(): Buffer {
    const encoded = this.config.get<string>('MFA_ENCRYPTION_KEY') ?? '';
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32 || key.toString('base64') !== encoded) throw new ServiceUnavailableException('Account security configuration is unavailable.');
    return key;
  }

  encrypt(secret: string, userId: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    cipher.setAAD(Buffer.from(userId));
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  }

  decrypt(value: string, userId: string): string {
    const key = this.key();
    // Compatibility only for test-era records; the caller replaces these after authentication.
    if (/^[A-Z2-7]{16,64}$/.test(value)) return value;
    try {
      const [version, iv, tag, encrypted, extra] = value.split('.');
      if (version !== 'v1' || !iv || !tag || !encrypted || extra) throw new Error('Invalid envelope');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
      decipher.setAAD(Buffer.from(userId));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
    } catch { throw new ServiceUnavailableException('Account security configuration is unavailable.'); }
  }
}
