import apiClient from './apiClient';
import type { Invoice, InvoiceListResponse } from '../types/invoice';

export const invoiceService = {
  /**
   * Get all invoices for tenant
   */
  async getInvoices(params?: {
    page?: number;
    limit?: number;
  }): Promise<InvoiceListResponse> {
    const response = await apiClient.get('/invoices', { params });
    return response.data.data;
  },

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice> {
    const response = await apiClient.get(`/invoices/${invoiceId}`);
    return response.data.data;
  },

  /**
   * Create invoice from order
   */
  async createInvoiceFromOrder(orderId: string): Promise<Invoice> {
    const response = await apiClient.post('/invoices/from-order', {
      orderId,
    });
    return response.data.data;
  },

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceId: string, status: string): Promise<void> {
    await apiClient.put(`/invoices/${invoiceId}/status`, {
      status,
    });
  },

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoiceId: string): Promise<{ pdfUrl: string }> {
    const response = await apiClient.get(`/invoices/${invoiceId}/pdf`);
    return response.data.data;
  },

  /**
   * Download invoice PDF
   */
  downloadInvoicePDF(invoiceId: string): string {
    return `${apiClient.defaults.baseURL}/invoices/${invoiceId}/pdf`;
  },
};
