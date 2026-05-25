// Order Flow
export type OrderStep = 'cart' | 'address' | 'payment' | 'confirmation';

export interface Address {
  id?: string;
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_transfer' | 'cash_on_delivery' | 'paypal';
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
}

// Order Notes & Gift
export interface OrderNote {
  customerNote?: string;
  adminNote?: string;
  internalNote?: string;
}

export interface GiftOption {
  isGift: boolean;
  giftMessage?: string;
  giftWrap?: boolean;
  giftWrapPrice?: number;
  recipientName?: string;
  recipientEmail?: string;
}

// Order Status
export type OrderStatus = 
  | 'pending'           // Beklemede
  | 'confirmed'         // Onaylandı
  | 'processing'        // Hazırlanıyor
  | 'shipped'           // Kargoya verildi
  | 'out_for_delivery'  // Dağıtımda
  | 'delivered'         // Teslim edildi
  | 'cancelled'         // İptal edildi
  | 'refunded';         // İade edildi

export interface OrderStatusHistory {
  id: string;
  status: OrderStatus;
  note?: string;
  createdAt: string;
  createdBy?: string;
}

// Email Notifications
export type EmailType = 
  | 'order_confirmation'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_received';

export interface EmailNotification {
  id: string;
  type: EmailType;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'pending' | 'sent' | 'failed';
}

// Complete Order
export interface Order {
  id: string;
  orderNumber: string;
  
  // Customer
  customerId: string;
  customerName: string;
  customerEmail: string;
  
  // Items
  items: OrderItem[];
  
  // Pricing
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  giftWrapCost: number;
  totalAmount: number;
  
  // Addresses
  shippingAddress: Address;
  billingAddress: Address;
  
  // Payment
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  
  // Notes & Gift
  notes: OrderNote;
  giftOption?: GiftOption;
  
  // Status
  status: OrderStatus;
  statusHistory: OrderStatusHistory[];
  
  // Tracking
  trackingNumber?: string;
  trackingUrl?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  image?: string;
}

// Checkout Context
export interface CheckoutData {
  step: OrderStep;
  cart: {
    items: OrderItem[];
    subtotal: number;
  };
  shippingAddress?: Address;
  billingAddress?: Address;
  useSameAddress: boolean;
  paymentMethod?: PaymentMethod;
  notes?: OrderNote;
  giftOption?: GiftOption;
}

// Order Automation Rules
export interface AutomationRule {
  id: string;
  name: string;
  trigger: OrderStatus;
  action: 'send_email' | 'update_status' | 'notify_admin' | 'update_inventory';
  config: Record<string, any>;
  isActive: boolean;
}
