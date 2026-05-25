export type MarketplaceType = 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'AMAZON' | 'CUSTOM';

export interface MarketplaceConfig {
  id: string;
  name: string;
  type: MarketplaceType;
  isActive: boolean;
  credentials: any;
  settings: any;
}

export interface StockSyncItem {
  productId: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  price?: number;
  marketplaceProductId?: string;
  marketplaceSku?: string;
}

export interface StockSyncResult {
  marketplaceId: string;
  marketplaceName: string;
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    productId: string;
    error: string;
  }>;
  duration: number;
}

export interface StockSyncHistory {
  id: string;
  tenantId: string;
  marketplaceId: string;
  marketplaceName: string;
  totalProducts: number;
  succeededProducts: number;
  failedProducts: number;
  duration: number;
  errors: Array<{
    productId: string;
    error: string;
  }>;
  triggeredBy: string;
  createdAt: string;
}

export interface ConnectionTestResult {
  connected: boolean;
  message: string;
}

export interface StockSyncHistoryResponse {
  history: StockSyncHistory[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
