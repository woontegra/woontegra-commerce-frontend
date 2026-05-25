import apiClient from './apiClient';
import type {
  SalesAnalytics,
  ProductSalesReport,
  CategoryRevenue,
  HourlySales,
  CustomerAnalytics,
  DateRange,
} from '../types/analytics';

export const analyticsService = {
  /**
   * Get sales analytics
   */
  async getSalesAnalytics(dateRange: DateRange): Promise<SalesAnalytics> {
    const response = await apiClient.get('/analytics/sales', {
      params: dateRange,
    });
    return response.data.data;
  },

  /**
   * Get product sales report
   */
  async getProductSalesReport(dateRange: DateRange): Promise<ProductSalesReport[]> {
    const response = await apiClient.get('/analytics/products', {
      params: dateRange,
    });
    return response.data.data;
  },

  /**
   * Get revenue by category
   */
  async getRevenueByCategory(dateRange: DateRange): Promise<CategoryRevenue[]> {
    const response = await apiClient.get('/analytics/categories', {
      params: dateRange,
    });
    return response.data.data;
  },

  /**
   * Get hourly sales
   */
  async getHourlySales(dateRange: DateRange): Promise<HourlySales[]> {
    const response = await apiClient.get('/analytics/hourly', {
      params: dateRange,
    });
    return response.data.data;
  },

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(dateRange: DateRange): Promise<CustomerAnalytics> {
    const response = await apiClient.get('/analytics/customers', {
      params: dateRange,
    });
    return response.data.data;
  },
};
