// Professional Checkout Rules System

export type CheckoutRuleType = 
  | 'min_total'           // Minimum sipariş tutarı
  | 'max_total'           // Maximum sipariş tutarı
  | 'payment_limit'       // Ödeme yöntemi limiti
  | 'shipping_limit'      // Kargo yöntemi limiti
  | 'product_limit'       // Ürün bazlı limit
  | 'category_limit';     // Kategori bazlı limit

export type PaymentMethod = 
  | 'credit_card'         // Kredi kartı
  | 'cash_on_delivery'    // Kapıda ödeme
  | 'bank_transfer'       // Havale/EFT
  | 'mobile_payment';     // Mobil ödeme

export type ShippingMethod = 
  | 'standard'            // Standart kargo
  | 'express'             // Hızlı kargo
  | 'free';               // Ücretsiz kargo

export interface CheckoutRule {
  id: string;
  name: string;
  description?: string;
  
  // Rule Type
  type: CheckoutRuleType;
  
  // Value & Condition
  value: number;
  condition: 'min' | 'max' | 'equals';
  
  // Targeting
  paymentMethods?: PaymentMethod[];
  shippingMethods?: ShippingMethod[];
  productIds?: string[];
  categoryIds?: string[];
  
  // Status
  active: boolean;
  
  // Error Message
  errorMessage: string;
  
  createdAt: string;
  updatedAt: string;
}

// Checkout Validation Result
export interface CheckoutValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// Checkout Context
export interface CheckoutContext {
  cart: {
    items: any[];
    subtotal: number;
    total: number;
  };
  paymentMethod?: PaymentMethod;
  shippingMethod?: ShippingMethod;
  user?: {
    id: string;
    email: string;
  };
}
