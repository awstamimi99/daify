import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Invalid payment notification.');
  return value as Record<string, unknown>;
}
function field(value: unknown): string {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > 200 || /[\r\n,=]/.test(value)) throw new BadRequestException('Invalid signed payment field.');
  return value;
}

// MyFatoorah V2 PAYMENT_STATUS_CHANGED signs these five fields, in this exact
// order, not the raw JSON. Event.Reference, timestamps, amounts and UDF are NOT
// signed; never use them as payment facts or the replay key.
export function verifyPaymentNotification(body: unknown, signature: string | undefined, secret: string) {
  if (!signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) throw new UnauthorizedException('Invalid payment signature.');
  const payload = object(body), event = object(payload.Event), data = object(payload.Data);
  if (event.Code !== 1 || event.Name !== 'PAYMENT_STATUS_CHANGED' || event.CountryIsoCode !== 'KWT') throw new BadRequestException('Unsupported payment notification.');
  const invoice = object(data.Invoice), transaction = object(data.Transaction);
  const invoiceId = field(invoice.Id), invoiceStatus = field(invoice.Status), transactionStatus = field(transaction.Status), paymentId = field(transaction.PaymentId);
  if (!/^[1-9]\d{0,14}$/.test(invoiceId) || !paymentId || !['PAID', 'PENDING'].includes(invoiceStatus) || !['SUCCESS', 'FAILED', 'AUTHORIZE', 'CANCELED'].includes(transactionStatus)) throw new BadRequestException('Invalid payment notification.');
  const signed = `Invoice.Id=${invoiceId},Invoice.Status=${invoiceStatus},Transaction.Status=${transactionStatus},Transaction.PaymentId=${paymentId},Invoice.ExternalIdentifier=${field(invoice.ExternalIdentifier)}`;
  const expected = createHmac('sha256', secret).update(signed, 'utf8').digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'base64'))) throw new UnauthorizedException('Invalid payment signature.');
  return { invoiceId, fingerprint: createHash('sha256').update(signed).digest('hex') };
}
