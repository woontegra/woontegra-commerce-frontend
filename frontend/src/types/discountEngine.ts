// Advanced Discount Engine

export type DiscountType = 'campaign' | 'coupon' | 'special';
export type DiscountPriority = 1 | 2 | 3; // 1 = highest (campaign), 3 = lowest (special)

export interface DiscountRule {
  id: string;
  name: string;
  type: DiscountType;
  priority: DiscountPriority;
  
  // Conditions
  conditions: {
    // User rules
    userIds?: string[];
    userGroups?: string[];
    userTags?: string[];
    
    // Product rules
    productIds?: string[];
    categoryIds?: string[];
    productTags?: string[];
    
    // Cart rules
    minCartTotal?: number;
    maxCartTotal?: number;
    minQuantity?: number;
    maxQuantity?: number;
    
    // Date rules
    startDate?: string;
    endDate?: string;
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    timeRange?: {
      start: string; // HH:mm
      end: string;   // HH:mm
    };
  };
  
  // Discount
  discount: {
    type: 'percentage' | 'fixed' | 'buy_x_get_y';
    value: number;
    maxDiscount?: number;
    
    // Buy X Get Y
    buyQuantity?: number;
    getQuantity?: number;
    getFree?: boolean;
  };
  
  // Limits
  usageLimit?: number;
  usagePerUser?: number;
  currentUsage: number;
  
  // Stacking
  stackable: boolean;
  excludesWith?: string[]; // Rule IDs that cannot be combined
  
  // Status
  isActive: boolean;
}

export interface DiscountCalculation {
  ruleId: string;
  ruleName: string;
  type: DiscountType;
  priority: DiscountPriority;
  amount: number;
  appliedTo: Array<{
    productId: string;
    quantity: number;
    discount: number;
  }>;
}

export interface DiscountEngineResult {
  totalDiscount: number;
  appliedDiscounts: DiscountCalculation[];
  skippedDiscounts: Array<{
    ruleId: string;
    reason: string;
  }>;
  finalTotal: number;
}

export interface CartItem {
  productId: string;
  categoryId?: string;
  productTags?: string[];
  quantity: number;
  price: number;
}

export interface DiscountContext {
  userId?: string;
  userGroup?: string;
  userTags?: string[];
  cartItems: CartItem[];
  cartTotal: number;
  appliedCoupons?: string[];
  timestamp: Date;
}
