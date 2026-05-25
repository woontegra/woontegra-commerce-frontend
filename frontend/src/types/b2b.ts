// B2B Infrastructure

export type UserGroup = 'normal' | 'bayi';

export interface User {
  id: string;
  email: string;
  name: string;
  group: UserGroup;
  b2bProfile?: B2BProfile;
}

export interface CustomerGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  _count?: {
    customers: number;
  };
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  group?: CustomerGroup;
  _count?: {
    orders: number;
  };
}

export interface B2BProfile {
  companyName: string;
  taxNumber: string;
  taxOffice: string;
  
  // Pricing
  discountRate: number;        // Genel indirim oranı (%)
  priceGroup?: string;          // Fiyat grubu (A, B, C)
  
  // Payment
  paymentTerms: number;         // Vade (gün)
  creditLimit: number;          // Kredi limiti
  currentDebt: number;          // Mevcut borç
  
  // Limits
  minOrderAmount: number;       // Minimum sipariş tutarı
  maxOrderAmount?: number;      // Maximum sipariş tutarı
  
  // Status
  status: 'active' | 'suspended' | 'pending';
  approvedAt?: string;
  approvedBy?: string;
}

export interface B2BPricing {
  productId: string;
  
  // Group-based pricing
  prices: {
    normal: number;             // Normal müşteri fiyatı
    bayi: number;               // Bayi fiyatı
  };
  
  // Price groups (optional)
  priceGroups?: {
    A: number;                  // VIP bayiler
    B: number;                  // Standart bayiler
    C: number;                  // Yeni bayiler
  };
  
  // Quantity-based pricing
  quantityPricing?: Array<{
    minQuantity: number;
    price: number;
    discountRate?: number;
  }>;
}

export interface B2BDiscount {
  id: string;
  name: string;
  
  // Target
  userGroup: UserGroup;
  priceGroup?: string;
  
  // Discount
  type: 'percentage' | 'fixed';
  value: number;
  
  // Conditions
  minOrderAmount?: number;
  minQuantity?: number;
  productIds?: string[];
  categoryIds?: string[];
  
  // Validity
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface B2BPaymentMethod {
  id: string;
  name: string;
  type: 'credit_card' | 'bank_transfer' | 'on_credit' | 'cash';
  
  // Availability
  availableFor: UserGroup[];
  
  // Terms
  paymentTerms?: number;        // Vade (gün) - sadece on_credit için
  installments?: number[];      // Taksit seçenekleri
  
  // Fees
  fee?: number;                 // İşlem ücreti (%)
  minAmount?: number;
  maxAmount?: number;
}

export interface B2BOrder {
  orderId: string;
  userId: string;
  userGroup: UserGroup;
  
  // Pricing
  subtotal: number;
  b2bDiscount: number;          // B2B indirimi
  total: number;
  
  // Payment
  paymentMethod: string;
  paymentTerms?: number;
  dueDate?: string;             // Ödeme vadesi
  
  // Status
  paymentStatus: 'pending' | 'paid' | 'overdue';
  isPaid: boolean;
}
