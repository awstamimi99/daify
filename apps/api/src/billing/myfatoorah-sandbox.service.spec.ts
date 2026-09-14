import { ConfigService } from '@nestjs/config';
import { MyFatoorahSandboxService } from './myfatoorah-sandbox.service';
describe('MyFatoorah sandbox boundary', () => {
  const checkout = { id: 'local-reference', providerInvoiceId: '123', amount: '3.000' };
  const invoice = { InvoiceId: 123, InvoiceStatus: 'Paid', CustomerReference: checkout.id, UserDefinedField: checkout.id, InvoiceValue: 3, InvoiceDisplayValue: '3.000 KD' };
  const config = () => new ConfigService({ NODE_ENV: 'test', BILLING_MODE: 'sandbox', MYFATOORAH_TEST_API_KEY: 'test-only' });
  afterEach(() => jest.restoreAllMocks());
  it('uses a fixed sandbox URL and validates authoritative payment facts', async () => {
    const fetcher = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ IsSuccess: true, Data: invoice }));
    const result = await new MyFatoorahSandboxService(config()).inspect(checkout);
    expect(result.status).toBe('Paid');
    expect(fetcher.mock.calls[0]![0]).toBe('https://apitest.myfatoorah.com/v2/GetPaymentStatus');
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toEqual({ Key: '123', KeyType: 'InvoiceId' });
  });
  it('recovers uncertain creation using the local reference, never another create call', async () => {
    const fetcher = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ IsSuccess: true, Data: invoice }));
    await new MyFatoorahSandboxService(config()).inspect({ ...checkout, providerInvoiceId: null });
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toEqual({ Key: checkout.id, KeyType: 'CustomerReference' });
  });
  it('rejects mismatched ownership, amount, currency, invoice and unsupported states', async () => {
    const fetcher = jest.spyOn(globalThis, 'fetch');
    for (const change of [{ InvoiceId: 124 }, { CustomerReference: 'foreign' }, { UserDefinedField: 'foreign' }, { InvoiceValue: 30 }, { InvoiceDisplayValue: '3.000 USD' }, { InvoiceStatus: 'Authorized' }]) {
      fetcher.mockResolvedValueOnce(Response.json({ IsSuccess: true, Data: { ...invoice, ...change } }));
      await expect(new MyFatoorahSandboxService(config()).inspect(checkout)).rejects.toThrow('does not match');
    }
  });
  it('never exposes provider errors or redirects users to a live or arbitrary host', async () => {
    const fetcher = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ IsSuccess: false, Message: 'private card details' }));
    await expect(new MyFatoorahSandboxService(config()).inspect(checkout)).rejects.toThrow('could not be confirmed');
    for (const url of ['https://portal.myfatoorah.com/payment', 'https://demo.myfatoorah.com.evil.test/', 'http://demo.myfatoorah.com/']) {
      fetcher.mockResolvedValueOnce(Response.json({ IsSuccess: true, Data: { InvoiceId: 1, PaymentURL: url } }));
      await expect(new MyFatoorahSandboxService(config()).create(checkout)).rejects.toThrow('Unexpected sandbox');
    }
  });
  it('refuses production even if a test key is present', async () => {
    const options = config(); options.set('NODE_ENV', 'production');
    const fetcher = jest.spyOn(globalThis, 'fetch');
    await expect(new MyFatoorahSandboxService(options).inspect(checkout)).rejects.toThrow('not configured');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
