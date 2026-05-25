import apiClient from './apiClient';

// ── Types ──────────────────────────────────────────────────────────────────

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
  admin?:           AdminOrderMeta;
}

export interface UpdateOrderShippingDto {
  shippingCarrier?:        string;
  shippingTrackingNumber?: string;
  shippingTrackingUrl?:    string;
  markAsShipped?:          boolean;
}

export interface OrderStats {
  total:        number;
  pending:      number;
  paid:         number;
  todayRevenue: number;
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
  customerId: string;
  items:      CreateOrderItemDto[];
  notes?:     string;
  currency?:  string;
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

export interface GetOrdersQuery {
  page?:            number;
  limit?:           number;
  status?:          OrderStatus | '';
  search?:          string;
  paymentProvider?: OrderPaymentProviderFilter | '';
  paymentStatus?:   OrderPaymentStatusFilter | '';
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

  async updateShipping(id: string, data: UpdateOrderShippingDto): Promise<Order> {
    const res = await apiClient.patch<{ data: Order }>(`${this.base}/${id}/shipping`, data);
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
