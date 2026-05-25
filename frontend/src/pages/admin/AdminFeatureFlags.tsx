import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search, RefreshCw, Loader2, AlertCircle, RotateCcw,
  ChevronDown, Crown, Zap, Rocket, CheckCheck, XSquare,
  ShieldAlert, Info,
} from 'lucide-react';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';
import { getMinPlanForFeature } from '../../context/FeatureContext';
import type { FeatureKey } from '../../context/FeatureContext';

// ── DEFAULT_FEATURES local copy for bulk plan calculations ────────────────────
const DEFAULT_FEATURES = [
  { key: 'campaigns'          as FeatureKey },
  { key: 'coupons'            as FeatureKey },
  { key: 'bulk_import'        as FeatureKey },
  { key: 'seo_tools'          as FeatureKey },
  { key: 'blog'               as FeatureKey },
  { key: 'export_reports'     as FeatureKey },
  { key: 'order'              as FeatureKey },
  { key: 'customer'           as FeatureKey },
  { key: 'stock_management'   as FeatureKey },
  { key: 'campaign_advanced'  as FeatureKey },
  { key: 'discount_rules'     as FeatureKey },
  { key: 'abandoned_cart'     as FeatureKey },
  { key: 'advanced_analytics' as FeatureKey },
  { key: 'multi_currency'     as FeatureKey },
  { key: 'trendyol'           as FeatureKey },
  { key: 'marketplace'        as FeatureKey },
  { key: 'api_access'         as FeatureKey },
  { key: 'webhooks'           as FeatureKey },
  { key: 'b2b'                as FeatureKey },
  { key: 'pages_builder'      as FeatureKey },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeatureRow {
  id:          string;
  key:         string;
  name:        string;
  description: string;
  category:    string;
  defaultOn:   boolean;
  enabled:     boolean;
  overridden:  boolean;
}

interface TenantOption {
  id: string; name: string; slug: string; status: string;
  subscriptions: Array<{ plan: string; status: string; endDate: string }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  commerce:    '🛒 Ticaret',
  integration: '🔗 Entegrasyonlar',
  storefront:  '🏪 Vitrin',
  analytics:   '📊 Analitik',
  operations:  '⚙️ Operasyon',
  general:     '🌐 Genel',
};

const PLAN_META = {
  STARTER:    { label: 'Starter',    color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-700/40',   icon: Rocket },
  PRO:        { label: 'Pro',        color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/40', icon: Zap },
  ENTERPRISE: { label: 'Enterprise', color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-700/40',  icon: Crown },
} as const;

// ── Toggle Switch Component ───────────────────────────────────────────────────

const Toggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}> = ({ checked, onChange, loading, disabled, size = 'md' }) => {
  const track = size === 'sm'
    ? 'w-9 h-5'
    : 'w-12 h-6';
  const thumb = size === 'sm'
    ? 'w-3.5 h-3.5 top-[3px]'
    : 'w-4.5 h-4.5 top-[3px]';
  const translate = size === 'sm'
    ? (checked ? 'translate-x-[18px]' : 'translate-x-[3px]')
    : (checked ? 'translate-x-[24px]' : 'translate-x-[3px]');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={loading || disabled}
      className={`
        relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${track}
        ${checked ? 'bg-indigo-500' : 'bg-gray-700'}
      `}
    >
      <span
        className={`
          inline-block rounded-full bg-white shadow-md
          pointer-events-none transition-transform duration-200 ease-in-out
          ${thumb} ${translate}
          ${loading ? 'animate-pulse' : ''}
        `}
        style={{ width: size === 'sm' ? 14 : 18, height: size === 'sm' ? 14 : 18, top: 3, position: 'absolute' }}
      />
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-3 h-3 animate-spin text-white/70" />
        </span>
      )}
    </button>
  );
};

// ── Plan Badge ────────────────────────────────────────────────────────────────

const PlanBadge: React.FC<{ plan: 'STARTER' | 'PRO' | 'ENTERPRISE' }> = ({ plan }) => {
  const m = PLAN_META[plan];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${m.bg} ${m.color}`}>
      <m.icon className="w-2.5 h-2.5" />
      {m.label}
    </span>
  );
};

// ── Tenant Search Dropdown ────────────────────────────────────────────────────

const TenantPicker: React.FC<{
  selected: TenantOption | null;
  onSelect: (t: TenantOption) => void;
}> = ({ selected, onSelect }) => {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<TenantOption[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const ref                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res: any = await api.get(`/admin/tenants?search=${encodeURIComponent(query)}&limit=8`);
        const data = res?.data?.data ?? res?.data ?? {};
        setResults(data.tenants ?? data ?? []);
        setOpen(true);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const STATUS_DOT: Record<string, string> = {
    ACTIVE:    'bg-green-400',
    TRIAL:     'bg-blue-400',
    PAST_DUE:  'bg-amber-400',
    SUSPENDED: 'bg-red-400',
    CANCELED:  'bg-gray-500',
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 focus-within:border-indigo-500 transition-colors">
        <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <input
          value={selected && !open ? selected.name : query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (selected) { setQuery(''); } setOpen(true); }}
          placeholder="Tenant ara..."
          className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
        />
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        ) : (
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          {results.map(t => {
            const sub  = t.subscriptions?.[0];
            const plan = sub?.plan ?? '—';
            return (
              <button
                key={t.id}
                onClick={() => { onSelect(t); setQuery(''); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 text-left transition-colors"
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[t.status] ?? 'bg-gray-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium truncate">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.slug}</p>
                </div>
                {sub && <PlanBadge plan={plan as any} />}
              </button>
            );
          })}
        </div>
      )}

      {open && query.length > 1 && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-gray-500 text-center">
          Tenant bulunamadı.
        </div>
      )}
    </div>
  );
};

// ── Feature Row ───────────────────────────────────────────────────────────────

const FeatureItem: React.FC<{
  row: FeatureRow;
  saving: boolean;
  tenantPlan: string;
  onToggle: () => void;
}> = ({ row, saving, tenantPlan, onToggle }) => {
  const minPlan    = getMinPlanForFeature(row.key as any) ?? 'STARTER';
  const planOrder  = ['STARTER', 'PRO', 'ENTERPRISE'];
  const needsHigher = planOrder.indexOf(minPlan) > planOrder.indexOf(tenantPlan);

  return (
    <div className={`flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition-colors ${!row.enabled ? 'opacity-60' : ''}`}>
      <div className="min-w-0 flex-1 mr-4">
        <div className="flex items-center flex-wrap gap-2 mb-0.5">
          <span className="font-medium text-white text-sm">{row.name}</span>

          {/* Plan requirement badge */}
          <PlanBadge plan={minPlan as any} />

          {/* State badges */}
          {row.overridden && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-700/40 px-1.5 py-0.5 rounded font-mono">
              override
            </span>
          )}
          {!row.overridden && row.defaultOn && (
            <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded font-mono">
              default on
            </span>
          )}
          {needsHigher && !row.overridden && (
            <span className="text-[10px] bg-red-900/20 text-red-400 border border-red-800/40 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <ShieldAlert className="w-2.5 h-2.5" />
              plan dışı
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{row.description}</p>
        <span className="text-[10px] font-mono text-gray-600 mt-0.5 block">{row.key}</span>
      </div>

      <Toggle
        checked={row.enabled}
        onChange={onToggle}
        loading={saving}
        size="md"
      />
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const AdminFeatureFlags: React.FC = () => {
  const [selectedTenant, setSelectedTenant] = useState<TenantOption | null>(null);
  const [features, setFeatures]             = useState<FeatureRow[]>([]);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState<Record<string, boolean>>({});
  const [error, setError]                   = useState<string | null>(null);
  const [search, setSearch]                 = useState('');
  const [activeCat, setActiveCat]           = useState<string>('all');

  const tenantPlan = selectedTenant?.subscriptions?.[0]?.plan ?? 'STARTER';

  const fetchMatrix = useCallback(async (tenantId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.get(`/features/matrix/${tenantId}`);
      setFeatures(res?.data?.data || res?.data || []);
    } catch (e: any) {
      setError(e?.message || 'Feature listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTenant) fetchMatrix(selectedTenant.id);
    else setFeatures([]);
  }, [selectedTenant, fetchMatrix]);

  const handleToggle = async (row: FeatureRow) => {
    if (!selectedTenant) return;
    setSaving(s => ({ ...s, [row.key]: true }));
    try {
      await api.post('/features/toggle', {
        tenantId:   selectedTenant.id,
        featureKey: row.key,
        enabled:    !row.enabled,
      });
      setFeatures(prev =>
        prev.map(f => f.key === row.key ? { ...f, enabled: !f.enabled, overridden: true } : f),
      );
      toast.success(`"${row.name}" ${!row.enabled ? 'aktifleştirildi' : 'devre dışı bırakıldı'}.`);
    } catch (e: any) {
      toast.error(e?.message || 'Toggle başarısız.');
    } finally {
      setSaving(s => ({ ...s, [row.key]: false }));
    }
  };

  const handleReset = async () => {
    if (!selectedTenant) return;
    if (!confirm(`"${selectedTenant.name}" için tüm override'lar silinecek. Plan bazlı defaults geri yüklenecek. Devam?`)) return;
    setSaving(s => ({ ...s, __reset__: true }));
    try {
      await api.post('/features/reset', { tenantId: selectedTenant.id });
      await fetchMatrix(selectedTenant.id);
      toast.success('Feature\'lar varsayılanlara sıfırlandı.');
    } catch (e: any) {
      toast.error(e?.message || 'Sıfırlama başarısız.');
    } finally {
      setSaving(s => ({ ...s, __reset__: false }));
    }
  };

  /** Enable all features that belong to a given plan tier and below */
  const handleBulkPlan = async (plan: 'STARTER' | 'PRO' | 'ENTERPRISE') => {
    if (!selectedTenant) return;
    const planOrder = ['STARTER', 'PRO', 'ENTERPRISE'];
    const planKeys  = DEFAULT_FEATURES
      .filter(f => planOrder.indexOf(getMinPlanForFeature(f.key as any)) <= planOrder.indexOf(plan))
      .map(f => f.key);

    const overrides: Record<string, boolean> = {};
    planKeys.forEach(k => { overrides[k] = true; });

    setSaving(s => ({ ...s, __bulk__: true }));
    try {
      await api.post('/features/bulk', { tenantId: selectedTenant.id, overrides });
      await fetchMatrix(selectedTenant.id);
      toast.success(`${plan} plan özellikleri toplu aktifleştirildi.`);
    } catch (e: any) {
      toast.error(e?.message || 'Toplu güncelleme başarısız.');
    } finally {
      setSaving(s => ({ ...s, __bulk__: false }));
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

  const filtered = features.filter(f => {
    const matchSearch = !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCat === 'all' || f.category === activeCat;
    return matchSearch && matchCat;
  });

  const grouped = filtered.reduce<Record<string, FeatureRow[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  const categories = ['all', ...Array.from(new Set(features.map(f => f.category)))];

  const enabledCount  = features.filter(f => f.enabled).length;
  const overrideCount = features.filter(f => f.overridden).length;
  const anyBusy       = saving.__bulk__ || saving.__reset__;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Feature Toggle</h1>
          <p className="text-gray-400 text-sm mt-0.5">Tenant bazlı özellik yönetimi — plan override dahil</p>
        </div>
      </div>

      {/* Tenant Picker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Tenant Seç</label>
          <TenantPicker selected={selectedTenant} onSelect={setSelectedTenant} />
        </div>

        {/* Selected tenant info card */}
        {selectedTenant && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm">{selectedTenant.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">{selectedTenant.slug}</p>
              <div className="flex items-center gap-2 mt-2">
                <PlanBadge plan={tenantPlan as any} />
                <span className="text-xs text-gray-500">
                  {enabledCount}/{features.length} özellik aktif
                </span>
                {overrideCount > 0 && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-700/40 px-1.5 py-0.5 rounded">
                    {overrideCount} override
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => fetchMatrix(selectedTenant.id)}
                disabled={loading}
                className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                title="Yenile"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleReset}
                disabled={anyBusy || saving.__reset__}
                className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-amber-400 hover:text-amber-300 transition-colors"
                title="Tüm override'ları sıfırla"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/40 text-red-400 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!selectedTenant && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
          <Search className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Bir tenant seçerek feature'larını yönetin.</p>
        </div>
      )}

      {selectedTenant && loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      )}

      {selectedTenant && !loading && features.length > 0 && (
        <>
          {/* Bulk plan buttons */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Hızlı toplu aktivasyon — seçilen plandaki tüm özellikler açılır (override olarak kayıt edilir)
            </p>
            <div className="flex flex-wrap gap-2">
              {(['STARTER', 'PRO', 'ENTERPRISE'] as const).map(plan => {
                const m = PLAN_META[plan];
                return (
                  <button
                    key={plan}
                    onClick={() => handleBulkPlan(plan)}
                    disabled={anyBusy}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${m.bg} ${m.color} hover:opacity-90`}
                  >
                    <m.icon className="w-4 h-4" />
                    {m.label} özelliklerini aç
                    {tenantPlan === plan && (
                      <span className="text-[10px] bg-white/10 px-1 py-0.5 rounded">mevcut plan</span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  if (!selectedTenant) return;
                  const overrides: Record<string, boolean> = {};
                  features.forEach(f => { overrides[f.key] = false; });
                  api.post('/features/bulk', { tenantId: selectedTenant.id, overrides })
                    .then(() => fetchMatrix(selectedTenant.id))
                    .then(() => toast.success('Tüm özellikler kapatıldı.'))
                    .catch((e: any) => toast.error(e?.message || 'Hata.'));
                }}
                disabled={anyBusy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 bg-gray-800 text-gray-400 hover:text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <XSquare className="w-4 h-4" />
                Tümünü kapat
              </button>
            </div>
          </div>

          {/* Search + category filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Feature ara..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeCat === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'Tümü' : (CATEGORY_LABELS[cat]?.replace(/^[^\s]+\s/, '') ?? cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Feature groups */}
          {Object.entries(grouped).length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
              Arama ile eşleşen feature bulunamadı.
            </div>
          ) : (
            Object.entries(grouped).map(([category, rows]) => (
              <div key={category} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {/* Category header */}
                <div className="px-5 py-3 bg-gray-800/60 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-300">
                    {CATEGORY_LABELS[category] ?? category}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {rows.filter(r => r.enabled).length}/{rows.length} aktif
                    </span>
                    {/* Category bulk toggles */}
                    <button
                      onClick={async () => {
                        if (!selectedTenant) return;
                        const overrides: Record<string, boolean> = {};
                        rows.forEach(r => { overrides[r.key] = true; });
                        await api.post('/features/bulk', { tenantId: selectedTenant.id, overrides });
                        setFeatures(prev => prev.map(f =>
                          rows.find(r => r.key === f.key) ? { ...f, enabled: true, overridden: true } : f,
                        ));
                        toast.success('Kategori özellikleri açıldı.');
                      }}
                      className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
                      title="Tümünü aç"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Tümünü aç
                    </button>
                    <button
                      onClick={async () => {
                        if (!selectedTenant) return;
                        const overrides: Record<string, boolean> = {};
                        rows.forEach(r => { overrides[r.key] = false; });
                        await api.post('/features/bulk', { tenantId: selectedTenant.id, overrides });
                        setFeatures(prev => prev.map(f =>
                          rows.find(r => r.key === f.key) ? { ...f, enabled: false, overridden: true } : f,
                        ));
                        toast.success('Kategori özellikleri kapatıldı.');
                      }}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                      title="Tümünü kapat"
                    >
                      <XSquare className="w-3.5 h-3.5" />
                      Tümünü kapat
                    </button>
                  </div>
                </div>

                {/* Feature rows */}
                <div className="divide-y divide-gray-800/50">
                  {rows.map(row => (
                    <FeatureItem
                      key={row.key}
                      row={row}
                      saving={!!saving[row.key]}
                      tenantPlan={tenantPlan}
                      onToggle={() => handleToggle(row)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
};

export default AdminFeatureFlags;
