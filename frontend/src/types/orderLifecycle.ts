// Professional Order Lifecycle System

export const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  PREPARING: 'preparing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;  // User ID or 'system'
}

export interface OrderTracking {
  trackingNumber: string;
  shippingCompany: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  
  // Status
  status: OrderStatus;
  statusHistory: OrderStatusHistory[];
  
  // Tracking
  tracking?: OrderTracking;
  
  // Customer & Items
  customerId: string;
  customerEmail: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  
  // Pricing
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  
  // Payment
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  
  // Shipping Address
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    postalCode?: string;
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Status Flow Definition
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

// Status Labels (Turkish)
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Beklemede',
  [OrderStatus.PAID]: 'Ödeme Alındı',
  [OrderStatus.PREPARING]: 'Hazırlanıyor',
  [OrderStatus.SHIPPED]: 'Kargoda',
  [OrderStatus.DELIVERED]: 'Teslim Edildi',
  [OrderStatus.CANCELLED]: 'İptal Edildi',
};

// Status Colors
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'yellow',
  [OrderStatus.PAID]: 'blue',
  [OrderStatus.PREPARING]: 'purple',
  [OrderStatus.SHIPPED]: 'indigo',
  [OrderStatus.DELIVERED]: 'green',
  [OrderStatus.CANCELLED]: 'red',
};

// Status Icons
export const ORDER_STATUS_ICONS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '⏳',
  [OrderStatus.PAID]: '💳',
  [OrderStatus.PREPARING]: '📦',
  [OrderStatus.SHIPPED]: '🚚',
  [OrderStatus.DELIVERED]: '✅',
  [OrderStatus.CANCELLED]: '❌',
};
