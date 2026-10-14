import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { MyFatoorahSandboxService } from '../src/billing/myfatoorah-sandbox.service';

async function main() {
  if (process.env.BILLING_MODE !== 'sandbox' || !['development', 'test'].includes(process.env.NODE_ENV ?? '')) throw new Error('Explicit sandbox development/test mode required.');
  const provider = new MyFatoorahSandboxService(new ConfigService());
  const id = randomUUID();
  const checkout = await provider.create({ id, amount: '1.000' });
  const result = await provider.inspect({ id, amount: '1.000', providerInvoiceId: checkout.invoiceId });
  console.log(JSON.stringify({ environment: 'sandbox', invoiceId: checkout.invoiceId, status: result.status, paymentUrl: checkout.paymentUrl, verifiedReferenceAndAmount: true }));
}
void main();
