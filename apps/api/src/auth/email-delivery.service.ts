import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);
  private readonly transport: Transporter<SMTPTransport.SentMessageInfo> | null;

  constructor(private readonly config: ConfigService) {
    const testOnly = config.get<string>('EMAIL_TRANSPORT') === 'test';
    if (testOnly && config.get<string>('NODE_ENV') !== 'test') throw new Error('Test email delivery is forbidden outside NODE_ENV=test.');
    const user = config.get<string>('SMTP_USER');
    this.transport = testOnly ? null : createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: config.getOrThrow<number>('SMTP_PORT'),
      secure: config.getOrThrow<boolean>('SMTP_SECURE'),
      requireTLS: config.get<string>('NODE_ENV') === 'production' || config.get<boolean>('SMTP_REQUIRE_TLS'),
      auth: user ? { user, pass: config.getOrThrow<string>('SMTP_PASSWORD') } : undefined,
      connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
      disableFileAccess: true, disableUrlAccess: true,
    });
  }

  sendVerification(email: string, token: string): Promise<void> {
    return this.send(email, 'Verify your DAIFY email', '/verify-email', token, 'Confirm your email to start using DAIFY.');
  }

  sendPasswordReset(email: string, token: string): Promise<void> {
    return this.send(email, 'Reset your DAIFY password', '/reset-password', token, 'Choose a new password. If you did not request this, ignore this email.');
  }

  sendInvitation(email: string, token: string): Promise<void> {
    return this.send(email, 'Join your team on DAIFY', '/accept-invitation', token, 'Sign in with this email address to accept your team invitation.');
  }

  sendSecurityNotification(email: string, kind: string, occurredAt: Date, id: string): Promise<void> {
    const description = kind === 'MFA_ENABLED' ? 'Your DAIFY authenticator and recovery codes were configured or replaced.' : 'A recovery code was used for your DAIFY account.';
    const url = new URL('/dashboard/security', this.config.getOrThrow<string>('WEB_ORIGIN'));
    return this.deliver(email, 'DAIFY account security alert', `${description}\nTime: ${occurredAt.toISOString()}\n\nIf this was not you, reset your password and contact your account operator immediately.\n\nReview account security: ${url.toString()}`, `<security-${id}@daify.net>`);
  }

  async verifyConnection(): Promise<void> {
    if (!this.transport) throw new Error('SMTP verification requires a real SMTP transport.');
    try { await this.transport.verify(); }
    catch { throw new Error('SMTP connection verification failed. Check provider, TLS and credentials.'); }
  }

  private async send(email: string, subject: string, path: string, token: string, description: string): Promise<void> {
    if (!this.transport) return; // Explicit, isolated automated-test adapter; never enabled in production.
    const url = new URL(path, this.config.getOrThrow<string>('WEB_ORIGIN'));
    url.searchParams.set('token', token);
    return this.deliver(email, subject, `${description}\n\n${url.toString()}\n\nThis link expires and can only be used once.`);
  }

  private async deliver(email: string, subject: string, text: string, messageId?: string): Promise<void> {
    if (!this.transport) return;
    try {
      const result = await this.transport.sendMail({
        from: this.config.getOrThrow<string>('EMAIL_FROM'), to: email, subject,
        text, messageId,
      });
      if (result.rejected.length || !result.accepted.length) throw new Error('Recipient rejected');
      this.logger.log({ event: 'email.accepted-by-smtp', recipientDomain: email.split('@')[1] });
    } catch {
      // SMTP errors can contain addresses, credentials or the message. Never log the raw error.
      this.logger.error({ event: 'email.delivery-failed', recipientDomain: email.split('@')[1] });
      throw new ServiceUnavailableException('Email delivery is temporarily unavailable. Please request a new link shortly.');
    }
  }
}
