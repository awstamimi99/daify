import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { verifyPaymentNotification } from './billing-webhook.signature';

const secret = 'isolated-webhook-test-secret';
const signed = 'Invoice.Id=6409988,Invoice.Status=PAID,Transaction.Status=SUCCESS,Transaction.PaymentId=07076409988323998875,Invoice.ExternalIdentifier=';
const signature = createHmac('sha256', secret).update(signed).digest('base64');
const notification = () => ({
  Event: { Code: 1, Name: 'PAYMENT_STATUS_CHANGED', CountryIsoCode: 'KWT', Reference: 'WH-test' },
  Data: {
    Invoice: { Id: '6409988', Status: 'PAID', ExternalIdentifier: null as string | null },
    Transaction: { Status: 'SUCCESS', PaymentId: '07076409988323998875' },
  },
});

describe('MyFatoorah V2 payment signatures', () => {
  it('verifies the documented field order and normalizes null identifiers', () => {
    const body = notification();
    const verified = verifyPaymentNotification(body, signature, secret);
    expect(verified.invoiceId).toBe('6409988');
    expect(verified.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    body.Data.Invoice.ExternalIdentifier = '';
    expect(verifyPaymentNotification(body, signature, secret)).toEqual(verified);
  });

  it('rejects missing, malformed and incorrect signatures without accepting another key', () => {
    for (const value of [undefined, '', 'bad', 'A'.repeat(44), Buffer.alloc(32).toString('base64')]) {
      expect(() => verifyPaymentNotification(notification(), value, secret)).toThrow(UnauthorizedException);
    }
    expect(() => verifyPaymentNotification(notification(), signature, 'another-secret')).toThrow(UnauthorizedException);
  });

  it('authenticates every signed field', () => {
    const mutations = [
      (body: ReturnType<typeof notification>) => { body.Data.Invoice.Id = '6409989'; },
      (body: ReturnType<typeof notification>) => { body.Data.Invoice.Status = 'PENDING'; },
      (body: ReturnType<typeof notification>) => { body.Data.Invoice.ExternalIdentifier = 'changed'; },
      (body: ReturnType<typeof notification>) => { body.Data.Transaction.Status = 'FAILED'; },
      (body: ReturnType<typeof notification>) => { body.Data.Transaction.PaymentId = 'different'; },
    ];
    for (const mutate of mutations) {
      const body = notification(); mutate(body);
      expect(() => verifyPaymentNotification(body, signature, secret)).toThrow(UnauthorizedException);
    }
  });

  it('ignores unsigned envelope changes when deduplicating deliveries', () => {
    const body = notification();
    const verified = verifyPaymentNotification(body, signature, secret);
    body.Event.Reference = 'attacker-controlled-reference';
    Object.assign(body.Data, { Amount: { ValueInBaseCurrency: '999' }, Customer: { Name: 'Ignored' } });
    Object.assign(body.Data.Invoice, { UserDefinedField: 'another-checkout' });
    expect(verifyPaymentNotification(body, signature, secret)).toEqual(verified);
  });

  it('rejects invalid shapes, unsupported events and ambiguous signed values', () => {
    const base = notification();
    const invalid = [null, [], {}, { ...base, Data: [] },
      { ...base, Event: { ...base.Event, Code: 2 } },
      { ...base, Event: { ...base.Event, Name: 'REFUND_STATUS_CHANGED' } },
      { ...base, Event: { ...base.Event, CountryIsoCode: 'SAU' } },
      ...[0, 6409988, '0', '01', '-1', '1'.repeat(16)].map(Id => ({ ...base, Data: { ...base.Data, Invoice: { ...base.Data.Invoice, Id } } })),
      ...['', 'a,b', 'a=b', 'a\nb', 'a\rb', 'a'.repeat(201)].map(PaymentId => ({ ...base, Data: { ...base.Data, Transaction: { ...base.Data.Transaction, PaymentId } } })),
    ];
    for (const body of invalid) expect(() => verifyPaymentNotification(body, signature, secret)).toThrow(BadRequestException);
  });
});
