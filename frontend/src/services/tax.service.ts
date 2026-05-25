import apiClient from './apiClient';
import type {
  TaxCalculationItem,
  TaxCalculationResult,
  TaxBreakdown,
  TaxRate,
} from '../types/tax';

export const taxService = {
  /**
   * Calculate tax for items
   */
  async calculate(items: TaxCalculationItem[]): Promise<TaxCalculationResult> {
    const response = await apiClient.post('/tax/calculate', { items });
    return response.data.data;
  },

  /**
   * Get tax breakdown by rate
   */
  async getBreakdown(items: TaxCalculationItem[]): Promise<TaxBreakdown> {
    const response = await apiClient.post('/tax/breakdown', { items });
    return response.data.data;
  },

  /**
   * Get available tax rates
   */
  async getRates(): Promise<TaxRate[]> {
    const response = await apiClient.get('/tax/rates');
    return response.data.data;
  },

  /**
   * Calculate tax for a single item (client-side)
   */
  calculateItemTax(price: number, quantity: number, taxRate: number) {
    const subtotal = price * quantity;
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  },

  /**
   * Calculate price without tax (reverse calculation)
   */
  calculatePriceWithoutTax(priceWithTax: number, taxRate: number): number {
    const priceWithoutTax = priceWithTax / (1 + taxRate / 100);
    return Number(priceWithoutTax.toFixed(2));
  },

  /**
   * Extract tax amount from price with tax
   */
  extractTaxAmount(priceWithTax: number, taxRate: number): number {
    const priceWithoutTax = this.calculatePriceWithoutTax(priceWithTax, taxRate);
    return Number((priceWithTax - priceWithoutTax).toFixed(2));
  },
};
