export interface TaxCalculationItem {
  price: number;
  quantity: number;
  taxRate: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  itemsWithTax: Array<{
    price: number;
    quantity: number;
    taxRate: number;
    itemSubtotal: number;
    itemTax: number;
    itemTotal: number;
  }>;
}

export interface TaxBreakdown {
  [rate: number]: {
    subtotal: number;
    tax: number;
  };
}

export interface TaxRate {
  value: number;
  label: string;
  description: string;
}

export const TAX_RATES = {
  STANDARD: 20,    // Standart KDV
  REDUCED_1: 10,   // İndirimli KDV 1
  REDUCED_2: 1,    // İndirimli KDV 2
  EXEMPT: 0,       // Muaf
};

export const TAX_RATE_OPTIONS: TaxRate[] = [
  { value: 20, label: 'Standart KDV (%20)', description: 'Genel ürünler' },
  { value: 10, label: 'İndirimli KDV 1 (%10)', description: 'Gıda, kitap vb.' },
  { value: 1, label: 'İndirimli KDV 2 (%1)', description: 'Temel gıda' },
  { value: 0, label: 'Muaf (%0)', description: 'KDV muaf ürünler' },
];
