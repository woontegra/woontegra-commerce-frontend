import apiClient from './apiClient';
import type { ExchangeRate, CurrencyConversion, Currency } from '../types/currency';

export const currencyService = {
  /**
   * Get all exchange rates
   */
  async getRates(): Promise<ExchangeRate[]> {
    const response = await apiClient.get('/currency/rates');
    return response.data.data;
  },

  /**
   * Convert currency
   */
  async convert(amount: number, from: string, to: string): Promise<CurrencyConversion> {
    const response = await apiClient.post('/currency/convert', { amount, from, to });
    return response.data.data;
  },

  /**
   * Update exchange rates (manual trigger)
   */
  async updateRates(): Promise<void> {
    await apiClient.post('/currency/update');
  },

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<Currency[]> {
    const response = await apiClient.get('/currency/supported');
    return response.data.data;
  },

  /**
   * Client-side conversion (if rate is already known)
   */
  convertAmount(amount: number, rate: number): number {
    return Number((amount * rate).toFixed(2));
  },
};
