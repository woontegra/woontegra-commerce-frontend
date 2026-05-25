// Professional Stock Management System

export const StockStatus = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
} as const;

export type StockStatus = typeof StockStatus[keyof typeof StockStatus];

export interface Stock {
  id: string;
  productId: string;
  variantId?: string;
  
  // Quantities
  quantity: number;              // Actual available stock
  reservedQuantity: number;      // Reserved for pending orders/carts
  
  // Calculated
  availableQuantity: number;     // quantity - reservedQuantity
  
  // Thresholds
  lowStockThreshold: number;     // Alert when stock falls below this
  
  // Status
  status: StockStatus;
  
  // Metadata
  sku: string;
  location?: string;
  updatedAt: string;
}

export interface StockHistory {
  id: string;
  stockId: string;
  productId: string;
  variantId?: string;
  
  // Change
  type: StockChangeType;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  
  // Reason
  reason: string;
  orderId?: string;
  userId?: string;
  
  // Timestamp
  createdAt: string;
}

export const StockChangeType = {
  MANUAL_INCREASE: 'manual_increase',
  MANUAL_DECREASE: 'manual_decrease',
  RESERVATION: 'reservation',
  RESERVATION_RELEASE: 'reservation_release',
  ORDER_PLACED: 'order_placed',
  ORDER_CANCELLED: 'order_cancelled',
  RETURN: 'return',
  ADJUSTMENT: 'adjustment',
} as const;

export type StockChangeType = typeof StockChangeType[keyof typeof StockChangeType];

export interface StockUpdateRequest {
  productId: string;
  variantId?: string;
  quantity: number;
  type: StockChangeType;
  reason: string;
  orderId?: string;
  userId?: string;
}

export interface StockReservation {
  id: string;
  stockId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  cartId?: string;
  orderId?: string;
  expiresAt: string;
  createdAt: string;
}
