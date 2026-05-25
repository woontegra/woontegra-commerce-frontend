import apiClient from './apiClient';
import type { BatchJobData, BatchJobStatus, BatchJobResponse } from '../types/batch';

export const batchService = {
  /**
   * Create a batch job
   */
  async createBatchJob(data: BatchJobData): Promise<BatchJobResponse> {
    const response = await apiClient.post('/batch', data);
    return response.data.data;
  },

  /**
   * Get batch job status
   */
  async getBatchJobStatus(jobId: string): Promise<BatchJobStatus> {
    const response = await apiClient.get(`/batch/${jobId}`);
    return response.data.data;
  },

  /**
   * Poll batch job until completion
   */
  async pollBatchJob(
    jobId: string,
    onProgress?: (progress: number) => void,
    interval: number = 2000
  ): Promise<BatchJobStatus> {
    return new Promise((resolve, reject) => {
      const poll = setInterval(async () => {
        try {
          const status = await this.getBatchJobStatus(jobId);

          if (onProgress) {
            onProgress(status.progress);
          }

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(poll);
            resolve(status);
          }
        } catch (error) {
          clearInterval(poll);
          reject(error);
        }
      }, interval);
    });
  },

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(productIds: string[], data: any): Promise<BatchJobResponse> {
    const response = await apiClient.post('/batch/products/update', {
      productIds,
      data,
    });
    return response.data.data;
  },

  /**
   * Bulk delete products
   */
  async bulkDeleteProducts(productIds: string[]): Promise<BatchJobResponse> {
    const response = await apiClient.post('/batch/products/delete', {
      productIds,
    });
    return response.data.data;
  },

  /**
   * Bulk import products
   */
  async bulkImportProducts(products: any[]): Promise<BatchJobResponse> {
    const response = await apiClient.post('/batch/products/import', {
      products,
    });
    return response.data.data;
  },
};
