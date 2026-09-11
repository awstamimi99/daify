import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function decodeBase32(value: string): Buffer {
  let bits = '';
  for (const character of value.toUpperCase().replace(/=|\s|-/g, '')) {
    const index = BASE32.indexOf(character);
    if (index < 0) throw new Error('Invalid TOTP secret.');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  return Buffer.from(bytes);
}

function codeAt(secret: Buffer, counter: number): string {
  const input = Buffer.alloc(8);
  input.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(input).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}

@Injectable()
export class TotpService {
  verify(secretValue: string, token: string, now = Date.now()): boolean {
    let secret: Buffer;
    try { secret = decodeBase32(secretValue); } catch { return false; }
    const provided = Buffer.from(token);
    const counter = Math.floor(now / 30_000);
    return [-1, 0, 1].some(offset => {
      const expected = Buffer.from(codeAt(secret, counter + offset));
      return provided.length === expected.length && timingSafeEqual(provided, expected);
    });
  }
}
