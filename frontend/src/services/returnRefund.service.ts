import apiClient from './apiClient';

export type RefundMethod =
  | 'MANUAL_BANK_TRANSFER'
  | 'CASH'
  | 'PAYTR_MANUAL'
  | 'IYZICO_MANUAL'
  | 'OTHER';

export type RefundRecordStatus = 'RECORDED' | 'CANCELLED';

export const REFUND_METHOD_OPTIONS: { value: RefundMethod; label: string }[] = [
  { value: 'MANUAL_BANK_TRANSFER', label: 'Banka havalesi' },
  { value: 'CASH',                 label: 'Nakit' },
  { value: 'PAYTR_MANUAL',         label: 'PayTR (manuel)' },
  { value: 'IYZICO_MANUAL',        label: 'iyzico (manuel)' },
  { value: 'OTHER',                label: 'Diğer' },
];

export type RefundSummary = {
  refundableAmount: number;
  refundedAmount: number;
  remainingAmount: number;
  currency: string;
};

export type RefundRecord = {
  id: string;
  returnRequestId: string;
  orderId: string;
  amount: number;
  currency: string;
  method: RefundMethod;
  methodLabel: string;
  status: RefundRecordStatus;
  note: string | null;
  refundedAt: string;
  createdAt: string;
};

export async function fetchReturnRefunds(returnRequestId: string): Promise<{
  summary: RefundSummary;
  refunds: RefundRecord[];
}> {
  const r = await apiClient.get<{
    success: boolean;
    summary?: RefundSummary;
    refunds?: RefundRecord[];
    error?: string;
  }>(`/returns/${returnRequestId}/refunds`);
  if (!r.data.success || !r.data.summary) {
    throw new Error(r.data.error || 'İade kayıtları alınamadı.');
  }
  return { summary: r.data.summary, refunds: r.data.refunds ?? [] };
}

export async function createReturnRefund(
  returnRequestId: string,
  body: {
    amount: number;
    method: RefundMethod;
    note?: string;
    refundedAt: string;
  },
): Promise<{ refund: RefundRecord; summary: RefundSummary }> {
  const r = await apiClient.post<{
    success: boolean;
    refund?: RefundRecord;
    summary?: RefundSummary;
    error?: string;
  }>(`/returns/${returnRequestId}/refunds`, body);
  if (!r.data.success || !r.data.refund || !r.data.summary) {
    throw new Error(r.data.error || 'Kayıt oluşturulamadı.');
  }
  return { refund: r.data.refund, summary: r.data.summary };
}

export async function cancelReturnRefund(refundId: string): Promise<{
  refund: RefundRecord;
  summary: RefundSummary;
}> {
  const r = await apiClient.patch<{
    success: boolean;
    refund?: RefundRecord;
    summary?: RefundSummary;
    error?: string;
  }>(`/returns/refunds/${refundId}/cancel`);
  if (!r.data.success || !r.data.refund || !r.data.summary) {
    throw new Error(r.data.error || 'İptal edilemedi.');
  }
  return { refund: r.data.refund, summary: r.data.summary };
}
