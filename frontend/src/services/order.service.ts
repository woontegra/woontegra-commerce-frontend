import apiClient from './apiClient';

// ── Types ──────────────────────────────────────────────────────────────────

export type OrderSource = 'STOREFRONT' | 'TRENDYOL';
export type OrderSourceFilter = 'all' | 'storefront' | 'trendyol';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderCustomer {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  phone?:    string | null;
  address?:  string | null;
  city?:     string | null;
  zipCode?:  string | null;
}

export interface OrderItemProduct {
  id:   string;
  name: string;
  slug: string;
}

export interface OrderItemVariant {
  id:   string;
  name: string;
  sku?: string | null;
}

export interface OrderItem {
  id:             string;
  quantity:       number;
  price:          number;
  discountAmount: number;
  lineTotal?:     number;
  productId?:     string;
  variantId?:     string | null;
  product?:       OrderItemProduct | null;
  variant?:       OrderItemVariant | null;
}

export interface AdminOrderAddress {
  fullName:    string;
  phone:       string;
  addressLine: string;
  district:    string;
  city:        string;
  postalCode:  string;
}

export interface AdminBillingAddress extends AdminOrderAddress {
  sameAsShipping: boolean;
  type?:          'individual' | 'corporate';
  companyName?:   string;
  taxOffice?:     string;
  taxNumber?:     string;
}

export interface AdminOrderTotals {
  itemsSubtotal:      number;
  shippingPrice:      number;
  cashOnDeliveryFee:  number;
  couponDiscount:     number;
  campaignDiscount:   number;
  grandTotal:         number;
}

export interface AdminPaymentSummary {
  provider:        string | null;
  methodLabel:     string;
  statusLabel:     string;
  sessionStatus:   string | null;
  sessionProvider: string | null;
}

export interface OrderListPaymentView {
  provider:       string | null;
  providerLabel:  string;
  status:         string | null;
  statusLabel:    string;
}

export interface AdminOrderMeta {
  isStorefrontOrder: boolean;
  payment:           AdminPaymentSummary;
  totals:            AdminOrderTotals;
  shippingAddress?:  AdminOrderAddress | null;
  billingAddress?:   AdminBillingAddress | null;
  customerNote?:      string | null;
  systemNoteLines?:  string[];
}

export interface OrderPaymentSession {
  id:       string;
  provider: string;
  status:   string;
}

export interface Order {
  id:               string;
  orderNumber:      string;
  status:           OrderStatus;
  totalAmount:      number;
  shippingPrice:    number;
  discountAmount:   number;
  campaignDiscount: number;
  currency:         string;
  notes?:           string | null;
  createdAt:        string;
  updatedAt:        string;
  tenantId?:        string;
  customerId?:      string;
  customer?:        OrderCustomer | null;
  items:            OrderItem[];
  paymentSession?:  OrderPaymentSession | null;
  paymentProvider?: string | null;
  paymentStatus?:   string | null;
  paymentApprovedAt?: string | null;
  paymentFailedAt?:   string | null;
  payment?:          OrderListPaymentView;
  shippingCarrier?:        string | null;
  shippingTrackingNumber?: string | null;
  shippingTrackingUrl?:    string | null;
  shippedAt?:              string | null;
  shippingNotificationSentAt?: string | null;
  invoiceNumber?:     string | null;
  invoiceUrl?:        string | null;
  invoiceUploadedAt?: string | null;
  admin?:           AdminOrderMeta;
  /** Unified list (storefront + Trendyol merge) */
  source?:               OrderSource;
  sourceLabel?:          string;
  displayOrderNumber?:   string;
  customerName?:         string;
  customerEmail?:        string;
  fulfillmentStatus?:    string;
  externalStatus?:       string;
  externalStatusLabel?:  string;
  orderDate?:            string;
  sourceSyncedAt?:       string;
  canEditStatus?:        boolean;
  canEditShipping?:      boolean;
  cargoTrackingNumber?:  string | null;
}

export interface UpdateOrderShippingDto {
  shippingCarrier?:        string;
  shippingTrackingNumber?: string;
  shippingTrackingUrl?:    string;
  markAsShipped?:          boolean;
}

export interface UpdateOrderInvoiceDto {
  invoiceNumber?: string | null;
  invoiceUrl?:    string | null;
}

export interface BulkUpdateOrderStatusResult {
  updatedCount: number;
  skippedCount: number;
  failedCount:  number;
  skippedIds?:   string[];
  failures?:    Array<{ id: string; error: string }>;
}

export interface OrderStats {
  total:              number;
  pending:            number;
  paid:               number;
  todayRevenue:       number;
  storefrontCount?:   number;
  trendyolCount?:     number;
  totalCount?:        number;
  storefrontPending?: number;
  trendyolPending?:   number;
}

export interface OrdersResponse {
  orders:     Order[];
  total:      number;
  page:       number;
  totalPages: number;
}

export interface CreateOrderItemDto {
  productId:  string;
  variantId?: string;
  quantity:   number;
  price:      number;
}

export interface CreateOrderDto {
  customerId:      string;
  items:           CreateOrderItemDto[];
  notes?:          string;
  currency?:       string;
  paymentProvider?: OrderPaymentProviderFilter;
  paymentStatus?:   OrderPaymentStatusFilter;
  shippingPrice?:  number;
  extraFees?:      number;
}

export type OrderPaymentProviderFilter =
  | 'PAYTR'
  | 'BANK_TRANSFER'
  | 'CASH_ON_DELIVERY'
  | 'IYZICO'
  | 'BANK_POS';

export type OrderPaymentStatusFilter =
  | 'PENDING'
  | 'WAITING_BANK_TRANSFER'
  | 'PAID'
  | 'APPROVED'
  | 'FAILED'
  | 'CANCELLED';

export type OrderOperationFilter = 'invoice_missing' | 'tracking_missing';

export interface GetOrdersQuery {
  page?:             number;
  limit?:            number;
  status?:           OrderStatus | '';
  search?:           string;
  paymentProvider?:  OrderPaymentProviderFilter | '';
  paymentStatus?:    OrderPaymentStatusFilter | '';
  source?:           OrderSourceFilter | '';
  operationFilter?:  OrderOperationFilter | '';
}

export interface OrderHistoryEntry {
  id:                    string;
  occurredAt:            string;
  actionType:            string;
  actionLabel:           string;
  previousStatus:        string | null;
  newStatus:             string | null;
  previousPaymentStatus: string | null;
  newPaymentStatus:      string | null;
  actorEmail:            string | null;
  note:                  string | null;
}

// ── Service ────────────────────────────────────────────────────────────────

class OrderService {
  private base = '/orders';

  async getAll(query: GetOrdersQuery = {}): Promise<OrdersResponse> {
    const params = Object.fromEntries(
      Object.entries(query).filter(([, v]) => v !== '' && v != null),
    );
    const res = await apiClient.get<{ data: OrdersResponse }>(this.base, { params });
    return res.data.data;
  }

  async getById(id: string): Promise<Order> {
    const res = await apiClient.get<{ data: Order }>(`${this.base}/${id}`);
    return res.data.data;
  }

  async getHistory(id: string): Promise<OrderHistoryEntry[]> {
    const res = await apiClient.get<{ data: OrderHistoryEntry[] }>(`${this.base}/${id}/history`);
    return res.data.data;
  }

  async getStats(): Promise<OrderStats> {
    const res = await apiClient.get<{ data: OrderStats }>(`${this.base}/stats`);
    return res.data.data;
  }

  async create(data: CreateOrderDto): Promise<Order> {
    const res = await apiClient.post<{ data: { order: Order } }>(this.base, data);
    return res.data.data.order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const res = await apiClient.patch<{ data: Order }>(`${this.base}/${id}/status`, { status });
    return res.data.data;
  }

  async bulkUpdateStatus(
    orderIds: string[],
    status: OrderStatus,
  ): Promise<BulkUpdateOrderStatusResult> {
    const res = await apiClient.patch<{ data: BulkUpdateOrderStatusResult }>(
      `${this.base}/bulk/status`,
      { orderIds, status },
    );
    return res.data.data;
  }

  async confirmPayment(id: string): Promise<Order> {
    const res = await apiClient.patch<{ data: Order }>(`${this.base}/${id}/confirm-payment`);
    return res.data.data;
  }

  async updateShipping(id: string, data: UpdateOrderShippingDto): Promise<Order> {
    const res = await apiClient.patch<{ data: Order }>(`${this.base}/${id}/shipping`, data);
    return res.data.data;
  }

  async updateInvoice(id: string, data: UpdateOrderInvoiceDto): Promise<Order> {
    const res = await apiClient.patch<{ data: Order }>(`${this.base}/${id}/invoice`, data);
    return res.data.data;
  }

  async uploadInvoicePdf(id: string, file: File): Promise<Order> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<{ data: Order }>(`${this.base}/${id}/invoice/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  }

  async cancel(id: string): Promise<Order> {
    return this.updateStatus(id, 'CANCELLED');
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.base}/${id}`);
  }

  async getByCustomer(customerId: string): Promise<Order[]> {
    const res = await apiClient.get<{ data: Order[] }>(`${this.base}/customer/${customerId}`);
    return res.data.data;
  }
}

export const orderService = new OrderService();
