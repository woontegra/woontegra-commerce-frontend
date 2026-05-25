import apiClient from './apiClient';
import type { Store, CreateStoreDto, UpdateStoreDto } from '../types/store';

export const storeService = {
  /**
   * Get all stores
   */
  async getAll(): Promise<Store[]> {
    const response = await apiClient.get('/stores');
    return response.data.data;
  },

  /**
   * Get store by ID
   */
  async getById(id: string): Promise<Store> {
    const response = await apiClient.get(`/stores/${id}`);
    return response.data.data;
  },

  /**
   * Create store
   */
  async create(data: CreateStoreDto): Promise<Store> {
    const response = await apiClient.post('/stores', data);
    return response.data.data;
  },

  /**
   * Update store
   */
  async update(id: string, data: UpdateStoreDto): Promise<Store> {
    const response = await apiClient.put(`/stores/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete store
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/stores/${id}`);
  },

  /**
   * Toggle store active status
   */
  async toggleActive(id: string): Promise<Store> {
    const response = await apiClient.patch(`/stores/${id}/toggle`);
    return response.data.data;
  },

  /**
   * Set store as default
   */
  async setDefault(id: string): Promise<Store> {
    const response = await apiClient.patch(`/stores/${id}/set-default`);
    return response.data.data;
  },

  /**
   * Get products by store
   */
  async getProducts(id: string): Promise<any[]> {
    const response = await apiClient.get(`/stores/${id}/products`);
    return response.data.data;
  },
};
