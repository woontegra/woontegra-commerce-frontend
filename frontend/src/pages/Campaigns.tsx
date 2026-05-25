/**
 * Campaigns — Rule-Based Campaign Engine
 * Supports: PRODUCT_DISCOUNT | CART_DISCOUNT | BUY_X_GET_Y | BULK_DISCOUNT
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  campaignService,
  type Campaign,
  type CampaignRule,
  type CampaignRuleType,
  type CreateRuleDto,
  type GetCampaignsQuery,
  type CartItem,
  type ApplyCartResult,
} from '../services/campaign.service';
import { categoryService } from '../services/category.service';
import type { FlatCategoryNode } from '../services/category.service';
import apiClient from '../services/apiClient';
import EmptyState from '../components/EmptyState';

// ── Constants ──────────────────────────────────────────────────────────────────

interface RuleTypeMeta {
  label:   string;
  desc:    string;
  color:   string;   // badge bg + text
  ring:    string;   // selected ring
  iconBg:  string;   // icon container bg
  iconFg:  string;   // icon color
  icon:    React.ReactNode;
}

const RULE_TYPE_META: Record<CampaignRuleType, RuleTypeMeta> = {
  PRODUCT_DISCOUNT: {
    label:  'Ürüne İndirim Yap',
    desc:   'Belirli ürün veya kategoriye indirim uygula',
    color:  'bg-blue-50 text-blue-700',
    ring:   'ring-blue-500 border-blue-400',
    iconBg: 'bg-blue-100',
    iconFg: 'text-blue-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>
      </svg>
    ),
  },
  CART_DISCOUNT: {
    label:  'Sepete İndirim Uygula',
    desc:   'Sepet tutarına göre indirim ver',
    color:  'bg-purple-50 text-purple-700',
    ring:   'ring-purple-500 border-purple-400',
    iconBg: 'bg-purple-100',
    iconFg: 'text-purple-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
    ),
  },
  BUY_X_GET_Y: {
    label:  'X Al Y Bedava',
    desc:   'Belirli üründen alınca başka ürün hediye et',
    color:  'bg-emerald-50 text-emerald-700',
    ring:   'ring-emerald-500 border-emerald-400',
    iconBg: 'bg-emerald-100',
    iconFg: 'text-emerald-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
      </svg>
    ),
  },
  BULK_DISCOUNT: {
    label:  'Toplu Alım İndirimi',
    desc:   'Adet arttıkça indirim uygula',
    color:  'bg-orange-50 text-orange-700',
    ring:   'ring-orange-500 border-orange-400',
    iconBg: 'bg-orange-100',
    iconFg: 'text-orange-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
    ),
  },
};

const QUERY_KEYS = {
  all:   ['campaigns']                              as const,
  list:  (q?: GetCampaignsQuery) => ['campaigns', 'list', q] as const,
  stats: ()                      => ['campaigns', 'stats']   as const,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate   = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
const fmtMoney  = (n: number)   => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
const padDate   = (n: number)   => String(n).padStart(2, '0');
const toLocal   = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${padDate(d.getMonth()+1)}-${padDate(d.getDate())}T${padDate(d.getHours())}:${padDate(d.getMinutes())}`;
};
const nowStr    = () => toLocal(new Date().toISOString());
const nextMonth = () => { const d = new Date(); d.setMonth(d.getMonth()+1); return toLocal(d.toISOString()); };

function ruleDescription(rule: CampaignRule): string {
  const c = rule.conditions as Record<string, any>;
  const a = rule.actions    as Record<string, any>;

  // Scope label (from ScopeSelector)
  const scopeLabel = (() => {
    if (!c.scope || c.scope === 'ALL') return 'Tüm Ürünler';
    if (c.scope === 'PRODUCT')  return c.productName  ? `Ürün: ${c.productName}`   : 'Belirli Ürün';
    if (c.scope === 'CATEGORY') return c.categoryName ? `Kategori: ${c.categoryName}` : 'Belirli Kategori';
    return 'Tüm Ürünler';
  })();

  // Discount amount label
  const discLabel = a.discountType === 'percentage'
    ? `%${a.value} indirim`
    : a.value != null ? `₺${a.value} indirim` : '';

  switch (rule.type) {
    case 'PRODUCT_DISCOUNT':
      return `${discLabel} — ${scopeLabel}`;

    case 'CART_DISCOUNT': {
      const threshold = c.minCartTotal ? `₺${c.minCartTotal}+ sepette` : c.minQuantity ? `${c.minQuantity}+ adet için` : '';
      return `${threshold ? threshold + ' ' : ''}${discLabel} (sepet geneli)`;
    }

    case 'BUY_X_GET_Y': {
      const freeLabel = a.freeProductName ? `${a.freeProductName} ücretsiz` : `${a.freeQty ?? '?'} adet bedava`;
      return `${c.minQty ?? '?'} al → ${freeLabel} — ${scopeLabel}`;
    }

    case 'BULK_DISCOUNT':
      return `${c.minQty ?? '?'}+ adet alınca ${discLabel} — ${scopeLabel}`;

    default:
      return '';
  }
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useCampaigns(query: GetCampaignsQuery) {
  return useQuery({ queryKey: QUERY_KEYS.list(query), queryFn: () => campaignService.getAll(query) });
}
function useCampaignStats() {
  return useQuery({ queryKey: QUERY_KEYS.stats(), queryFn: () => campaignService.getStats(), staleTime: 30_000 });
}
function useToggleCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignService.toggle(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QUERY_KEYS.all }),
    onError:    (e: any) => toast.error(e.response?.data?.error ?? 'Hata'),
  });
}
function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignService.delete(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.all }); toast.success('Kampanya silindi'); },
    onError:    (e: any) => toast.error(e.response?.data?.error ?? 'Silinemedi'),
  });
}
function useAddRule(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: CreateRuleDto) => campaignService.addRule(campaignId, d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.all }); toast.success('Kural eklendi'); },
    onError:    (e: any) => toast.error(e.response?.data?.error ?? 'Kural eklenemedi'),
  });
}
function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, ruleId }: { campaignId: string; ruleId: string }) =>
      campaignService.deleteRule(campaignId, ruleId),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.all }); toast.success('Kural silindi'); },
    onError:    (e: any) => toast.error(e.response?.data?.error ?? 'Kural silinemedi'),
  });
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ c }: { c: Campaign }) {
  if (c.isExpired)   return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">Süresi Doldu</span>;
  if (!c.isActive)   return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">Pasif</span>;
  if (c.isScheduled) return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Planlandı</span>;
  if (c.isRunning)   return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Aktif</span>;
  return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">Pasif</span>;
}

// ── RuleBadge ─────────────────────────────────────────────────────────────────

function RuleBadge({ type }: { type: CampaignRuleType }) {
  const meta = RULE_TYPE_META[type];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${meta.color} border-current/20`}>
      <span className={`flex-shrink-0 ${meta.iconFg}`}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

// ── RuleBuilder ───────────────────────────────────────────────────────────────

interface RuleBuilderProps {
  campaignId: string;
  onClose:    () => void;
}

function RuleBuilder({ campaignId, onClose }: RuleBuilderProps) {
  const addRule = useAddRule(campaignId);
  const [type,       setType]       = useState<CampaignRuleType>('PRODUCT_DISCOUNT');
  const [conditions, setConditions] = useState<Record<string, any>>({});
  const [actions,    setActions]    = useState<Record<string, any>>({ discountType: 'percentage', value: 10 });

  const setC = (k: string, v: any) => setConditions(p => ({ ...p, [k]: v === '' ? undefined : v }));
  const setA = (k: string, v: any) => setActions(p => ({ ...p, [k]: v === '' ? undefined : v }));

  const handleSubmit = () => {
    const cleanCond = Object.fromEntries(Object.entries(conditions).filter(([, v]) => v !== undefined && v !== ''));
    const cleanAct  = Object.fromEntries(Object.entries(actions).filter(([, v]) => v !== undefined && v !== ''));
    addRule.mutate({ type, conditions: cleanCond, actions: cleanAct }, { onSuccess: onClose });
  };

  // Reset fields when type changes
  const changeType = (t: CampaignRuleType) => {
    setType(t);
    setConditions({});
    if (t === 'BUY_X_GET_Y') setActions({ freeQty: 1 });
    else setActions({ discountType: 'percentage', value: 10 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Kural Ekle</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type selector — card grid */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              İndirim Türünü Seçin
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(RULE_TYPE_META) as CampaignRuleType[]).map(t => {
                const meta    = RULE_TYPE_META[t];
                const selected = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => changeType(t)}
                    className={`group relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all duration-150 ${
                      selected
                        ? `${meta.ring} ring-2 shadow-sm`
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${meta.iconBg} ${meta.iconFg} transition-transform group-hover:scale-110`}>
                      {meta.icon}
                    </div>

                    {/* Title */}
                    <div>
                      <p className={`text-sm font-semibold leading-snug ${selected ? meta.iconFg : 'text-gray-800'}`}>
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                        {meta.desc}
                      </p>
                    </div>

                    {/* Selected checkmark */}
                    {selected && (
                      <span className={`absolute top-2.5 right-2.5 flex items-center justify-center w-5 h-5 rounded-full ${meta.iconBg} ${meta.iconFg}`}>
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditions */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Koşullar</label>
            <div className="space-y-3 bg-gray-50 rounded-xl p-4">
              {type === 'PRODUCT_DISCOUNT' && (
                <>
                  <Field label="Ürün ID (boş = tüm ürünler)" value={conditions.productId ?? ''} onChange={v => setC('productId', v)} placeholder="uuid..." />
                  <Field label="Kategori ID (opsiyonel)" value={conditions.categoryId ?? ''} onChange={v => setC('categoryId', v)} placeholder="uuid..." />
                  <Field label="Varyant ID (opsiyonel)" value={conditions.variantId ?? ''} onChange={v => setC('variantId', v)} placeholder="uuid..." />
                </>
              )}
              {type === 'CART_DISCOUNT' && (
                <>
                  <NumField label="Minimum Sepet Tutarı (₺, opsiyonel)" value={conditions.minCartTotal ?? ''} onChange={v => setC('minCartTotal', v ? Number(v) : undefined)} />
                  <NumField label="Minimum Ürün Adeti (opsiyonel)" value={conditions.minQuantity ?? ''} onChange={v => setC('minQuantity', v ? Number(v) : undefined)} />
                  <p className="text-xs text-gray-400">En az bir koşul belirtilmelidir.</p>
                </>
              )}
              {type === 'BUY_X_GET_Y' && (
                <>
                  <Field    label="Ürün ID (boş = tüm ürünler)" value={conditions.productId ?? ''} onChange={v => setC('productId', v)} placeholder="uuid..." />
                  <NumField label="Minimum Adet (X)" value={conditions.minQty ?? ''} onChange={v => setC('minQty', v ? Number(v) : undefined)} />
                </>
              )}
              {type === 'BULK_DISCOUNT' && (
                <>
                  <Field    label="Ürün ID (boş = tüm ürünler)" value={conditions.productId ?? ''} onChange={v => setC('productId', v)} placeholder="uuid..." />
                  <NumField label="Minimum Adet" value={conditions.minQty ?? ''} onChange={v => setC('minQty', v ? Number(v) : undefined)} />
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Aksiyon</label>
            <div className="space-y-3 bg-gray-50 rounded-xl p-4">
              {type !== 'BUY_X_GET_Y' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">İndirim Tipi</label>
                    <select
                      value={actions.discountType ?? 'percentage'}
                      onChange={e => setA('discountType', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="percentage">Yüzde (%)</option>
                      <option value="fixed">Sabit Tutar (₺)</option>
                    </select>
                  </div>
                  <NumField
                    label={actions.discountType === 'fixed' ? 'İndirim Miktarı (₺)' : 'İndirim Oranı (%)'}
                    value={actions.value ?? ''}
                    onChange={v => setA('value', v ? Number(v) : undefined)}
                  />
                  <NumField label="Maksimum İndirim (₺, opsiyonel)" value={actions.maxDiscount ?? ''} onChange={v => setA('maxDiscount', v ? Number(v) : undefined)} />
                </>
              )}
              {type === 'BUY_X_GET_Y' && (
                <>
                  <NumField label="Bedava Adet (Y)" value={actions.freeQty ?? ''} onChange={v => setA('freeQty', v ? Number(v) : undefined)} />
                  <Field    label="Bedava Ürün ID (boş = aynı ürün)" value={actions.freeProductId ?? ''} onChange={v => setA('freeProductId', v)} placeholder="uuid..." />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">İptal</button>
          <button
            onClick={handleSubmit}
            disabled={addRule.isPending}
            className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {addRule.isPending ? 'Ekleniyor…' : 'Kural Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Variant display label (client-side fallback) ──────────────────────────────
/** Mirrors backend buildVariantDisplayName — used when displayName is absent. */
function buildVariantLabel(v: {
  name?: string | null;
  variantAttributes?: Array<{
    attribute?: { name: string } | null;
    attributeValue?: { label: string } | null;
    textValue?: string | null;
  }>;
  combination?: Record<string, string> | null;
}): string {
  const attrs = v.variantAttributes ?? [];
  if (attrs.length > 0) {
    const parts = attrs
      .filter(va => va.attribute)
      .map(va => {
        const n = va.attribute!.name;
        const val = va.attributeValue?.label ?? va.textValue ?? '';
        return val ? `${n}: ${val}` : n;
      });
    if (parts.length > 0) return parts.join(' / ');
  }
  if (v.combination && typeof v.combination === 'object' && Object.keys(v.combination).length > 0) {
    return Object.entries(v.combination).map(([k, val]) => `${k}: ${val}`).join(' / ');
  }
  return v.name ?? '';
}

// ── Field helpers ─────────────────────────────────────────────────────────────

const Field = ({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label className="block text-xs text-gray-600 mb-1">{label}</label>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
  </div>
);
const NumField = ({ label, value, onChange }: { label: string; value: number | string; onChange: (v: string) => void }) => (
  <div>
    <label className="block text-xs text-gray-600 mb-1">{label}</label>
    <input type="number" min="0" value={value} onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
  </div>
);

// ── ProductSearch — ürün adı ile arama, ID döner ──────────────────────────────

interface ProductHit { id: string; name: string; price: number; }

function ProductSearch({
  label,
  value,       // currently selected product id
  valueName,   // currently selected product name (display)
  onSelect,    // (id, name) => void
  placeholder = 'Ürün ara…',
}: {
  label:       string;
  value:       string;
  valueName:   string;
  onSelect:    (id: string, name: string) => void;
  placeholder?: string;
}) {
  const [query,   setQuery]   = useState('');
  const [open,    setOpen]    = useState(false);
  const [results, setResults] = useState<ProductHit[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/products', { params: { search: query, limit: 10 } });
        const data = (res as any).data;
        const items: ProductHit[] = (data?.items ?? data ?? []).map((p: any) => ({
          id:    p.id,
          name:  p.name,
          price: Number(p.price ?? 0),
        }));
        setResults(items);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, [query]);

  const handleSelect = (hit: ProductHit) => {
    onSelect(hit.id, hit.name);
    setQuery('');
    setOpen(false);
    setResults([]);
  };

  const clear = () => { onSelect('', ''); setQuery(''); };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs text-slate-600 mb-1.5">{label}</label>

      {/* Selected pill */}
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 border border-indigo-300 bg-indigo-50 rounded-xl text-sm">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-500 flex-shrink-0">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h2a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"/>
          </svg>
          <span className="flex-1 font-medium text-indigo-800 truncate">{valueName || value}</span>
          <button type="button" onClick={clear} className="text-indigo-400 hover:text-red-500 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
      )}

      {/* Dropdown */}
      {open && !value && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {loading && (
            <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Aranıyor…
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="px-4 py-3 text-xs text-slate-400">Sonuç bulunamadı.</div>
          )}
          {!loading && !query && (
            <div className="px-4 py-3 text-xs text-slate-400">Ürün adı yazın…</div>
          )}
          {results.map(hit => (
            <button
              key={hit.id}
              type="button"
              onMouseDown={() => handleSelect(hit)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50 text-sm transition-colors text-left"
            >
              <span className="font-medium text-slate-800">{hit.name}</span>
              <span className="text-xs text-slate-400 flex-shrink-0 ml-3">
                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(hit.price)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CategorySelect — kategori ağacından seç ───────────────────────────────────

function CategorySelect({
  label,
  value,
  valueName,
  onSelect,
}: {
  label:     string;
  value:     string;
  valueName: string;
  onSelect:  (id: string, name: string) => void;
}) {
  const { data: cats = [], isLoading } = useQuery({
    queryKey: ['cats-flat'],
    queryFn:  () => categoryService.getFlat(),
    staleTime: 60_000,
  });

  return (
    <div>
      <label className="block text-xs text-slate-600 mb-1.5">{label}</label>
      {isLoading ? (
        <div className="text-xs text-slate-400 py-2">Kategoriler yükleniyor…</div>
      ) : (
        <select
          value={value}
          onChange={e => {
            const cat = cats.find((c: FlatCategoryNode) => c.id === e.target.value);
            onSelect(e.target.value, cat?.name ?? e.target.value);
          }}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="">— Kategori seçin —</option>
          {cats.map((c: FlatCategoryNode) => (
            <option key={c.id} value={c.id}>
              {'  '.repeat(c.level ?? 0)}{c.level ? '└ ' : ''}{c.name}
            </option>
          ))}
        </select>
      )}
      {value && (
        <p className="text-xs text-indigo-600 mt-1">Seçili: {valueName}</p>
      )}
    </div>
  );
}

// ── ScopeSelector — Tüm Ürünler / Belirli Ürün / Kategori ────────────────────

type Scope = 'ALL' | 'PRODUCT' | 'CATEGORY';

function ScopeSelector({
  label = 'Uygulama Alanı',
  scope,
  productId,
  productName,
  categoryId,
  categoryName,
  onScopeChange,
  onProductSelect,
  onCategorySelect,
}: {
  label?:           string;
  scope:            Scope;
  productId:        string;
  productName:      string;
  categoryId:       string;
  categoryName:     string;
  onScopeChange:    (s: Scope) => void;
  onProductSelect:  (id: string, name: string) => void;
  onCategorySelect: (id: string, name: string) => void;
}) {
  const SCOPES: { value: Scope; label: string; icon: string }[] = [
    { value: 'ALL',      label: 'Tüm Ürünler',    icon: '🌐' },
    { value: 'PRODUCT',  label: 'Belirli Ürün',   icon: '📦' },
    { value: 'CATEGORY', label: 'Kategori',        icon: '📁' },
  ];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-slate-600 mb-1.5">{label}</label>
        <div className="grid grid-cols-3 gap-2">
          {SCOPES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => onScopeChange(s.value)}
              className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                scope === s.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'border-slate-100 text-slate-500 hover:border-slate-200'
              }`}
            >
              <span className="text-base leading-none">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {scope === 'PRODUCT' && (
        <ProductSearch
          label="Ürün Seç"
          value={productId}
          valueName={productName}
          onSelect={onProductSelect}
        />
      )}

      {scope === 'CATEGORY' && (
        <CategorySelect
          label="Kategori Seç"
          value={categoryId}
          valueName={categoryName}
          onSelect={onCategorySelect}
        />
      )}
    </div>
  );
}

// ── CreateCampaignModal — 3-step wizard ───────────────────────────────────────

interface WizardStep1 {
  name:        string;
  description: string;
  startDate:   string;
  endDate:     string;
  priority:    number;
  isActive:    boolean;
}

const INPUT = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder:text-slate-400';

// Step indicator pill
function StepPill({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm transition-colors ${active ? 'text-indigo-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
        done   ? 'bg-emerald-100 text-emerald-700'
        : active ? 'bg-indigo-600 text-white shadow-sm'
        : 'bg-slate-100 text-slate-400'
      }`}>
        {done
          ? <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
          : n
        }
      </div>
      <span className="hidden sm:inline font-medium">{label}</span>
    </div>
  );
}

function CreateCampaignModal({ onClose, editCampaign }: { onClose: () => void; editCampaign?: Campaign }) {
  const isEdit     = !!editCampaign;
  const queryClient = useQueryClient();

  // ── helpers for existing rule (edit mode seed) ────────────────────────────
  const seedRule = editCampaign?.rules?.[0] ?? null;

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [s1, setS1] = useState<WizardStep1>(() => isEdit ? {
    name:        editCampaign!.name,
    description: editCampaign!.description ?? '',
    startDate:   editCampaign!.startDate   ? editCampaign!.startDate.slice(0, 10)  : nowStr(),
    endDate:     editCampaign!.endDate     ? editCampaign!.endDate.slice(0, 10)    : nextMonth(),
    priority:    editCampaign!.priority    ?? 0,
    isActive:    editCampaign!.isActive    ?? true,
  } : {
    name: '', description: '', startDate: nowStr(), endDate: nextMonth(), priority: 0, isActive: true,
  });
  const [s1Err, setS1Err] = useState<Partial<Record<keyof WizardStep1, string>>>({});

  // Step 2 state
  const [ruleType, setRuleType] = useState<CampaignRuleType | null>(
    (seedRule?.type as CampaignRuleType | undefined) ?? null
  );

  // Step 3 state
  const [cond, setCond] = useState<Record<string, any>>(
    seedRule ? { scope: 'ALL', ...(seedRule.conditions as any) } : {}
  );
  const [act,  setAct]  = useState<Record<string, any>>(
    seedRule ? (seedRule.actions as any) : { discountType: 'percentage', value: 10 }
  );
  const setC = (k: string, v: any) => setCond(p => ({ ...p, [k]: v === '' ? undefined : v }));
  const setA = (k: string, v: any) => setAct(p  => ({ ...p, [k]: v === '' ? undefined : v }));

  // scope + names for ScopeSelector (seeded from existing rule)
  const [productName,     setProductName]     = useState((seedRule?.conditions as any)?.productName  ?? '');
  const [categoryName,    setCategoryName]    = useState((seedRule?.conditions as any)?.categoryName ?? '');
  const [freeProductName, setFreeProductName] = useState((seedRule?.actions    as any)?.freeProductName ?? '');

  // When type changes reset fields
  const pickType = (t: CampaignRuleType) => {
    setRuleType(t);
    setCond({ scope: 'ALL' });
    setProductName('');
    setCategoryName('');
    setFreeProductName('');
    setAct(t === 'BUY_X_GET_Y' ? { freeQty: 1 } : { discountType: 'percentage', value: 10 });
  };

  // ── Step 1 validation ──────────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    const errs: typeof s1Err = {};
    if (!s1.name.trim()) errs.name = 'Kampanya adı zorunludur';
    if (!s1.startDate)   errs.startDate = 'Başlangıç tarihi zorunludur';
    if (!s1.endDate)     errs.endDate   = 'Bitiş tarihi zorunludur';
    if (s1.startDate && s1.endDate && s1.endDate <= s1.startDate)
      errs.endDate = 'Bitiş tarihi başlangıçtan sonra olmalıdır';
    setS1Err(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Final submit ───────────────────────────────────────────────────────────
  const submit = async () => {
    setIsBusy(true);
    const payload = {
      name:        s1.name.trim(),
      description: s1.description.trim() || undefined,
      startDate:   s1.startDate,
      endDate:     s1.endDate,
      priority:    Number(s1.priority),
      isActive:    s1.isActive,
    } as any;

    const cleanCond = Object.fromEntries(
      Object.entries({ ...cond, ...(productName  ? { productName  } : {}), ...(categoryName ? { categoryName } : {}) })
        .filter(([, v]) => v !== undefined && v !== '')
    );
    const cleanAct = Object.fromEntries(
      Object.entries({ ...act, ...(freeProductName ? { freeProductName } : {}) })
        .filter(([, v]) => v !== undefined && v !== '')
    );

    try {
      if (isEdit) {
        // 1. Update base campaign info
        await campaignService.update(editCampaign!.id, payload);

        // 2. Remove all existing rules then re-add (simple approach)
        for (const r of editCampaign!.rules ?? []) {
          await campaignService.deleteRule(editCampaign!.id, r.id);
        }
        if (ruleType) {
          await campaignService.addRule(editCampaign!.id, { type: ruleType, conditions: cleanCond, actions: cleanAct });
        }

        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
        toast.success('Kampanya güncellendi');
      } else {
        // Create mode
        const campaign = await campaignService.create(payload);
        const cid = (campaign as any).id ?? (campaign as any).data?.id;

        if (cid && ruleType) {
          await campaignService.addRule(cid, { type: ruleType, conditions: cleanCond, actions: cleanAct });
        }

        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
        toast.success('Kampanya oluşturuldu');
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? e?.message ?? (isEdit ? 'Güncellenemedi' : 'Oluşturulamadı'));
    } finally {
      setIsBusy(false);
    }
  };

  const [isBusy, setIsBusy] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {isEdit ? 'Kampanyayı Düzenle' : 'Kampanya Oluştur'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEdit ? 'Bilgileri güncelleyin' : 'Adım adım kampanyanızı oluşturun'}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mt-5">
            <StepPill n={1} label="Bilgiler"    active={step === 1} done={step > 1} />
            <div className="flex-1 h-px bg-slate-100" />
            <StepPill n={2} label="İndirim Türü" active={step === 2} done={step > 2} />
            <div className="flex-1 h-px bg-slate-100" />
            <StepPill n={3} label="Kural Detayı" active={step === 3} done={false} />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ STEP 1 ══════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Kampanya Adı *</label>
                <input
                  value={s1.name}
                  onChange={e => setS1(p => ({ ...p, name: e.target.value }))}
                  className={INPUT}
                  placeholder="Örn: Yaz İndirimi 2026"
                />
                {s1Err.name && <p className="text-red-500 text-xs mt-1">{s1Err.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Açıklama</label>
                <textarea
                  value={s1.description}
                  onChange={e => setS1(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className={INPUT}
                  placeholder="Kampanya hakkında kısa açıklama"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Başlangıç *</label>
                  <input
                    type="datetime-local"
                    value={s1.startDate}
                    onChange={e => setS1(p => ({ ...p, startDate: e.target.value }))}
                    className={INPUT}
                  />
                  {s1Err.startDate && <p className="text-red-500 text-xs mt-1">{s1Err.startDate}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Bitiş *</label>
                  <input
                    type="datetime-local"
                    value={s1.endDate}
                    onChange={e => setS1(p => ({ ...p, endDate: e.target.value }))}
                    className={INPUT}
                  />
                  {s1Err.endDate && <p className="text-red-500 text-xs mt-1">{s1Err.endDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Öncelik</label>
                  <input
                    type="number"
                    min={0}
                    value={s1.priority}
                    onChange={e => setS1(p => ({ ...p, priority: Number(e.target.value) }))}
                    className={INPUT}
                  />
                </div>
                <div className="flex items-center gap-2.5 pt-7">
                  <button
                    type="button"
                    onClick={() => setS1(p => ({ ...p, isActive: !p.isActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s1.isActive ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${s1.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-slate-700">Hemen aktif et</span>
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 2 ══════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">
                Kampanyanıza uygulanacak indirim türünü seçin. İsterseniz bu adımı atlayabilir, kampanyayı kaydettikten sonra kural ekleyebilirsiniz.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(RULE_TYPE_META) as CampaignRuleType[]).map(t => {
                  const meta     = RULE_TYPE_META[t];
                  const selected = ruleType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => pickType(t)}
                      className={`group relative flex flex-col items-start gap-2.5 p-4 rounded-2xl border-2 text-left transition-all duration-150 ${
                        selected
                          ? `${meta.ring} ring-2 shadow-sm`
                          : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${meta.iconBg} ${meta.iconFg} transition-transform group-hover:scale-105`}>
                        {meta.icon}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold leading-snug ${selected ? meta.iconFg : 'text-slate-800'}`}>
                          {meta.label}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{meta.desc}</p>
                      </div>
                      {selected && (
                        <span className={`absolute top-2.5 right-2.5 flex items-center justify-center w-5 h-5 rounded-full ${meta.iconBg} ${meta.iconFg}`}>
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {!ruleType && (
                <p className="mt-4 text-center text-xs text-slate-400">
                  Kural eklemek istemiyorsanız "Sonraki" ile devam edin veya "Kaydet" ile kampanyayı oluşturun.
                </p>
              )}
            </div>
          )}

          {/* ══ STEP 3 ══════════════════════════════════════════════════════════ */}
          {step === 3 && ruleType && (
            <div className="p-6 space-y-5">
              {/* Selected type reminder */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${RULE_TYPE_META[ruleType].color} border-current/10`}>
                <span className={RULE_TYPE_META[ruleType].iconFg}>{RULE_TYPE_META[ruleType].icon}</span>
                <div>
                  <p className="text-sm font-semibold">{RULE_TYPE_META[ruleType].label}</p>
                  <p className="text-xs opacity-70">{RULE_TYPE_META[ruleType].desc}</p>
                </div>
              </div>

              {/* ── Conditions ── */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Koşullar</label>
                <div className="space-y-3 bg-slate-50 rounded-xl p-4">
                  {/* PRODUCT_DISCOUNT */}
                  {ruleType === 'PRODUCT_DISCOUNT' && (
                    <ScopeSelector
                      scope={cond.scope ?? 'ALL'}
                      productId={cond.productId ?? ''}
                      productName={productName}
                      categoryId={cond.categoryId ?? ''}
                      categoryName={categoryName}
                      onScopeChange={s => {
                        setCond({ scope: s });
                        setProductName('');
                        setCategoryName('');
                      }}
                      onProductSelect={(id, name) => {
                        setC('productId', id);
                        setProductName(name);
                      }}
                      onCategorySelect={(id, name) => {
                        setC('categoryId', id);
                        setCategoryName(name);
                      }}
                    />
                  )}

                  {/* CART_DISCOUNT */}
                  {ruleType === 'CART_DISCOUNT' && (
                    <>
                      <NumField label="Minimum Sepet Tutarı ₺ (opsiyonel)" value={cond.minCartTotal ?? ''} onChange={v => setC('minCartTotal', v ? Number(v) : undefined)} />
                      <NumField label="Minimum Ürün Adeti (opsiyonel)" value={cond.minQuantity ?? ''} onChange={v => setC('minQuantity', v ? Number(v) : undefined)} />
                      <p className="text-xs text-slate-400">En az bir koşul belirtiniz.</p>
                    </>
                  )}

                  {/* BUY_X_GET_Y */}
                  {ruleType === 'BUY_X_GET_Y' && (
                    <>
                      <ScopeSelector
                        label="Hangi üründen alındığında (X)"
                        scope={cond.scope ?? 'ALL'}
                        productId={cond.productId ?? ''}
                        productName={productName}
                        categoryId={cond.categoryId ?? ''}
                        categoryName={categoryName}
                        onScopeChange={s => {
                          setCond(p => ({ ...p, scope: s, productId: undefined, categoryId: undefined }));
                          setProductName('');
                          setCategoryName('');
                        }}
                        onProductSelect={(id, name) => {
                          setC('productId', id);
                          setProductName(name);
                        }}
                        onCategorySelect={(id, name) => {
                          setC('categoryId', id);
                          setCategoryName(name);
                        }}
                      />
                      <NumField label="Minimum Adet (X)" value={cond.minQty ?? ''} onChange={v => setC('minQty', v ? Number(v) : undefined)} />
                    </>
                  )}

                  {/* BULK_DISCOUNT */}
                  {ruleType === 'BULK_DISCOUNT' && (
                    <>
                      <ScopeSelector
                        scope={cond.scope ?? 'ALL'}
                        productId={cond.productId ?? ''}
                        productName={productName}
                        categoryId={cond.categoryId ?? ''}
                        categoryName={categoryName}
                        onScopeChange={s => {
                          setCond(p => ({ ...p, scope: s, productId: undefined, categoryId: undefined }));
                          setProductName('');
                          setCategoryName('');
                        }}
                        onProductSelect={(id, name) => {
                          setC('productId', id);
                          setProductName(name);
                        }}
                        onCategorySelect={(id, name) => {
                          setC('categoryId', id);
                          setCategoryName(name);
                        }}
                      />
                      <NumField label="Minimum Adet" value={cond.minQty ?? ''} onChange={v => setC('minQty', v ? Number(v) : undefined)} />
                    </>
                  )}
                </div>
              </div>

              {/* ── Actions ── */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">İndirim Detayı</label>
                <div className="space-y-3 bg-slate-50 rounded-xl p-4">
                  {ruleType !== 'BUY_X_GET_Y' && (
                    <>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1.5">İndirim Tipi</label>
                        <div className="grid grid-cols-2 gap-2">
                          {([['percentage', 'Yüzde (%)'], ['fixed', 'Sabit Tutar (₺)']] as const).map(([v, label]) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setA('discountType', v)}
                              className={`py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                                (act.discountType ?? 'percentage') === v
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <NumField
                        label={act.discountType === 'fixed' ? 'İndirim Miktarı (₺)' : 'İndirim Oranı (%)'}
                        value={act.value ?? ''}
                        onChange={v => setA('value', v ? Number(v) : undefined)}
                      />
                      <NumField label="Maksimum İndirim Tutarı ₺ (opsiyonel)" value={act.maxDiscount ?? ''} onChange={v => setA('maxDiscount', v ? Number(v) : undefined)} />
                    </>
                  )}
                  {ruleType === 'BUY_X_GET_Y' && (
                    <>
                      <NumField label="Bedava Adet (Y)" value={act.freeQty ?? ''} onChange={v => setA('freeQty', v ? Number(v) : undefined)} />
                      <ProductSearch
                        label="Hediye Ürün (boş = aynı ürün)"
                        value={act.freeProductId ?? ''}
                        valueName={freeProductName}
                        placeholder="Hediye ürün ara… (boş = X ile aynı ürün)"
                        onSelect={(id, name) => {
                          setA('freeProductId', id || undefined);
                          setFreeProductName(name);
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — no rule type selected */}
          {step === 3 && !ruleType && (
            <div className="p-6 flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                </svg>
              </div>
              <p className="font-semibold text-slate-700">Kural tipi seçilmedi</p>
              <p className="text-sm text-slate-400">Kampanya kuralsız oluşturulacak. Sonradan kural ekleyebilirsiniz.</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          {/* Back */}
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(s => (s - 1) as 1|2|3)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                Geri
              </button>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              İptal
            </button>

            {/* Step 2: skip rule */}
            {step === 2 && (
              <button
                type="button"
                onClick={submit}
                disabled={isBusy}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors disabled:opacity-50"
              >
                Kuralsız Kaydet
              </button>
            )}

            {/* Forward / Submit */}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1) { if (validateStep1()) setStep(2); }
                  else if (step === 2) { setStep(3); }
                }}
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {step === 2 && ruleType ? 'Kural Detayları' : 'Sonraki'}
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
              >
                {isBusy
                  ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> {isEdit ? 'Güncelleniyor…' : 'Oluşturuluyor…'}</>
                  : <><svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> {isEdit ? 'Güncelle' : 'Kampanyayı Oluştur'}</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CartSimulator ─────────────────────────────────────────────────────────────

interface SimCartLine {
  id:          string;   // local uuid
  productId:   string;
  productName: string;
  variantId:   string | null;
  variantName: string;
  quantity:    number;
  unitPrice:   number;
  categoryId:  string | null;
}

interface ProductVariantOption {
  id:    string;
  name:  string;
  price: number | null;
  sku:   string | null;
}

function CartSimulator() {
  // ── picker state ───────────────────────────────────────────────────────────
  const [pickerProductId,   setPickerProductId]   = useState('');
  const [pickerProductName, setPickerProductName] = useState('');
  const [pickerVariants,    setPickerVariants]    = useState<ProductVariantOption[]>([]);
  const [pickerVariantId,   setPickerVariantId]   = useState('');
  const [pickerQty,         setPickerQty]         = useState(1);
  const [pickerPrice,       setPickerPrice]       = useState<number | ''>('');
  const [pickerLoading,     setPickerLoading]     = useState(false);
  const [pickerCategoryId,  setPickerCategoryId]  = useState<string | null>(null);
  const [pickerBasePrice,   setPickerBasePrice]   = useState<number>(0);

  // ── cart state ─────────────────────────────────────────────────────────────
  const [cart, setCart]       = useState<SimCartLine[]>([]);
  const [result, setResult]   = useState<ApplyCartResult | null>(null);
  const [applyErr, setApplyErr] = useState('');
  const [applying, setApplying] = useState(false);

  // ── load product details when selected ────────────────────────────────────
  const handleProductSelect = async (id: string, name: string) => {
    setPickerProductId(id);
    setPickerProductName(name);
    setPickerVariantId('');
    setPickerVariants([]);
    setPickerPrice('');
    setPickerCategoryId(null);
    setResult(null);

    if (!id) return;
    setPickerLoading(true);
    try {
      const res = await apiClient.get(`/products/${id}`);
      const p   = (res as any).data;

      // base price from ProductPrice or direct field
      const base = Number(p?.pricing?.salePrice ?? p?.price ?? 0);
      setPickerBasePrice(base);
      setPickerPrice(base);
      setPickerCategoryId(p?.categoryId ?? null);

      const variants: ProductVariantOption[] = (p?.variants ?? []).map((v: any) => ({
        id:    v.id,
        name:  v.displayName || v.name || buildVariantLabel(v),
        price: v.price != null ? Number(v.price) : null,
        sku:   v.sku ?? null,
      }));
      setPickerVariants(variants);
      if (variants.length === 1) {
        setPickerVariantId(variants[0].id);
        if (variants[0].price != null) setPickerPrice(variants[0].price);
      }
    } catch { /* silently keep base */ }
    finally { setPickerLoading(false); }
  };

  const handleVariantChange = (vid: string) => {
    setPickerVariantId(vid);
    const v = pickerVariants.find(x => x.id === vid);
    setPickerPrice(v?.price != null ? v.price : pickerBasePrice);
  };

  // ── add to cart ────────────────────────────────────────────────────────────
  const addToCart = () => {
    if (!pickerProductId) return;
    const price = Number(pickerPrice) || 0;
    const qty   = Math.max(1, pickerQty);

    setCart(prev => {
      // if same product+variant exists, bump quantity
      const idx = prev.findIndex(
        l => l.productId === pickerProductId && l.variantId === (pickerVariantId || null)
      );
      if (idx !== -1) {
        return prev.map((l, i) => i === idx ? { ...l, quantity: l.quantity + qty } : l);
      }
      const variantLabel = pickerVariants.find(v => v.id === pickerVariantId)?.name ?? '';
      return [
        ...prev,
        {
          id:          crypto.randomUUID(),
          productId:   pickerProductId,
          productName: pickerProductName,
          variantId:   pickerVariantId || null,
          variantName: variantLabel,
          quantity:    qty,
          unitPrice:   price,
          categoryId:  pickerCategoryId,
        },
      ];
    });

    // reset picker
    setPickerProductId('');
    setPickerProductName('');
    setPickerVariants([]);
    setPickerVariantId('');
    setPickerQty(1);
    setPickerPrice('');
    setResult(null);
    setApplyErr('');
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(l => l.id !== id));
    setResult(null);
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) { removeFromCart(id); return; }
    setCart(prev => prev.map(l => l.id === id ? { ...l, quantity: qty } : l));
    setResult(null);
  };

  // ── apply campaigns ────────────────────────────────────────────────────────
  const applyCampaigns = async () => {
    if (!cart.length) return;
    setApplyErr('');
    setApplying(true);
    try {
      const cartItems: CartItem[] = cart.map(l => ({
        productId:  l.productId,
        variantId:  l.variantId,
        quantity:   l.quantity,
        price:      l.unitPrice,
        categoryId: l.categoryId,
      }));
      const r = await campaignService.applyToCart(cartItems);
      setResult(r);
    } catch (e: any) {
      setApplyErr(e?.response?.data?.error ?? e?.message ?? 'Hata oluştu');
    } finally { setApplying(false); }
  };

  const cartTotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

      {/* LEFT — picker + cart */}
      <div className="lg:col-span-3 space-y-4">

        {/* ── Product picker ─────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">1</span>
            Ürün Ekle
          </h4>

          <ProductSearch
            label="Ürün Ara"
            value={pickerProductId}
            valueName={pickerProductName}
            placeholder="Ürün adı ile ara…"
            onSelect={handleProductSelect}
          />

          {pickerLoading && (
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Ürün detayları yükleniyor…
            </div>
          )}

          {pickerVariants.length > 1 && (
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Varyant</label>
              <select
                value={pickerVariantId}
                onChange={e => handleVariantChange(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— Varyant seçin —</option>
                {pickerVariants.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}{v.price != null ? ` — ${fmtMoney(v.price)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Birim Fiyat ₺</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pickerPrice}
                onChange={e => setPickerPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Adet</label>
              <input
                type="number"
                min="1"
                value={pickerQty}
                onChange={e => setPickerQty(Math.max(1, Number(e.target.value)))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={!pickerProductId || !pickerPrice}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
            </svg>
            Sepete Ekle
          </button>
        </div>

        {/* ── Cart lines ─────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">2</span>
              Sepet
              {cart.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">{cart.length}</span>
              )}
            </h4>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => { setCart([]); setResult(null); }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Sepeti Temizle
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-slate-400 text-sm gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-slate-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>
              </svg>
              Sepet boş. Yukarıdan ürün ekleyin.
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 font-semibold uppercase bg-slate-50">
                    <th className="text-left px-5 py-2.5">Ürün</th>
                    <th className="text-center px-3 py-2.5">Adet</th>
                    <th className="text-right px-3 py-2.5">Birim</th>
                    <th className="text-right px-5 py-2.5">Toplam</th>
                    <th className="w-8"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cart.map(line => (
                    <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-800">{line.productName}</div>
                        {line.variantName && (
                          <div className="text-xs text-slate-400">{line.variantName}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={e => updateQty(line.id, Number(e.target.value))}
                          className="w-16 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">{fmtMoney(line.unitPrice)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">
                        {fmtMoney(line.unitPrice * line.quantity)}
                      </td>
                      <td className="pr-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeFromCart(line.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-100">
                    <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-slate-600">Ara Toplam</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">{fmtMoney(cartTotal)}</td>
                    <td/>
                  </tr>
                </tfoot>
              </table>

              {applyErr && (
                <div className="mx-5 mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {applyErr}
                </div>
              )}

              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={applyCampaigns}
                  disabled={applying}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  {applying ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Hesaplanıyor…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h.5A2.5 2.5 0 0119 6.5V17a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 015 17V6.5A2.5 2.5 0 017.5 4H8V3a1 1 0 011-1h0zm-1 5a1 1 0 000 2h10a1 1 0 100-2H4zm0 4a1 1 0 000 2h7a1 1 0 100-2H4z" clipRule="evenodd"/>
                      </svg>
                      Kampanyaları Uygula
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT — results */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-6">
          <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">3</span>
            Sonuç
          </h4>

          {!result && !applying && (
            <div className="flex flex-col items-center py-8 text-slate-400 text-sm gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-slate-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
              </svg>
              Sepete ürün ekleyip "Kampanyaları Uygula" butonuna basın.
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Price summary */}
              <div className={`rounded-xl p-4 space-y-2 ${result.savings > 0 ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Orijinal Tutar</span>
                  <span className="font-medium text-slate-700">{fmtMoney(result.originalTotal)}</span>
                </div>
                {result.savings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">Kampanya İndirimi</span>
                    <span className="font-bold text-green-700">- {fmtMoney(result.savings)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-current/10">
                  <span className="font-semibold text-slate-800">Final Fiyat</span>
                  <span className={`text-xl font-extrabold ${result.savings > 0 ? 'text-green-700' : 'text-slate-800'}`}>
                    {fmtMoney(result.finalPrice)}
                  </span>
                </div>
                {result.savings > 0 && (
                  <div className="text-xs text-green-600 text-right">
                    %{((result.savings / result.originalTotal) * 100).toFixed(1)} tasarruf
                  </div>
                )}
              </div>

              {/* Applied campaigns */}
              {result.discounts.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Uygulanan Kampanyalar</p>
                  <div className="space-y-2">
                    {result.discounts.map(d => {
                      const meta = RULE_TYPE_META[d.ruleType];
                      return (
                        <div key={d.ruleId} className={`flex items-start gap-3 rounded-xl border p-3 ${meta?.ring?.replace('ring-2 ring-', 'border-').replace(' ring-offset-1', '') || 'border-slate-200'} bg-white`}>
                          {meta && (
                            <div className={`w-7 h-7 rounded-lg ${meta.iconBg} ${meta.iconFg} flex items-center justify-center flex-shrink-0`}>
                              {meta.icon}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-800">{d.campaignName}</div>
                            <div className="text-xs text-slate-400 truncate">{d.description}</div>
                          </div>
                          <span className="text-green-700 font-bold text-sm flex-shrink-0 ml-2">
                            - {fmtMoney(d.discountAmount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400 text-center py-3 bg-slate-50 rounded-xl">
                  Bu sepete uygulanacak aktif kampanya bulunamadı.
                </div>
              )}

              {/* Item breakdown */}
              {result.itemBreakdown.some(b => b.unitDiscount > 0) && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ürün Bazlı İndirim</p>
                  <div className="space-y-1">
                    {result.itemBreakdown.filter(b => b.unitDiscount > 0).map((b, i) => {
                      const cartLine = cart.find(l => l.productId === b.productId && l.variantId === b.variantId);
                      return (
                        <div key={i} className="flex justify-between items-center text-xs px-3 py-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-600 truncate">{cartLine?.productName ?? b.productId}</span>
                          <span className="text-green-600 font-semibold ml-2 flex-shrink-0">
                            - {fmtMoney(b.unitDiscount)} / adet
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CampaignCard ──────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onEdit }: { campaign: Campaign; onEdit: (c: Campaign) => void }) {
  const toggle     = useToggleCampaign();
  const deleteMut  = useDeleteCampaign();
  const deleteRule = useDeleteRule();
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
      {showRuleBuilder && <RuleBuilder campaignId={campaign.id} onClose={() => setShowRuleBuilder(false)} />}

      {/* Campaign header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
              <StatusBadge c={campaign} />
            </div>
            {campaign.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{campaign.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>{fmtDate(campaign.startDate)} — {fmtDate(campaign.endDate)}</span>
              <span>Öncelik: {campaign.priority}</span>
              <span>{campaign.rules.length} kural</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(campaign)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg font-medium flex items-center gap-1"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
              </svg>
              Düzenle
            </button>
            <button
              onClick={() => setShowRuleBuilder(true)}
              className="px-2.5 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium"
            >+ Kural</button>
            <button
              onClick={() => toggle.mutate(campaign.id)}
              className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                campaign.isActive
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-green-50 hover:bg-green-100 text-green-700'
              }`}
            >{campaign.isActive ? 'Durdur' : 'Aktif Et'}</button>
            <button
              onClick={() => { if (confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) deleteMut.mutate(campaign.id); }}
              className="px-2.5 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium"
            >Sil</button>
          </div>
        </div>

        {/* Rules list */}
        {campaign.rules.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(p => !p)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              {expanded ? '▲' : '▼'} {campaign.rules.length} kural {expanded ? 'gizle' : 'göster'}
            </button>

            {expanded && (
              <div className="mt-2 space-y-2">
                {campaign.rules.map(rule => (
                  <div key={rule.id} className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2.5 gap-3">
                    <div className="flex-1 min-w-0">
                      <RuleBadge type={rule.type} />
                      <p className="text-xs text-gray-600 mt-1">{ruleDescription(rule)}</p>
                    </div>
                    <button
                      onClick={() => deleteRule.mutate({ campaignId: campaign.id, ruleId: rule.id })}
                      className="text-xs text-red-400 hover:text-red-600 shrink-0"
                    >Sil</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-gray-800', sub }: { label: string; value: React.ReactNode; color?: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const Campaigns: React.FC = () => {
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [showCreate,    setShowCreate]    = useState(false);
  const [editCampaign,  setEditCampaign]  = useState<Campaign | null>(null);
  const [tab,           setTab]           = useState<'list' | 'tester'>('list');

  const query = useMemo(() => ({
    page,
    limit: 20,
    ...(search       && { search }),
    ...(activeFilter && { active: activeFilter }),
  }), [page, search, activeFilter]);

  const { data, isLoading } = useCampaigns(query);
  const { data: stats }     = useCampaignStats();
  const campaigns           = data?.campaigns ?? [];
  const totalPages          = data?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {showCreate   && <CreateCampaignModal onClose={() => setShowCreate(false)} />}
      {editCampaign && <CreateCampaignModal onClose={() => setEditCampaign(null)} editCampaign={editCampaign} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kampanyalar</h1>
            <p className="text-sm text-gray-500 mt-0.5">İndirim kampanyaları oluşturun ve yönetin</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Kampanya Oluştur
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 border-b border-gray-200 -mb-px">
          {([['list', 'Kampanya Listesi'], ['tester', 'Sepet Testi']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Toplam"     value={stats.total}     />
            <StatCard label="Aktif"      value={stats.active}     color="text-green-600" />
            <StatCard label="Planlandı"  value={stats.scheduled}  color="text-amber-600" />
            <StatCard label="Sona Erdi"  value={stats.expired}    color="text-gray-400" />
          </div>
        )}

        {tab === 'list' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Kampanya ara…"
                className="flex-1 min-w-48 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
              <select
                value={activeFilter}
                onChange={e => { setActiveFilter(e.target.value as any); setPage(1); }}
                className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Tümü</option>
                <option value="true">Aktifler</option>
                <option value="false">Pasifler</option>
              </select>
            </div>

            {/* Rule type legend */}
            <div className="flex flex-wrap gap-2">
              {(Object.entries(RULE_TYPE_META) as [CampaignRuleType, RuleTypeMeta][]).map(([, v]) => (
                <span key={v.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${v.color} border border-current/10`}>
                  <span className={`flex-shrink-0 ${v.iconFg}`}>{v.icon}</span>
                  {v.label}
                </span>
              ))}
            </div>

            {/* Campaign list */}
            {isLoading ? (
              <div className="text-center py-12 text-gray-400">Yükleniyor…</div>
            ) : campaigns.length === 0 ? (
              <EmptyState
                icon="🎯"
                title="Henüz kampanya yok"
                description="İlk kampanyanızı oluşturun, ardından kurallar ekleyerek esnek indirim sistemi kurun."
                actionLabel="Kampanya Oluştur"
                onAction={() => setShowCreate(true)}
              />
            ) : (
              <div className="space-y-3">
                {campaigns.map(c => <CampaignCard key={c.id} campaign={c} onEdit={setEditCampaign} />)}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40">← Önceki</button>
                <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40">Sonraki →</button>
              </div>
            )}

            {/* Info card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <h4 className="font-semibold text-slate-700 mb-4">İndirim Türleri Hakkında</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(Object.entries(RULE_TYPE_META) as [CampaignRuleType, RuleTypeMeta][]).map(([, meta]) => (
                  <div key={meta.label} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-slate-100">
                    <div className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl ${meta.iconBg} ${meta.iconFg}`}>
                      {meta.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'tester' && (
          <CartSimulator />
        )}
      </div>
    </div>
  );
};

export default Campaigns;
