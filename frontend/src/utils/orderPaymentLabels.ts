/** Admin panel — sipariş listesi ve dashboard ile uyumlu ödeme etiketleri */

export const ORDER_PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  PAYTR:            'Kredi Kartı / PayTR',
  BANK_TRANSFER:    'Havale / EFT',
  CASH_ON_DELIVERY: 'Kapıda Ödeme',
  IYZICO:           'iyzico',
  BANK_POS:         'Banka POS',
  UNKNOWN:          'Belirtilmemiş',
};

export const ORDER_PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING:               'Bekliyor',
  WAITING_BANK_TRANSFER: 'Havale Bekleniyor',
  PAID:                  'Ödendi',
  APPROVED:              'Onaylandı',
  FAILED:                'Başarısız',
  CANCELLED:             'İptal',
  UNKNOWN:               'Belirsiz',
};

export const PAYMENT_PROVIDER_SUMMARY_KEYS = [
  'PAYTR',
  'BANK_TRANSFER',
  'CASH_ON_DELIVERY',
  'IYZICO',
  'BANK_POS',
  'UNKNOWN',
] as const;

export const PAYMENT_STATUS_SUMMARY_KEYS = [
  'PENDING',
  'WAITING_BANK_TRANSFER',
  'PAID',
  'APPROVED',
  'FAILED',
  'CANCELLED',
  'UNKNOWN',
] as const;

export type PaymentSummaryByProvider = Record<typeof PAYMENT_PROVIDER_SUMMARY_KEYS[number], number>;
export type PaymentSummaryByStatus = Record<typeof PAYMENT_STATUS_SUMMARY_KEYS[number], number>;

export type PaymentSummary = {
  byProvider: PaymentSummaryByProvider;
  byStatus:   PaymentSummaryByStatus;
};

export function emptyPaymentSummary(): PaymentSummary {
  return {
    byProvider: {
      PAYTR: 0,
      BANK_TRANSFER: 0,
      CASH_ON_DELIVERY: 0,
      IYZICO: 0,
      BANK_POS: 0,
      UNKNOWN: 0,
    },
    byStatus: {
      PENDING: 0,
      WAITING_BANK_TRANSFER: 0,
      PAID: 0,
      APPROVED: 0,
      FAILED: 0,
      CANCELLED: 0,
      UNKNOWN: 0,
    },
  };
}
