import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client';

interface ProviderInvoice {
  InvoiceId: number;
  InvoiceStatus: string;
  CustomerReference: string;
  UserDefinedField: string;
  InvoiceValue: number;
  InvoiceDisplayValue: string;
  InvoiceTransactions?: { TransactionStatus: string }[];
}

@Injectable()
export class MyFatoorahSandboxService {
  constructor(private readonly config: ConfigService) {}

  ready() { return this.config.get('BILLING_MODE') === 'sandbox' && Boolean(this.config.get('MYFATOORAH_TEST_API_KEY')) && this.config.get('NODE_ENV') !== 'production'; }

  private async call<T>(operation: 'ExecutePayment' | 'GetPaymentStatus', body: object): Promise<T> {
    if (!this.ready()) throw new ServiceUnavailableException('MyFatoorah sandbox is not configured.');
    try {
      // Fixed sandbox host: neither configuration nor client input can turn on live charging.
      const response = await fetch(`https://apitest.myfatoorah.com/v2/${operation}`, {
        method: 'POST', headers: { Authorization: `Bearer ${this.config.get<string>('MYFATOORAH_TEST_API_KEY')!}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(12_000), redirect: 'error',
      });
      const result = await response.json() as { IsSuccess?: boolean; Data?: T };
      if (!response.ok || result.IsSuccess !== true || !result.Data) throw new Error('Provider rejected request');
      return result.Data;
    } catch {
      // Provider payloads may include card/customer data. Never echo or log them.
      throw new ServiceUnavailableException('Sandbox payment status could not be confirmed. Retry the status check; do not start another checkout.');
    }
  }

  async create(checkout: { id: string; amount: string }) {
    const callback = this.config.get<string>('MYFATOORAH_TEST_RETURN_URL');
    const result = await this.call<{ InvoiceId: number; PaymentURL: string }>('ExecutePayment', {
      InvoiceValue: Number(checkout.amount), PaymentMethodId: 2, DisplayCurrencyIso: 'KWD',
      CustomerName: 'DAIFY Sandbox', CustomerReference: checkout.id, UserDefinedField: checkout.id, Language: 'EN',
      ...(callback ? { CallBackUrl: callback, ErrorUrl: callback } : {}),
    });
    let url: URL;
    try { url = new URL(result.PaymentURL); } catch { throw new ServiceUnavailableException('Unexpected sandbox checkout response. Reconcile before retrying.'); }
    if (url.origin !== 'https://demo.myfatoorah.com' || url.username || url.password || !Number.isSafeInteger(result.InvoiceId) || result.InvoiceId <= 0) {
      throw new ServiceUnavailableException('Unexpected sandbox checkout response. Reconcile before retrying.');
    }
    return { invoiceId: String(result.InvoiceId), paymentUrl: url.href };
  }

  async inspect(checkout: { id: string; providerInvoiceId: string | null; amount: string }) {
    const invoice = await this.call<ProviderInvoice>('GetPaymentStatus', {
      Key: checkout.providerInvoiceId ?? checkout.id, KeyType: checkout.providerInvoiceId ? 'InvoiceId' : 'CustomerReference',
    });
    const display = /^(\d+(?:\.\d{1,3})?)\s+(?:KD|KWD)$/.exec(invoice.InvoiceDisplayValue ?? '');
    if (!Number.isSafeInteger(invoice.InvoiceId) || invoice.InvoiceId <= 0 ||
        (checkout.providerInvoiceId && String(invoice.InvoiceId) !== checkout.providerInvoiceId) ||
        invoice.CustomerReference !== checkout.id || invoice.UserDefinedField !== checkout.id ||
        !display || !new Prisma.Decimal(display[1]!).equals(checkout.amount) ||
        !Number.isFinite(invoice.InvoiceValue) || !new Prisma.Decimal(invoice.InvoiceValue).equals(checkout.amount) ||
        !['Paid', 'Pending', 'Canceled'].includes(invoice.InvoiceStatus)) {
      throw new ServiceUnavailableException('Sandbox invoice does not match this checkout. No access was changed.');
    }
    return { invoiceId: String(invoice.InvoiceId), status: invoice.InvoiceStatus as 'Paid' | 'Pending' | 'Canceled',
      failedAttempt: invoice.InvoiceTransactions?.some(transaction => ['Failed', 'FAILED'].includes(transaction.TransactionStatus)) ?? false };
  }
}
