import { ConfigService } from '@nestjs/config';
import { SMTPServer } from 'smtp-server';
import type { AddressInfo } from 'node:net';
import { EmailDeliveryService } from './email-delivery.service';

describe('SMTP email delivery', () => {
  let server: SMTPServer;
  let service: EmailDeliveryService;
  const messages: string[] = [];

  beforeAll(async () => {
    server = new SMTPServer({
      authOptional: true, disabledCommands: ['AUTH', 'STARTTLS'],
      onRcptTo(address, _session, callback) {
        callback(address.address === 'reject@example.com' ? new Error('Rejected for test') : undefined);
      },
      onData(stream, _session, callback) {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => { messages.push(Buffer.concat(chunks).toString()); callback(); });
      },
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.server.address() as AddressInfo).port;
    service = new EmailDeliveryService(new ConfigService({
      NODE_ENV: 'test', EMAIL_TRANSPORT: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PORT: port,
      SMTP_SECURE: false, SMTP_REQUIRE_TLS: false, EMAIL_FROM: 'no-reply@daify.test', WEB_ORIGIN: 'http://localhost:3000',
    }));
  });

  afterAll(async () => { await new Promise<void>(resolve => server.close(resolve)); });

  it('delivers verification, reset and invitation links to a local SMTP inbox', async () => {
    const token = 'test-token-123456789012345678901234';
    await service.sendVerification('recipient@example.com', token);
    await service.sendPasswordReset('recipient@example.com', token);
    await service.sendInvitation('recipient@example.com', token);
    expect(messages).toHaveLength(3);
    for (const [index, route] of ['/verify-email', '/reset-password', '/accept-invitation'].entries()) {
      // Decode quoted-printable soft wrapping used by the SMTP transport.
      const message = messages[index]!.replace(/=\r?\n/g, '').replace(/=3D/g, '=');
      expect(message).toContain(`http://localhost:3000${route}?token=${token}`);
      expect(message).toContain('recipient@example.com');
    }
  });

  it('reports rejected delivery instead of claiming the message was sent', async () => {
    await expect(service.sendVerification('reject@example.com', 'test-token')).rejects.toThrow('Email delivery is temporarily unavailable');
  });

  it('verifies SMTP without sending and delivers security alerts without secrets', async () => {
    const before = messages.length;
    await service.verifyConnection(); expect(messages).toHaveLength(before);
    await service.sendSecurityNotification('recipient@example.com', 'MFA_RECOVERY_USED', new Date('2026-09-12T00:00:00Z'), 'test-notification');
    const message = messages.at(-1)!.replace(/=\r?\n/g, '').replace(/=3D/g, '=');
    expect(message).toContain('A recovery code was used');
    expect(message).toContain('/dashboard/security');
    expect(message).not.toContain('?token=');
  });

  it('forbids the test delivery adapter outside the test environment', () => {
    expect(() => new EmailDeliveryService(new ConfigService({ NODE_ENV: 'production', EMAIL_TRANSPORT: 'test' }))).toThrow('forbidden');
  });
});
