// Advanced Campaign Engine Types

export type CampaignType = 'percentage' | 'fixed' | 'bxgy';

export type UserGroup = 'all' | 'new' | 'returning' | 'vip';

// 1. CAMPAIGN MODEL
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  
  // Type & Value
  type: CampaignType;
  value: number; // percentage: 10 (10%), fixed: 50 (50 TL), bxgy: not used
  
  // BXGY Config
  bxgyConfig?: {
    buy: number;  // 3 al
    pay: number;  // 2 öde
  };
  
  // Dates
  startDate: string;
  endDate: string;
  
  // Status
  active: boolean;
  
  // Target
  target: CampaignTarget;
  
  // Stats
  usageCount: number;
  totalDiscount: number;
  
  createdAt: string;
  updatedAt: string;
}

// 2. CAMPAIGN TARGET
export interface CampaignTarget {
  // Product targeting
  productIds?: string[];
  
  // Category targeting
  categoryIds?: string[];
  
  // User targeting
  userGroup?: UserGroup;
  
  // Minimum cart amount
  minCartAmount?: number;
  
  // Maximum discount limit
  maxDiscountAmount?: number;
}

// Cart Item for Campaign Application
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  categoryId: string;
  price: number;
  quantity: number;
  originalPrice: number;
}

// Cart with Campaign Applied
export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  appliedCampaigns: AppliedCampaign[];
}

// Applied Campaign Info
export interface AppliedCampaign {
  campaignId: string;
  campaignName: string;
  campaignType: CampaignType;
  discountAmount: number;
  affectedItems: string[]; // item IDs
}

// Campaign Application Result
export interface CampaignApplicationResult {
  success: boolean;
  discountAmount: number;
  appliedCampaign?: AppliedCampaign;
  message?: string;
}
