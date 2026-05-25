import apiClient from './apiClient';
import type { ApiKey, CreateApiKeyInput, ApiKeyWithPlainKey } from '../types/api-key';

export const apiKeyService = {
  /**
   * Create a new API key
   */
  async createApiKey(input: CreateApiKeyInput): Promise<ApiKeyWithPlainKey> {
    const response = await apiClient.post('/api-keys', input);
    return response.data.data;
  },

  /**
   * Get all API keys
   */
  async getApiKeys(): Promise<ApiKey[]> {
    const response = await apiClient.get('/api-keys');
    return response.data.data;
  },

  /**
   * Update an API key
   */
  async updateApiKey(id: string, data: Partial<CreateApiKeyInput>): Promise<ApiKey> {
    const response = await apiClient.put(`/api-keys/${id}`, data);
    return response.data.data;
  },

  /**
   * Revoke an API key
   */
  async revokeApiKey(id: string): Promise<void> {
    await apiClient.post(`/api-keys/${id}/revoke`);
  },

  /**
   * Delete an API key
   */
  async deleteApiKey(id: string): Promise<void> {
    await apiClient.delete(`/api-keys/${id}`);
  },
};
