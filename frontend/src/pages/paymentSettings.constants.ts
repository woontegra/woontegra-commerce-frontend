import type { PaymentProviderType } from '../types/paymentSettings.types';

export const PROVIDER_LABELS: Record<PaymentProviderType, string> = {
  PAYTR:            'PayTR',
  BANK_TRANSFER:    'Havale / EFT',
  CASH_ON_DELIVERY: 'Kapıda Ödeme',
  IYZICO:           'iyzico',
  BANK_POS:         'Banka Sanal POS',
};
