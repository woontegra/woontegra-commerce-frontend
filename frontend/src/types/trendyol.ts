// Trendyol Integration Types

// Auth
export interface TrendyolCredentials {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
}

export interface TrendyolConnection {
  id: string;
  supplierId: string;
  isActive: boolean;
  lastSync?: string;
  createdAt: string;
}

// Product Sync
export interface TrendyolProduct {
  barcode: string;
  title: string;
  productMainId: string;
  brandId: number;
  categoryId: number;
  quantity: number;
  stockCode: string;
  dimensionalWeight: number;
  description: string;
  currencyType: 'TRY' | 'USD' | 'EUR';
  listPrice: number;
  salePrice: number;
  vatRate: number;
  cargoCompanyId: number;
  images: Array<{
    url: string;
  }>;
  attributes: Array<{
    attributeId: number;
    attributeValueId: number;
  }>;
}

export interface ProductSyncResult {
  success: boolean;
  batchRequestId?: string;
  failureReasons?: Array<{
    barcode: string;
    reason: string;
  }>;
}

// Order Pulling
export interface TrendyolOrder {
  orderNumber: string;
  orderDate: number; // timestamp
  status: TrendyolOrderStatus;
  grossAmount: number;
  totalDiscount: number;
  totalPrice: number;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  shipmentAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    district: string;
    postalCode: string;
    phone: string;
  };
  invoiceAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    district: string;
    postalCode: string;
  };
  lines: Array<{
    barcode: string;
    productName: string;
    quantity: number;
    price: number;
    discount: number;
    currencyCode: string;
  }>;
  cargoTrackingNumber?: string;
  cargoProviderName?: string;
}

export type TrendyolOrderStatus = 
  | 'Created'
  | 'Picking'
  | 'Invoiced'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned';

// Stock Sync
export interface TrendyolStockUpdate {
  barcode: string;
  quantity: number;
}

export interface StockSyncResult {
  success: boolean;
  updatedCount: number;
  failedItems?: Array<{
    barcode: string;
    reason: string;
  }>;
}

// Sync Settings
export interface TrendyolSyncSettings {
  autoSyncProducts: boolean;
  autoSyncOrders: boolean;
  autoSyncStock: boolean;
  syncInterval: number; // minutes
  priceMarkup: number; // percentage
  stockBuffer: number; // reserve stock amount
}

// Sync History
export interface SyncHistory {
  id: string;
  type: 'product' | 'order' | 'stock';
  status: 'success' | 'failed' | 'partial';
  itemsProcessed: number;
  itemsFailed: number;
  startedAt: string;
  completedAt: string;
  error?: string;
}

// Mapping
export interface ProductMapping {
  localProductId: string;
  trendyolBarcode: string;
  trendyolProductId?: string;
  lastSynced?: string;
}
