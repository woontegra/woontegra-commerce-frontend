// Professional Coupon System

export type CouponType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  
  // Type & Value
  type: CouponType;
  value: number; // percentage: 10 (10%), fixed: 50 (50 TL)
  
  // Restrictions
  minCartTotal?: number;
  maxDiscountAmount?: number;
  
  // Usage Limits
  maxUsage?: number;      // Total usage limit
  usedCount: number;      // Current usage count
  maxUsagePerUser?: number; // Per user limit
  
  // Targeting
  productIds?: string[];   // Specific products
  categoryIds?: string[];  // Specific categories
  userIds?: string[];      // Specific users
  
  // Dates
  startDate: string;
  endDate: string;
  
  // Status
  active: boolean;
  
  // Metadata
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Coupon Validation Result
export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  discountAmount?: number;
}

// Coupon Usage Record
export interface CouponUsage {
  id: string;
  couponId: string;
  userId?: string;
  orderId?: string;
  discountAmount: number;
  usedAt: string;
}
