// Advanced Shipping System

export type ShippingPriceType = 'fixed' | 'dynamic' | 'free';

export interface ShippingRegion {
  id: string;
  name: string;
  cities: string[];      // İstanbul, Ankara, İzmir
  price: number;
  estimatedDays: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  
  // Price Type
  priceType: ShippingPriceType;
  basePrice: number;
  
  // Region-based Pricing
  regions?: ShippingRegion[];
  
  // Free Shipping Rules
  freeShippingThreshold?: number;  // 500 TL üzeri ücretsiz
  
  // Weight-based Pricing (optional)
  weightRanges?: Array<{
    minWeight: number;
    maxWeight: number;
    price: number;
  }>;
  
  // Delivery Time
  minDeliveryDays: number;
  maxDeliveryDays: number;
  
  // Restrictions
  maxCartTotal?: number;
  minCartTotal?: number;
  
  // Status
  active: boolean;
  displayOrder: number;
  
  // Metadata
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

// Shipping Address
export interface ShippingAddress {
  city: string;
  district?: string;
  address: string;
  postalCode?: string;
}

// Shipping Calculation Result
export interface ShippingCalculationResult {
  methodId: string;
  methodName: string;
  price: number;
  originalPrice?: number;  // If free shipping applied
  estimatedDays: number;
  isFree: boolean;
  region?: string;
}

// Cart for Shipping Calculation
export interface ShippingCart {
  items: Array<{
    weight?: number;
    quantity: number;
  }>;
  subtotal: number;
  total: number;
}

// Advanced Shipping Rules
export type CalculationType = 'fixed' | 'percentage' | 'weight_based';

export interface WeightRange {
  min: number;
  max: number;
  cost: number;
}

export interface ShippingRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  
  // Conditions
  minOrderAmount?: number;
  maxOrderAmount?: number;
  cities: string[];
  excludedCities: string[];
  
  // Pricing
  shippingCost: number;
  freeShippingThreshold?: number;
  
  // Advanced
  calculationType: CalculationType;
  percentageRate?: number;
  weightRanges?: WeightRange[];
  
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShippingRuleDto {
  name: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
  minOrderAmount?: number;
  maxOrderAmount?: number;
  cities?: string[];
  excludedCities?: string[];
  shippingCost: number;
  freeShippingThreshold?: number;
  calculationType?: CalculationType;
  percentageRate?: number;
  weightRanges?: WeightRange[];
}

export interface UpdateShippingRuleDto extends Partial<CreateShippingRuleDto> {}

export interface ShippingCalculationInput {
  orderAmount: number;
  city: string;
  weight?: number;
}

export interface ShippingCalculationResponse {
  cost: number;
  ruleName: string;
  isFree: boolean;
  appliedRule: ShippingRule | null;
}
