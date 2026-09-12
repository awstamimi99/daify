import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class CryptoService {
  hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  }

  verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  opaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
