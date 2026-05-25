import apiClient from './apiClient';
import type { CustomerGroup, Customer } from '../types/b2b';

export const b2bService = {
  // Customer Groups
  async getCustomerGroups(): Promise<CustomerGroup[]> {
    const response = await apiClient.get('/b2b/customer-groups');
    return response.data;
  },

  async createCustomerGroup(name: string): Promise<CustomerGroup> {
    const response = await apiClient.post('/b2b/customer-groups', { name });
    return response.data;
  },

  async updateCustomerGroup(id: string, name: string): Promise<CustomerGroup> {
    const response = await apiClient.put(`/b2b/customer-groups/${id}`, { name });
    return response.data;
  },

  async deleteCustomerGroup(id: string): Promise<void> {
    await apiClient.delete(`/b2b/customer-groups/${id}`);
  },

  // Customer Group Assignment
  async assignCustomerToGroup(customerId: string, groupId: string): Promise<Customer> {
    const response = await apiClient.post('/b2b/customers/assign-group', { customerId, groupId });
    return response.data;
  },

  async getCustomersByGroup(groupId: string): Promise<Customer[]> {
    const response = await apiClient.get(`/b2b/customers/by-group/${groupId}`);
    return response.data;
  },

  async getCustomersWithoutGroup(): Promise<Customer[]> {
    const response = await apiClient.get('/b2b/customers/without-group');
    return response.data;
  },

  async bulkAssignCustomersToGroup(customerIds: string[], groupId: string): Promise<void> {
    await apiClient.post('/b2b/customers/bulk-assign', { customerIds, groupId });
  },

  // Product Pricing
  async updateProductGroupPricing(
    variantId: string, 
    wholesalePrice?: number,
    groupPrices?: Record<string, number>
  ): Promise<any> {
    const response = await apiClient.put(`/b2b/products/${variantId}/group-pricing`, {
      wholesalePrice,
      groupPrices
    });
    return response.data;
  },

  async getProductPricing(variantId: string, customerId?: string): Promise<any> {
    const params = customerId ? { customerId } : {};
    const response = await apiClient.get(`/b2b/products/${variantId}/pricing`, { params });
    return response.data;
  }
};
