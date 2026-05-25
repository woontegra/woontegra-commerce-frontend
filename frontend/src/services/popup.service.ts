import apiClient from './apiClient';
import type { Popup, CreatePopupDto, UpdatePopupDto } from '../types/popup';

export const popupService = {
  /**
   * Get all popups (admin)
   */
  async getAll(): Promise<Popup[]> {
    const response = await apiClient.get('/popups');
    return response.data.data;
  },

  /**
   * Get active popup for storefront
   */
  async getActive(): Promise<Popup | null> {
    const response = await apiClient.get('/popups/active');
    return response.data.data;
  },

  /**
   * Get popup by ID
   */
  async getById(id: string): Promise<Popup> {
    const response = await apiClient.get(`/popups/${id}`);
    return response.data.data;
  },

  /**
   * Create popup
   */
  async create(data: CreatePopupDto): Promise<Popup> {
    const response = await apiClient.post('/popups', data);
    return response.data.data;
  },

  /**
   * Update popup
   */
  async update(id: string, data: UpdatePopupDto): Promise<Popup> {
    const response = await apiClient.put(`/popups/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete popup
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/popups/${id}`);
  },

  /**
   * Toggle popup active status
   */
  async toggleActive(id: string): Promise<Popup> {
    const response = await apiClient.patch(`/popups/${id}/toggle`);
    return response.data.data;
  },
};
