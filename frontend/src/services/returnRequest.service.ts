import apiClient from './apiClient';

export type ReturnRequestType = 'CANCEL_REQUEST' | 'RETURN_REQUEST';
export type ReturnRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export type ReturnRequestItem = {
  id:            string;
  orderItemId:   string;
  quantity:      number;
  reason:        string | null;
  productName?:  string;
  productSlug?:  string;
  variantName?:  string | null;
  orderQuantity?: number;
  linePrice?:    number;
};

export type ReturnRequest = {
  id:            string;
  requestNumber: string;
  tenantId:      string;
  orderId:       string;
  customerId:    string;
  type:          ReturnRequestType;
  status:        ReturnRequestStatus;
  reason:        string;
  customerNote:  string | null;
  adminNote:       string | null;
  stockRestoredAt: string | null;
  createdAt:       string;
  updatedAt:       string;
  order?: {
    id:          string;
    orderNumber: string;
    status:      string;
    totalAmount?: number;
  };
  customer?: {
    id:        string;
    email:     string;
    firstName: string;
    lastName:  string;
    phone:     string;
  };
  items: ReturnRequestItem[];
};

export async function fetchReturnRequests(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: ReturnRequest[]; total: number; page: number; totalPages: number }> {
  const r = await apiClient.get<{
    success: boolean;
    items?: ReturnRequest[];
    total?: number;
    page?: number;
    totalPages?: number;
    error?: string;
  }>('/returns', { params });
  if (!r.data.success) throw new Error(r.data.error || 'Talepler alınamadı.');
  return {
    items:      r.data.items ?? [],
    total:      r.data.total ?? 0,
    page:       r.data.page ?? 1,
    totalPages: r.data.totalPages ?? 1,
  };
}

export async function fetchReturnRequest(id: string): Promise<ReturnRequest> {
  const r = await apiClient.get<{ success: boolean; request?: ReturnRequest; error?: string }>(
    `/returns/${id}`,
  );
  if (!r.data.success || !r.data.request) throw new Error(r.data.error || 'Talep bulunamadı.');
  return r.data.request;
}

export async function fetchReturnRequestsByOrder(orderId: string): Promise<ReturnRequest[]> {
  const r = await apiClient.get<{ success: boolean; requests?: ReturnRequest[]; error?: string }>(
    `/returns/order/${orderId}`,
  );
  if (!r.data.success) throw new Error(r.data.error || 'Talepler alınamadı.');
  return r.data.requests ?? [];
}

export type ReturnStatusSync = {
  orderSynced: boolean;
  orderStatus?: string;
  message?: string;
  stockRestored?: boolean;
  stockAlreadyRestored?: boolean;
};

export async function updateReturnRequestStatus(
  id: string,
  status: ReturnRequestStatus,
  adminNote?: string,
): Promise<{ request: ReturnRequest; sync?: ReturnStatusSync }> {
  const r = await apiClient.patch<{
    success: boolean;
    request?: ReturnRequest;
    sync?: ReturnStatusSync;
    error?: string;
  }>(`/returns/${id}/status`, { status, adminNote });
  if (!r.data.success || !r.data.request) throw new Error(r.data.error || 'Güncellenemedi.');
  return { request: r.data.request, sync: r.data.sync };
}
