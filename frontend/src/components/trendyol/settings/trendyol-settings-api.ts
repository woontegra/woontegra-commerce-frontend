/**
 * Trendyol Settings — Shared API helpers & types
 *
 * TrendyolIntegration.tsx'teki api nesnesi ile aynı endpoint'leri kullanır.
 * İki dosya da aynı backend'e istek atar — duplicasyon değil, paralel kullanım.
 */

import apiClient from '../../../services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendyolIntegrationData {
  id:              string;
  supplierId:      string;
  apiKey:          string;
  apiSecret:       string;
  token:           string;
  integrationCode: string;
  isActive:        boolean;
  lastSync:        string | null;
}

export interface TrendyolStats {
  connected:     boolean;
  supplierId?:   string;
  isActive?:     boolean;
  lastSync?:     string | null;
  total?:        number;
  sent?:         number;
  errors?:       number;
  unmapped?:     number;
  totalProducts?: number;
}

export interface ShippingDefaults {
  cargoCompanyId:    number;
  deliveryDuration:  number;
  dimensionalWeight: number;
}

export interface PriceStrategy {
  mode:        'none' | 'percent' | 'fixed';
  value:       number;
  vatRate:     number;
  vatIncluded: boolean;
  roundTo:     number;
}

export interface TrendyolCategory {
  id:       string;
  name:     string;
  path:     string;
  parentId?: string;
  level:    number;
}

export interface LocalCategory {
  id:    string;
  name:  string;
  path:  string;
  level: number;
}

export interface TrendyolBrand {
  id:   number;
  name: string;
}

export interface LocalAttribute {
  id:     string;
  name:   string;
  type:   string;
  values: { id: string; label: string }[];
}

export interface TrendyolAttribute {
  id:              string;
  name:            string;
  type:            string;
  required:        boolean;
  allowCustom?:    boolean;
  varianter?:      boolean;
  attributeValues?: { id: number | string; name: string }[];
}

// ─── Cargo companies (static list) ───────────────────────────────────────────

export const CARGO_COMPANIES = [
  { id: 10, name: 'MNG Kargo Marketplace' },
  { id: 4,  name: 'Yurtiçi Kargo Marketplace' },
  { id: 7,  name: 'Aras Kargo Marketplace' },
  { id: 6,  name: 'Horoz Kargo Marketplace' },
  { id: 9,  name: 'Sürat Kargo Marketplace' },
  { id: 17, name: 'Trendyol Express Marketplace' },
  { id: 19, name: 'PTT Kargo Marketplace' },
  { id: 20, name: 'CEVA Marketplace' },
  { id: 30, name: 'Ceva Tedarik Marketplace' },
  { id: 38, name: 'Kolay Gelsin Marketplace' },
];

export const VAT_RATES = [0, 1, 8, 10, 18, 20];

// ─── API helpers ──────────────────────────────────────────────────────────────

const d = (r: any) => r.data?.data ?? r.data;

export const settingsApi = {
  getStats:            () => apiClient.get('/trendyol/stats').then(r => d(r) as TrendyolStats),
  getIntegration:      () => apiClient.get('/trendyol/integration').then(r => d(r) as TrendyolIntegrationData | null),
  saveIntegration:     (body: any) => apiClient.post('/trendyol/integration', body).then(r => r.data),
  testConnection:      () => apiClient.post('/trendyol/integration/test', {}).then(r => r.data),

  getShippingDefaults: () => apiClient.get('/trendyol/shipping-defaults').then(r => d(r) as ShippingDefaults),
  saveShippingDefaults:(body: any) => apiClient.post('/trendyol/shipping-defaults', body).then(r => r.data),

  getPriceStrategy:    () => apiClient.get('/pricing-settings').then(r => {
    const raw = d(r) as Record<string, unknown>;
    return {
      mode:        (raw?.type ?? raw?.mode ?? 'none') as PriceStrategy['mode'],
      value:       Number(raw?.value ?? 0),
      vatRate:     Number(raw?.vatRate ?? 20),
      vatIncluded: Boolean(raw?.vatIncluded ?? false),
      roundTo:     Number(raw?.rounding ?? raw?.roundTo ?? 2),
    };
  }),
  savePriceStrategy:   (body: PriceStrategy) => apiClient.post('/pricing-settings', {
    type:        body.mode,
    value:       body.value,
    vatRate:     body.vatRate,
    rounding:    body.roundTo,
    vatIncluded: body.vatIncluded,
  }).then(r => d(r)),

  getTrendyolCategories: () => apiClient.get('/trendyol/trendyol-categories').then(r => {
    const val = r.data; return (Array.isArray(val) ? val : (val?.data ?? val?.categories ?? [])) as TrendyolCategory[];
  }),
  getLocalCategories:  () => apiClient.get('/trendyol/local-categories').then(r => {
    const val = r.data; return (Array.isArray(val) ? val : (val?.data ?? val?.categories ?? [])) as LocalCategory[];
  }),
  getCategoryMapping:  () => apiClient.get('/trendyol/category-mapping').then(r => {
    const val = r.data; return (val?.data ?? val?.mapping ?? (typeof val === 'object' && !Array.isArray(val) ? val : {})) as Record<string, string>;
  }),
  saveCategoryMapping: (m: Record<string, string>) => apiClient.post('/trendyol/category-mapping', { mapping: m }).then(r => r.data),

  getTrendyolBrands:   (name?: string) => apiClient.get('/trendyol/trendyol-brands', { params: name ? { name } : {} }).then(r => {
    const val = r.data; return (Array.isArray(val) ? val : (val?.data ?? val?.brands ?? [])) as TrendyolBrand[];
  }),
  getLocalBrands:      () => apiClient.get('/trendyol/local-brands').then(r => {
    const val = r.data; return (Array.isArray(val) ? val : (val?.data ?? val?.brands ?? [])) as string[];
  }),
  getBrandMapping:     () => apiClient.get('/trendyol/brand-mapping').then(r => {
    const val = r.data; const m = val?.data ?? val?.mapping ?? val;
    return (m && typeof m === 'object' && !Array.isArray(m) ? m : {}) as Record<string, number>;
  }),
  saveBrandMapping:    (m: Record<string, number>) => apiClient.post('/trendyol/brand-mapping', { mapping: m }).then(r => r.data),

  getLocalAttributes:  () => apiClient.get('/trendyol/local-attributes').then(r => {
    const val = r.data; return (Array.isArray(val) ? val : (val?.data ?? val?.attributes ?? [])) as LocalAttribute[];
  }),
  getAttributeMapping: () => apiClient.get('/trendyol/attribute-mapping').then(r => {
    const val = r.data; return (val?.data ?? val?.mapping ?? (typeof val === 'object' && !Array.isArray(val) ? val : {})) as Record<string, any>;
  }),
  getTrendyolCatAttributes: (catId: string) => apiClient.get(`/trendyol/trendyol-categories/${catId}/attributes`).then(r => {
    const val = r.data; return (Array.isArray(val) ? val : (val?.data ?? val?.attributes ?? [])) as TrendyolAttribute[];
  }),
};
