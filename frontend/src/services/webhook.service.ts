import apiClient from './apiClient';
import type { Webhook, CreateWebhookInput, UpdateWebhookInput, WebhookLog, WebhookEvent } from '../types/webhook';

export const webhookService = {
  /**
   * Get all webhooks
   */
  async getWebhooks(): Promise<Webhook[]> {
    const response = await apiClient.get('/webhooks');
    return response.data.data;
  },

  /**
   * Get available webhook events
   */
  async getEvents(): Promise<WebhookEvent[]> {
    const response = await apiClient.get('/webhooks/events');
    return response.data.data;
  },

  /**
   * Create a new webhook
   */
  async createWebhook(input: CreateWebhookInput): Promise<Webhook> {
    const response = await apiClient.post('/webhooks', input);
    return response.data.data;
  },

  /**
   * Get a single webhook
   */
  async getWebhook(id: string): Promise<Webhook> {
    const response = await apiClient.get(`/webhooks/${id}`);
    return response.data.data;
  },

  /**
   * Update a webhook
   */
  async updateWebhook(id: string, data: UpdateWebhookInput): Promise<Webhook> {
    const response = await apiClient.put(`/webhooks/${id}`, data);
    return response.data;
  },

  /**
   * Delete a webhook
   */
  async deleteWebhook(id: string): Promise<void> {
    await apiClient.delete(`/webhooks/${id}`);
  },

  /**
   * Rotate webhook secret
   */
  async rotateSecret(id: string): Promise<{ secret: string }> {
    const response = await apiClient.post(`/webhooks/${id}/rotate-secret`);
    return response.data.data;
  },

  /**
   * Test a webhook
   */
  async testWebhook(id: string): Promise<any> {
    const response = await apiClient.post(`/webhooks/${id}/test`);
    return response.data.data;
  },

  /**
   * Get webhook logs
   */
  async getWebhookLogs(id: string, page: number = 1, limit: number = 20): Promise<{
    logs: WebhookLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await apiClient.get(`/webhooks/${id}/logs`, {
      params: { page, limit },
    });
    return response.data.data;
  },
};
