import type { ReturnRequestStatus, ReturnRequestType } from '../services/storefrontReturnsApi';

export const RETURN_TYPE_LABELS: Record<ReturnRequestType, string> = {
  CANCEL_REQUEST: 'İptal talebi',
  RETURN_REQUEST: 'İade talebi',
};

export const RETURN_STATUS_LABELS: Record<ReturnRequestStatus, string> = {
  PENDING:   'Beklemede',
  APPROVED:  'Onaylandı',
  REJECTED:  'Reddedildi',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal edildi',
};

export const STORE_ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING:    'Beklemede',
  PROCESSING: 'İşlemde',
  PAID:       'Ödendi',
  SHIPPED:    'Kargoda',
  DELIVERED:  'Teslim edildi',
  CANCELLED:  'İptal edildi',
};
