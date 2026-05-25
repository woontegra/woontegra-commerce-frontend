import { formatDateTimeTr } from './shipping';

export type PaymentStatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'muted';

export type StoreOrderPaymentInput = {
  paymentProvider?:     string | null;
  paymentStatus?:       string | null;
  paymentApprovedAt?:   string | null;
  paymentFailedAt?:     string | null;
  payment?: {
    provider?:    string | null;
    status?:      string | null;
    approvedAt?:  string | null;
    failedAt?:    string | null;
  };
};

export type StoreOrderPaymentView = {
  providerLabel: string;
  statusLabel:   string;
  statusTone:    PaymentStatusTone;
  helperText:    string;
  dateText:      string | null;
  dateKind:      'approved' | 'failed' | null;
};

const STORE_PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  PAYTR:            'Kredi/Banka Kartı',
  IYZICO:           'Kredi/Banka Kartı',
  BANK_TRANSFER:    'Havale / EFT',
  CASH_ON_DELIVERY: 'Kapıda Ödeme',
  BANK_POS:         'Sanal POS',
};

const STORE_PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING:               'Ödeme bekleniyor',
  WAITING_BANK_TRANSFER:  'Havale/EFT bekleniyor',
  PAID:                  'Ödeme alındı',
  APPROVED:              'Ödeme onaylandı',
  FAILED:                'Ödeme başarısız',
  CANCELLED:             'Ödeme iptal edildi',
};

export function storePaymentProviderLabel(provider: string | null | undefined): string {
  if (!provider?.trim()) return 'Ödeme yöntemi belirtilmedi';
  return STORE_PAYMENT_PROVIDER_LABELS[provider] ?? provider;
}

export function storePaymentStatusLabel(status: string | null | undefined): string {
  if (!status?.trim()) return 'Ödeme durumu bilinmiyor';
  return STORE_PAYMENT_STATUS_LABELS[status] ?? status;
}

function resolvePaymentStatusTone(
  status: string | null,
): PaymentStatusTone {
  if (status === 'PAID' || status === 'APPROVED') return 'success';
  if (status === 'FAILED') return 'danger';
  if (status === 'WAITING_BANK_TRANSFER' || status === 'PENDING') return 'warning';
  if (status === 'CANCELLED') return 'muted';
  return 'neutral';
}

function resolvePaymentHelperText(
  provider: string | null,
  status: string | null,
): string {
  if (provider === 'BANK_TRANSFER' && status === 'WAITING_BANK_TRANSFER') {
    return 'Ödemeniz mağaza tarafından onaylandığında siparişiniz hazırlık sürecine alınacaktır.';
  }
  if (provider === 'PAYTR' && status === 'FAILED') {
    return 'Ödemeniz tamamlanamadı. Sipariş durumunu kontrol edebilir veya mağaza ile iletişime geçebilirsiniz.';
  }
  if (provider === 'CASH_ON_DELIVERY') {
    return 'Ödeme teslimatta alınacaktır.';
  }
  return '';
}

function resolvePaymentDate(
  status: string | null,
  approvedAt: string | null | undefined,
  failedAt: string | null | undefined,
): { dateText: string | null; dateKind: 'approved' | 'failed' | null } {
  if ((status === 'PAID' || status === 'APPROVED') && approvedAt) {
    return { dateText: formatDateTimeTr(approvedAt), dateKind: 'approved' };
  }
  if (status === 'FAILED' && failedAt) {
    return { dateText: formatDateTimeTr(failedAt), dateKind: 'failed' };
  }
  return { dateText: null, dateKind: null };
}

/** Müşteri sipariş listesi / detay — ödeme yöntemi ve durum görünümü. */
export function getStoreOrderPaymentView(order: StoreOrderPaymentInput): StoreOrderPaymentView {
  const provider = order.payment?.provider ?? order.paymentProvider ?? null;
  const status = order.payment?.status ?? order.paymentStatus ?? null;
  const approvedAt = order.payment?.approvedAt ?? order.paymentApprovedAt ?? null;
  const failedAt = order.payment?.failedAt ?? order.paymentFailedAt ?? null;
  const { dateText, dateKind } = resolvePaymentDate(status, approvedAt, failedAt);

  return {
    providerLabel: storePaymentProviderLabel(provider),
    statusLabel:   storePaymentStatusLabel(status),
    statusTone:    resolvePaymentStatusTone(status),
    helperText:    resolvePaymentHelperText(provider, status),
    dateText,
    dateKind,
  };
}

export const PAYMENT_STATUS_TONE_CLASS: Record<PaymentStatusTone, string> = {
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger:  'text-red-700',
  muted:   'text-slate-500',
  neutral: 'text-slate-700',
};
