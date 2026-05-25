import type { ReturnRequestItem, ReturnRequestStatus, ReturnRequestType } from '../services/storefrontReturnsApi';

export const RETURN_TYPE_VIEW_LABELS: Record<ReturnRequestType, string> = {
  CANCEL_REQUEST: 'İptal Talebi',
  RETURN_REQUEST: 'İade Talebi',
};

export const RETURN_STATUS_VIEW_LABELS: Record<ReturnRequestStatus, string> = {
  PENDING:   'Beklemede',
  APPROVED:  'Onaylandı',
  REJECTED:  'Reddedildi',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal edildi',
};

export function returnRequestTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Talep';
  return RETURN_TYPE_VIEW_LABELS[type as ReturnRequestType] ?? 'Talep';
}

export function returnRequestStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Durum bilinmiyor';
  return RETURN_STATUS_VIEW_LABELS[status as ReturnRequestStatus] ?? 'Durum bilinmiyor';
}

export type ReturnStatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'muted';

export function returnRequestStatusTone(status: string | null | undefined): ReturnStatusTone {
  if (status === 'APPROVED' || status === 'COMPLETED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'PENDING') return 'warning';
  if (status === 'CANCELLED') return 'muted';
  return 'neutral';
}

export const RETURN_STATUS_TONE_CLASS: Record<ReturnStatusTone, string> = {
  success: 'text-emerald-700 bg-emerald-50',
  warning: 'text-amber-700 bg-amber-50',
  danger:  'text-red-700 bg-red-50',
  muted:   'text-slate-500 bg-slate-100',
  neutral: 'text-slate-700 bg-slate-100',
};

/** Liste kartında kısa ürün özeti. */
export function formatReturnItemsSummary(items: ReturnRequestItem[] | undefined): string {
  if (!items?.length) {
    return 'Ürün bilgisi yok';
  }
  const first = items[0];
  const name = first.productName ?? 'Ürün';
  const variant = first.variantName ? ` — ${first.variantName}` : '';
  const qty = items.length === 1
    ? `× ${first.quantity}`
    : `× ${first.quantity} (+${items.length - 1} ürün)`;
  return `${name}${variant} ${qty}`;
}
