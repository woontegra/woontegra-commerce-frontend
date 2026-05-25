// Campaign Types
export type CampaignType = 
  | 'percentage_discount'    // % indirim
  | 'fixed_discount'         // Sabit indirim
  | 'buy_x_get_y'           // 3 al 2 öde
  | 'category_discount';     // Kategori indirimi

export type RuleType = 
  | 'user_specific'    // Kullanıcıya özel
  | 'product_based'    // Ürün bazlı
  | 'category_based'   // Kategori bazlı
  | 'cart_total'       // Sepet toplamı
  | 'quantity_based';  // Miktar bazlı

// Campaign Rule
export interface CampaignRule {
  id: string;
  type: RuleType;
  
  // User specific
  userIds?: string[];
  userRoles?: string[];
  
  // Product based
  productIds?: string[];
  excludeProductIds?: string[];
  
  // Category based
  categoryIds?: string[];
  excludeCategoryIds?: string[];
  
  // Cart total
  minCartTotal?: number;
  maxCartTotal?: number;
  
  // Quantity based
  minQuantity?: number;
  maxQuantity?: number;
}

// Campaign Discount
export interface CampaignDiscount {
  type: CampaignType;
  
  // Percentage discount
  percentage?: number; // 0-100
  
  // Fixed discount
  amount?: number;
  
  // Buy X Get Y
  buyQuantity?: number;  // 3 al
  getQuantity?: number;  // 2 öde (1 bedava)
  
  // Max discount limit
  maxDiscount?: number;
}

// Campaign
export interface Campaign {
  id: string;
  name: string;
  description: string;
  code?: string; // Kupon kodu (opsiyonel)
  
  // Discount
  discount: CampaignDiscount;
  
  // Rules
  rules: CampaignRule[];
  
  // Time
  startDate: string;
  endDate: string;
  
  // Limits
  usageLimit?: number;      // Toplam kullanım limiti
  usagePerUser?: number;    // Kullanıcı başına limit
  currentUsage: number;     // Mevcut kullanım
  
  // Status
  isActive: boolean;
  priority: number;         // Öncelik (yüksek önce uygulanır)
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Cart Discount Application
export interface AppliedDiscount {
  campaignId: string;
  campaignName: string;
  type: CampaignType;
  amount: number;
  description: string;
}

// Campaign Validation Result
export interface CampaignValidation {
  isValid: boolean;
  campaign: Campaign;
  discount: number;
  reason?: string;
}
