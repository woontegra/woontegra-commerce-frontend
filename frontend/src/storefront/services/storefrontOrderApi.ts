import { storePublicClient } from '../../services/storePublicApi';
import type { CreateStoreOrderPayload, CreateStoreOrderResponse } from '../types/storefront.types';

export async function createStoreOrder(
  tenantSlug: string,
  payload: CreateStoreOrderPayload,
): Promise<CreateStoreOrderResponse> {
  const r = await storePublicClient.post<CreateStoreOrderResponse>('/store/orders', payload, {
    params: { tenant: tenantSlug },
  });
  return r.data;
}

export type StoreOrderStatusResponse = {
  success: boolean;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    currency: string;
    createdAt: string;
  };
  payment?: {
    provider: string | null;
    status: string | null;
  };
  error?: string;
};

export async function getStoreOrderStatus(
  tenantSlug: string,
  orderNumber: string,
): Promise<StoreOrderStatusResponse> {
  const encoded = encodeURIComponent(decodeURIComponent(orderNumber));
  const r = await storePublicClient.get<StoreOrderStatusResponse>(
    `/store/orders/${encoded}/status`,
    { params: { tenant: tenantSlug } },
  );
  return r.data;
}

export type StorePaymentPendingResponse = {
  success: boolean;
  order?: {
    orderNumber:          string;
    status:               string;
    paymentProvider:      string | null;
    paymentStatus:        string | null;
    paymentProviderLabel: string;
    paymentStatusLabel:   string;
    totalAmount:          number;
    currency:             string;
    createdAt:            string;
    paymentApprovedAt?:   string | null;
  };
  bankTransferPayment?: {
    bankName:         string | null;
    accountHolder:    string | null;
    iban:             string | null;
    description:      string | null;
    paymentReference: string;
  } | null;
  error?: string;
};

export async function getStoreOrderPaymentPending(
  tenantSlug: string,
  orderNumber: string,
): Promise<StorePaymentPendingResponse> {
  const encoded = encodeURIComponent(decodeURIComponent(orderNumber));
  const r = await storePublicClient.get<StorePaymentPendingResponse>(
    `/store/orders/${encoded}/payment-pending`,
    { params: { tenant: tenantSlug } },
  );
  return r.data;
}

export type ResendPaymentPendingEmailResponse = {
  success: boolean;
  message?: string;
};

export async function resendStoreOrderPaymentPendingEmail(
  tenantSlug: string,
  orderNumber: string,
): Promise<ResendPaymentPendingEmailResponse> {
  const encoded = encodeURIComponent(decodeURIComponent(orderNumber));
  const r = await storePublicClient.post<ResendPaymentPendingEmailResponse>(
    `/store/orders/${encoded}/payment-pending/resend-email`,
    {},
    { params: { tenant: tenantSlug } },
  );
  return r.data;
}
