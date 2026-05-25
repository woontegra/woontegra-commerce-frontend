import { storePublicClient } from '../../services/storePublicApi';
import type { ReturnRequest } from './storefrontReturnsApi';

export type CustomerAddress = {
  id:          string;
  title:       string;
  fullName:    string;
  phone:       string;
  city:        string;
  district:    string;
  addressLine: string;
  postalCode:  string | null;
  isDefault:   boolean;
};

export type MyOrderSummary = {
  id:            string;
  orderNumber:   string;
  status:        string;
  paymentStatus?: string | null;
  totalAmount:   number;
  currency:      string;
  createdAt:     string;
  itemCount:     number;
  paymentProvider?:     string | null;
  paymentApprovedAt?:   string | null;
  paymentFailedAt?:     string | null;
  paymentMethod:        string;
  paymentStatusLabel?:  string;
  shippingPrice: number;
  shippingCarrier?:        string | null;
  shippingTrackingNumber?: string | null;
  shippingTrackingUrl?:    string | null;
  shippedAt?:              string | null;
};

export type MyOrdersListParams = {
  status?: string;
  filter?: string;
  page?:  number;
  limit?: number;
};

export type MyOrdersPagination = {
  page:        number;
  limit:       number;
  total:       number;
  totalPages:  number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type MyOrdersListResult = {
  orders:     MyOrderSummary[];
  pagination: MyOrdersPagination;
};

export type MyOrderSummaryStats = {
  total:          number;
  waitingPayment: number;
  processing:     number;
  shipped:        number;
  delivered:      number;
  cancelled:      number;
};

export type MyOrderDetail = {
  id:              string;
  orderNumber:     string;
  status:          string;
  currency:        string;
  createdAt:       string;
  notes:           string | null;
  payment: {
    provider:      string | null;
    providerLabel: string;
    status:        string | null;
    statusLabel:   string;
    approvedAt:    string | null;
    failedAt:      string | null;
    hint:          string;
    methodLabel:   string;
  };
  bankTransferPayment: {
    bankName:         string | null;
    accountHolder:    string | null;
    iban:             string | null;
    description:      string | null;
    paymentReference: string;
  } | null;
  totals:          {
    itemsSubtotal:     number;
    shippingPrice:     number;
    cashOnDeliveryFee: number;
    couponDiscount:    number;
    campaignDiscount:  number;
    grandTotal:        number;
  };
  shippingAddress: { fullName: string; phone: string; addressLine: string; district: string; city: string; postalCode: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    lineTotal: number;
    product: { id: string; name: string; slug: string } | null;
    variant: { id: string; name: string; sku?: string | null } | null;
  }>;
  activeReturnRequest?: ReturnRequest | null;
  shippingCarrier?:        string | null;
  shippingTrackingNumber?: string | null;
  shippingTrackingUrl?:    string | null;
  shippedAt?:              string | null;
};

export async function fetchMyOrders(
  tenantSlug: string,
  listParams?: MyOrdersListParams,
): Promise<MyOrdersListResult> {
  const params: Record<string, string> = { tenant: tenantSlug };
  if (listParams?.status) params.status = listParams.status;
  if (listParams?.filter) params.filter = listParams.filter;
  if (listParams?.page != null) params.page = String(listParams.page);
  if (listParams?.limit != null) params.limit = String(listParams.limit);

  const r = await storePublicClient.get<{
    success: boolean;
    orders?: MyOrderSummary[];
    pagination?: MyOrdersPagination;
    error?: string;
  }>(
    '/store/account/orders',
    { params },
  );
  if (!r.data.success) throw new Error(r.data.error || 'Siparişler alınamadı.');
  const pagination = r.data.pagination ?? {
    page: 1,
    limit: 10,
    total: r.data.orders?.length ?? 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };
  return { orders: r.data.orders ?? [], pagination };
}

export async function fetchMyOrderSummary(tenantSlug: string): Promise<MyOrderSummaryStats> {
  const r = await storePublicClient.get<{
    success: boolean;
    summary?: MyOrderSummaryStats;
    error?: string;
  }>('/store/account/orders/summary', { params: { tenant: tenantSlug } });
  if (!r.data.success || !r.data.summary) {
    throw new Error(r.data.error || 'Sipariş özeti alınamadı.');
  }
  return r.data.summary;
}

export async function fetchMyOrder(tenantSlug: string, orderNumber: string): Promise<MyOrderDetail> {
  const r = await storePublicClient.get<{ success: boolean; order?: MyOrderDetail; error?: string }>(
    `/store/account/orders/${encodeURIComponent(orderNumber)}`,
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success || !r.data.order) throw new Error(r.data.error || 'Sipariş bulunamadı.');
  return r.data.order;
}

export async function fetchMyAddresses(tenantSlug: string): Promise<CustomerAddress[]> {
  const r = await storePublicClient.get<{ success: boolean; addresses?: CustomerAddress[]; error?: string }>(
    '/store/account/addresses',
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success) throw new Error(r.data.error || 'Adresler alınamadı.');
  return r.data.addresses ?? [];
}

export type CreateAddressBody = {
  title:       string;
  fullName:    string;
  phone:       string;
  city:        string;
  district:    string;
  addressLine: string;
  postalCode:  string;
  isDefault:   boolean;
};

export async function createMyAddress(
  tenantSlug: string,
  body: CreateAddressBody,
): Promise<CustomerAddress> {
  const r = await storePublicClient.post<{ success: boolean; address?: CustomerAddress; error?: string }>(
    '/store/account/addresses',
    body,
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success || !r.data.address) throw new Error(r.data.error || 'Adres eklenemedi.');
  return r.data.address;
}

export type UpdateProfileBody = {
  firstName: string;
  lastName:  string;
  phone:     string;
};

export type UpdateAddressBody = Partial<CreateAddressBody>;

export async function updateMyProfile(
  tenantSlug: string,
  body: UpdateProfileBody,
): Promise<{ id: string; email: string; firstName: string; lastName: string; phone: string }> {
  const r = await storePublicClient.put<{
    success: boolean;
    customer?: { id: string; email: string; firstName: string; lastName: string; phone: string };
    error?: string;
  }>('/store/account/profile', body, { params: { tenant: tenantSlug } });
  if (!r.data.success || !r.data.customer) throw new Error(r.data.error || 'Profil güncellenemedi.');
  return r.data.customer;
}

export async function updateMyAddress(
  tenantSlug: string,
  id: string,
  body: UpdateAddressBody,
): Promise<CustomerAddress> {
  const r = await storePublicClient.put<{ success: boolean; address?: CustomerAddress; error?: string }>(
    `/store/account/addresses/${id}`,
    body,
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success || !r.data.address) throw new Error(r.data.error || 'Adres güncellenemedi.');
  return r.data.address;
}

export async function deleteMyAddress(tenantSlug: string, id: string): Promise<void> {
  const r = await storePublicClient.delete<{ success: boolean; error?: string }>(
    `/store/account/addresses/${id}`,
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success) throw new Error(r.data.error || 'Adres silinemedi.');
}
