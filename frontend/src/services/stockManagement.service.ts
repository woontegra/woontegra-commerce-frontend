import type { 
  Stock, 
  StockStatus, 
  StockHistory, 
  StockChangeType,
  StockUpdateRequest,
  StockReservation 
} from '../types/stock';
import toast from 'react-hot-toast';

class StockManagementService {
  // Get stock status based on quantity and threshold
  getStockStatus(stock: Stock): StockStatus {
    const available = stock.quantity - stock.reservedQuantity;
    
    if (available <= 0) {
      return 'out_of_stock';
    }
    
    if (available <= stock.lowStockThreshold) {
      return 'low_stock';
    }
    
    return 'in_stock';
  }

  // Check if product can be added to cart
  canReserve(stock: Stock, requestedQuantity: number): boolean {
    const available = stock.quantity - stock.reservedQuantity;
    return available >= requestedQuantity;
  }

  // Reserve stock (when adding to cart)
  async reserveStock(
    stock: Stock,
    quantity: number,
    cartId?: string
  ): Promise<{ stock: Stock; reservation: StockReservation }> {
    // Check availability
    if (!this.canReserve(stock, quantity)) {
      throw new Error('Yeterli stok yok');
    }

    // Create reservation
    const reservation: StockReservation = {
      id: `reservation-${Date.now()}`,
      stockId: stock.id,
      productId: stock.productId,
      variantId: stock.variantId,
      quantity,
      cartId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      createdAt: new Date().toISOString(),
    };

    // Update stock
    const updatedStock: Stock = {
      ...stock,
      reservedQuantity: stock.reservedQuantity + quantity,
      availableQuantity: stock.quantity - (stock.reservedQuantity + quantity),
      status: this.getStockStatus({
        ...stock,
        reservedQuantity: stock.reservedQuantity + quantity,
      }),
      updatedAt: new Date().toISOString(),
    };

    // Log history
    await this.logStockChange({
      productId: stock.productId,
      variantId: stock.variantId,
      quantity: -quantity,
      type: 'reservation',
      reason: 'Sepete eklendi',
    });

    return { stock: updatedStock, reservation };
  }

  // Release reservation (when removing from cart)
  async releaseReservation(
    stock: Stock,
    quantity: number
  ): Promise<Stock> {
    const updatedStock: Stock = {
      ...stock,
      reservedQuantity: Math.max(0, stock.reservedQuantity - quantity),
      availableQuantity: stock.quantity - Math.max(0, stock.reservedQuantity - quantity),
      status: this.getStockStatus({
        ...stock,
        reservedQuantity: Math.max(0, stock.reservedQuantity - quantity),
      }),
      updatedAt: new Date().toISOString(),
    };

    // Log history
    await this.logStockChange({
      productId: stock.productId,
      variantId: stock.variantId,
      quantity: quantity,
      type: 'reservation_release',
      reason: 'Sepetten çıkarıldı',
    });

    return updatedStock;
  }

  // Process order (convert reservation to actual stock decrease)
  async processOrder(
    stock: Stock,
    quantity: number,
    orderId: string
  ): Promise<Stock> {
    // Decrease reserved quantity
    // Decrease actual quantity
    const updatedStock: Stock = {
      ...stock,
      quantity: stock.quantity - quantity,
      reservedQuantity: Math.max(0, stock.reservedQuantity - quantity),
      availableQuantity: (stock.quantity - quantity) - Math.max(0, stock.reservedQuantity - quantity),
      status: this.getStockStatus({
        ...stock,
        quantity: stock.quantity - quantity,
        reservedQuantity: Math.max(0, stock.reservedQuantity - quantity),
      }),
      updatedAt: new Date().toISOString(),
    };

    // Log history
    await this.logStockChange({
      productId: stock.productId,
      variantId: stock.variantId,
      quantity: -quantity,
      type: 'order_placed',
      reason: 'Sipariş oluşturuldu',
      orderId,
    });

    // Check low stock
    if (updatedStock.status === 'low_stock') {
      toast(`⚠️ Düşük stok: ${stock.sku}`, { icon: '⚠️' });
    }

    if (updatedStock.status === 'out_of_stock') {
      toast.error(`❌ Stok tükendi: ${stock.sku}`);
    }

    return updatedStock;
  }

  // Cancel order (restore stock)
  async cancelOrder(
    stock: Stock,
    quantity: number,
    orderId: string
  ): Promise<Stock> {
    const updatedStock: Stock = {
      ...stock,
      quantity: stock.quantity + quantity,
      availableQuantity: (stock.quantity + quantity) - stock.reservedQuantity,
      status: this.getStockStatus({
        ...stock,
        quantity: stock.quantity + quantity,
      }),
      updatedAt: new Date().toISOString(),
    };

    // Log history
    await this.logStockChange({
      productId: stock.productId,
      variantId: stock.variantId,
      quantity: quantity,
      type: 'order_cancelled',
      reason: 'Sipariş iptal edildi',
      orderId,
    });

    return updatedStock;
  }

  // Manual stock update (admin)
  async updateStock(
    stock: Stock,
    newQuantity: number,
    reason: string,
    userId?: string
  ): Promise<Stock> {
    const quantityChange = newQuantity - stock.quantity;
    const type: StockChangeType = quantityChange > 0 ? 'manual_increase' : 'manual_decrease';

    const updatedStock: Stock = {
      ...stock,
      quantity: newQuantity,
      availableQuantity: newQuantity - stock.reservedQuantity,
      status: this.getStockStatus({
        ...stock,
        quantity: newQuantity,
      }),
      updatedAt: new Date().toISOString(),
    };

    // Log history
    await this.logStockChange({
      productId: stock.productId,
      variantId: stock.variantId,
      quantity: quantityChange,
      type,
      reason,
      userId,
    });

    toast.success('Stok güncellendi');

    return updatedStock;
  }

  // Log stock change
  private async logStockChange(request: StockUpdateRequest): Promise<void> {
    const history: StockHistory = {
      id: `history-${Date.now()}`,
      stockId: `stock-${request.productId}-${request.variantId || 'default'}`,
      productId: request.productId,
      variantId: request.variantId,
      type: request.type,
      quantityBefore: 0, // Should be fetched from current stock
      quantityAfter: request.quantity,
      quantityChange: request.quantity,
      reason: request.reason,
      orderId: request.orderId,
      userId: request.userId,
      createdAt: new Date().toISOString(),
    };

    // In production: Save to database
    console.log('📊 Stock change logged:', history);
  }

  // Get stock status label
  getStatusLabel(status: StockStatus): string {
    const labels = {
      in_stock: 'Stokta',
      low_stock: 'Düşük Stok',
      out_of_stock: 'Tükendi',
    };
    return labels[status];
  }

  // Get status color
  getStatusColor(status: StockStatus): string {
    const colors = {
      in_stock: 'green',
      low_stock: 'yellow',
      out_of_stock: 'red',
    };
    return colors[status];
  }

  // Clean expired reservations
  async cleanExpiredReservations(reservations: StockReservation[]): Promise<void> {
    const now = new Date();
    const expired = reservations.filter(r => new Date(r.expiresAt) < now);

    for (const reservation of expired) {
      console.log('🧹 Cleaning expired reservation:', reservation.id);
      // In production: Release the reservation
    }
  }

  // Get low stock products
  getLowStockProducts(stocks: Stock[]): Stock[] {
    return stocks.filter(stock => stock.status === 'low_stock');
  }

  // Get out of stock products
  getOutOfStockProducts(stocks: Stock[]): Stock[] {
    return stocks.filter(stock => stock.status === 'out_of_stock');
  }
}

export const stockManagementService = new StockManagementService();
