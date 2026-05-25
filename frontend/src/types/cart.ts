// E-commerce Cart System with Campaign Support

// 1. CART ITEM
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  
  // Variant support
  variantId?: string;
  variantOptions?: Record<string, string>; // { "Renk": "Kırmızı", "Beden": "M" }
  
  // Category for campaign targeting
  categoryId: string;
  
  // Pricing
  basePrice: number;      // Original price
  finalPrice: number;     // After all discounts
  
  // Quantity
  quantity: number;
  
  // Stock info
  stock: number;
  
  // Metadata
  sku: string;
}

// 2. DISCOUNT BREAKDOWN
export interface DiscountBreakdown {
  // Campaign discounts
  campaignDiscount: number;
  appliedCampaigns: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  
  // Coupon discount
  couponDiscount: number;
  appliedCoupon?: {
    code: string;
    amount: number;
  };
  
  // Total discount
  discountTotal: number;
}

// 3. SHIPPING INFO
export interface ShippingInfo {
  method: 'standard' | 'express' | 'free';
  cost: number;
  freeShippingThreshold?: number;
  estimatedDays: number;
}

// 4. CART
export interface Cart {
  items: CartItem[];
  
  // Calculation breakdown
  subtotal: number;           // Base total (sum of basePrice × quantity)
  discountBreakdown: DiscountBreakdown;
  shipping: ShippingInfo;
  total: number;              // Final total
  
  // Metadata
  itemCount: number;          // Total items
  updatedAt: string;
}

// 5. COUPON
export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minCartAmount?: number;
  maxDiscountAmount?: number;
  expiresAt?: string;
  usageLimit?: number;
  currentUsage: number;
  isActive: boolean;
}

// Cart calculation result
export interface CartCalculationResult {
  subtotal: number;
  campaignDiscount: number;
  couponDiscount: number;
  discountTotal: number;
  shipping: number;
  total: number;
  breakdown: DiscountBreakdown;
}
