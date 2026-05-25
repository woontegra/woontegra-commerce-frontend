import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type Currency = 'TRY' | 'USD' | 'EUR';

interface CurrencyRates {
  TRY: number;
  USD: number;
  EUR: number;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (price: number, fromCurrency?: Currency) => number;
  formatPrice: (price: number, fromCurrency?: Currency) => string;
  rates: CurrencyRates;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = 'woontegra_currency';

// Base currency: USD
// Exchange rates (1 USD = X TRY/EUR)
const EXCHANGE_RATES: CurrencyRates = {
  USD: 1,
  EUR: 0.92,
  TRY: 32.5,
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  TRY: '₺',
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return (stored as Currency) || 'USD';
  });

  useEffect(() => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
  };

  // Convert price from one currency to another
  const convertPrice = (price: number, fromCurrency: Currency = 'USD'): number => {
    // Convert to USD first (base currency)
    const priceInUSD = price / EXCHANGE_RATES[fromCurrency];
    // Convert to target currency
    const convertedPrice = priceInUSD * EXCHANGE_RATES[currency];
    return convertedPrice;
  };

  // Format price with currency symbol
  const formatPrice = (price: number, fromCurrency: Currency = 'USD'): string => {
    const converted = convertPrice(price, fromCurrency);
    const symbol = CURRENCY_SYMBOLS[currency];
    
    // Format based on currency
    if (currency === 'TRY') {
      return `${converted.toFixed(2)} ${symbol}`;
    } else {
      return `${symbol}${converted.toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convertPrice,
        formatPrice,
        rates: EXCHANGE_RATES,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
