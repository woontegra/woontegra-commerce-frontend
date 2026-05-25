// Product Performance Tracking System

export interface ProductStats {
  id: string;
  productId: string;
  
  // Metrics
  views: number;              // Görüntülenme sayısı
  addToCart: number;          // Sepete eklenme sayısı
  sales: number;              // Satış sayısı
  
  // Calculated Metrics
  conversionRate: number;     // (sales / views) * 100
  cartRate: number;           // (addToCart / views) * 100
  
  // Revenue
  totalRevenue: number;       // Toplam gelir
  
  // Period
  period: 'all_time' | 'today' | 'week' | 'month';
  
  // Timestamps
  lastViewedAt?: string;
  lastAddedToCartAt?: string;
  lastSoldAt?: string;
  updatedAt: string;
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  sku: string;
  
  // Stats
  stats: ProductStats;
  
  // Rankings
  viewRank?: number;
  salesRank?: number;
  revenueRank?: number;
  
  // Status
  trending: boolean;
  topSeller: boolean;
}

export const PerformanceMetric = {
  VIEWS: 'views',
  ADD_TO_CART: 'addToCart',
  SALES: 'sales',
  REVENUE: 'revenue',
  CONVERSION: 'conversion',
} as const;

export type PerformanceMetric = typeof PerformanceMetric[keyof typeof PerformanceMetric];

export interface PerformanceEvent {
  id: string;
  productId: string;
  type: 'view' | 'add_to_cart' | 'sale';
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
