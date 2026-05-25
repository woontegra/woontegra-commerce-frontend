import apiClient from './apiClient';
import type { ProductTranslation, CreateTranslationDto, Language } from '../types/translation';

export const translationService = {
  /**
   * Get product translations
   */
  async getProductTranslations(productId: string): Promise<ProductTranslation[]> {
    const response = await apiClient.get(`/translations/products/${productId}`);
    return response.data.data;
  },

  /**
   * Create or update product translation
   */
  async upsertTranslation(productId: string, data: CreateTranslationDto): Promise<ProductTranslation> {
    const response = await apiClient.post(`/translations/products/${productId}`, data);
    return response.data.data;
  },

  /**
   * Delete product translation
   */
  async deleteTranslation(productId: string, language: string): Promise<void> {
    await apiClient.delete(`/translations/products/${productId}/${language}`);
  },

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<Language[]> {
    const response = await apiClient.get('/translations/languages');
    return response.data.data;
  },
};
