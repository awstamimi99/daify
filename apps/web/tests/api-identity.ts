import { createHmac } from 'node:crypto';

// Match the local proxy key in playwright.config.ts. Direct fixture calls must
// carry the same trusted identity as their browser, rather than share loopback.
export function apiIdentity(path: string, ip: string, method = 'POST') {
  const time = Date.now().toString();
  return {
    Origin: 'http://127.0.0.1:3100',
    'x-daify-client-ip': ip,
    'x-daify-client-time': time,
    'x-daify-client-signature': createHmac('sha256', Buffer.alloc(32, 8))
      .update([time, method, `/api/v1${path}`, ip].join('\n')).digest('hex'),
  };
}
