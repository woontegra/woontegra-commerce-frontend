import apiClient from './apiClient';
import type { LiveSearchResponse } from '../types/search';

export const liveSearchService = {
  /**
   * Live search for products and categories
   */
  async search(query: string, limit: number = 10): Promise<LiveSearchResponse> {
    const response = await apiClient.get('/search/live', {
      params: { q: query, limit },
    });
    return response.data;
  },
};
