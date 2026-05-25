/**
 * Trendyol Integration Page — Production Level
 * WooCommerce-like product → Trendyol sending system
 */
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient from '../services/apiClient';
import { BulkCatalogPricePanel } from '../components/pricing/BulkCatalogPricePanel';
import { useGeneralSettingsGate } from '../components/trendyol/flow/GeneralSettingsContext';
import { SettingsRequiredBanner } from '../components/trendyol/flow/SettingsRequiredBanner';
import { SendPreviewModal } from '../components/trendyol/flow/SendPreviewModal';
import {
  applyTrendyolPriceStrategy,
  formatPriceArrow,
} from '../components/trendyol/flow/trendyolPriceUtils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Stats {
  connected: boolean;
  supplierId?: string;
  isActive?: boolean;
  lastSync?: string | null;
  total?: number;
  sent?: number;
  errors?: number;
  unmapped?: number;
  totalProducts?: number;
}

interface Integration {
  id: string;
  supplierId: string;
  apiKey: string;
  apiSecret: string;
  token: string;
  integrationCode: string;
  isActive: boolean;
  lastSync: string | null;
  categoryMappings: Record<string, string>;
  attributeMappings: Record<string, any>;
}

interface TrendyolCategory { id: string; name: string; path: string; parentId?: string; level: number; }
interface TrendyolAttribute {
  id:              string;
  name:            string;
  type:            string;
  required:        boolean;
  allowCustom?:    boolean;
  /** true = variant attribute (Color, Size…); NOT required for non-variant products */
  varianter?:      boolean;
  slicer?:         boolean;
  options?:        string[];
  attributeValues?: { id: number | string; name: string }[];
}
interface LocalCategory { id: string; name: string; path: string; level: number; }
interface LocalAttribute { id: string; name: string; type: string; values: { id: string; label: string }[]; }

interface Product {
  id: string; name: string; barcode: string | null; sku: string | null;
  status: string; salePrice: number; stock: number;
  categoryName: string | null; categoryId: string | null; mainImage: string | null;
  trendyol: {
    mapped: boolean; status: string; batchId: string | null;
    lastSyncAt: string | null; errorMessage: string | null;
  };
}

interface SyncResult {
  success: number; failed: number; skipped: number;
  results: Array<{ productId: string; productName: string; status: 'sent' | 'error' | 'skipped'; message: string; batchId?: string }>;
}

interface BatchResult {
  productId:        string;
  productName:      string;
  status:           'pending' | 'sending' | 'success' | 'error' | 'skipped';
  message:          string;
  trendyolBatchId?: string;
  barcode?:         string;
}
interface BatchJob {
  batchId:    string;
  total:      number;
  processed:  number;
  success:    number;
  failed:     number;
  skipped:    number;
  status:     'pending' | 'running' | 'done';
  results:    BatchResult[];
  startedAt:  string;
  finishedAt?: string;
}
interface IntegrationLog {
  id:              string;
  productId:       string | null;
  productName:     string | null;
  batchId:         string | null;
  status:          string;
  message:         string | null;
  requestPayload:  any;
  responsePayload: any;
  createdAt:       string;
}

interface MappedCategory {
  id:            string;
  name:          string;
  trendyolCatId: string;
  productCount:  number;
}

interface PriceStrategyData {
  mode:        'none' | 'percent' | 'fixed';
  value:       number;
  vatRate:     number;
  vatIncluded: boolean;
  roundTo:     number;
}

interface ProductPriceOverrideData {
  customPrice?:  number;
  mode?:         'none' | 'percent' | 'fixed';
  value?:        number;
  vatRate?:      number;
}

interface ValidationIssueItem {
  level:   'error' | 'warning' | 'skip';
  code:    string;
  message: string;
  tab:     string | null;
  hint?:   string;
}
interface ValidationReport {
  productId:   string;
  productName: string;
  canSend:     boolean;    // false = hard error or category skip; true = warnings only
  issues:      ValidationIssueItem[];
}
interface ValidationSummary {
  total:     number;
  errors:    number;
  warnings:  number;
  clean:     number;
  skipped?:  number;
  sendable?: number;
}

function isCategorySkipReport(r: ValidationReport): boolean {
  return !r.canSend && r.issues.length > 0 && r.issues.every(i => i.code === 'NO_CATEGORY_MAP');
}
function hasHardErrorReport(r: ValidationReport): boolean {
  return r.issues.some(i => i.level === 'error');
}
function buildValidationSummaryFromReports(reports: ValidationReport[], total: number): ValidationSummary {
  const skipped  = reports.filter(isCategorySkipReport).length;
  const errors   = reports.filter(r => !r.canSend && hasHardErrorReport(r)).length;
  const warnings = reports.filter(r => r.canSend && r.issues.some(i => i.level === 'warning')).length;
  const clean    = reports.filter(r => r.canSend && r.issues.length === 0).length;
  const sendable = reports.filter(r => r.canSend).length;
  return { total, errors, warnings, clean, skipped, sendable };
}

interface TrendyolBrand {
  id:   number;
  name: string;
}
/** localBrand → trendyolBrandId */
type BrandMapping = Record<string, number>;

interface MappedVariant {
  id:      string;
  label:   string;
  barcode: string;
  sku:     string;
  price:   number;
  stock:   number;
}

interface MappedProduct {
  productId:      string;
  productName:    string;
  barcode:        string;
  sku:            string;
  salePrice:      number;
  stock:          number;
  lastSyncAt:     string | null;
  trendyolStatus: string;
  errorMessage:   string | null;
  hasVariants:    boolean;
  variants:       MappedVariant[];
}

interface PriceStockUpdateItem {
  barcode:   string;
  price:     number;
  stock:     number;
  productId?: string;
  variantId?: string;
}

interface PriceStockUpdateResult {
  sent:   number;
  failed: number;
  items:  Array<{ barcode: string; status: 'ok' | 'error'; message: string }>;
}

// ── API helpers ───────────────────────────────────────────────────────────────

// NOTE: apiClient interceptor already unwraps response.data.data → response.data
// so all .then(r => r.data) below refers to the actual payload, NOT a nested .data
export const trendyolApi = {
  getStats:                 ()              => apiClient.get('/trendyol/stats').then(r => { const d = r.data; return (d?.data ?? d) as Stats; }),
  getIntegration:           ()              => apiClient.get('/trendyol/integration').then(r => { const d = r.data; return (d?.data ?? d) as Integration | null; }),
  saveIntegration:          (body: any)     => apiClient.post('/trendyol/integration', body).then(r => r.data),
  testConnection:           ()              => apiClient.post('/trendyol/integration/test', {}).then(r => r.data),
  getTrendyolCategories:    ()              => apiClient.get('/trendyol/trendyol-categories').then(r => { const d = r.data; return (Array.isArray(d) ? d : (d?.data ?? d?.categories ?? [])) as TrendyolCategory[]; }),
  getLocalCategories:       ()              => apiClient.get('/trendyol/local-categories').then(r => { const d = r.data; return (Array.isArray(d) ? d : (d?.data ?? d?.categories ?? [])) as LocalCategory[]; }),
  getCategoryMapping:       ()              => apiClient.get('/trendyol/category-mapping').then(r => { const d = r.data; return (d?.data ?? d?.mapping ?? (typeof d === 'object' && !Array.isArray(d) ? d : {})) as Record<string, string>; }),
  saveCategoryMapping:      (m: any)        => apiClient.post('/trendyol/category-mapping', { mapping: m }).then(r => r.data),
  getLocalAttributes:       ()              => apiClient.get('/trendyol/local-attributes').then(r => { const d = r.data; return (Array.isArray(d) ? d : (d?.data ?? d?.attributes ?? [])) as LocalAttribute[]; }),
  getTrendyolCatAttributes: (catId: string) => apiClient.get(`/trendyol/trendyol-categories/${catId}/attributes`).then(r => { const d = r.data; return (Array.isArray(d) ? d : (d?.data ?? d?.attributes ?? [])) as TrendyolAttribute[]; }),
  getAttributeMapping:      ()              => apiClient.get('/trendyol/attribute-mapping').then(r => { const d = r.data; return (d?.data ?? d?.mapping ?? (typeof d === 'object' && !Array.isArray(d) ? d : {})) as Record<string, any>; }),
  saveAttributeMapping:     (m: any)        => apiClient.post('/trendyol/attribute-mapping', { mapping: m }).then(r => r.data),
  getProducts:              (q: any)        => apiClient.get('/trendyol/products', { params: q }).then(r => r.data as { products: Product[]; total: number; page: number; totalPages: number }),
  validateProducts: async (ids: string[]): Promise<{ data: ValidationReport[]; summary: ValidationSummary }> => {
    const CHUNK = 30;
    if (ids.length <= CHUNK) {
      return apiClient.post('/trendyol/products/validate', { productIds: ids }, { timeout: 120_000 }).then(r => r.data);
    }
    // For large batches: chunk into groups of 30 and merge results
    const allReports: ValidationReport[] = [];
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const res   = await apiClient.post('/trendyol/products/validate', { productIds: chunk }, { timeout: 120_000 });
      const data  = res.data as { data: ValidationReport[]; summary: ValidationSummary };
      allReports.push(...(data.data ?? []));
    }
    return {
      data:    allReports,
      summary: buildValidationSummaryFromReports(allReports, allReports.length),
    };
  },
  sendProducts:             (ids: string[]) => apiClient.post('/trendyol/products/send', { productIds: ids }, { timeout: 120_000 }).then(r => r.data as SyncResult),
  syncPriceStock:           (ids?: string[], opts?: { fullCatalog?: boolean }) =>
    apiClient.post('/trendyol/products/sync-price-stock', { productIds: ids }, {
      timeout: opts?.fullCatalog || !ids?.length ? 600_000 : 300_000,
    }).then(r => r.data as SyncResult),
  manualPriceStockUpdate:   (items: PriceStockUpdateItem[]) => apiClient.post('/trendyol/price-stock-update', { items }, { timeout: 300_000 }).then(r => r.data as PriceStockUpdateResult),
  getMappedWithVariants:    (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/trendyol/products/mapped-with-variants', { params }).then(r => {
      const d = r.data?.data ?? r.data;
      if (d && Array.isArray(d.items)) {
        return d as {
          items: MappedProduct[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }
      const arr = (Array.isArray(d) ? d : (d?.products ?? [])) as MappedProduct[];
      return { items: arr, total: arr.length, page: 1, limit: arr.length || 20, totalPages: 1 };
    }),
  removeMap:                (id: string)    => apiClient.delete(`/trendyol/products/${id}/map`).then(r => r.data),
  getSyncHistory:           ()              => apiClient.get('/trendyol/sync-history').then(r => { const d = r.data; return (Array.isArray(d) ? d : (d?.data ?? d?.history ?? [])) as any[]; }),
  // Brand mapping
  getTrendyolBrands:  (name?: string) => apiClient.get('/trendyol/trendyol-brands', { params: name ? { name } : {} }).then(r => { const d = r.data; return (Array.isArray(d) ? d : (d?.data ?? d?.brands ?? [])) as TrendyolBrand[]; }),
  createTrendyolBrand:(name: string)  => apiClient.post('/trendyol/trendyol-brands', { name }).then(r => { const d = r.data; return (d?.data ?? d) as TrendyolBrand; }),
  getBrandMapping:    ()              => apiClient.get('/trendyol/brand-mapping').then(r => { const d = r.data; const m = d?.data ?? d?.mapping ?? d; return (m && typeof m === 'object' && !Array.isArray(m) ? m : {}) as BrandMapping; }),
  saveBrandMapping:   (m: BrandMapping) => apiClient.post('/trendyol/brand-mapping', { mapping: m }).then(r => r.data),
  getLocalBrands:     ()              => apiClient.get('/trendyol/local-brands').then(r => { const d = r.data; return (Array.isArray(d) ? d : (d?.data ?? d?.brands ?? [])) as string[]; }),
  // Shipping defaults
  getCargoCompanies:   ()                              => apiClient.get('/trendyol/cargo-companies').then(r => { const d = r.data; return (Array.isArray(d) ? d : (d?.data ?? d?.companies ?? [])) as Array<{ id: number; code: string; name: string }>; }),
  getShippingDefaults: ()                              => apiClient.get('/trendyol/shipping-defaults').then(r => { const d = r.data; return (d?.data ?? d) as { cargoCompanyId: number; deliveryDuration: number; dimensionalWeight: number }; }),
  saveShippingDefaults:(body: any)                     => apiClient.post('/trendyol/shipping-defaults', body).then(r => r.data),
  // Price strategy (global) — pricing_settings tablosu
  getPriceStrategy:    ()            => apiClient.get('/pricing-settings').then(r => {
    const d = (r.data as { data?: Record<string, unknown> })?.data ?? r.data as Record<string, unknown>;
    return {
      mode:        (d?.type ?? d?.mode ?? 'none') as PriceStrategyData['mode'],
      value:       Number(d?.value ?? 0),
      vatRate:     Number(d?.vatRate ?? 20),
      vatIncluded: Boolean(d?.vatIncluded ?? false),
      roundTo:     Number(d?.rounding ?? d?.roundTo ?? 2),
    };
  }),
  savePriceStrategy:   (body: PriceStrategyData) => apiClient.post('/pricing-settings', {
    type:        body.mode,
    value:       body.value,
    vatRate:     body.vatRate,
    rounding:    body.roundTo,
    vatIncluded: body.vatIncluded,
  }).then(r => {
    const d = (r.data as { data?: Record<string, unknown> })?.data ?? r.data;
    return {
      mode:        (d?.type ?? d?.mode ?? body.mode) as PriceStrategyData['mode'],
      value:       Number(d?.value ?? body.value),
      vatRate:     Number(d?.vatRate ?? body.vatRate),
      vatIncluded: Boolean(d?.vatIncluded ?? body.vatIncluded),
      roundTo:     Number(d?.rounding ?? d?.roundTo ?? body.roundTo),
    };
  }),
  // Per-product price override
  getProductPriceOverride:  (productId: string) => apiClient.get(`/trendyol/price-override/${productId}`).then(r => r.data as ProductPriceOverrideData | null),
  saveProductPriceOverride: (productId: string, body: any) => apiClient.post(`/trendyol/price-override/${productId}`, body).then(r => r.data),
  deleteProductPriceOverride:(productId: string) => apiClient.delete(`/trendyol/price-override/${productId}`).then(r => r.data),
  // Queue-based bulk send
  bulkSend:        (ids: string[]) => apiClient.post('/trendyol/products/bulk-send', { productIds: ids }, { timeout: 120_000 }).then(r => r.data as { batchId: string; total: number }),
  getBatchStatus:  (batchId: string) => apiClient.get(`/trendyol/batches/${batchId}`).then(r => r.data as BatchJob),
  retryFailed:     () => apiClient.post('/trendyol/products/retry-failed', {}).then(r => r.data as { batchId: string | null; total: number }),
  resetTrendyolRecords: (productIds?: string[], resetAll?: boolean) =>
    apiClient.post('/trendyol/products/reset-trendyol', { productIds, resetAll }, { timeout: 60_000 }).then(r => r.data as { deleted: number; message: string }),
  getIntegrationLogs: (q?: any) => apiClient.get('/trendyol/logs', { params: q }).then(r => r.data as { logs: IntegrationLog[]; total: number; page: number; totalPages: number }),
  // Category helpers
  getMappedCategories:  () => apiClient.get('/trendyol/products/mapped-categories').then(r => {
    const d = r.data;
    const list = d?.categories ?? d?.data?.categories;
    return (Array.isArray(list) ? list : []) as MappedCategory[];
  }),
  getCategoryProductIds: (categoryId?: string) => apiClient.get('/trendyol/products/category-ids', { params: categoryId ? { categoryId } : {} }).then(r => r.data as { ids: string[]; total: number }),
  // Trendyol batch status (async processing result)
  getTrendyolBatchResult: (batchRequestId: string) => apiClient.get(`/trendyol/trendyol-batch/${encodeURIComponent(batchRequestId)}`).then(r => r.data),
};

// ── Small helpers ─────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('tr-TR');
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleString('tr-TR') : '—';

const TABS = [
  { id: 'setup',      label: 'Bağlantı' },
  { id: 'categories', label: 'Kategori Eşleştirme' },
  { id: 'brands',     label: 'Marka Eşleştirme' },
  { id: 'attributes', label: 'Özellik Eşleştirme' },
  { id: 'products',   label: 'Ürün Gönderme' },
  { id: 'sync',       label: 'Fiyat & Stok Senkron' },
  { id: 'calculator', label: '🧮 Kâr Hesaplayıcı' },
  { id: 'history',    label: 'Geçmiş' },
  { id: 'logs',       label: '🔍 Gönderim Tanısı' },
] as const;
export type TabId = typeof TABS[number]['id'];

const STATUS_STYLES: Record<string, string> = {
  SENT:         'bg-green-100 text-green-700',
  APPROVED:     'bg-green-100 text-green-700',
  PRICE_SYNCED: 'bg-blue-100 text-blue-700',
  PENDING:      'bg-gray-100 text-gray-600',
  ERROR:        'bg-red-100 text-red-700',
  REJECTED:     'bg-red-100 text-red-700',
};
const STATUS_LABELS: Record<string, string> = {
  SENT: 'Gönderildi', APPROVED: 'Onaylandı', PRICE_SYNCED: 'Senkron',
  PENDING: 'Beklemede', ERROR: 'Hata', REJECTED: 'Reddedildi',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-gray-800', sub }: { label: string; value: React.ReactNode; color?: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Trendyol Cargo Companies (static list matching official docs) ─────────────
const CARGO_COMPANIES = [
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

// ── Tab: Setup ────────────────────────────────────────────────────────────────

/** Masked credential input with show/hide toggle and copy button */
function SecretField({
  label, value, onChange, placeholder = '••••••••',
  hint, required = false, type = 'password',
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; required?: boolean; type?: 'text' | 'password';
}) {
  const [show, setShow] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    if (!value || value === '***') return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const isPlaceholder = !value || value === '***';

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-orange-400 bg-white">
        <input
          type={type === 'password' && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm focus:outline-none bg-transparent"
        />
        {/* Show/hide toggle — only for password fields */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="px-2 text-gray-400 hover:text-gray-700 transition-colors text-xs"
            tabIndex={-1}
            title={show ? 'Gizle' : 'Göster'}
          >
            {show ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            )}
          </button>
        )}
        {/* Copy button */}
        <button
          type="button"
          onClick={copy}
          disabled={isPlaceholder}
          className="px-2 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30"
          tabIndex={-1}
          title="Kopyala"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          )}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

type FormState = {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
  token: string;
  integrationCode: string;
};

export function SetupTab({
  stats,
  flowMode = false,
  onContinue,
}: {
  stats: Stats | undefined;
  flowMode?: boolean;
  onContinue?: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState<FormState>({
    supplierId: '', apiKey: '', apiSecret: '', token: '', integrationCode: '',
  });
  const [testing, setTesting] = React.useState(false);

  // Load existing credentials (shown as '***')
  const { data: integration } = useQuery({
    queryKey: ['trendyol-integration'],
    queryFn:  trendyolApi.getIntegration,
  });

  React.useEffect(() => {
    if (integration) {
      setForm({
        supplierId:      integration.supplierId ?? '',
        apiKey:          integration.apiKey ?? '',
        apiSecret:       integration.apiSecret ?? '',
        token:           integration.token ?? '',
        integrationCode: integration.integrationCode ?? '',
      });
    }
  }, [integration]);

  const set = (k: keyof FormState) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const missingRequired = !form.supplierId.trim() || !form.apiKey.trim() || !form.apiSecret.trim();

  const saveMut = useMutation({
    mutationFn: () => trendyolApi.saveIntegration(form),
    onSuccess:  () => {
      toast.success('API bilgileri kaydedildi.');
      qc.invalidateQueries({ queryKey: ['trendyol-stats'] });
      qc.invalidateQueries({ queryKey: ['trendyol-integration'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? e.message),
  });

  const testConn = async () => {
    if (missingRequired) {
      toast.error('Önce Supplier ID, API Key ve API Secret alanlarını doldurun.');
      return;
    }
    setTesting(true);
    try {
      // If fields have been changed (not '***'), save first then test
      const hasChanges = [form.apiKey, form.apiSecret, form.token].some(v => v && v !== '***');
      if (hasChanges) await trendyolApi.saveIntegration(form);
      const res = await trendyolApi.testConnection();
      if (res.success) toast.success(res.message ?? 'Bağlantı başarılı!');
      else toast.error(res.message ?? 'Bağlantı başarısız.');
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? e.message ?? 'Test başarısız.');
    } finally { setTesting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {stats && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${stats.connected ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stats.connected ? 'bg-green-500' : 'bg-amber-500'}`} />
          <span className={`font-medium text-sm ${stats.connected ? 'text-green-800' : 'text-amber-800'}`}>
            {stats.connected ? `Bağlı — Supplier ID: ${stats.supplierId}` : 'Henüz bağlantı kurulmadı'}
          </span>
          {stats.lastSync && <span className="ml-auto text-xs text-gray-500">Son senkron: {fmtDate(stats.lastSync)}</span>}
        </div>
      )}

      {/* API Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Trendyol API Bilgileri</h3>
        <p className="text-xs text-gray-500 mb-5">Trendyol Satıcı Paneli → Hesabım → Mağaza Bilgileri bölümünden alabilirsiniz.</p>

        {/* Row 1: Core credentials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <SecretField
            label="Supplier ID (Mağaza ID)"
            value={form.supplierId}
            onChange={set('supplierId')}
            type="text"
            placeholder="12345678"
            hint="Trendyol satıcı kimlik numaranız"
            required
          />
          <SecretField
            label="API Key"
            value={form.apiKey}
            onChange={set('apiKey')}
            type="password"
            placeholder="••••••••••••"
            hint="Maskelenmiş — değiştirmek için yeniden girin"
            required
          />
          <SecretField
            label="API Secret"
            value={form.apiSecret}
            onChange={set('apiSecret')}
            type="password"
            placeholder="••••••••••••"
            hint="Maskelenmiş — değiştirmek için yeniden girin"
            required
          />
        </div>

        {/* Row 2: Token + Integration Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          <SecretField
            label="Token"
            value={form.token}
            onChange={set('token')}
            type="password"
            placeholder="Bearer token (opsiyonel)"
            hint="OAuth Bearer token — Trendyol bazı entegrasyonlarda talep edebilir"
          />
          <SecretField
            label="Entegrasyon Referans Kodu"
            value={form.integrationCode}
            onChange={set('integrationCode')}
            type="text"
            placeholder="WTG-2024-XXXXX"
            hint="Trendyol tarafından verilen entegrasyon tanımlayıcısı"
          />
        </div>

        {missingRequired && (
          <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            Kaydetmek için Supplier ID, API Key ve API Secret zorunludur.
          </p>
        )}

        <div className="flex flex-wrap gap-3 mt-5">
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || missingRequired}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saveMut.isPending && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            )}
            {saveMut.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button
            onClick={testConn}
            disabled={testing || missingRequired}
            className="px-5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
            title={missingRequired ? 'Önce zorunlu alanları doldurun' : 'Bağlantıyı test et'}
          >
            {testing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Test ediliyor…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Bağlantıyı Test Et
              </>
            )}
          </button>
        </div>
      </div>

      {!flowMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h4 className="font-semibold text-blue-900 mb-3">Nasıl Çalışır?</h4>
          <ol className="space-y-1.5 text-sm text-blue-800">
            {[
              '1. Trendyol Satıcı Paneli → Ayarlar → API Bilgileri\'nden Supplier ID, API Key ve API Secret alın',
              '2. Gerekiyorsa Token ve Entegrasyon Referans Kodu\'nu da girin',
              '3. Kategori Eşleştirme sekmesinde yerel kategorilerinizi Trendyol kategorileriyle eşleştirin',
              '4. Özellik Eşleştirme sekmesinde ürün özelliklerini Trendyol özellik formatına dönüştürün',
              '5. Ürün Gönderme sekmesinden ürünleri seçerek Trendyol\'a gönderin',
              '6. Fiyat & Stok Senkron sekmesinden toplu güncelleme yapın',
            ].map(s => <li key={s}>{s}</li>)}
          </ol>
        </div>
      )}

      {stats?.connected && !flowMode && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Toplam Ürün"      value={fmt.format(stats.totalProducts ?? 0)} />
          <StatCard label="Trendyol'da"      value={fmt.format(stats.sent ?? 0)}          color="text-green-600" />
          <StatCard label="Eşleştirilmemiş"  value={fmt.format(stats.unmapped ?? 0)}       color="text-amber-600" />
          <StatCard label="Hatalı"           value={fmt.format(stats.errors ?? 0)}         color="text-red-600" />
        </div>
      )}

      {stats?.connected && !flowMode && <ShippingDefaultsPanel />}
      {stats?.connected && !flowMode && <PriceStrategyPanel />}

      {flowMode && onContinue && (
        <div className="flex justify-end pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onContinue}
            disabled={!stats?.connected}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Devam Et
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Shipping Defaults Panel ───────────────────────────────────────────────────
function ShippingDefaultsPanel() {
  const qc = useQueryClient();

  const { data: defaults } = useQuery({
    queryKey: ['trendyol-shipping-defaults'],
    queryFn:  trendyolApi.getShippingDefaults,
    staleTime: 0,
  });

  const [form, setForm] = React.useState({
    cargoCompanyId:    10,
    deliveryDuration:  3,
    dimensionalWeight: 1,
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (defaults) setForm({
      cargoCompanyId:    defaults.cargoCompanyId    ?? 10,
      deliveryDuration:  defaults.deliveryDuration  ?? 3,
      dimensionalWeight: defaults.dimensionalWeight ?? 1,
    });
  }, [defaults]);

  const save = async () => {
    setSaving(true);
    try {
      await trendyolApi.saveShippingDefaults(form);
      qc.invalidateQueries({ queryKey: ['trendyol-shipping-defaults'] });
      toast.success('Kargo varsayılanları kaydedildi.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7"/>
            </svg>
            Global Kargo Varsayılanları
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Ürünlerde kargo ayarı yoksa bu değerler kullanılır.</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
          {saving
            ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
          }
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Cargo company */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Kargo Firması</label>
          <select value={form.cargoCompanyId}
            onChange={e => setForm(f => ({ ...f, cargoCompanyId: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            {CARGO_COMPANIES.map(c => (
              <option key={c.id} value={c.id}>{c.name} (ID: {c.id})</option>
            ))}
          </select>
        </div>

        {/* Delivery duration */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Teslimat Süresi (gün)</label>
          <div className="relative">
            <input type="number" min="1" max="30" step="1"
              value={form.deliveryDuration}
              onChange={e => setForm(f => ({ ...f, deliveryDuration: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">gün</span>
          </div>
        </div>

        {/* Dimensional weight */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Varsayılan Desi</label>
          <div className="relative">
            <input type="number" min="0.1" step="0.1"
              value={form.dimensionalWeight}
              onChange={e => setForm(f => ({ ...f, dimensionalWeight: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">desi</span>
          </div>
        </div>
      </div>

      {/* Cargo company table (read-only reference) */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 transition-colors list-none flex items-center gap-1">
          <svg className="w-3 h-3 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          Trendyol kargo şirketleri tablosu
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">ID</th>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">Şirket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {CARGO_COMPANIES.map(c => (
                <tr key={c.id} className={form.cargoCompanyId === c.id ? 'bg-orange-50' : 'bg-white'}>
                  <td className="px-3 py-1.5 font-mono font-bold text-orange-600">{c.id}</td>
                  <td className="px-3 py-1.5 text-gray-700">{c.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// ── Price Strategy Panel ──────────────────────────────────────────────────────

const VAT_RATES = [0, 1, 8, 10, 18, 20];

export function PriceStrategyPanel() {
  const qc = useQueryClient();

  const { data: strategy } = useQuery({
    queryKey: ['trendyol-price-strategy'],
    queryFn:  trendyolApi.getPriceStrategy,
    staleTime: 0,
  });

  const [form, setForm] = React.useState({
    mode:        'none' as 'none' | 'percent' | 'fixed',
    value:       0,
    vatRate:     20,
    vatIncluded: false,
    roundTo:     2,
  });
  const [saving, setSaving] = React.useState(false);
  const [preview, setPreview] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (strategy) setForm({
      mode:        (strategy.mode ?? 'none') as 'none' | 'percent' | 'fixed',
      value:       Number(strategy.value   ?? 0),
      vatRate:     Number(strategy.vatRate ?? 20),
      vatIncluded: Boolean(strategy.vatIncluded ?? false),
      roundTo:     Number(strategy.roundTo ?? 2),
    });
  }, [strategy]);

  React.useEffect(() => {
    const base = 100;
    if (form.mode === 'percent') setPreview(parseFloat((base * (1 + form.value / 100)).toFixed(form.roundTo)));
    else if (form.mode === 'fixed') setPreview(parseFloat((base + form.value).toFixed(form.roundTo)));
    else setPreview(null);
  }, [form.mode, form.value, form.roundTo]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await trendyolApi.savePriceStrategy(form);
      qc.invalidateQueries({ queryKey: ['trendyol-price-strategy'] });
      setForm({
        mode:        saved.mode,
        value:       saved.value,
        vatRate:     saved.vatRate,
        vatIncluded: saved.vatIncluded,
        roundTo:     saved.roundTo,
      });
      toast.success('Fiyat stratejisi kaydedildi.');
    } catch (e: any) {
      toast.error(e?.message ?? e?.response?.data?.error ?? 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Global Fiyat Stratejisi
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Trendyol'a gönderilecek fiyatı otomatik artır. Ürün bazlı override mümkün.</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
          {saving
            ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
          }
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Mode */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Artış Yöntemi</label>
          <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value as any }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="none">Artış yok — orijinal fiyat</option>
            <option value="percent">Yüzde artış (%)</option>
            <option value="fixed">Sabit artış (₺)</option>
          </select>
        </div>

        {/* Value */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {form.mode === 'percent' ? 'Artış Yüzdesi (%)' : form.mode === 'fixed' ? 'Sabit Artış (₺)' : 'Artış Değeri'}
          </label>
          <div className="relative">
            <input type="number" min="0" step={form.mode === 'percent' ? 0.1 : 1}
              value={form.value}
              disabled={form.mode === 'none'}
              onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-400"/>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {form.mode === 'percent' ? '%' : '₺'}
            </span>
          </div>
        </div>

        {/* VAT rate */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">KDV Oranı (%)</label>
          <select value={form.vatRate} onChange={e => setForm(f => ({ ...f, vatRate: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            {VAT_RATES.map(r => <option key={r} value={r}>%{r}{r === 20 ? ' (Varsayılan)' : ''}</option>)}
          </select>
        </div>

        {/* Round to */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Yuvarlama (ondalık basamak)</label>
          <select value={form.roundTo} onChange={e => setForm(f => ({ ...f, roundTo: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value={0}>Tam sayı</option>
            <option value={2}>2 basamak (varsayılan)</option>
            <option value={4}>4 basamak</option>
          </select>
        </div>
      </div>

      {/* VAT included toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
        <input type="checkbox" checked={form.vatIncluded}
          onChange={e => setForm(f => ({ ...f, vatIncluded: e.target.checked }))}
          className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"/>
        <span className="text-sm text-gray-700">Temel fiyat KDV dahil (bilgilendirme amaçlı)</span>
      </label>

      {/* Live preview */}
      {form.mode !== 'none' && preview !== null && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm text-orange-800">
            <strong>Örnek hesaplama:</strong> 100 ₺ ürün → Trendyol'a <strong>{preview.toLocaleString('tr-TR')} ₺</strong> gönderilecek
            {form.mode === 'percent' ? ` (%${form.value} artış)` : ` (+${form.value} ₺ artış)`}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Searchable Trendyol Category Select ──────────────────────────────────────

/** Highlight matching query parts in a string — returns JSX spans */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts    = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <strong key={i} className="text-orange-500 font-semibold">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

function TrendyolCategorySelect({
  value, onChange, categories, placeholder = 'Trendyol kategorisi seç…',
}: {
  value: string;
  onChange: (id: string, name: string) => void;
  categories: TrendyolCategory[];
  placeholder?: string;
}) {
  const [query,    setQuery]    = useState('');
  const [open,     setOpen]     = useState(false);
  const [dropPos,  setDropPos]  = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const dropRef    = React.useRef<HTMLDivElement>(null);

  const selected = categories.find(c => String(c.id) === String(value));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const leafSet = new Set(categories.map(c => c.id));
      categories.forEach(c => { if (c.parentId) leafSet.delete(c.parentId); });
      return categories.filter(c => leafSet.has(c.id)).slice(0, 60);
    }
    return categories
      .filter(c => (c.path ?? c.name).toLowerCase().includes(q))
      .slice(0, 100);
  }, [query, categories]);

  // Recalculate dropdown position when opening
  const openDropdown = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropHeight = Math.min(320, window.innerHeight * 0.5);
    // Open upward if not enough space below
    const top = spaceBelow < dropHeight + 8
      ? rect.top + window.scrollY - dropHeight - 4
      : rect.bottom + window.scrollY + 4;
    setDropPos({ top, left: rect.left + window.scrollX, width: rect.width });
    setOpen(true);
    setQuery('');
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Portal dropdown rendered at document.body to escape overflow:hidden containers
  const dropdownPortal = open
    ? ReactDOM.createPortal(
        <div
          ref={dropRef}
          style={{ position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Kategori adı veya yolu ile ara…"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Options */}
          <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50">
            <li>
              <button
                type="button"
                onClick={() => { onChange('', ''); setOpen(false); setQuery(''); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 italic"
              >
                — Eşleştirme kaldır —
              </button>
            </li>
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-sm text-gray-400 text-center">Sonuç bulunamadı</li>
            )}
            {filtered.map(cat => {
              const displayPath = cat.path ?? cat.name;
              const isSelected  = String(cat.id) === String(value);
              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(String(cat.id), displayPath); setOpen(false); setQuery(''); }}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                      isSelected ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700 hover:bg-orange-50'
                    }`}
                  >
                    <HighlightMatch text={displayPath} query={query} />
                  </button>
                </li>
              );
            })}
            {!query && (
              <li className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
                Aramak için yazmaya başlayın — {categories.length} kategori mevcut
              </li>
            )}
          </ul>
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={triggerRef} className="relative">
      {/* Trigger */}
      <div
        className={`flex items-center border rounded-lg bg-white cursor-pointer ${open ? 'border-orange-400 ring-2 ring-orange-200' : 'border-gray-300 hover:border-gray-400'}`}
        onClick={openDropdown}
      >
        <span className={`flex-1 px-3 py-1.5 text-sm truncate ${selected ? 'text-gray-800' : 'text-gray-400'}`}>
          {selected ? (selected.path ?? selected.name) : placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange('', ''); setQuery(''); setOpen(false); }}
            className="px-2 text-gray-400 hover:text-gray-700"
            title="Temizle"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {dropdownPortal}
    </div>
  );
}

// ── Tab: Category Mapping ─────────────────────────────────────────────────────

export function CategoryMappingTab({
  onNavigate,
  flowMode = false,
}: {
  onNavigate: (tab: TabId) => void;
  flowMode?: boolean;
}) {
  const qc = useQueryClient();

  const { data: localCats,    isLoading: lcLoading } = useQuery({
    queryKey: ['local-categories'],
    queryFn:  trendyolApi.getLocalCategories,
  });
  const { data: trendyolCats, isLoading: tcLoading, error: tcError } = useQuery({
    queryKey: ['trendyol-categories'],
    queryFn:  trendyolApi.getTrendyolCategories,
    retry:    1,
  });
  const { data: savedMapping } = useQuery({
    queryKey: ['category-mapping'],
    queryFn:  trendyolApi.getCategoryMapping,
  });

  const [mapping,    setMapping]    = useState<Record<string, string>>({});
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    if (savedMapping) {
      setMapping(savedMapping);
    }
  }, [savedMapping]);

  const invalidateCategoryQueries = () => {
    qc.invalidateQueries({ queryKey: ['category-mapping'] });
    qc.invalidateQueries({ queryKey: ['category-mapping-summary'] });
    qc.invalidateQueries({ queryKey: ['trendyol-mapped-categories'] });
  };

  const saveMut = useMutation({
    mutationFn: () => trendyolApi.saveCategoryMapping(mapping),
    onSuccess:  () => {
      toast.success('Kategori eşleştirmesi kaydedildi.');
      invalidateCategoryQueries();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? e.message),
  });

  const persistMapping = async (next: Record<string, string>, silent = false) => {
    await trendyolApi.saveCategoryMapping(next);
    invalidateCategoryQueries();
    if (!silent) toast.success('Kategori eşleştirmesi kaydedildi.');
  };

  const allLocal    = Array.isArray(localCats)    ? localCats    : [];
  const allTrendyol = Array.isArray(trendyolCats) ? trendyolCats : [];

  const filteredLocal = useMemo(() =>
    allLocal.filter(c => c.name.toLowerCase().includes(localSearch.toLowerCase())),
    [allLocal, localSearch],
  );

  const mappedCount   = Object.values(mapping).filter(Boolean).length;
  const unmappedCats  = allLocal.filter(c => !mapping[c.id]);
  const hasUnmapped   = unmappedCats.length > 0;

  const handleCategoryChange = (localId: string, trendyolId: string) => {
    const next = { ...mapping, [localId]: trendyolId };
    if (!trendyolId) delete next[localId];
    setMapping(next);
    persistMapping(next, true).catch((e: any) =>
      toast.error(e?.message ?? e?.response?.data?.error ?? 'Kategori eşleştirmesi kaydedilemedi'),
    );
  };

  if (lcLoading || tcLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Kategoriler yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trendyol categories error banner */}
      {tcError && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Trendyol kategorileri yüklenemedi</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {(tcError as any)?.response?.data?.error ?? (tcError as any)?.message ?? 'Trendyol API bağlantı hatası.'}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              API bilgilerinizin doğru girildiğinden ve <strong>Kurulum</strong> sekmesinden kaydedildiğinden emin olun.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Kategori Eşleştirme</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Yerel kategorilerinizi Trendyol kategorileriyle eşleştirin.{' '}
            <span className="font-medium text-gray-700">{mappedCount} / {allLocal.length}</span> eşleşti.
          </p>
        </div>
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {saveMut.isPending && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
          {saveMut.isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

      {/* Trendyol API error */}
      {tcError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Trendyol kategorileri yüklenemedi</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Bağlantı sekmesinden API bilgilerinizi kaydedin ve bağlantıyı test edin.
            </p>
          </div>
        </div>
      )}

      {/* Unmapped info (non-blocking) */}
      {hasUnmapped && !tcError && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              {unmappedCats.length} kategori henüz eşleştirilmemiş
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Eşleşmeyen kategorilere ait ürünler gönderilmeyecektir. Eşleştirdiğiniz kategorilerdeki ürünler normal şekilde gönderilir.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {unmappedCats.slice(0, 6).map(c => (
                <span key={c.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{c.name}</span>
              ))}
              {unmappedCats.length > 6 && (
                <span className="text-xs text-blue-600">+{unmappedCats.length - 6} diğer</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All mapped success */}
      {!hasUnmapped && allLocal.length > 0 && !tcError && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-700 font-medium">Tüm kategoriler eşleştirildi — ürün göndermeye hazır!</p>
        </div>
      )}

      {/* Progress bar */}
      {allLocal.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Eşleştirme ilerlemesi</span>
            <span>{mappedCount} / {allLocal.length}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${mappedCount === allLocal.length ? 'bg-green-500' : 'bg-orange-400'}`}
              style={{ width: `${allLocal.length ? (mappedCount / allLocal.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Local category search */}
      <input
        value={localSearch}
        onChange={e => setLocalSearch(e.target.value)}
        placeholder="Yerel kategori ara…"
        className="w-full md:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
      />

      {/* Mapping table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase w-5/12">
                Yerel Kategori
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center w-2/12">
                Durum
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase w-5/12">
                Trendyol Kategorisi
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLocal.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-gray-400">
                  {allLocal.length === 0 ? 'Henüz kategori oluşturulmamış' : 'Arama sonucu bulunamadı'}
                </td>
              </tr>
            )}
            {filteredLocal.map((cat, i) => {
              const mapped = !!mapping[cat.id];
              return (
                <tr key={cat.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50/40 transition-colors`}>
                  {/* Local category */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{cat.name}</div>
                    {cat.path && cat.path !== cat.name && (
                      <div className="text-xs text-gray-400 mt-0.5">{cat.path}</div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    {mapped ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Eşleşti
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5" title="Bu kategorideki ürünler gönderimde atlanır">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Eksik
                      </span>
                    )}
                  </td>

                  {/* Trendyol category searchable select */}
                  <td className="px-4 py-3">
                    <TrendyolCategorySelect
                      value={mapping[cat.id] ?? ''}
                      categories={allTrendyol}
                      onChange={(id) => handleCategoryChange(cat.id, id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Trendyol category count info */}
      {allTrendyol.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          Trendyol'dan {allTrendyol.length} kategori yüklendi
        </p>
      )}

      {!flowMode && (
        <div className="flex justify-between pt-4 border-t border-gray-200 mt-4">
          <button
            type="button"
            onClick={() => onNavigate('setup')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Geri: Bağlantı
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await persistMapping(mapping, true);
              } catch (e: any) {
                toast.error(e?.message ?? e?.response?.data?.error ?? 'Kayıt başarısız — önce Kaydet\'e basın.');
                return;
              }
              onNavigate('brands');
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
          >
            İleri: Marka Eşleştirme
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab: Brand Mapping ────────────────────────────────────────────────────────

/**
 * Searchable Trendyol brand select.
 * Loads brands lazily when the user opens the dropdown; filters client-side.
 */
function TrendyolBrandSelect({
  value, onChange,
}: {
  value: TrendyolBrand | null;
  onChange: (b: TrendyolBrand | null) => void;
}) {
  const [search,   setSearch]   = useState('');
  const [open,     setOpen]     = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const { data: brands = [], isFetching } = useQuery({
    queryKey: ['trendyol-brands', search],
    queryFn:  () => trendyolApi.getTrendyolBrands(search || undefined),
    enabled:  open,
    staleTime: 60_000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const createBrand = async () => {
    if (!search.trim()) return;
    setCreating(true);
    try {
      const brand = await trendyolApi.createTrendyolBrand(search.trim());
      onChange(brand);
      setOpen(false);
      setSearch('');
      toast.success(`"${brand.name}" markası Trendyol'da oluşturuldu.`);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? e.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase())).slice(0, 50);

  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors text-left">
        <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {value ? `${value.name}` : 'Trendyol markası seç…'}
        </span>
        {value && <span className="text-xs text-gray-400 ml-2 flex-shrink-0">ID: {value.id}</span>}
        <svg className={`w-4 h-4 text-gray-400 ml-auto transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Marka adı ara…"
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"/>
          </div>

          <ul className="max-h-52 overflow-y-auto divide-y divide-gray-50">
            {isFetching && (
              <li className="px-3 py-3 text-sm text-center text-gray-400">
                <svg className="w-4 h-4 animate-spin inline mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Aranıyor…
              </li>
            )}
            {!isFetching && filtered.map(b => (
              <li key={b.id}>
                <button type="button" onClick={() => { onChange(b); setOpen(false); setSearch(''); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800">{b.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">ID: {b.id}</span>
                </button>
              </li>
            ))}
            {!isFetching && filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-gray-400 text-center">
                {search ? `"${search}" bulunamadı` : 'Arama yapın'}
              </li>
            )}
          </ul>

          {search.trim() && (
            <div className="p-2 border-t border-gray-100 bg-gray-50">
              <button type="button" onClick={createBrand} disabled={creating}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg border border-orange-200 transition-colors disabled:opacity-50">
                {creating
                  ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                }
                {creating ? 'Oluşturuluyor…' : `"${search}" markasını Trendyol'da oluştur`}
              </button>
            </div>
          )}

          {value && (
            <div className="px-2 pb-2 bg-gray-50">
              <button type="button" onClick={() => { onChange(null); setOpen(false); }}
                className="w-full text-xs text-gray-400 hover:text-red-500 py-1 text-center transition-colors">
                Seçimi temizle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Each row in the brand mapping table
interface BrandRow {
  rowId:      string;                   // internal React key
  brandName:  string;                   // user's own brand name label
  mode:       'search' | 'manual';      // search from list OR type brand ID manually
  selected:   TrendyolBrand | null;     // search mode result
  manualId:   string;                   // manual mode: numeric Trendyol brand ID
}

let _rowCounter = 0;
const newRow = (brandName = ''): BrandRow => ({
  rowId:     String(++_rowCounter),
  brandName,
  mode:      'search',
  selected:  null,
  manualId:  '',
});

export function BrandMappingTab({
  onNavigate,
  flowMode = false,
}: {
  onNavigate: (tab: TabId) => void;
  flowMode?: boolean;
}) {
  const qc = useQueryClient();

  // Local brands from products (may be empty — that's fine now)
  const { data: localBrands = [] } = useQuery({
    queryKey: ['local-brands'],
    queryFn:  trendyolApi.getLocalBrands,
    staleTime: 0,
  });

  const { data: savedMapping = {}, isLoading: loadingMapping } = useQuery({
    queryKey: ['brand-mapping'],
    queryFn:  trendyolApi.getBrandMapping,
    staleTime: 0,
  });

  const [rows,   setRows]   = useState<BrandRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialised, setInitialised] = useState(false);

  // Build rows once data is loaded
  useEffect(() => {
    if (loadingMapping || initialised) return;
    setInitialised(true);

    const built: BrandRow[] = [];

    // First: rows from saved mapping
    for (const [name, id] of Object.entries(savedMapping)) {
      if (!id) continue;
      built.push({
        rowId:     String(++_rowCounter),
        brandName: name,
        mode:      'search',
        // Restore with the label as the brand name so it's readable; user can re-search to get full details
        selected:  { id: id as number, name: name },
        manualId:  '',
      });
    }

    // Then: add product brands not already in saved mapping
    for (const brand of localBrands) {
      if (!brand || savedMapping[brand] !== undefined) continue;
      built.push(newRow(brand));
    }

    // Always have at least one empty row
    if (built.length === 0) built.push(newRow());

    setRows(built);
  }, [savedMapping, localBrands, loadingMapping, initialised]);

  const updateRow = (rowId: string, patch: Partial<BrandRow>) =>
    setRows(prev => prev.map(r => r.rowId === rowId ? { ...r, ...patch } : r));

  const removeRow = (rowId: string) =>
    setRows(prev => prev.filter(r => r.rowId !== rowId));

  // Effective mapped ID for a row
  const effectiveId = (row: BrandRow): number | null => {
    if (row.mode === 'search')  return row.selected?.id ?? null;
    const n = parseInt(row.manualId, 10);
    return isNaN(n) ? null : n;
  };

  const save = async () => {
    setSaving(true);
    try {
      const toSave: BrandMapping = {};
      for (const row of rows) {
        const id = effectiveId(row);
        if (!id) continue;
        // Use left-column label if filled, otherwise fall back to selected brand name or string ID
        const key = row.brandName.trim()
          || (row.mode === 'search' && row.selected?.name ? row.selected.name : '')
          || String(id);
        if (key) toSave[key] = id;
      }
      if (Object.keys(toSave).length === 0) {
        toast.error('Kaydedilecek eşleşme yok. Önce sağ taraftan bir Trendyol markası seçin.');
        return;
      }
      await trendyolApi.saveBrandMapping(toSave);
      qc.invalidateQueries({ queryKey: ['brand-mapping'] });
      toast.success(`${Object.keys(toSave).length} marka eşleştirmesi kaydedildi.`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const mappedCount = rows.filter(r => !!effectiveId(r)).length;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-900">Marka Eşleştirme</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Trendyol'a ürün gönderirken kullanılacak marka ID'lerini eşleştirin.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-center px-3 py-1 bg-green-50 rounded-lg border border-green-200">
            <p className="text-lg font-bold text-green-600 leading-none">{mappedCount}</p>
            <p className="text-[10px] text-green-500 mt-0.5">Eşleşti</p>
          </div>
          <div className="text-center px-3 py-1 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-lg font-bold text-amber-500 leading-none">{rows.length - mappedCount}</p>
            <p className="text-[10px] text-amber-500 mt-0.5">Eksik</p>
          </div>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm">
            {saving
              ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
            }
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* ── Info panel ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Trendyol ürün gönderiminde numeric <strong>brandId</strong> zorunludur.</li>
          <li>• <strong>Listeden Seç:</strong> Trendyol marka havuzunda arama yapın ve markanızı seçin.</li>
          <li>• <strong>ID ile Gir:</strong> Markanız Trendyol'da onay sürecindeyse Trendyol panelinizden aldığınız marka ID numarasını girin. Onay 3–10 gün sürebilir.</li>
          <li>• <strong>Üründe marka alanı boşsa</strong> burada kaydettiğiniz marka ID&apos;si otomatik kullanılır. Tek eşleştirme varsa tüm ürünlerde geçerlidir.</li>
          <li>• Birden fazla eşleştirmede sol kolon, ürünün marka adıyla eşleşmelidir (büyük/küçük harf fark etmez).</li>
        </ul>
      </div>

      {/* ── Mapping rows ── */}
      {loadingMapping ? (
        <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Yükleniyor…
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-visible">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Marka ID</span>
              <p className="text-[10px] text-gray-400 mt-0.5 font-normal normal-case tracking-normal">
                Listede markası bulunmayan satıcılar Trendyol'dan "Marka Ekle" ile aldıkları ID numarasını bu alana girmelidir.
              </p>
            </div>
            <span />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide self-center">Trendyol Markası</span>
            <span />
          </div>

          <div className="divide-y divide-gray-100">
            {rows.map(row => {
              const id       = effectiveId(row);
              const isMapped = !!id;
              return (
                <div key={row.rowId}
                  className={`grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center px-4 py-3 transition-colors ${isMapped ? 'bg-white' : 'bg-amber-50/20'}`}>

                  {/* Left: brand name input */}
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isMapped ? 'bg-green-400' : 'bg-amber-300'}`} />
                    <input
                      type="text"
                      value={row.brandName}
                      onChange={e => updateRow(row.rowId, { brandName: e.target.value })}
                      placeholder="ör: 102340"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  {/* Mode toggle */}
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      title="Listeden seç"
                      onClick={() => updateRow(row.rowId, { mode: 'search' })}
                      className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${row.mode === 'search' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      Liste
                    </button>
                    <button
                      type="button"
                      title="ID ile gir"
                      onClick={() => updateRow(row.rowId, { mode: 'manual' })}
                      className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${row.mode === 'manual' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      ID
                    </button>
                  </div>

                  {/* Right: search select OR manual ID input */}
                  {row.mode === 'search' ? (
                    <TrendyolBrandSelect
                      value={row.selected}
                      onChange={brand => {
                        // Auto-fill the left label from the brand name if it's currently empty
                        const patch: Partial<BrandRow> = { selected: brand };
                        if (brand && !row.brandName.trim()) patch.brandName = brand.name;
                        updateRow(row.rowId, patch);
                      }}
                    />
                  ) : (
                    <div className="space-y-1">
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          value={row.manualId}
                          onChange={e => updateRow(row.rowId, { manualId: e.target.value })}
                          placeholder="Trendyol Marka ID (ör: 102340)"
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono"
                        />
                        {row.manualId && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        Trendyol paneli → Markalarım → Marka ID'yi buraya girin
                      </p>
                    </div>
                  )}

                  {/* Delete row */}
                  <button
                    type="button"
                    onClick={() => removeRow(row.rowId)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Satırı sil"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {!flowMode && (
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button type="button" onClick={() => onNavigate('categories')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            Geri: Kategori Eşleştirme
          </button>
          <button type="button" onClick={async () => { await save(); onNavigate('attributes'); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
            İleri: Özellik Eşleştirme
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab: Attribute Mapping ────────────────────────────────────────────────────

// ── Attribute accordion section ───────────────────────────────────────────────
function AttrSection({
  title, badge, badgeColor, subtitle, defaultOpen, forceOpen, onToggle, missingCount, children,
}: {
  title:        string;
  badge:        string;
  badgeColor:   string;
  subtitle?:    string;
  defaultOpen?: boolean;
  forceOpen?:   boolean;
  onToggle?:    () => void;
  missingCount?: number;
  children:     React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const isOpen = forceOpen !== undefined ? forceOpen : open;
  const toggle = onToggle ?? (() => setOpen(o => !o));

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
        <span className="font-semibold text-gray-800 text-sm flex-1">{title}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
        {missingCount !== undefined && missingCount > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
            {missingCount} eksik
          </span>
        )}
        {subtitle && <span className="text-xs text-gray-400 hidden sm:block">{subtitle}</span>}
      </button>
      {isOpen && (
        <div className="divide-y divide-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Attribute rows (shared) ───────────────────────────────────────────────────
function AttrRows({
  attrs, catDefaults, setAttrValue, clearAttrValue,
}: {
  attrs:          TrendyolAttribute[];
  catDefaults:    Record<string, string>;
  setAttrValue:   (id: string, val: string) => void;
  clearAttrValue: (id: string) => void;
}) {
  return (
    <>
      {/* Column header */}
      <div className="grid grid-cols-12 px-4 py-2 bg-white border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
        <div className="col-span-4">Özellik</div>
        <div className="col-span-7">Değer</div>
        <div className="col-span-1"/>
      </div>

      {attrs.map((attr, i) => {
        const selectedId = catDefaults[attr.id] ?? '';
        const hasOptions = (attr.attributeValues?.length ?? 0) > 0;
        const isFilled   = !!selectedId;

        return (
          <div key={attr.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
            <div className="grid grid-cols-12 items-center px-4 py-2.5 gap-3">
              <div className="col-span-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-gray-800 text-sm">{attr.name}</span>
                  {attr.required && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1">Zorunlu</span>
                  )}
                  {attr.required && attr.varianter && (
                    <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-200 rounded px-1" title="Varyantlı ürünlerde varyanttan gelir; varyantsız ürünler için buraya varsayılan değer girin">Varyant</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {hasOptions ? `${attr.attributeValues!.length} seçenek` : 'Serbest metin'}
                </div>
              </div>

              <div className="col-span-7">
                {hasOptions ? (
                  <select
                    value={selectedId}
                    onChange={e => e.target.value ? setAttrValue(attr.id, e.target.value) : clearAttrValue(attr.id)}
                    className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                      isFilled ? 'border-green-300 bg-green-50/50 text-gray-800' : 'border-gray-300 text-gray-500'
                    }`}>
                    <option value="">— Seçin —</option>
                    {attr.attributeValues!.map(v => (
                      <option key={String(v.id)} value={String(v.id)}>{v.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedId}
                    onChange={e => e.target.value ? setAttrValue(attr.id, e.target.value) : clearAttrValue(attr.id)}
                    placeholder="Değer girin…"
                    className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                      isFilled ? 'border-green-300 bg-green-50/50' : 'border-gray-300'
                    }`}
                  />
                )}
              </div>

              <div className="col-span-1 flex items-center justify-end">
                {isFilled && (
                  <button type="button" onClick={() => clearAttrValue(attr.id)} title="Temizle"
                    className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/**
 * New format: category-based attribute value selection.
 * { [trendyolCategoryId]: { [trendyolAttributeId]: selectedValueId | customText } }
 */
type AttrMap = Record<string, Record<string, string>>;

export function AttributeMappingTab({
  onNavigate,
  flowMode = false,
}: {
  onNavigate: (tab: TabId) => void;
  flowMode?: boolean;
}) {
  const qc = useQueryClient();

  // Saved category mapping → derive which Trendyol categories are in use
  // staleTime:0 ensures we re-fetch after the category tab auto-saves on navigation
  const { data: savedCatMapping  } = useQuery({ queryKey: ['category-mapping'],  queryFn: trendyolApi.getCategoryMapping,   staleTime: 0 });
  const { data: savedAttrDefaults} = useQuery({ queryKey: ['attribute-mapping'], queryFn: trendyolApi.getAttributeMapping,  staleTime: 0 });
  const { data: allTrendyolCats  } = useQuery({ queryKey: ['trendyol-categories'], queryFn: trendyolApi.getTrendyolCategories, retry: 1 });

  // Unique Trendyol category IDs from saved category mapping
  const mappedTrendyolCatIds = useMemo(() => {
    const ids = Object.values(savedCatMapping ?? {}).filter(Boolean) as string[];
    return [...new Set(ids)];
  }, [savedCatMapping]);

  // Defaults state: { [trendyolCatId]: { [trendyolAttrId]: selectedValueId } }
  const [defaults,      setDefaults]      = useState<AttrMap>({});
  const [activeCatId,   setActiveCatId]   = useState<string>('');
  const [trendyolAttrs, setTrendyolAttrs] = useState<TrendyolAttribute[]>([]);
  const [loadingAttrs,  setLoadingAttrs]  = useState(false);

  // Restore saved defaults
  useEffect(() => { if (savedAttrDefaults) setDefaults(savedAttrDefaults as AttrMap); }, [savedAttrDefaults]);

  // Auto-select first mapped category
  useEffect(() => {
    if (!activeCatId && mappedTrendyolCatIds.length > 0) setActiveCatId(mappedTrendyolCatIds[0]);
  }, [mappedTrendyolCatIds, activeCatId]);

  // Load attributes when active category changes
  useEffect(() => {
    if (!activeCatId) { setTrendyolAttrs([]); return; }
    setLoadingAttrs(true);
    trendyolApi.getTrendyolCatAttributes(activeCatId)
      .then(attrs => setTrendyolAttrs(attrs ?? []))
      .catch(e => toast.error('Özellikler yüklenemedi: ' + e.message))
      .finally(() => setLoadingAttrs(false));
  }, [activeCatId]);

  const saveMut = useMutation({
    mutationFn: () => trendyolApi.saveAttributeMapping(defaults),
    onSuccess: () => {
      toast.success('Özellik değerleri kaydedildi.');
      qc.invalidateQueries({ queryKey: ['attribute-mapping'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? e.message),
  });

  const catDefaults      = defaults[activeCatId] ?? {};
  // required:true attrs always shown as mandatory — even if varianter:true
  // (Trendyol requires Beden/Size even for non-variant products in many categories)
  const trulyRequired    = trendyolAttrs.filter(a => a.required);
  // varianter-only attrs that are NOT required — these are truly auto from variants
  const varianterAttrs   = trendyolAttrs.filter(a => a.varianter && !a.required);
  const optionalAttrs    = trendyolAttrs.filter(a => !a.required && !a.varianter);
  const requiredUnmapped = trulyRequired.filter(a => !catDefaults[a.id]);
  const mappedCount      = Object.values(catDefaults).filter(Boolean).length;

  const [optionalOpen, setOptionalOpen] = useState(false);

  const setAttrValue = (attrId: string, value: string) =>
    setDefaults(prev => ({ ...prev, [activeCatId]: { ...(prev[activeCatId] ?? {}), [attrId]: value } }));

  const clearAttrValue = (attrId: string) =>
    setDefaults(prev => {
      const catMap = { ...(prev[activeCatId] ?? {}) };
      delete catMap[attrId];
      return { ...prev, [activeCatId]: catMap };
    });

  const getCatName = (id: string) =>
    allTrendyolCats?.find(c => String(c.id) === String(id))?.path ?? id;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Özellik Değerleri</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Her Trendyol özelliği için değer seçin.{' '}
            {trendyolAttrs.length > 0 && <span className="font-medium text-gray-700">{mappedCount} / {trendyolAttrs.length} dolduruldu.</span>}
          </p>
        </div>
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
          {saveMut.isPending && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
          {saveMut.isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

      {/* ── No categories mapped yet ── */}
      {mappedTrendyolCatIds.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Önce kategori eşleştirmesi yapın</p>
            <p className="text-xs text-amber-700 mt-1">Kategori Eşleştirme sekmesinde yerel kategorilerinizi Trendyol kategorileriyle eşleştirin. Ardından bu sekme otomatik dolacak.</p>
            <button type="button" onClick={() => onNavigate('categories')}
              className="mt-2 text-xs font-medium text-orange-600 hover:underline">
              → Kategori Eşleştirme sekmesine git
            </button>
          </div>
        </div>
      )}

      {/* ── Category tabs (if multiple mapped) ── */}
      {mappedTrendyolCatIds.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {mappedTrendyolCatIds.map(id => (
            <button key={id} type="button" onClick={() => setActiveCatId(id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                activeCatId === id
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'
              }`}>
              {getCatName(id).split(' / ').pop() ?? id}
            </button>
          ))}
        </div>
      )}

      {/* Active category name */}
      {activeCatId && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
          <span className="font-medium text-gray-800 truncate">{getCatName(activeCatId)}</span>
          <span className="text-gray-400 flex-shrink-0">kategorisi için özellik değerleri</span>
        </div>
      )}

      {/* ── Required warning ── */}
      {activeCatId && !loadingAttrs && requiredUnmapped.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">{requiredUnmapped.length} zorunlu özelliğin değeri girilmedi</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {requiredUnmapped.map(a => (
                <span key={a.id} className="text-xs bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-2 py-0.5 font-medium">{a.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}
      {trendyolAttrs.length > 0 && requiredUnmapped.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm text-green-700 font-medium">Tüm zorunlu özellik değerleri girildi!</p>
        </div>
      )}

      {/* ── Attribute accordion ── */}
      {activeCatId && (
        <div className="space-y-3">
          {loadingAttrs ? (
            <div className="text-center py-12 text-gray-400">Özellikler yükleniyor…</div>
          ) : trendyolAttrs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-300 rounded-xl">
              Bu kategoriye ait özellik bulunamadı
            </div>
          ) : (
            <>
              {/* ── SECTION 1: Required ── */}
              {trulyRequired.length > 0 && (
                <AttrSection
                  title="Zorunlu Özellikler"
                  badge={`${trulyRequired.length}`}
                  badgeColor="bg-red-100 text-red-700"
                  defaultOpen
                  missingCount={requiredUnmapped.length}
                >
                  <AttrRows
                    attrs={trulyRequired}
                    catDefaults={catDefaults}
                    setAttrValue={setAttrValue}
                    clearAttrValue={clearAttrValue}
                  />
                </AttrSection>
              )}

              {/* ── SECTION 2: Varianter (info only) ── */}
              {varianterAttrs.length > 0 && (
                <AttrSection
                  title="Varyant Özellikleri"
                  badge={`${varianterAttrs.length}`}
                  badgeColor="bg-purple-100 text-purple-700"
                  subtitle="Varyantlı ürünlerde bu değerler otomatik gelir — değiştirmeniz gerekmez"
                  defaultOpen={false}
                >
                  <div className="divide-y divide-gray-100">
                    {varianterAttrs.map(attr => (
                      <div key={attr.id} className="grid grid-cols-12 items-center px-4 py-2.5 gap-3 opacity-50">
                        <div className="col-span-4 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1">⚡</span>
                          <span className="text-sm text-gray-700">{attr.name}</span>
                        </div>
                        <div className="col-span-8 text-xs text-gray-400 italic">Varyanttan otomatik</div>
                      </div>
                    ))}
                  </div>
                </AttrSection>
              )}

              {/* ── SECTION 3: Optional (collapsed by default) ── */}
              {optionalAttrs.length > 0 && (
                <AttrSection
                  title="Opsiyonel Özellikler"
                  badge={`${optionalAttrs.length}`}
                  badgeColor="bg-gray-100 text-gray-600"
                  subtitle="Doldurulması zorunlu değil — Trendyol ürün denetim ve içerik bilgileri"
                  defaultOpen={false}
                  forceOpen={optionalOpen}
                  onToggle={() => setOptionalOpen(o => !o)}
                >
                  <AttrRows
                    attrs={optionalAttrs}
                    catDefaults={catDefaults}
                    setAttrValue={setAttrValue}
                    clearAttrValue={clearAttrValue}
                  />
                </AttrSection>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Summary ── */}
      {trendyolAttrs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{trendyolAttrs.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Toplam Özellik</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${mappedCount > 0 ? 'text-orange-500' : 'text-gray-400'}`}>{mappedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Değer Girildi</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${requiredUnmapped.length === 0 ? 'text-green-600' : 'text-red-500'}`}>{requiredUnmapped.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Zorunlu Eksik</p>
          </div>
        </div>
      )}

      {!flowMode && (
        <div className="flex justify-between pt-4 border-t border-gray-200 mt-2">
          <button type="button" onClick={() => onNavigate('brands')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            Geri: Marka Eşleştirme
          </button>
          <button type="button" onClick={() => onNavigate('products')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
            İleri: Ürün Gönderme
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Batch progress status colors ─────────────────────────────────────────────
const BATCH_STATUS_STYLE: Record<string, string> = {
  pending:  'bg-gray-100 text-gray-500',
  sending:  'bg-blue-100 text-blue-600 animate-pulse',
  success:  'bg-green-100 text-green-700',
  error:    'bg-red-100 text-red-600',
  skipped:  'bg-amber-100 text-amber-600',
};
const BATCH_STATUS_LABEL: Record<string, string> = {
  pending: 'Bekliyor',
  sending: 'Gönderiliyor…',
  success: 'Başarılı',
  error:   'Hata',
  skipped: 'Atlandı',
};

/** Tek bir Trendyol failureReason satırı (kod + açıklama). */
function formatTrendyolFailureReason(fr: unknown): string {
  if (typeof fr === 'string') return fr;
  if (!fr || typeof fr !== 'object') return String(fr ?? '');
  const o = fr as Record<string, unknown>;
  const code = o.reasonCode ?? o.code;
  const desc = o.reasonDescription ?? o.message ?? o.description;
  if (code && desc) return `${code}: ${desc}`;
  if (code) return String(code);
  if (desc) return String(desc);
  return JSON.stringify(fr);
}

/** Parse Trendyol batch-request API response for honest UI messaging. */
function summarizeTrendyolBatchResponse(qr: any) {
  const items: any[] = qr?.items ?? qr?.batchRequestItems ?? qr?.content ?? [];
  const batchStatus = String(qr?.status ?? qr?.batchStatus ?? '').toUpperCase();
  const failedItemCount = Number(qr?.failedItemCount ?? 0);
  const failedItems = items.filter((i: any) => {
    const s = String(i?.status ?? '').toUpperCase();
    return s === 'FAILED' || s === 'REJECTED' || s === 'ERROR'
      || (Array.isArray(i?.failureReasons) && i.failureReasons.length > 0);
  });
  const successItems = items.filter((i: any) =>
    String(i?.status ?? '').toUpperCase() === 'SUCCESS'
    && !(Array.isArray(i?.failureReasons) && i.failureReasons.length > 0),
  );
  return { items, batchStatus, failedItemCount, failedItems, successItems };
}

function TrendyolFailureReasonList({ item }: { item: any }) {
  const reasons = [...(item?.failureReasons ?? []), ...(item?.errorMessages ?? [])];
  if (reasons.length === 0 && item?.status) {
    return <p className="text-xs text-red-700 mt-1">Durum: <strong>{item.status}</strong> (failureReasons boş)</p>;
  }
  return (
    <ul className="mt-1.5 space-y-1 list-none">
      {reasons.map((fr: unknown, i: number) => (
        <li key={i} className="text-xs text-red-800 bg-red-100/80 border border-red-200 rounded px-2 py-1 font-mono leading-relaxed">
          {formatTrendyolFailureReason(fr)}
        </li>
      ))}
    </ul>
  );
}

function TrendyolBatchResultPanel({ qr, highlightBarcode }: { qr: any; highlightBarcode?: string }) {
  if (qr?.error) return <p className="text-xs text-red-600 font-medium">{qr.error}</p>;
  const { items, batchStatus, failedItemCount, failedItems, successItems } = summarizeTrendyolBatchResponse(qr);
  const allItemsOk = items.length > 0 && successItems.length === items.length && failedItems.length === 0;
  const relevantFailed = highlightBarcode
    ? failedItems.filter((fi: any) => {
        const bc = fi.requestItem?.barcode ?? fi.requestItem?.product?.barcode ?? fi.barcode ?? '';
        return String(bc) === String(highlightBarcode);
      })
    : failedItems;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-700">
        Trendyol batch:{' '}
        <span className={
          batchStatus === 'COMPLETED' && allItemsOk ? 'text-green-600'
            : batchStatus === 'FAILED' || failedItems.length > 0 ? 'text-red-600'
              : 'text-amber-600'
        }>{batchStatus || '—'}</span>
        {failedItemCount > 0 && <span className="text-red-600 ml-2">({failedItemCount} hatalı ürün)</span>}
      </p>
      {relevantFailed.length > 0 && (
        <div className="space-y-2">
          {relevantFailed.map((fi: any, idx: number) => (
            <div key={idx} className="rounded-lg border border-red-200 bg-red-50 p-2.5">
              <p className="text-xs font-semibold text-red-900">
                Barkod: {fi.requestItem?.barcode ?? fi.requestItem?.product?.barcode ?? fi.barcode ?? '—'}
                {fi.status && <span className="ml-2 text-red-600">[{fi.status}]</span>}
              </p>
              <TrendyolFailureReasonList item={fi} />
            </div>
          ))}
        </div>
      )}
      {highlightBarcode && relevantFailed.length === 0 && failedItems.length > 0 && (
        <p className="text-xs text-amber-700">Bu barkod için ayrı hata satırı yok; batch içindeki diğer ürünlere bakın.</p>
      )}
      {allItemsOk && !highlightBarcode && (
        <p className="text-xs text-green-700">
          Trendyol API isteği kabul etti (SUCCESS). Ürün panelde görünmüyorsa barkodu Trendyol satıcı panelinde arayın.
        </p>
      )}
      {batchStatus === 'COMPLETED' && items.length === 0 && (
        <p className="text-xs text-amber-800 font-medium">
          Batch COMPLETED ama ürün listesi boş — muhtemelen yanlış PUT/POST veya batch ID eşleşmedi.
        </p>
      )}
    </div>
  );
}

/** Batch sorgu sonuçlarından ürün bazlı Trendyol hata özeti */
function findTrendyolErrorForBarcode(
  batchQueryResults: Record<string, any>,
  trendyolBatchId: string | undefined,
  barcode: string | undefined,
): string | null {
  if (!trendyolBatchId || !barcode) return null;
  const qr = batchQueryResults[trendyolBatchId];
  if (!qr || qr.error) return qr?.error ?? null;
  const { failedItems } = summarizeTrendyolBatchResponse(qr);
  const item = failedItems.find((fi: any) => {
    const bc = fi.requestItem?.barcode ?? fi.requestItem?.product?.barcode ?? fi.barcode ?? '';
    return String(bc) === String(barcode);
  });
  if (!item) return null;
  const parts = (item.failureReasons ?? []).map((fr: unknown) => formatTrendyolFailureReason(fr));
  const status = item.status ? `[${item.status}] ` : '';
  return status + (parts.join(' | ') || 'Trendyol FAILED (sebep metni yok)');
}

// ── Log status style ──────────────────────────────────────────────────────────
const LOG_DOT: Record<string, string> = {
  success: 'bg-green-500',
  error:   'bg-red-500',
  skipped: 'bg-amber-500',
  pending: 'bg-gray-400',
};

// ── Validation Panel ──────────────────────────────────────────────────────────

const TAB_LABEL: Record<string, string> = {
  setup:      'Bağlantı',
  categories: 'Kategori Eşleştirme',
  brands:     'Marka Eşleştirme',
  attributes: 'Özellik Değerleri',
  product:    'Ürün Formu',
};

function ValidationPanel({
  result,
  onNavigate,
  onDismiss,
  onSendValidOnly,
  isBusy,
}: {
  result:          { reports: ValidationReport[]; summary: ValidationSummary };
  onNavigate:      (tab: TabId) => void;
  onDismiss:       () => void;
  onSendValidOnly: () => void;
  isBusy:          boolean;
}) {
  const { reports, summary } = result;

  const hardErrorCount = reports.filter(r => !r.canSend && hasHardErrorReport(r)).length;
  const skipCount      = summary.skipped ?? reports.filter(isCategorySkipReport).length;
  const hasBlockingErrors = hardErrorCount > 0;
  const hasWarnings       = summary.warnings > 0;
  const sendableCount     = summary.sendable ?? (summary.clean + summary.warnings);
  const allReady          = reports.length > 0 && reports.every(
    r => r.canSend && !isCategorySkipReport(r) && r.issues.length === 0,
  );

  const headerBg = hasBlockingErrors
    ? 'bg-red-50 border-b border-red-200'
    : skipCount > 0
      ? 'bg-blue-50 border-b border-blue-200'
      : hasWarnings
        ? 'bg-amber-50 border-b border-amber-200'
        : 'bg-emerald-50 border-b border-emerald-200';

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm">

      {/* ── Header ── */}
      <div className={`px-5 py-4 flex items-start justify-between gap-4 ${headerBg}`}>
        <div className="flex items-start gap-3">
          {hasBlockingErrors ? (
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          ) : allReady ? (
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          )}
          <div>
            <p className={`font-semibold text-sm ${
              hasBlockingErrors ? 'text-red-900' :
              skipCount > 0 ? 'text-blue-900' :
              allReady ? 'text-emerald-900' : 'text-amber-900'
            }`}>
              {allReady && sendableCount > 0
                ? <>{sendableCount} ürün gönderime hazır — sorun yok</>
                : sendableCount > 0 && <>{sendableCount} ürün gönderilecek</>}
              {skipCount > 0 && <> · {skipCount} ürün kategori eşleşmediği için atlanacak</>}
              {hasBlockingErrors && <> · {hardErrorCount} üründe kritik hata</>}
              {!allReady && !skipCount && !hasBlockingErrors && summary.warnings > 0 && ` · ${summary.warnings} üründe uyarı var`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Toplam: {summary.total} ürün
              {skipCount > 0 && <> · <span className="text-slate-600 font-medium">{skipCount} atlanacak</span></>}
              {hardErrorCount > 0 && <> · <span className="text-red-600 font-medium">{hardErrorCount} hatalı</span></>}
              {summary.warnings > 0 && <> · <span className="text-amber-600 font-medium">{summary.warnings} uyarılı</span></>}
            </p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {/* ── Per-product list ── */}
      <div className="bg-white divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {reports.map(report => {
          const isOpen    = expanded.has(report.productId);
          const skipped   = isCategorySkipReport(report);
          const hasError  = !report.canSend && hasHardErrorReport(report);
          const isReady   = report.canSend && !skipped && report.issues.length === 0;
          const hasIssues = report.issues.length > 0;
          const RowTag    = hasIssues ? 'button' : 'div';
          return (
            <div key={report.productId}>
              <RowTag
                {...(hasIssues ? {
                  type: 'button' as const,
                  onClick: () => toggleExpand(report.productId),
                } : {})}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  hasIssues ? 'hover:bg-gray-50 cursor-pointer' : ''
                }`}
              >
                {/* Status icon */}
                {skipped ? (
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                ) : hasError ? (
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                ) : isReady ? (
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                )}
                {/* Product name */}
                <span className="flex-1 font-medium text-sm text-gray-800 truncate">{report.productName}</span>
                {/* Issue count badge */}
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  hasError ? 'bg-red-100 text-red-700' :
                  skipped ? 'bg-slate-100 text-slate-600' :
                  isReady ? 'bg-emerald-100 text-emerald-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {skipped ? 'Atlanacak' : isReady ? 'Hazır' : `${report.issues.length} sorun`}
                </span>
                {/* Expand chevron — only when there are issues to show */}
                {hasIssues && (
                  <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                )}
              </RowTag>

              {/* Expanded issue list */}
              {isOpen && hasIssues && (
                <div className="pb-3 px-4 space-y-2">
                  {report.issues.map((issue, idx) => (
                    <div key={idx} className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${
                      issue.level === 'error' ? 'bg-red-50 border border-red-100' :
                      issue.level === 'skip' ? 'bg-slate-50 border border-slate-100' :
                      'bg-amber-50 border border-amber-100'
                    }`}>
                      <span className={`mt-0.5 flex-shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        issue.level === 'error' ? 'bg-red-100 text-red-700' :
                        issue.level === 'skip' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {issue.level === 'error' ? 'Hata' : issue.level === 'skip' ? 'Atla' : 'Uyarı'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{issue.message}</p>
                        {issue.hint && <p className="text-xs text-gray-500 mt-0.5">{issue.hint}</p>}
                      </div>
                      {issue.tab && issue.tab !== 'product' && (
                        <button
                          onClick={() => onNavigate(issue.tab as TabId)}
                          className="flex-shrink-0 text-xs text-orange-600 hover:text-orange-700 font-medium underline underline-offset-2 whitespace-nowrap"
                        >
                          {TAB_LABEL[issue.tab] ?? issue.tab} →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer actions ── */}
      <div className={`px-5 py-3 flex items-center justify-between gap-3 ${
        hasBlockingErrors ? 'bg-red-50 border-t border-red-200' :
        allReady ? 'bg-emerald-50 border-t border-emerald-200' :
        'bg-amber-50 border-t border-amber-200'
      }`}>
        <p className="text-xs text-gray-500">
          Eşleşmeyen kategorilere ait ürünler otomatik atlanır.
          {hasBlockingErrors && ' Kritik hatalı ürünler gönderilmez.'}
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onDismiss} className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg">
            İptal
          </button>
          {sendableCount > 0 && (
            <button onClick={onSendValidOnly} disabled={isBusy}
              className="px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 font-medium">
              {sendableCount} Ürünü Gönder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Products ─────────────────────────────────────────────────────────────

export function ProductsTab({
  onNavigate,
  isActive,
  flowMode = false,
  onContinue,
}: {
  onNavigate: (tab: TabId) => void;
  isActive?: boolean;
  flowMode?: boolean;
  onContinue?: () => void;
}) {
  const qc = useQueryClient();
  const { requireConfigured, isConfigured, priceStrategy } = useGeneralSettingsGate();
  const actionsBlocked = !isConfigured;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);

  // Category selection state
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Product list state
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('');

  // Batch state
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchJob,      setBatchJob]      = useState<BatchJob | null>(null);

  // Validation
  const [validationResult, setValidationResult] = useState<{ reports: ValidationReport[]; summary: ValidationSummary } | null>(null);
  const [validating, setValidating] = useState(false);

  // Log state
  const [logsOpen,    setLogsOpen]    = useState(false);
  const [logStatus,   setLogStatus]   = useState('all');
  const [logPage,     setLogPage]     = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Trendyol batch status query
  const [batchQueryResults, setBatchQueryResults] = useState<Record<string, any>>({});
  const [queryingBatch,     setQueryingBatch]     = useState<string | null>(null);

  const { data: savedCatMapping } = useQuery({
    queryKey: ['category-mapping'],
    queryFn:  trendyolApi.getCategoryMapping,
    staleTime: 0,
  });
  const { data: localCatsForFallback } = useQuery({
    queryKey: ['local-categories'],
    queryFn:  trendyolApi.getLocalCategories,
    staleTime: 60_000,
  });

  // Mapped categories (server list + fallback from saved mapping)
  const { data: mappedCatsFromApi = [], isLoading: catsLoading, refetch: refetchMappedCats } = useQuery({
    queryKey: ['trendyol-mapped-categories'],
    queryFn:  trendyolApi.getMappedCategories,
    staleTime: 0,
  });

  /** All local categories for product tabs (mapped + unmapped) */
  const displayCats = useMemo(() => {
    const m = savedCatMapping ?? {};
    const locals = Array.isArray(localCatsForFallback) ? localCatsForFallback : [];
    const apiById = new Map(mappedCatsFromApi.map(c => [c.id, c]));
    return locals.map(c => ({
      id:            c.id,
      name:          c.name,
      trendyolCatId: m[c.id] ? String(m[c.id]) : '',
      productCount:  apiById.get(c.id)?.productCount ?? 0,
      mapped:        Boolean(m[c.id]),
    }));
  }, [localCatsForFallback, savedCatMapping, mappedCatsFromApi]);

  useEffect(() => {
    if (isActive) {
      refetchMappedCats();
      qc.invalidateQueries({ queryKey: ['category-mapping'] });
    }
  }, [isActive, refetchMappedCats, qc]);

  // Auto-select first category
  useEffect(() => {
    if (!activeCategoryId && displayCats.length > 0) setActiveCategoryId(displayCats[0].id);
  }, [displayCats, activeCategoryId]);

  // Product list (filtered by active category)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trendyol-products', page, search, filter, activeCategoryId],
    queryFn: () => trendyolApi.getProducts({
      page,
      limit: 20,
      search:     search  || undefined,
      mapped:     filter  || undefined,
      categoryId: activeCategoryId || undefined,
      onlyMappedCategories: false,
    }),
    enabled: displayCats.length > 0 || !!search,
  });

  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ['trendyol-logs', logStatus, logPage],
    queryFn:  () => trendyolApi.getIntegrationLogs({ status: logStatus, page: logPage, limit: 30 }),
    enabled:  logsOpen,
  });

  const logs       = logsData?.logs       ?? [];
  const logTotal   = logsData?.total      ?? 0;
  const logPages   = logsData?.totalPages ?? 1;
  const products   = data?.products   ?? [];
  const totalPages = data?.totalPages ?? 1;

  // ── Batch polling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeBatchId) return;
    const interval = setInterval(async () => {
      try {
        const job = await trendyolApi.getBatchStatus(activeBatchId);
        setBatchJob(job);
        if (job.status === 'done') {
          clearInterval(interval);
          setActiveBatchId(null);
          qc.invalidateQueries({ queryKey: ['trendyol-products'] });
          qc.invalidateQueries({ queryKey: ['trendyol-stats'] });
          qc.invalidateQueries({ queryKey: ['trendyol-logs'] });
          qc.invalidateQueries({ queryKey: ['trendyol-mapped-categories'] });
          refetch();
          if (logsOpen) refetchLogs();
        }
      } catch {
        clearInterval(interval);
        setActiveBatchId(null);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [activeBatchId]);

  // When bulk send finishes, auto-fetch Trendyol batch results for honest per-item status
  useEffect(() => {
    if (batchJob?.status !== 'done') return;
    const ids = [...new Set(batchJob.results.map(r => r.trendyolBatchId).filter(Boolean))] as string[];
    ids.forEach(async (id) => {
      if (batchQueryResults[id]) return;
      try {
        const result = await trendyolApi.getTrendyolBatchResult(id);
        setBatchQueryResults(prev => ({ ...prev, [id]: result }));
      } catch (e: any) {
        setBatchQueryResults(prev => ({ ...prev, [id]: { error: e.message } }));
      }
    });
  }, [batchJob?.status]);

  const isBusy = !!activeBatchId || validating;

  // ── Bulk send ──────────────────────────────────────────────────────────────
  const startBulkSend = async (ids: string[]) => {
    if (!requireConfigured()) return;
    if (ids.length === 0) { toast.error('Gönderilecek ürün yok.'); return; }
    setBatchJob(null);
    setValidationResult(null);
    try {
      const { batchId } = await trendyolApi.bulkSend(ids);
      setActiveBatchId(batchId);
      toast.success(`${ids.length} ürün kuyruğa alındı.`);
    } catch (e: any) {
      toast.error(e.message ?? 'Gönderim başlatılamadı');
    }
  };

  // ── Send all products in current category ─────────────────────────────────
  const sendAllInCategory = async () => {
    if (!activeCategoryId) return;
    setValidating(true);
    try {
      const catResp = await trendyolApi.getCategoryProductIds(activeCategoryId);
      const ids = catResp?.ids ?? [];
      if (ids.length === 0) { toast.error('Bu kategoride ürün bulunamadı.'); return; }

      // Validate first
      const validateResp = await trendyolApi.validateProducts(ids);
      const reports: ValidationReport[] = validateResp?.data ?? [];
      const summary: ValidationSummary = validateResp?.summary
        ?? buildValidationSummaryFromReports(reports, ids.length);

      const sendable = reports.filter(r => r.canSend).map(r => r.productId);
      if (sendable.length === 0) {
        toast.error('Gönderilecek ürün yok. Kategori eşleştirmesi veya zorunlu alanları kontrol edin.');
        return;
      }

      if (reports.length === 0) {
        await startBulkSend(ids);
        return;
      }

      setValidationResult({ reports, summary });
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? e.message ?? 'Bilinmeyen hata');
    } finally {
      setValidating(false);
    }
  };

  /** Send only valid products from validation report */
  const sendValidOnly = async () => {
    if (!validationResult) return;
    setValidating(true);
    try {
      const sendable = validationResult.reports.filter(r => r.canSend).map(r => r.productId);
      if (sendable.length === 0) { toast.error('Gönderilecek geçerli ürün yok.'); return; }
      setValidationResult(null);
      await startBulkSend(sendable);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? e.message ?? 'Bilinmeyen hata');
    } finally {
      setValidating(false);
    }
  };

  // ── Reset Trendyol records for current category ───────────────────────────
  const [resetting, setResetting]     = React.useState(false);
  const [resetConfirm, setResetConfirm] = React.useState(false);

  const handleResetCategory = async () => {
    if (!activeCategoryId) return;
    setResetting(true);
    try {
      const catResp = await trendyolApi.getCategoryProductIds(activeCategoryId);
      const ids = catResp?.ids ?? [];
      if (ids.length === 0) { toast.error('Bu kategoride ürün bulunamadı.'); return; }
      const result = await trendyolApi.resetTrendyolRecords(ids);
      toast.success(result.message ?? `${result.deleted} kayıt sıfırlandı. Şimdi tekrar gönderebilirsiniz.`);
      setResetConfirm(false);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? e.message ?? 'Sıfırlama hatası');
    } finally {
      setResetting(false);
    }
  };

  // ── Retry all failed ──────────────────────────────────────────────────────
  const retryFailed = async () => {
    if (!requireConfigured()) return;
    setBatchJob(null);
    try {
      const { batchId, total } = await trendyolApi.retryFailed();
      if (!batchId) { toast.success('Hatalı ürün yok.'); return; }
      setActiveBatchId(batchId);
      toast.success(`${total} hatalı ürün kuyruğa alındı.`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const pct = batchJob ? Math.round((batchJob.processed / Math.max(batchJob.total, 1)) * 100) : 0;
  const fmtPrice = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const activeCategory = displayCats.find(c => c.id === activeCategoryId);

  const pageIds = products.map(p => p.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };

  const previewProducts = products.filter(p => selectedIds.has(p.id));

  return (
    <div className="space-y-4">

      {actionsBlocked && <SettingsRequiredBanner />}

      {previewOpen && previewProducts.length > 0 && (
        <SendPreviewModal
          products={previewProducts.map(p => ({
            id: p.id,
            name: p.name,
            salePrice: p.salePrice,
            barcode: p.barcode,
          }))}
          priceStrategy={priceStrategy}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* ── Category send info (non-blocking) ── */}
      {!catsLoading && displayCats.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-xs text-blue-800">
            Eşleşmeyen kategorilere ait ürünler gönderilmeyecektir. Gönderim öncesi kaç ürünün gideceği kontrol panelinde gösterilir.
          </p>
        </div>
      )}

      {!catsLoading && displayCats.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-600">
          Henüz yerel kategori yok. Ürünlerinize kategori atayın veya Kategori Eşleştirme sekmesinden eşleştirme yapın.
          <button type="button" onClick={() => onNavigate('categories')}
            className="mt-2 block text-xs font-medium text-orange-600 hover:underline">
            → Kategori Eşleştirme
          </button>
        </div>
      )}

      {/* ── Category tabs ── */}
      {displayCats.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Kategori seç</p>
          <div className="flex gap-2 flex-wrap">
            {displayCats.map(cat => (
              <button key={cat.id} type="button"
                onClick={() => { setActiveCategoryId(cat.id); setPage(1); setSearch(''); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                  activeCategoryId === cat.id
                    ? 'bg-orange-500 text-white border-orange-500'
                    : cat.mapped
                      ? 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'
                      : 'bg-white text-gray-500 border-dashed border-gray-300 hover:border-orange-300'
                }`}>
                {cat.name}
                {!cat.mapped && (
                  <span className="text-[10px] text-slate-500 font-normal">(eşleşmedi)</span>
                )}
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeCategoryId === cat.id ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{cat.productCount}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Action bar ── */}
      {activeCategory && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Ürün adı, barkod veya SKU ara…"
            className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">Tüm durum</option>
            <option value="false">Gönderilmemiş</option>
            <option value="true">Gönderilmiş</option>
          </select>

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={actionsBlocked}
              title={actionsBlocked ? 'Önce genel ayarları kaydedin' : 'Seçili ürünlerin fiyat önizlemesi'}
              className="px-4 py-2 border border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önizleme ({selectedIds.size})
            </button>
          )}

          {/* Main CTA: send all in category */}
          <button
            onClick={sendAllInCategory}
            disabled={isBusy || actionsBlocked}
            title={actionsBlocked ? 'Önce genel ayarları kaydedin' : undefined}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {validating
              ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            }
            {validating ? 'Kontrol ediliyor…' : `"${activeCategory.name}" Kategorisini Gönder (${activeCategory.productCount})`}
          </button>

          <button
            onClick={retryFailed}
            disabled={isBusy || actionsBlocked}
            title={actionsBlocked ? 'Önce genel ayarları kaydedin' : undefined}
            className="px-4 py-2 border border-orange-300 text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Hatalıları Tekrar Gönder
          </button>

          {/* Reset Trendyol records for this category */}
          {activeCategoryId && (
            <button onClick={() => setResetConfirm(true)} disabled={isBusy || resetting}
              className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium disabled:opacity-40 flex items-center gap-1.5 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              {resetting ? 'Sıfırlanıyor…' : 'Trendyol Kaydını Sıfırla'}
            </button>
          )}

          <button onClick={() => { setLogsOpen(o => !o); if (!logsOpen) refetchLogs(); }}
            className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            {logsOpen ? 'Logları Kapat' : 'Logları Görüntüle'}
          </button>
        </div>
      )}

      {/* ── Reset Trendyol records confirm modal ── */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Trendyol Kaydını Sıfırla</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Bu kategorideki ürünlerin Trendyol gönderim kayıtları silinecek. Bir sonraki gönderimde ürünler <strong>yeni ürün olarak</strong> POST edilecek.
                </p>
                <p className="text-sm text-amber-600 mt-2 bg-amber-50 rounded-lg p-2">
                  ⚠️ Bu işlem sadece sistemdeki kaydı siler. Trendyol'daki ürünlere dokunmaz.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setResetConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                İptal
              </button>
              <button onClick={handleResetCategory} disabled={resetting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {resetting ? 'Sıfırlanıyor…' : 'Evet, Sıfırla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Validation report panel ── */}
      {validationResult && (
        <ValidationPanel
          result={validationResult}
          onNavigate={onNavigate}
          onDismiss={() => setValidationResult(null)}
          onSendValidOnly={sendValidOnly}
          isBusy={isBusy}
        />
      )}

      {/* ── Active batch: progress bar + per-product status ── */}
      {(activeBatchId || (batchJob && batchJob.status === 'done')) && batchJob && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">
                {batchJob.status === 'done'
                  ? (batchJob.failed > 0 ? 'Gönderim Bitti (hatalar var)' : 'Trendyol Yanıtı Alındı')
                  : 'Trendyol Sonucu Bekleniyor…'}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {batchJob.processed} / {batchJob.total} işlendi &nbsp;·&nbsp;
                <span className="text-green-600 font-medium">{batchJob.success} başarılı</span> &nbsp;·&nbsp;
                {batchJob.failed > 0 && <span className="text-red-600 font-medium">{batchJob.failed} hatalı &nbsp;·&nbsp;</span>}
                {batchJob.skipped > 0 && <span className="text-amber-600 font-medium">{batchJob.skipped} atlandı</span>}
              </p>
            </div>
            {batchJob.status === 'done' && (
              <button onClick={() => setBatchJob(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${batchJob.status === 'done' && batchJob.failed === 0 ? 'bg-green-500' : batchJob.status === 'done' ? 'bg-orange-500' : 'bg-orange-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="absolute right-0 -top-5 text-xs text-gray-500 font-medium">{pct}%</span>
          </div>

          {/* Trendyol hata özeti — batch tamamlanınca otomatik dolar */}
          {batchJob.status === 'done' && batchJob.failed > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-red-900">Trendyol hata kodları ve sebepleri</p>
              <p className="text-xs text-red-700">
                Aşağıdaki metinleri Trendyol dokümantasyonunda veya destekte aratarak düzeltebilirsiniz.
                Önce kategoride <strong>Trendyol kaydını sıfırla</strong>, sonra yeniden gönderin (POST ile gider).
              </p>
            </div>
          )}

          {/* Per-product status list */}
          <div className="space-y-2 max-h-[28rem] overflow-y-auto">
            {batchJob.results.map(r => {
              const trendyolErr = findTrendyolErrorForBarcode(batchQueryResults, r.trendyolBatchId, r.barcode);
              const displayError = r.status === 'error' ? r.message : trendyolErr;
              return (
              <React.Fragment key={r.productId}>
                <div className={`rounded-lg border px-3 py-2.5 text-sm ${
                  r.status === 'error' ? 'bg-red-50 border-red-200' :
                  r.status === 'success' ? 'bg-green-50/50 border-green-100' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${BATCH_STATUS_STYLE[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {BATCH_STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{r.productName || r.productId}</p>
                      {r.barcode && <p className="text-[11px] text-gray-500 font-mono mt-0.5">Barkod: {r.barcode}</p>}
                    </div>
                    {r.trendyolBatchId && (
                      <button
                        type="button"
                        onClick={async () => {
                          setQueryingBatch(r.trendyolBatchId!);
                          try {
                            const result = await trendyolApi.getTrendyolBatchResult(r.trendyolBatchId!);
                            setBatchQueryResults(prev => ({ ...prev, [r.trendyolBatchId!]: result }));
                          } catch (e: any) {
                            setBatchQueryResults(prev => ({ ...prev, [r.trendyolBatchId!]: { error: e.message } }));
                          } finally {
                            setQueryingBatch(null);
                          }
                        }}
                        disabled={queryingBatch === r.trendyolBatchId}
                        className="text-xs text-blue-600 hover:underline flex-shrink-0 disabled:opacity-40"
                      >
                        {queryingBatch === r.trendyolBatchId ? 'Sorgulanıyor…' : 'Batch detayı'}
                      </button>
                    )}
                  </div>
                  {displayError && (
                    <p className="mt-2 text-xs text-red-800 font-mono leading-relaxed whitespace-pre-wrap break-words bg-red-100/60 rounded px-2 py-1.5 border border-red-200">
                      {displayError}
                    </p>
                  )}
                  {r.status === 'success' && r.message && !displayError && (
                    <p className="mt-1.5 text-xs text-green-800">{r.message}</p>
                  )}
                </div>
                {r.trendyolBatchId && batchQueryResults[r.trendyolBatchId] && (
                  <div className="ml-2 mb-1">
                    <TrendyolBatchResultPanel qr={batchQueryResults[r.trendyolBatchId!]} highlightBarcode={r.barcode} />
                  </div>
                )}
              </React.Fragment>
            );})}
          </div>
        </div>
      )}

      {/* ── Product table ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allPageSelected && pageIds.length > 0}
                  onChange={toggleSelectAllPage}
                  disabled={pageIds.length === 0}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                  title="Sayfadaki tümünü seç"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ürün</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Katalog</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trendyol Fiyatı</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stok</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trendyol Durumu</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <svg className="w-5 h-5 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Yükleniyor…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="text-center py-10">
                  <div className="inline-flex flex-col items-center gap-2">
                    <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <p className="text-sm text-red-600 font-medium">Ürünler yüklenirken hata oluştu</p>
                    <button onClick={() => refetch()} className="text-xs text-orange-600 hover:underline">Tekrar dene</button>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && !isError && products.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="font-medium">Bu kategoride ürün bulunamadı</p>
                </td>
              </tr>
            )}
            {products.map((p, i) => {
              const calc = isConfigured
                ? applyTrendyolPriceStrategy(p.salePrice, priceStrategy)
                : null;
              return (
              <tr
                key={p.id}
                className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-orange-50/50 transition-colors ${
                  selectedIds.has(p.id) ? 'ring-1 ring-inset ring-orange-200' : ''
                }`}
              >
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.mainImage ? (
                      <img src={p.mainImage} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 text-sm truncate max-w-[280px]">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.barcode ?? p.sku ?? '—'}</div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 text-right font-medium text-gray-600 text-sm tabular-nums">
                  {fmtPrice.format(p.salePrice)} ₺
                </td>

                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {calc ? (
                    <span className="font-semibold text-orange-700">
                      {formatPriceArrow(calc.basePrice, calc.finalPrice)}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Ayarları kaydedin</span>
                  )}
                </td>

                <td className="px-4 py-3 text-right text-sm text-gray-600 tabular-nums">
                  {fmtPrice.format(p.stock)}
                </td>

                <td className="px-4 py-3 text-center">
                  {p.trendyol.mapped ? (
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.trendyol.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[p.trendyol.status] ?? p.trendyol.status}
                      </span>
                      {p.trendyol.lastSyncAt && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(p.trendyol.lastSyncAt).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                      {p.trendyol.errorMessage && (
                        <div className={`text-[10px] mt-1 max-w-[220px] leading-snug whitespace-pre-wrap break-words ${
                          p.trendyol.status === 'ERROR' ? 'text-red-600 font-medium' : 'text-amber-600'
                        }`}>
                          {p.trendyol.errorMessage}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400">Gönderilmedi</span>
                  )}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← Önceki
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Sonraki →
          </button>
        </div>
      )}

      {/* ── Integration Logs ── */}
      {logsOpen && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h4 className="font-semibold text-gray-800 text-sm">Gönderim Logları</h4>
            <div className="flex items-center gap-2">
              <select value={logStatus} onChange={e => { setLogStatus(e.target.value); setLogPage(1); }}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400">
                <option value="all">Tümü</option>
                <option value="success">Başarılı</option>
                <option value="error">Hatalı</option>
                <option value="skipped">Atlandı</option>
              </select>
              <button onClick={() => refetchLogs()} className="p-1 text-gray-400 hover:text-gray-700" title="Yenile">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              </button>
              <span className="text-xs text-gray-400">{logTotal} kayıt</span>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Henüz log yok</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map(log => (
                <div key={log.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${LOG_DOT[log.status] ?? 'bg-gray-400'}`} />
                    <span className="font-medium text-gray-800 text-sm truncate flex-1">{log.productName ?? log.productId ?? '—'}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      log.status === 'success' ? 'bg-green-100 text-green-700' :
                      log.status === 'error'   ? 'bg-red-100 text-red-700' :
                      log.status === 'skipped' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>{log.status === 'success' ? 'Başarılı' : log.status === 'error' ? 'Hata' : log.status === 'skipped' ? 'Atlandı' : log.status}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{new Date(log.createdAt).toLocaleString('tr-TR')}</span>
                    {(() => {
                      // Extract the real Trendyol batchRequestId (NOT our internal batchId)
                      const trendyolBatchId: string | undefined =
                        (log.responsePayload as any)?.batchRequestId ??
                        (log.message ?? '').match(/Batch:\s*(\S+)/)?.[1];
                      if (!trendyolBatchId) return null;
                      const key = log.id;
                      return (
                        <button
                          onClick={async () => {
                            setQueryingBatch(key);
                            try {
                              const result = await trendyolApi.getTrendyolBatchResult(trendyolBatchId);
                              setBatchQueryResults(prev => ({ ...prev, [key]: result }));
                            } catch (e: any) {
                              setBatchQueryResults(prev => ({ ...prev, [key]: { error: e?.response?.data?.error ?? e?.message ?? 'Trendyol sorgulanamadı' } }));
                            } finally {
                              setQueryingBatch(null);
                            }
                          }}
                          disabled={queryingBatch === key}
                          className="text-xs text-blue-500 hover:underline flex-shrink-0 disabled:opacity-40"
                        >
                          {queryingBatch === key ? '…' : 'T. Sorgula'}
                        </button>
                      );
                    })()}
                    {(log.requestPayload || log.responsePayload) && (
                      <button onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="text-xs text-orange-500 hover:underline flex-shrink-0">
                        {expandedLog === log.id ? 'Kapat' : 'Detay'}
                      </button>
                    )}
                  </div>
                  {log.message && (
                    <p className={`text-xs mt-1.5 ml-5 leading-relaxed whitespace-pre-wrap break-words font-mono ${
                      log.status === 'error' ? 'text-red-800 bg-red-50 border border-red-100 rounded px-2 py-1' : 'text-gray-600'
                    }`}>{log.message}</p>
                  )}
                  {batchQueryResults[log.id] && (
                    <div className="mt-2 ml-5">
                      <TrendyolBatchResultPanel qr={batchQueryResults[log.id]} />
                    </div>
                  )}
                  {expandedLog === log.id && (
                    <div className="mt-2 ml-5 space-y-2">
                      {log.requestPayload && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">İstek (Request)</p>
                          <pre className="text-[10px] bg-gray-900 text-green-300 rounded-lg p-3 overflow-x-auto max-h-40">
                            {JSON.stringify(log.requestPayload, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.responsePayload && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Yanıt (Response)</p>
                          <pre className={`text-[10px] rounded-lg p-3 overflow-x-auto max-h-40 ${log.status === 'error' ? 'bg-red-950 text-red-200' : 'bg-gray-900 text-blue-200'}`}>
                            {JSON.stringify(log.responsePayload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Log pagination */}
          {logPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-40 hover:bg-gray-100">← Önceki</button>
              <span className="text-xs text-gray-500">{logPage} / {logPages}</span>
              <button onClick={() => setLogPage(p => Math.min(logPages, p + 1))} disabled={logPage === logPages}
                className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-40 hover:bg-gray-100">Sonraki →</button>
            </div>
          )}
        </div>
      )}

      {flowMode && onContinue ? (
        <div className="flex justify-end pt-4 border-t border-gray-200 mt-2">
          <button
            type="button"
            onClick={onContinue}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
          >
            Devam Et: Fiyat &amp; Senkron
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : !flowMode ? (
        <div className="flex justify-between pt-4 border-t border-gray-200 mt-2">
          <button type="button" onClick={() => onNavigate('attributes')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            Geri: Özellik Eşleştirme
          </button>
          <button type="button" onClick={() => onNavigate('sync')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
            İleri: Fiyat & Stok Senkron
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Tab: Price & Stock Sync ───────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function SyncListPagination({
  page, totalPages, onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
      <span className="text-xs text-gray-500">
        Sayfa {page} / {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(1)}
          className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-30 hover:bg-white"
          title="İlk sayfa"
        >
          &laquo;
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-30 hover:bg-white"
        >
          &lsaquo;
        </button>
        {pages.map((p, i) => p === '...' ? (
          <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`min-w-[28px] h-7 rounded text-xs font-semibold ${
              p === page ? 'bg-orange-500 text-white' : 'border border-gray-300 hover:bg-white text-gray-700'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-30 hover:bg-white"
        >
          &rsaquo;
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(totalPages)}
          className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-30 hover:bg-white"
          title="Son sayfa"
        >
          &raquo;
        </button>
      </div>
    </div>
  );
}

/** Editable price/stock row — tracks local overrides before sending */
type EditMap = Record<string, { price: number; stock: number }>;

export function SyncTab({
  onNavigate,
  flowMode = false,
  onContinue,
  showBulkPrice = true,
}: {
  onNavigate: (tab: TabId) => void;
  flowMode?: boolean;
  onContinue?: () => void;
  showBulkPrice?: boolean;
}) {
  const qc = useQueryClient();
  const { requireConfigured, isConfigured } = useGeneralSettingsGate();
  const actionsBlocked = !isConfigured;

  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, limit]);

  const { data: listData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['trendyol-mapped-variants', debouncedSearch, page, limit],
    queryFn:  () => trendyolApi.getMappedWithVariants({
      page,
      limit,
      search: debouncedSearch || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const products   = listData?.items ?? [];
  const total      = listData?.total ?? 0;
  const totalPages = listData?.totalPages ?? 1;

  // ── Local edit state ───────────────────────────────────────────────────────
  // Key: productId or `${productId}::${variantId}` for variant rows
  const [edits,        setEdits]        = useState<EditMap>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selected,     setSelected]     = useState<Set<string>>(new Set()); // productIds
  const [busy,         setBusy]         = useState(false);
  const [result,       setResult]       = useState<PriceStockUpdateResult | null>(null);
  const [autoResult,   setAutoResult]   = useState<SyncResult | null>(null);

  // Merge server values for current page (preserve edits on other pages)
  React.useEffect(() => {
    if (products.length === 0) return;
    setEdits(prev => {
      const next = { ...prev };
      for (const p of products) {
        if (p.hasVariants) {
          for (const v of p.variants) {
            const key = `${p.productId}::${v.id}`;
            if (!next[key]) next[key] = { price: v.price, stock: v.stock };
          }
        } else if (!next[p.productId]) {
          next[p.productId] = { price: p.salePrice, stock: p.stock };
        }
      }
      return next;
    });
  }, [listData]);

  const setEdit = (key: string, field: 'price' | 'stock', val: number) =>
    setEdits(prev => ({ ...prev, [key]: { ...(prev[key] ?? { price: 0, stock: 0 }), [field]: val } }));

  const toggleExpand = (id: string) =>
    setExpandedRows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleSelect = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const pageProductIds = products.map(p => p.productId);
  const allPageSelected =
    pageProductIds.length > 0 && pageProductIds.every(id => selected.has(id));

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageProductIds.forEach(id => next.delete(id));
      } else {
        pageProductIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // ── Build payload for manual update ───────────────────────────────────────
  const buildItems = (productIds?: string[]): PriceStockUpdateItem[] => {
    const scope = productIds ? new Set(productIds) : null;
    const items: PriceStockUpdateItem[] = [];

    for (const p of products) {
      if (scope && !scope.has(p.productId)) continue;

      if (p.hasVariants) {
        for (const v of p.variants) {
          const key = `${p.productId}::${v.id}`;
          const edit = edits[key];
          if (!v.barcode) continue;
          items.push({
            barcode:   v.barcode,
            price:     edit?.price ?? v.price,
            stock:     edit?.stock ?? v.stock,
            productId: p.productId,
            variantId: v.id,
          });
        }
      } else {
        const edit = edits[p.productId];
        if (!p.barcode) continue;
        items.push({
          barcode:   p.barcode,
          price:     edit?.price ?? p.salePrice,
          stock:     edit?.stock ?? p.stock,
          productId: p.productId,
        });
      }
    }
    return items;
  };

  // ── Manual update (explicit values) ───────────────────────────────────────
  const doManualUpdate = async (productIds?: string[]) => {
    if (!requireConfigured()) return;
    setBusy(true);
    setResult(null);
    setAutoResult(null);
    const pending = toast.loading('Trendyol\'a gönderiliyor… (30 sn – 2 dk sürebilir)');
    try {
      const items = buildItems(productIds);
      if (items.length === 0) {
        toast.dismiss(pending);
        toast.error('Barkodu olan ürün bulunamadı.');
        return;
      }
      const r = await trendyolApi.manualPriceStockUpdate(items);
      setResult(r);
      toast.dismiss(pending);
      if (r.sent   > 0) toast.success(`${r.sent} barkod güncellendi.`);
      if (r.failed > 0) toast.error(`${r.failed} barkod güncellenemedi.`);
      qc.invalidateQueries({ queryKey: ['trendyol-stats'] });
      refetch();
    } catch (e: any) {
      const msg = e?.message ?? e.response?.data?.error ?? 'Güncelleme başarısız';
      toast.error(msg, { id: pending });
    } finally { setBusy(false); }
  };

  // ── Auto sync (uses current DB values, no overrides) ──────────────────────
  const doAutoSync = async (productIds?: string[]) => {
    if (!requireConfigured()) return;
    const syncAll = !productIds?.length;
    if (syncAll && total > 30) {
      const ok = window.confirm(
        `${total} ürünün tamamı senkronize edilecek. Bu işlem birkaç dakika sürebilir. Devam edilsin mi?`,
      );
      if (!ok) return;
    }
    setBusy(true);
    setResult(null);
    setAutoResult(null);
    const pending = toast.loading(
      syncAll ? 'Tüm katalog senkronize ediliyor…' : 'Trendyol senkronu devam ediyor…',
    );
    try {
      const r = await trendyolApi.syncPriceStock(productIds, { fullCatalog: syncAll });
      setAutoResult(r);
      toast.dismiss(pending);
      if (r.success > 0) toast.success(`${r.success} ürün otomatik güncellendi.`);
      if (r.failed  > 0) toast.error(`${r.failed} ürün güncellenemedi.`);
      qc.invalidateQueries({ queryKey: ['trendyol-stats'] });
      refetch();
    } catch (e: any) {
      const msg = e?.message ?? e.response?.data?.error ?? 'Senkron başarısız';
      toast.error(msg, { id: pending });
    } finally { setBusy(false); }
  };

  // ── Single row update (manual) ─────────────────────────────────────────────
  const updateOne = (productId: string) => doManualUpdate([productId]);

  return (
    <div className="space-y-5">

      {actionsBlocked && <SettingsRequiredBanner />}

      {showBulkPrice && (
        <div className={actionsBlocked ? 'opacity-60 pointer-events-none select-none' : undefined}>
          <BulkCatalogPricePanel
            selectedProductIds={Array.from(selected)}
            onUpdated={() => { void refetch(); }}
          />
        </div>
      )}

      {/* ── Header / bulk actions ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-blue-900">Fiyat &amp; Stok Güncelleme</h3>
            <p className="text-sm text-blue-700 mt-1">
              Satırdaki fiyat/stok değerlerini düzenleyin, ardından &quot;Trendyol&apos;a Gönder&quot; butonuna basın.
              Ya da &quot;Otomatik Güncelle&quot; ile veritabanındaki mevcut değerleri gönderin.
            </p>
            <p className="text-xs text-amber-800 mt-2 bg-amber-100/80 border border-amber-200 rounded-lg px-3 py-2">
              Fiyat/stok yalnızca Trendyol&apos;da <strong>zaten oluşturulmuş</strong> ürünler için çalışır.
              Ürün hiç gitmediyse önce <strong>Ürün Gönderme</strong> sekmesinden POST ile oluşturun; aksi halde barkod bulunamadı hatası alırsınız.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => doAutoSync()}
              disabled={busy || products.length === 0 || actionsBlocked}
              title={actionsBlocked ? 'Önce genel ayarları kaydedin' : undefined}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {busy ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {busy ? 'Güncelleniyor…' : `Tümünü Otomatik Güncelle (${total})`}
            </button>

            {selected.size > 0 && (
              <>
                <button
                  onClick={() => doManualUpdate(Array.from(selected))}
                  disabled={busy || actionsBlocked}
                  title={actionsBlocked ? 'Önce genel ayarları kaydedin' : undefined}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selected.size} Seçiliyi Manuel Gönder
                </button>
                <button
                  onClick={() => doAutoSync(Array.from(selected))}
                  disabled={busy || actionsBlocked}
                  title={actionsBlocked ? 'Önce genel ayarları kaydedin' : undefined}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selected.size} Seçiliyi Otomatik Güncelle
                </button>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-xs text-blue-600">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Fiyat &amp; stok alanları düzenlenebilir
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Varyantlı ürünlerde satırı genişlet
          </span>
        </div>
      </div>

      {/* ── Result panels ── */}
      {result && (
        <div className={`border rounded-xl p-4 ${result.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`font-semibold ${result.failed === 0 ? 'text-green-800' : 'text-amber-800'}`}>
              Manuel güncelleme: {result.sent} başarılı, {result.failed} başarısız
            </p>
            <button onClick={() => setResult(null)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {result.items.map((it, i) => (
              <p key={i} className={`text-xs flex items-center gap-1.5 ${it.status === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                {it.status === 'ok'
                  ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                }
                <span className="font-mono">{it.barcode}</span> — {it.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {autoResult && (
        <div className={`border rounded-xl p-4 ${autoResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between">
            <p className={`font-semibold ${autoResult.failed === 0 ? 'text-green-800' : 'text-amber-800'}`}>
              Otomatik sync: {autoResult.success} başarılı, {autoResult.failed} başarısız
            </p>
            <button onClick={() => setAutoResult(null)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
            {autoResult.results.filter(r => r.status === 'error').map(r => (
              <div key={r.productId} className="text-xs rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5">
                <p className="font-medium text-red-900">{r.productName}</p>
                <p className="text-red-800 font-mono mt-0.5 whitespace-pre-wrap break-words">{r.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search & list controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xl">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Ürün adı, SKU veya barkod ara"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
          />
          {isFetching && !isLoading && (
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-medium text-gray-700">
            {total.toLocaleString('tr-TR')} ürün
          </span>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-xs text-gray-500">Sayfa başına</span>
            <select
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Product table ── */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400 border border-gray-200 rounded-xl">
          <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Yükleniyor…
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 rounded-xl text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          {debouncedSearch ? (
            <>
              <p className="font-medium text-gray-500">Arama sonucu bulunamadı</p>
              <p className="text-sm mt-1">&quot;{debouncedSearch}&quot; için eşleşen ürün yok</p>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-500">Henüz Trendyol&apos;a gönderilmiş ürün yok</p>
              <p className="text-sm mt-1">Ürün Gönderme sekmesinden ürün gönderin</p>
            </>
          )}
        </div>
      ) : (
        <div className={`border border-gray-200 rounded-xl overflow-hidden relative ${isFetching ? 'opacity-70' : ''}`}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ürün / Varyant</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase w-20">Barkod</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase w-36">Fiyat (₺)</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase w-32">Stok</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase">Son Sync</th>
                <th className="px-3 py-3 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p, i) => {
                const editKey = p.productId;
                const edit    = edits[editKey] ?? { price: p.salePrice, stock: p.stock };
                const isExpanded = expandedRows.has(p.productId);
                const isSelected = selected.has(p.productId);
                const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';

                return (
                  <React.Fragment key={p.productId}>
                    {/* ── Product row ── */}
                    <tr className={`${rowBg} hover:bg-orange-50/30 transition-colors`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.productId)}
                          className="rounded"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.hasVariants && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(p.productId)}
                              className="text-gray-400 hover:text-gray-700 transition-colors"
                              title={isExpanded ? 'Varyantları gizle' : 'Varyantları göster'}
                            >
                              <svg className={`w-4 h-4 transition-transform duration-150 ${isExpanded ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                          <div>
                            <div className="font-medium text-gray-800">{p.productName}</div>
                            {p.hasVariants && (
                              <div className="text-xs text-blue-500 mt-0.5">{p.variants.length} varyant</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {p.barcode || '—'}
                        </span>
                      </td>

                      {/* Price — editable for non-variant products */}
                      <td className="px-3 py-3">
                        {p.hasVariants ? (
                          <span className="text-xs text-gray-400 block text-center">varyantlarda</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={edit.price}
                            onChange={e => setEdit(editKey, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        )}
                      </td>

                      {/* Stock — editable for non-variant products */}
                      <td className="px-3 py-3">
                        {p.hasVariants ? (
                          <span className="text-xs text-gray-400 block text-center">varyantlarda</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={edit.stock}
                            onChange={e => setEdit(editKey, 'stock', parseInt(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <div className="text-xs text-gray-400">{fmtDate(p.lastSyncAt)}</div>
                        {p.trendyolStatus && (
                          <span className={`text-[10px] font-medium ${p.trendyolStatus === 'PRICE_SYNCED' ? 'text-green-600' : p.trendyolStatus === 'ERROR' ? 'text-red-500' : 'text-gray-400'}`}>
                            {p.trendyolStatus}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex gap-1 justify-end">
                          {!p.hasVariants && p.barcode && (
                            <button
                              onClick={() => updateOne(p.productId)}
                              disabled={busy || actionsBlocked}
                              title={actionsBlocked ? 'Önce genel ayarları kaydedin' : undefined}
                              className="text-xs px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Gönder
                            </button>
                          )}
                          {p.hasVariants && (
                            <button
                              onClick={() => updateOne(p.productId)}
                              disabled={busy || actionsBlocked}
                              title={actionsBlocked ? 'Önce genel ayarları kaydedin' : undefined}
                              className="text-xs px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Tümü Gönder
                            </button>
                          )}
                          {p.errorMessage && (
                            <span title={p.errorMessage} className="text-red-400 cursor-help">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Variant rows (expandable) ── */}
                    {isExpanded && p.variants.map(v => {
                      const vKey  = `${p.productId}::${v.id}`;
                      const vEdit = edits[vKey] ?? { price: v.price, stock: v.stock };

                      return (
                        <tr key={v.id} className="bg-orange-50/30 border-l-2 border-orange-200">
                          <td className="px-3 py-2" />
                          <td className="px-4 py-2 pl-10">
                            <div className="text-sm text-gray-700 font-medium">{v.label}</div>
                            <div className="text-xs text-gray-400 font-mono">{v.sku || v.barcode || '—'}</div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-xs font-mono text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                              {v.barcode || (
                                <span className="text-red-400">Barkod yok</span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={vEdit.price}
                              disabled={!v.barcode}
                              onChange={e => setEdit(vKey, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={vEdit.stock}
                              disabled={!v.barcode}
                              onChange={e => setEdit(vKey, 'stock', parseInt(e.target.value) || 0)}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                          </td>
                          <td className="px-3 py-2" />
                          <td className="px-3 py-2">
                            {v.barcode ? (
                              <button
                                onClick={async () => {
                                  setBusy(true);
                                  setResult(null);
                                  try {
                                    const r = await trendyolApi.manualPriceStockUpdate([{
                                      barcode:   v.barcode,
                                      price:     vEdit.price,
                                      stock:     vEdit.stock,
                                      productId: p.productId,
                                      variantId: v.id,
                                    }]);
                                    setResult(r);
                                    if (r.sent > 0)   toast.success(`${v.label} güncellendi.`);
                                    else              toast.error(r.items[0]?.message ?? 'Hata');
                                    refetch();
                                  } catch (e: any) {
                                    toast.error(e.message);
                                  } finally { setBusy(false); }
                                }}
                                disabled={busy}
                                className="text-xs px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium disabled:opacity-40 whitespace-nowrap"
                              >
                                Gönder
                              </button>
                            ) : (
                              <span className="text-xs text-red-400">Barkod gerekli</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          <SyncListPagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onChange={setPage}
          />
        </div>
      )}

      {flowMode && onContinue ? (
        <div className="flex justify-end pt-4 border-t border-gray-200 mt-2">
          <button
            type="button"
            onClick={onContinue}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
          >
            Kurulumu Tamamla
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : !flowMode ? (
        <div className="flex justify-between pt-4 border-t border-gray-200 mt-2">
          <button type="button" onClick={() => onNavigate('products')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            Geri: Ürün Gönderme
          </button>
          <button type="button" onClick={() => onNavigate('history')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
            İleri: Geçmiş
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Tab: Send Diagnostics ─────────────────────────────────────────────────────

function SendDiagnosticsTab() {
  const [logStatus, setLogStatus]       = React.useState('all');
  const [logPage,   setLogPage]         = React.useState(1);
  const [expandedId, setExpandedId]     = React.useState<string | null>(null);
  const [liveResults, setLiveResults]   = React.useState<Record<string, any>>({});
  const [querying,    setQuerying]      = React.useState<string | null>(null);

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['diag-logs', logStatus, logPage],
    queryFn:  () => trendyolApi.getIntegrationLogs({ status: logStatus, page: logPage, limit: 30 }),
    refetchInterval: 30_000,
  });

  const logs      = logsData?.logs       ?? [];
  const logTotal  = logsData?.total      ?? 0;
  const logPages  = logsData?.totalPages ?? 1;

  // Query Trendyol live for a specific log
  const queryLive = async (log: IntegrationLog) => {
    const trendyolBatchId: string | undefined =
      (log.responsePayload as any)?.batchRequestId ??
      (log.message ?? '').match(/Batch:\s*(\S+)/)?.[1];
    if (!trendyolBatchId) {
      setLiveResults(prev => ({ ...prev, [log.id]: { error: 'Bu kayıtta Trendyol Batch ID bulunamadı.' } }));
      return;
    }
    setQuerying(log.id);
    try {
      const result = await trendyolApi.getTrendyolBatchResult(trendyolBatchId);
      setLiveResults(prev => ({ ...prev, [log.id]: { ...result, _queriedBatchId: trendyolBatchId } }));
    } catch (e: any) {
      setLiveResults(prev => ({ ...prev, [log.id]: { error: e?.response?.data?.error ?? e?.message ?? 'Trendyol sorgulanamadı' } }));
    } finally {
      setQuerying(null);
    }
  };

  // Payload summary helper
  const getPayloadSummary = (payload: any) => {
    if (!payload) return null;
    const p = Array.isArray(payload?.items) ? payload.items[0] : payload;
    return {
      title:      p?.title       ?? p?.name ?? '—',
      barcode:    p?.barcode     ?? '—',
      brandId:    p?.brandId     ?? '—',
      categoryId: p?.categoryId  ?? '—',
      attrCount:  Array.isArray(p?.attributes) ? p.attributes.length : 0,
      attrs:      (p?.attributes ?? []) as any[],
      salePrice:  p?.salePrice   ?? p?.price ?? '—',
      qty:        p?.quantity    ?? '—',
    };
  };

  const statusBadge = (s: string) => {
    if (s === 'success') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">✓ Başarılı</span>;
    if (s === 'error')   return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">✗ Hata</span>;
    if (s === 'skipped') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">— Atlandı</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">{s}</span>;
  };

  const trendyolResultPanel = (logId: string) => {
    const r = liveResults[logId];
    if (!r) return null;
    if (r.error) return (
      <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
        <strong>Hata:</strong> {r.error}
      </div>
    );
    const rawItems: any[] = r.items ?? r.batchRequestItems ?? r.content ?? [];
    const batchStatus = (r.status ?? r.batchStatus ?? '').toUpperCase();
    const isCompleted = batchStatus === 'COMPLETED' || batchStatus === 'DONE';
    const batchIdQueried = r._queriedBatchId ?? '—';
    return (
      <div className="mt-2 bg-white border border-gray-200 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-gray-600">Trendyol Batch:</span>
          <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{batchIdQueried}</code>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            batchStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' :
            batchStatus === 'FAILED'    ? 'bg-red-100 text-red-700' :
            batchStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>{batchStatus || '—'}</span>
        </div>
        {rawItems.length === 0 && (
          <pre className="text-[10px] text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto max-h-40">{JSON.stringify(r, null, 2)}</pre>
        )}
        {rawItems.map((item: any, idx: number) => {
          const itemStatus = (item.status ?? '').toUpperCase();
          const failed     = itemStatus === 'FAILED' || itemStatus === 'REJECTED';
          const reasons    = item.failureReasons ?? item.errorMessages ?? [];
          return (
            <div key={idx} className={`rounded-lg p-2.5 border text-xs ${failed ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-bold ${failed ? 'text-red-600' : 'text-green-600'}`}>
                  {failed ? '✗ BAŞARISIZ' : '✓ KABUL EDİLDİ'}
                </span>
                {item.barcode && <span className="text-gray-500">Barkod: <code className="font-mono">{item.barcode}</code></span>}
              </div>
              {reasons.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {reasons.map((r: any, i: number) => (
                    <li key={i} className="text-red-700 bg-red-100 rounded px-2 py-1 font-medium">
                      {typeof r === 'string' ? r : (r.message ?? r.reasonDescription ?? r.reasonCode ?? JSON.stringify(r))}
                    </li>
                  ))}
                </ul>
              )}
              {!failed && isCompleted && (
                <p className="text-green-700 mt-1">Trendyol ürünü kabul etti — panelde görünmesi birkaç dakika sürebilir.</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Detect log type
  const isTrendyolPollResult = (log: IntegrationLog) =>
    typeof log.message === 'string' && log.message.startsWith('[Trendyol Batch');
  const isQueueEntry = (log: IntegrationLog) =>
    typeof log.message === 'string' && log.message.includes('kuyruğuna alındı');
  const hasTrendyolBatchId = (log: IntegrationLog) =>
    !!(log.responsePayload as any)?.batchRequestId ||
    (log.message ?? '').match(/Batch:\s*(\S+)/)?.[1];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="font-semibold text-amber-800 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Gönderim Tanısı — Trendyol'a ne gönderildi, ne yanıt geldi?
        </h3>
        <p className="text-xs text-amber-700 mt-1">
          Her gönderim için iki kayıt oluşur: <strong>1)</strong> "Trendyol kuyruğuna alındı" (bizim sistemimizin kaydı) &nbsp;•&nbsp;
          <strong>2)</strong> "[Trendyol Batch ...] ..." (Trendyol'un asenkron işlem sonucu, ~15–30 sn sonra gelir).
          "Canlı Sorgula" butonu Trendyol'u anında sorgular.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={logStatus} onChange={e => { setLogStatus(e.target.value); setLogPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="all">Tüm kayıtlar</option>
          <option value="success">Başarılı</option>
          <option value="error">Hatalı</option>
          <option value="skipped">Atlandı</option>
        </select>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Yenile
        </button>
        <span className="text-sm text-gray-500">{logTotal} kayıt</span>
      </div>

      {/* Log list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <p>Henüz gönderim logu yok</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const summary       = getPayloadSummary(log.requestPayload);
            const isPoll        = isTrendyolPollResult(log);
            const isQueue       = isQueueEntry(log);
            const hasBatchId    = hasTrendyolBatchId(log);
            const isExpanded    = expandedId === log.id;
            const liveResult    = liveResults[log.id];

            return (
              <div key={log.id} className={`border rounded-xl overflow-hidden transition-all ${
                isPoll && log.status === 'error'   ? 'border-red-300 bg-red-50' :
                isPoll && log.status === 'success' ? 'border-green-300 bg-green-50' :
                isQueue ? 'border-blue-200 bg-blue-50' :
                log.status === 'error' ? 'border-red-200' :
                log.status === 'skipped' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'
              }`}>
                <div className="px-4 py-3">
                  {/* Row header */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isPoll ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Trendyol Yanıtı</span>
                        ) : isQueue ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Kuyruk Kaydı</span>
                        ) : null}
                        {statusBadge(log.status)}
                        <span className="font-medium text-gray-800 text-sm truncate">
                          {log.productName ?? log.productId ?? '—'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2" title={log.message ?? ''}>
                        {log.message ?? '—'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(log.createdAt).toLocaleString('tr-TR')}
                        {log.batchId && <span className="ml-2 font-mono text-gray-400">{log.batchId.slice(0, 16)}…</span>}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hasBatchId && (
                        <button
                          onClick={() => queryLive(log)}
                          disabled={querying === log.id}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 disabled:opacity-50 transition-colors font-medium flex items-center gap-1"
                        >
                          {querying === log.id ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                          )}
                          Canlı Sorgula
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors font-medium"
                      >
                        {isExpanded ? 'Kapat' : 'Detay'}
                      </button>
                    </div>
                  </div>

                  {/* Payload summary (always shown if available) */}
                  {summary && isQueue && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-[11px] bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-700">
                        📦 Kategori: <strong>{summary.categoryId}</strong>
                      </span>
                      <span className="text-[11px] bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-700">
                        🏷️ Marka ID: <strong>{summary.brandId}</strong>
                      </span>
                      <span className={`text-[11px] rounded px-2 py-0.5 font-semibold ${
                        summary.attrCount === 0 ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {summary.attrCount === 0 ? '⚠️ Özellik: BOŞ!' : `✓ ${summary.attrCount} özellik gönderildi`}
                      </span>
                      <span className="text-[11px] bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-700 font-mono">
                        Barkod: {summary.barcode}
                      </span>
                      <span className="text-[11px] bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-700">
                        Fiyat: ₺{summary.salePrice} · Adet: {summary.qty}
                      </span>
                    </div>
                  )}

                  {/* Live query result */}
                  {liveResult && trendyolResultPanel(log.id)}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
                    {log.requestPayload && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Trendyol'a gönderilen payload (requestPayload):</p>
                        {summary && (
                          <div className="mb-2 space-y-1">
                            <p className="text-xs text-gray-600"><strong>Özellikler ({summary.attrCount} adet):</strong></p>
                            {summary.attrCount === 0 ? (
                              <p className="text-xs text-red-600 font-semibold bg-red-50 rounded p-2">
                                ⚠️ Attributes dizisi BOŞ gönderildi! Trendyol zorunlu özellikleri reddediyor.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {(summary.attrs).map((a: any, i: number) => (
                                  <span key={i} className="text-[11px] bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 text-blue-700">
                                    attrId:{a.attributeId} {a.attributeValueId ? `→ ${a.attributeValueId}` : `→ "${a.customAttributeValue}"`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <pre className="text-[10px] bg-gray-800 text-green-300 rounded-lg p-3 overflow-x-auto max-h-64 font-mono">
                          {JSON.stringify(log.requestPayload, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.responsePayload && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Trendyol yanıtı (responsePayload):</p>
                        <pre className="text-[10px] bg-gray-800 text-yellow-300 rounded-lg p-3 overflow-x-auto max-h-40 font-mono">
                          {JSON.stringify(log.responsePayload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {logPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
            ← Önceki
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">{logPage} / {logPages}</span>
          <button disabled={logPage >= logPages} onClick={() => setLogPage(p => p + 1)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab: History ──────────────────────────────────────────────────────────────

function HistoryTab() {
  const { data: history, isLoading } = useQuery({ queryKey: ['trendyol-history'], queryFn: trendyolApi.getSyncHistory });

  const SYNC_TYPE_LABELS: Record<string, string> = { PRODUCT: 'Ürün Gönderme', STOCK: 'Stok/Fiyat Sync', ORDER: 'Sipariş' };
  const SYNC_STATUS_STYLES: Record<string, string> = { SUCCESS: 'text-green-600', FAILED: 'text-red-600', PARTIAL: 'text-amber-600' };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Senkronizasyon Geçmişi</h3>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tip</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">İşlenen</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Hatalı</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Süre</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Yükleniyor…</td></tr>}
            {!isLoading && (history ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Henüz senkronizasyon geçmişi yok</td></tr>
            )}
            {(history ?? []).map((h: any, i: number) => {
              const duration = h.completedAt
                ? Math.round((new Date(h.completedAt).getTime() - new Date(h.startedAt).getTime()) / 1000)
                : null;
              return (
                <tr key={h.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(h.startedAt)}</td>
                  <td className="px-4 py-3 text-gray-700">{SYNC_TYPE_LABELS[h.type] ?? h.type}</td>
                  <td className={`px-4 py-3 font-medium ${SYNC_STATUS_STYLES[h.status] ?? ''}`}>{h.status}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{h.itemsProcessed}</td>
                  <td className="px-4 py-3 text-right text-red-500">{h.itemsFailed || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{duration != null ? `${duration}s` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Profit Calculator ────────────────────────────────────────────────────

/** Trendyol kategori komisyon oranları (yaklaşık) */
const COMMISSION_PRESETS = [
  { label: 'Özel gir',            value: '' },
  { label: 'Elektronik (6%)',      value: '6' },
  { label: 'Bilgisayar (6%)',      value: '6' },
  { label: 'Telefon (6%)',         value: '6' },
  { label: 'Spor (8%)',            value: '8' },
  { label: 'Takı / Mücevher (8%)', value: '8' },
  { label: 'Kitap (10%)',          value: '10' },
  { label: 'Kozmetik (12%)',       value: '12' },
  { label: 'Moda (12%)',           value: '12' },
  { label: 'Ev & Yaşam (15%)',     value: '15' },
  { label: 'Anne & Bebek (15%)',   value: '15' },
  { label: 'Oyuncak (15%)',        value: '15' },
];

const CALC_VAT_RATES = [0, 1, 8, 10, 18, 20];

interface CalcResult {
  salePrice:        number;  // what customer pays
  commissionAmount: number;  // Trendyol commission cut
  vatAmount:        number;  // VAT portion embedded in price
  netRevenue:       number;  // after commission
  netProfit:        number;  // after commission + VAT + cost
  margin:           number;  // profit % of cost
  breakEvenPrice:   number;  // min price to not lose money
}

function calcProfit(
  cost:            number,
  commissionPct:   number,
  vatPct:          number,
  targetProfitPct: number,    // % of cost (forward mode)
  salePrice:       number,    // backward mode — 0 means forward
): CalcResult {
  const commissionFactor = commissionPct / 100;
  const vatFactor        = vatPct / (100 + vatPct); // VAT is INCLUDED in price

  // ── Backward mode: user entered a sale price ──────────────────────────────
  if (salePrice > 0) {
    const commissionAmount = salePrice * commissionFactor;
    const vatAmount        = salePrice * vatFactor;
    const netRevenue       = salePrice - commissionAmount;
    const netProfit        = netRevenue - vatAmount - cost;
    const margin           = cost > 0 ? (netProfit / cost) * 100 : 0;
    const breakEvenPrice   = cost / Math.max(1 - commissionFactor - vatFactor, 0.001);
    return { salePrice, commissionAmount, vatAmount, netRevenue, netProfit, margin, breakEvenPrice };
  }

  // ── Forward mode: calculate sale price from target profit % ──────────────
  const targetProfit = cost * (targetProfitPct / 100);
  const denominator  = Math.max(1 - commissionFactor - vatFactor, 0.001);
  const computedSalePrice = (cost + targetProfit) / denominator;
  const commissionAmount  = computedSalePrice * commissionFactor;
  const vatAmount         = computedSalePrice * vatFactor;
  const netRevenue        = computedSalePrice - commissionAmount;
  const netProfit         = netRevenue - vatAmount - cost;
  const margin            = cost > 0 ? (netProfit / cost) * 100 : 0;
  const breakEvenPrice    = cost / denominator;
  return {
    salePrice:  computedSalePrice,
    commissionAmount, vatAmount, netRevenue, netProfit, margin, breakEvenPrice,
  };
}

function r2(n: number) { return Math.round(n * 100) / 100; }
const moneyFmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctFmt   = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function ProfitCalculatorTab() {
  const qc = useQueryClient();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [mode,            setMode]            = React.useState<'forward' | 'backward'>('forward');
  const [cost,            setCost]            = React.useState('');
  const [commissionPct,   setCommissionPct]   = React.useState('12');
  const [commissionPreset,setCommissionPreset]= React.useState('');
  const [vatPct,          setVatPct]          = React.useState('20');
  const [targetProfitPct, setTargetProfitPct] = React.useState('30');
  const [salePriceInput,  setSalePriceInput]  = React.useState('');

  // ── Apply-to-product state ──────────────────────────────────────────────────
  const [applySearch,    setApplySearch]    = React.useState('');
  const [applyProductId, setApplyProductId] = React.useState('');
  const [applying,       setApplying]       = React.useState(false);
  const [applied,        setApplied]        = React.useState(false);

  const { data: productsData } = useQuery({
    queryKey: ['trendyol-products-calc', applySearch],
    queryFn:  () => trendyolApi.getProducts({ search: applySearch || undefined, limit: 20, page: 1 }),
    staleTime: 5000,
  });
  const productList = productsData?.products ?? [];

  // ── Live calculation ───────────────────────────────────────────────────────
  const result = React.useMemo<CalcResult | null>(() => {
    const c   = parseFloat(cost)          || 0;
    const com = parseFloat(commissionPct) || 0;
    const vat = parseFloat(vatPct)        || 0;
    const tp  = parseFloat(targetProfitPct) || 0;
    const sp  = parseFloat(salePriceInput)  || 0;
    if (c <= 0) return null;
    return calcProfit(c, com, vat, tp, mode === 'backward' ? sp : 0);
  }, [cost, commissionPct, vatPct, targetProfitPct, salePriceInput, mode]);

  // Sync preset → commissionPct
  React.useEffect(() => {
    if (commissionPreset) setCommissionPct(commissionPreset);
  }, [commissionPreset]);

  const applyToProduct = async () => {
    if (!applyProductId || !result) return;
    setApplying(true);
    setApplied(false);
    try {
      const price = r2(result.salePrice);
      await trendyolApi.saveProductPriceOverride(applyProductId, { customPrice: price });
      qc.invalidateQueries({ queryKey: ['trendyol-price-override', applyProductId] });
      setApplied(true);
      toast.success(`Fiyat ${moneyFmt.format(price)} ₺ olarak ürüne uygulandı.`);
      setTimeout(() => setApplied(false), 3000);
    } catch (e: any) {
      toast.error(e.message ?? 'Fiyat uygulanamadı.');
    } finally {
      setApplying(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Title ── */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🧮</span>
          Kâr Hesaplayıcı
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Trendyol komisyonu ve KDV dahil doğru satış fiyatını hesaplayın.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Inputs ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">

          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 w-full">
            <button
              onClick={() => setMode('forward')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'forward' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Hedef Kâra Göre Fiyat Hesapla
            </button>
            <button
              onClick={() => setMode('backward')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'backward' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Satış Fiyatı Analiz Et
            </button>
          </div>

          {/* Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ürün Maliyeti (₺)
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={cost}
                onChange={e => setCost(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₺</span>
            </div>
          </div>

          {/* Commission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Trendyol Komisyonu (%)</label>
            <div className="flex gap-2">
              <select
                value={commissionPreset}
                onChange={e => setCommissionPreset(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {COMMISSION_PRESETS.map(p => (
                  <option key={p.label} value={p.value}>{p.label}</option>
                ))}
              </select>
              <div className="relative w-24 flex-shrink-0">
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={commissionPct}
                  onChange={e => { setCommissionPct(e.target.value); setCommissionPreset(''); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* VAT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">KDV Oranı (%)</label>
            <select
              value={vatPct}
              onChange={e => setVatPct(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {CALC_VAT_RATES.map(r => (
                <option key={r} value={String(r)}>%{r}{r === 20 ? ' (Standart)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Target profit (forward) or sale price input (backward) */}
          {mode === 'forward' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hedef Kâr Oranı (% of maliyet)
              </label>
              <div className="relative">
                <input
                  type="number" min="0" max="500" step="1" placeholder="30"
                  value={targetProfitPct}
                  onChange={e => setTargetProfitPct(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              {cost && targetProfitPct && (
                <p className="text-xs text-gray-400 mt-1">
                  = {moneyFmt.format(r2((parseFloat(cost)||0) * (parseFloat(targetProfitPct)||0) / 100))} ₺ hedef kâr
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Satış Fiyatı (₺) — KDV Dahil
              </label>
              <div className="relative">
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={salePriceInput}
                  onChange={e => setSalePriceInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₺</span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="space-y-4">
          {!result ? (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center text-gray-400 h-full min-h-48">
              <span className="text-3xl mb-2">💡</span>
              <p className="text-sm">Maliyet girerek canlı hesaplama başlatın</p>
            </div>
          ) : (
            <>
              {/* Main result card */}
              <div className={`rounded-xl p-5 border ${result.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  {mode === 'forward' ? 'Önerilen Satış Fiyatı' : 'Hesaplama Sonucu'}
                </p>
                <div className="flex items-end gap-3">
                  <span className={`text-4xl font-bold tabular-nums ${result.netProfit >= 0 ? 'text-gray-900' : 'text-red-700'}`}>
                    {moneyFmt.format(r2(result.salePrice))}
                    <span className="text-xl ml-1 font-medium text-gray-500">₺</span>
                  </span>
                  <span className={`text-sm font-semibold pb-1 ${result.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {result.netProfit >= 0 ? `%${pctFmt.format(result.margin)} kâr` : '⚠ Zarar'}
                  </span>
                </div>
              </div>

              {/* Breakdown table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Kalem</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Tutar</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Oran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">Satış Fiyatı (KDV dahil)</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{moneyFmt.format(r2(result.salePrice))} ₺</td>
                      <td className="px-4 py-3 text-right text-gray-400">—</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"/>
                        Trendyol Komisyonu (%{commissionPct})
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 tabular-nums font-medium">−{moneyFmt.format(r2(result.commissionAmount))} ₺</td>
                      <td className="px-4 py-3 text-right text-gray-400">{pctFmt.format(result.salePrice > 0 ? (result.commissionAmount/result.salePrice)*100 : 0)}%</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"/>
                        KDV Payı (%{vatPct})
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 tabular-nums font-medium">−{moneyFmt.format(r2(result.vatAmount))} ₺</td>
                      <td className="px-4 py-3 text-right text-gray-400">{pctFmt.format(result.salePrice > 0 ? (result.vatAmount/result.salePrice)*100 : 0)}%</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"/>
                        Ürün Maliyeti
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600 tabular-nums font-medium">−{moneyFmt.format(r2(parseFloat(cost)||0))} ₺</td>
                      <td className="px-4 py-3 text-right text-gray-400">{pctFmt.format(result.salePrice > 0 ? ((parseFloat(cost)||0)/result.salePrice)*100 : 0)}%</td>
                    </tr>
                    <tr className={`font-semibold ${result.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <td className="px-4 py-3 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${result.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}/>
                        <span className={result.netProfit >= 0 ? 'text-green-800' : 'text-red-800'}>Net Kâr</span>
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums text-lg ${result.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {result.netProfit >= 0 ? '+' : ''}{moneyFmt.format(r2(result.netProfit))} ₺
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${result.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        %{pctFmt.format(result.margin)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Break-even info */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
                <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>
                  Başa baş fiyatı: <strong>{moneyFmt.format(r2(result.breakEvenPrice))} ₺</strong>
                  {' '}— Bu fiyatın altında satış zarardır.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Apply to product ── */}
      {result && result.netProfit >= 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Bu Fiyatı Ürüne Uygula
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Hesaplanan <strong>{moneyFmt.format(r2(result.salePrice))} ₺</strong> fiyat,
              seçilen ürünün Trendyol price override'ı olarak kaydedilir.
            </p>
          </div>

          <div className="flex gap-3 items-end">
            {/* Product search + select */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Ürün Seç</label>
              <input
                type="text"
                placeholder="Ürün adı veya barkod ara…"
                value={applySearch}
                onChange={e => { setApplySearch(e.target.value); setApplyProductId(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-2"
              />
              {productList.length > 0 && !applyProductId && (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto shadow-sm">
                  {productList.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setApplyProductId(p.id); setApplySearch(p.name); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-orange-50 text-left transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <span className="font-medium text-gray-800 truncate">{p.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2 font-mono">{p.barcode || p.sku || ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {applyProductId && (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Seçildi
                </p>
              )}
            </div>

            {/* Apply button */}
            <button
              onClick={applyToProduct}
              disabled={!applyProductId || applying || applied}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex-shrink-0 ${
                applied
                  ? 'bg-green-500 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {applying ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : applied ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              )}
              {applying ? 'Uygulanıyor…' : applied ? 'Uygulandı!' : `${moneyFmt.format(r2(result.salePrice))} ₺ Uygula`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Legacy tab page (advanced tools) — reachable via ?advanced=1 if needed later
export const TrendyolIntegrationLegacyTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('setup');
  const { data: stats } = useQuery({
    queryKey: ['trendyol-stats'],
    queryFn: trendyolApi.getStats,
    staleTime: 30_000,
    retry: false,
  });
  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-1 flex-wrap border-b border-gray-200 pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
              activeTab === tab.id ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={activeTab === 'setup' ? '' : 'hidden'}><SetupTab stats={stats} /></div>
      <div className={activeTab === 'categories' ? '' : 'hidden'}><CategoryMappingTab onNavigate={setActiveTab} /></div>
      <div className={activeTab === 'brands' ? '' : 'hidden'}><BrandMappingTab onNavigate={setActiveTab} /></div>
      <div className={activeTab === 'attributes' ? '' : 'hidden'}><AttributeMappingTab onNavigate={setActiveTab} /></div>
      <div className={activeTab === 'products' ? '' : 'hidden'}><ProductsTab onNavigate={setActiveTab} isActive={activeTab === 'products'} /></div>
      <div className={activeTab === 'sync' ? '' : 'hidden'}><SyncTab onNavigate={setActiveTab} /></div>
      <div className={activeTab === 'calculator' ? '' : 'hidden'}><ProfitCalculatorTab /></div>
      <div className={activeTab === 'history' ? '' : 'hidden'}><HistoryTab /></div>
      <div className={activeTab === 'logs' ? '' : 'hidden'}><SendDiagnosticsTab /></div>
    </div>
  );
};

