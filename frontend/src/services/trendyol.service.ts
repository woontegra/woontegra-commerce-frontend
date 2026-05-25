import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  TrendyolCredentials,
  TrendyolProduct,
  TrendyolOrder,
  TrendyolStockUpdate,
  ProductSyncResult,
  StockSyncResult,
} from '../types/trendyol';
import { logger } from './logger.service';

class TrendyolService {
  private client: AxiosInstance | null = null;
  private credentials: TrendyolCredentials | null = null;

  // Initialize connection
  connect(credentials: TrendyolCredentials) {
    this.credentials = credentials;
    
    // Create axios instance with Trendyol API config
    this.client = axios.create({
      baseURL: 'https://api.trendyol.com/sapigw',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${credentials.supplierId} - SelfIntegration`,
      },
      auth: {
        username: credentials.apiKey,
        password: credentials.apiSecret,
      },
    });

    logger.logAction('trendyol_connected', 'Trendyol bağlantısı kuruldu', {
      supplierId: credentials.supplierId,
    });
  }

  // Check connection
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('Trendyol bağlantısı kurulmamış');
    }

    try {
      // Test with a simple API call
      await this.client.get(`/suppliers/${this.credentials!.supplierId}/products`);
      return true;
    } catch (error) {
      logger.logError('trendyol_connection_failed', error);
      return false;
    }
  }

  // ============================================
  // 1. PRODUCT SYNC - Ürün Gönderme
  // ============================================

  async sendProducts(products: TrendyolProduct[]): Promise<ProductSyncResult> {
    if (!this.client) {
      throw new Error('Trendyol bağlantısı kurulmamış');
    }

    try {
      const response = await this.client.post(
        `/suppliers/${this.credentials!.supplierId}/v2/products`,
        { items: products }
      );

      logger.logAction('trendyol_products_sent', `${products.length} ürün Trendyol'a gönderildi`, {
        batchRequestId: response.data.batchRequestId,
      });

      return {
        success: true,
        batchRequestId: response.data.batchRequestId,
      };
    } catch (error: any) {
      logger.logError('trendyol_product_sync_failed', error);
      
      return {
        success: false,
        failureReasons: error.response?.data?.failureReasons || [],
      };
    }
  }

  async updateProduct(barcode: string, updates: Partial<TrendyolProduct>): Promise<boolean> {
    if (!this.client) {
      throw new Error('Trendyol bağlantısı kurulmamış');
    }

    try {
      await this.client.put(
        `/suppliers/${this.credentials!.supplierId}/products/price-and-inventory`,
        {
          items: [{
            barcode,
            ...updates,
          }],
        }
      );

      logger.logAction('trendyol_product_updated', 'Ürün güncellendi', { barcode });
      return true;
    } catch (error) {
      logger.logError('trendyol_product_update_failed', error, { barcode });
      return false;
    }
  }

  // ============================================
  // 2. ORDER PULLING - Sipariş Çekme
  // ============================================

  async getOrders(params?: {
    startDate?: number;
    endDate?: number;
    page?: number;
    size?: number;
    status?: string;
  }): Promise<{ content: TrendyolOrder[]; totalElements: number }> {
    if (!this.client) {
      throw new Error('Trendyol bağlantısı kurulmamış');
    }

    try {
      const response = await this.client.get(
        `/suppliers/${this.credentials!.supplierId}/orders`,
        { params }
      );

      logger.logAction('trendyol_orders_fetched', `${response.data.content.length} sipariş çekildi`);

      return {
        content: response.data.content,
        totalElements: response.data.totalElements,
      };
    } catch (error) {
      logger.logError('trendyol_order_fetch_failed', error);
      throw error;
    }
  }

  async getOrderDetails(orderNumber: string): Promise<TrendyolOrder> {
    if (!this.client) {
      throw new Error('Trendyol bağlantısı kurulmamış');
    }

    try {
      const response = await this.client.get(
        `/suppliers/${this.credentials!.supplierId}/orders/${orderNumber}`
      );

      return response.data;
    } catch (error) {
      logger.logError('trendyol_order_details_failed', error, { orderNumber });
      throw error;
    }
  }

  async updateOrderStatus(
    orderNumber: string,
    status: 'Shipped',
    params?: {
      trackingNumber?: string;
      invoiceNumber?: string;
    }
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error('Trendyol bağlantısı kurulmamış');
    }

    try {
      await this.client.put(
        `/suppliers/${this.credentials!.supplierId}/orders/${orderNumber}/status`,
        {
          status,
          ...params,
        }
      );

      logger.logAction('trendyol_order_status_updated', 'Sipariş durumu güncellendi', {
        orderNumber,
        status,
      });

      return true;
    } catch (error) {
      logger.logError('trendyol_order_status_update_failed', error, { orderNumber });
      return false;
    }
  }

  // ============================================
  // 3. STOCK SYNC - Stok Senkronizasyonu
  // ============================================

  async updateStock(items: TrendyolStockUpdate[]): Promise<StockSyncResult> {
    if (!this.client) {
      throw new Error('Trendyol bağlantısı kurulmamış');
    }

    try {
      await this.client.post(
        `/suppliers/${this.credentials!.supplierId}/products/price-and-inventory`,
        { items }
      );

      logger.logAction('trendyol_stock_updated', `${items.length} ürün stoğu güncellendi`);

      return {
        success: true,
        updatedCount: items.length,
      };
    } catch (error: any) {
      logger.logError('trendyol_stock_update_failed', error);

      return {
        success: false,
        updatedCount: 0,
        failedItems: error.response?.data?.failureReasons || [],
      };
    }
  }

  async syncStockForProduct(barcode: string, quantity: number): Promise<boolean> {
    return (await this.updateStock([{ barcode, quantity }])).success;
  }

  // Get current stock from Trendyol
  async getProductStock(barcode: string): Promise<number | null> {
    if (!this.client) {
      throw new Error('Trendyol bağlantısı kurulmamış');
    }

    try {
      const response = await this.client.get(
        `/suppliers/${this.credentials!.supplierId}/products`,
        {
          params: { barcode },
        }
      );

      return response.data.content[0]?.quantity || null;
    } catch (error) {
      logger.logError('trendyol_stock_fetch_failed', error, { barcode });
      return null;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  // Convert local product to Trendyol format
  convertToTrendyolProduct(localProduct: any): TrendyolProduct {
    return {
      barcode: localProduct.sku || localProduct.id,
      title: localProduct.name,
      productMainId: localProduct.id,
      brandId: 0, // Set from mapping
      categoryId: 0, // Set from mapping
      quantity: localProduct.stock,
      stockCode: localProduct.sku,
      dimensionalWeight: 1,
      description: localProduct.description || '',
      currencyType: 'TRY',
      listPrice: localProduct.price,
      salePrice: localProduct.price,
      vatRate: 20,
      cargoCompanyId: 10, // Default cargo company
      images: localProduct.images?.map((url: string) => ({ url })) || [],
      attributes: [],
    };
  }

  // Convert Trendyol order to local format
  convertToLocalOrder(trendyolOrder: TrendyolOrder): any {
    return {
      orderNumber: trendyolOrder.orderNumber,
      source: 'trendyol',
      status: this.mapOrderStatus(trendyolOrder.status),
      totalAmount: trendyolOrder.totalPrice,
      customerName: `${trendyolOrder.customerFirstName} ${trendyolOrder.customerLastName}`,
      customerEmail: trendyolOrder.customerEmail,
      shippingAddress: {
        fullName: `${trendyolOrder.shipmentAddress.firstName} ${trendyolOrder.shipmentAddress.lastName}`,
        addressLine1: trendyolOrder.shipmentAddress.address1,
        city: trendyolOrder.shipmentAddress.city,
        zipCode: trendyolOrder.shipmentAddress.postalCode,
        phone: trendyolOrder.shipmentAddress.phone,
      },
      items: trendyolOrder.lines.map(line => ({
        productName: line.productName,
        barcode: line.barcode,
        quantity: line.quantity,
        price: line.price,
        total: line.price * line.quantity - line.discount,
      })),
      trackingNumber: trendyolOrder.cargoTrackingNumber,
      createdAt: new Date(trendyolOrder.orderDate).toISOString(),
    };
  }

  private mapOrderStatus(trendyolStatus: string): string {
    const statusMap: Record<string, string> = {
      'Created': 'pending',
      'Picking': 'processing',
      'Invoiced': 'processing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'Returned': 'refunded',
    };

    return statusMap[trendyolStatus] || 'pending';
  }
}

export const trendyolService = new TrendyolService();
