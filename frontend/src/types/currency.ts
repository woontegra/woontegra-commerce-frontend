export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source?: string;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyConversion {
  from: string;
  to: string;
  amount: number;
  convertedAmount: number;
  rate: number;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export const BASE_CURRENCY = 'TRY';

export const getCurrencySymbol = (code: string): string => {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol || code;
};

export const formatPrice = (amount: number, currency: string = 'TRY'): string => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
