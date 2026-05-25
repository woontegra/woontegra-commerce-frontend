import { storePublicClient } from '../../services/storePublicApi';
import { getStorefrontApiErrorMessage } from '../utils/apiError';

export type ReturnRequestType = 'CANCEL_REQUEST' | 'RETURN_REQUEST';
export type ReturnRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export type ReturnRequestItem = {
  id:          string;
  orderItemId: string;
  quantity:    number;
  reason:      string | null;
  productName?: string;
  variantName?: string | null;
};

export type CustomerRefundInfo = {
  amount: number;
  currency: string;
  refundedAt: string;
  methodLabel: string;
};

export type ReturnRequest = {
  id:            string;
  requestNumber: string;
  type:          ReturnRequestType;
  status:        ReturnRequestStatus;
  reason:        string;
  customerNote:  string | null;
  createdAt:     string;
  updatedAt:     string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount?: number | null;
    currency?: string | null;
  };
  items: ReturnRequestItem[];
  refunds?: CustomerRefundInfo[];
};

export async function listReturns(tenantSlug: string): Promise<ReturnRequest[]> {
  try {
    const r = await storePublicClient.get<{ success: boolean; returns?: ReturnRequest[]; error?: string }>(
      '/store/account/returns',
      { params: { tenant: tenantSlug } },
    );
    if (!r.data.success) {
      throw new Error(r.data.error || 'İade / iptal talepleriniz şu anda yüklenemedi.');
    }
    return r.data.returns ?? [];
  } catch (e: unknown) {
    throw new Error(
      getStorefrontApiErrorMessage(e, 'İade / iptal talepleriniz şu anda yüklenemedi.'),
    );
  }
}

export async function getReturn(tenantSlug: string, id: string): Promise<ReturnRequest> {
  try {
    const r = await storePublicClient.get<{ success: boolean; request?: ReturnRequest; error?: string }>(
      `/store/account/returns/${id}`,
      { params: { tenant: tenantSlug } },
    );
    if (!r.data.success || !r.data.request) {
      throw new Error(r.data.error || 'Talep bulunamadı.');
    }
    return r.data.request;
  } catch (e: unknown) {
    throw new Error(getStorefrontApiErrorMessage(e, 'Talep detayı şu anda yüklenemedi.'));
  }
}

export async function createReturnRequest(
  tenantSlug: string,
  orderNumber: string,
  body: {
    type: ReturnRequestType;
    reason: string;
    customerNote?: string;
    items?: Array<{ orderItemId: string; quantity: number; reason?: string }>;
  },
): Promise<ReturnRequest> {
  const r = await storePublicClient.post<{ success: boolean; request?: ReturnRequest; error?: string }>(
    `/store/account/orders/${encodeURIComponent(orderNumber)}/return-request`,
    body,
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success || !r.data.request) throw new Error(r.data.error || 'Talep oluşturulamadı.');
  return r.data.request;
}
