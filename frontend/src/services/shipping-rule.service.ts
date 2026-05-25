import apiClient from './apiClient';
import type {
  ShippingRule,
  CreateShippingRuleDto,
  UpdateShippingRuleDto,
  ShippingCalculationInput,
  ShippingCalculationResponse,
} from '../types/shipping';

export const shippingRuleService = {
  /**
   * Get all shipping rules
   */
  async getAll(): Promise<ShippingRule[]> {
    const response = await apiClient.get('/shipping-rules');
    return response.data.data;
  },

  /**
   * Get shipping rule by ID
   */
  async getById(id: string): Promise<ShippingRule> {
    const response = await apiClient.get(`/shipping-rules/${id}`);
    return response.data.data;
  },

  /**
   * Create shipping rule
   */
  async create(data: CreateShippingRuleDto): Promise<ShippingRule> {
    const response = await apiClient.post('/shipping-rules', data);
    return response.data.data;
  },

  /**
   * Update shipping rule
   */
  async update(id: string, data: UpdateShippingRuleDto): Promise<ShippingRule> {
    const response = await apiClient.put(`/shipping-rules/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete shipping rule
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/shipping-rules/${id}`);
  },

  /**
   * Toggle shipping rule active status
   */
  async toggleActive(id: string): Promise<ShippingRule> {
    const response = await apiClient.patch(`/shipping-rules/${id}/toggle`);
    return response.data.data;
  },

  /**
   * Calculate shipping cost
   */
  async calculate(input: ShippingCalculationInput): Promise<ShippingCalculationResponse> {
    const response = await apiClient.post('/shipping-rules/calculate', input);
    return response.data.data;
  },
};
