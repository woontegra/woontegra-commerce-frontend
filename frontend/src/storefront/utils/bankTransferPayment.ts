import type { MyOrderDetail } from '../services/storefrontAccountApi';

/** Havale/EFT bilgileri kartı gösterilsin mi (backend ile uyumlu). */
export function shouldShowBankTransferPaymentSection(order: MyOrderDetail): boolean {
  if (order.status === 'CANCELLED' || order.status === 'DELIVERED') return false;

  const { provider, status } = order.payment;
  if (provider !== 'BANK_TRANSFER') return false;
  if (status === 'PAID' || status === 'APPROVED' || status === 'CANCELLED') return false;
  if (status === 'WAITING_BANK_TRANSFER' || status === 'PENDING') return true;
  if (!status && ['PENDING', 'PROCESSING'].includes(order.status)) return true;
  return false;
}

export type BankTransferPaymentFields = {
  bankName?: string | null;
  iban?: string | null;
} | null | undefined;

export function hasBankTransferPaymentDetails(bt: BankTransferPaymentFields): boolean {
  return Boolean(bt?.iban?.trim() && bt?.bankName?.trim());
}

export type PaymentPendingOrderFields = {
  status: string;
  paymentProvider: string | null;
  paymentStatus: string | null;
};

/** Ödeme bekleniyor sayfasında havale bilgisi bölümü gösterilsin mi. */
export function shouldShowBankTransferOnPendingPage(order: PaymentPendingOrderFields): boolean {
  if (order.status === 'CANCELLED' || order.status === 'DELIVERED') return false;
  if (order.paymentProvider !== 'BANK_TRANSFER') return false;
  const ps = order.paymentStatus;
  if (ps === 'PAID' || ps === 'APPROVED' || ps === 'CANCELLED') return false;
  if (ps === 'WAITING_BANK_TRANSFER' || ps === 'PENDING') return true;
  if (!ps && ['PENDING', 'PROCESSING'].includes(order.status)) return true;
  return false;
}

export function isBankTransferPaymentSettled(order: PaymentPendingOrderFields): boolean {
  return order.paymentProvider === 'BANK_TRANSFER'
    && (order.paymentStatus === 'PAID' || order.paymentStatus === 'APPROVED');
}

export const BANK_TRANSFER_APPROVED_TITLE =
  'Ödemeniz onaylandı';

export const BANK_TRANSFER_APPROVED_DESCRIPTION =
  'Havale/EFT ödemeniz mağaza tarafından onaylandı. Siparişiniz hazırlık sürecine alınacaktır.';

export function isBankTransferPaymentWaiting(order: PaymentPendingOrderFields): boolean {
  return shouldShowBankTransferOnPendingPage(order);
}

/** Ödeme bekleniyor sayfasında periyodik durum kontrolü yapılsın mı. */
export function shouldPollPaymentPendingStatus(order: PaymentPendingOrderFields): boolean {
  return isBankTransferPaymentWaiting(order);
}

/** Polling durdurulmalı mı (onay, iptal, teslim, uyumsuz yöntem). */
export function shouldStopPollingPaymentPending(order: PaymentPendingOrderFields): boolean {
  if (!order.paymentProvider || order.paymentProvider !== 'BANK_TRANSFER') return true;
  if (order.status === 'CANCELLED' || order.status === 'DELIVERED') return true;
  if (isBankTransferPaymentSettled(order)) return true;
  if (order.paymentStatus === 'CANCELLED') return true;
  return !isBankTransferPaymentWaiting(order);
}
