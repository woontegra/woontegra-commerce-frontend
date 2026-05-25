import apiClient from './apiClient';
import type {
  MarketplaceConfig,
  StockSyncItem,
  StockSyncResult,
  ConnectionTestResult,
  StockSyncHistoryResponse,
} from '../types/stock-sync';

export const stockSyncService = {
  /**
   * Get active marketplaces
   */
  async getMarketplaces(): Promise<MarketplaceConfig[]> {
    const response = await apiClient.get('/stock-sync/marketplaces');
    return response.data.data;
  },

  /**
   * Get stock products for sync
   */
  async getStockProducts(productIds?: string[]): Promise<StockSyncItem[]> {
    const response = await apiClient.post('/stock-sync/products', {
      productIds,
    });
    return response.data.data;
  },

  /**
   * Sync stock to all marketplaces
   */
  async syncAllMarketplaces(productIds?: string[]): Promise<void> {
    const response = await apiClient.post('/stock-sync/sync/all', {
      productIds,
    });
    return response.data;
  },

  /**
   * Sync stock to specific marketplace
   */
  async syncMarketplace(
    marketplaceId: string,
    productIds?: string[]
  ): Promise<StockSyncResult> {
    const response = await apiClient.post('/stock-sync/sync/marketplace', {
      marketplaceId,
      productIds,
    });
    return response.data.data;
  },

  /**
   * Test marketplace connection
   */
  async testConnection(marketplaceId: string): Promise<ConnectionTestResult> {
    const response = await apiClient.post('/stock-sync/test-connection', {
      marketplaceId,
    });
    return response.data.data;
  },

  /**
   * Get sync history
   */
  async getSyncHistory(params?: {
    page?: number;
    limit?: number;
    marketplaceId?: string;
  }): Promise<StockSyncHistoryResponse> {
    const response = await apiClient.get('/stock-sync/history', { params });
    return response.data.data;
  },

  /**
   * Manual stock update trigger
   */
  async triggerStockUpdate(
    productId: string,
    newQuantity: number,
    oldQuantity?: number
  ): Promise<void> {
    const response = await apiClient.post('/stock-sync/trigger-update', {
      productId,
      newQuantity,
      oldQuantity,
    });
    return response.data;
  },
};
