/**
 * ProductTrendyolSettingsModal
 *
 * Her ürün için Trendyol override ayarları:
 *   - Trendyol kategori seçimi + dinamik özellikler
 *   - Trendyol marka seçimi
 *   - Fiyat stratejisi (yok / % arttır / sabit)
 *   - Kargo şirketi ve teslimat süresi
 *   - Canlı fiyat önizlemesi
 *
 * isOverride=false ise toplu entegrasyon ayarları devreye girer.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendyolCategory {
  id: string;
  name: string;
  path: string;
}

interface TrendyolAttributeValue {
  id:   number | string;
  name: string;
}

interface TrendyolAttribute {
  id:              string;
  name:            string;
  required:        boolean;
  varianter?:      boolean;
  allowCustom?:    boolean;
  attributeValues: TrendyolAttributeValue[];
}

interface TrendyolBrand {
  id:   number;
  name: string;
}

interface Settings {
  trendyolCategoryId: string;
  trendyolBrandId:    number | null;
  attributes:         Record<string, any>;
  priceType:          'none' | 'percentage' | 'fixed';
  priceValue:         number;
  cargoCompanyId:     number | null;
  deliveryDuration:   number | null;
  vatRate:            number;
  isOverride:         boolean;
}

const DEFAULT: Settings = {
  trendyolCategoryId: '',
  trendyolBrandId:    null,
  attributes:         {},
  priceType:          'none',
  priceValue:         0,
  cargoCompanyId:     null,
  deliveryDuration:   null,
  vatRate:            18,
  isOverride:         true,
};

const CARGO_COMPANIES = [
  { id: 17,  name: 'Yurtiçi Kargo'  },
  { id: 10,  name: 'MNG Kargo'      },
  { id: 4,   name: 'Sürat Kargo'    },
  { id: 7,   name: 'PTT Kargo'      },
  { id: 681, name: 'Aras Kargo'     },
  { id: 699, name: 'Horoz Lojistik' },
];

function toAttributeFieldValue(value: unknown): string | number {
  if (typeof value === 'string' || typeof value === 'number') return value;
  return '';
}

function AttributeField({
  attr,
  value,
  onChange,
}: {
  attr:     TrendyolAttribute;
  value:    string | number;
  onChange: (v: string | number) => void;
}) {
  const hasValues = (attr.attributeValues?.length ?? 0) > 0;
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-600 mb-1">
        {attr.name}
        {attr.required && <span className="text-red-500 ml-0.5">*</span>}
        {attr.varianter && (
          <span className="ml-1 text-[10px] text-indigo-500 font-semibold">Varyant</span>
        )}
      </label>
      {hasValues ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-400 bg-white"
        >
          <option value="">— Seç —</option>
          {attr.attributeValues.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Serbest değer"
          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-400"
        />
      )}
    </div>
  );
}

function AttributeFieldsSection({
  title,
  subtitle,
  tone,
  attrs,
  attributes,
  setAttrValue,
  defaultOpen = true,
}: {
  title:         string;
  subtitle:      string;
  tone:          'required' | 'optional';
  attrs:         TrendyolAttribute[];
  attributes:    Record<string, unknown>;
  setAttrValue:  (id: string, v: string | number) => void;
  defaultOpen?:  boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (attrs.length === 0) return null;

  const border =
    tone === 'required'
      ? 'border-amber-200 bg-amber-50/50'
      : 'border-slate-200 bg-slate-50/60';

  return (
    <div className={`rounded-xl border ${border} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/60 transition-colors"
      >
        <div>
          <p className="text-xs font-bold text-slate-800">{title}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <span className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            tone === 'required' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {attrs.length}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-inherit">
          {attrs.map(attr => (
            <AttributeField
              key={attr.id}
              attr={attr}
              value={toAttributeFieldValue(attributes[attr.id])}
              onChange={v => setAttrValue(String(attr.id), v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  productId:    string;
  productName:  string;
  productPrice: number;
  isOpen:       boolean;
  onClose:      () => void;
  onSaved?:     () => void;
}

export default function ProductTrendyolSettingsModal({
  productId, productName, productPrice, isOpen, onClose, onSaved,
}: Props) {
  const [form,        setForm]       = useState<Settings>(DEFAULT);
  const [loading,     setLoading]    = useState(false);
  const [saving,      setSaving]     = useState(false);
  const [deleting,    setDeleting]   = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  // Category search
  const [categories,    setCategories]    = useState<TrendyolCategory[]>([]);
  const [catSearch,     setCatSearch]     = useState('');
  const [catDropOpen,   setCatDropOpen]   = useState(false);
  const [catLoading,    setCatLoading]    = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  // Attributes
  const [attributes, setAttributes] = useState<TrendyolAttribute[]>([]);
  const [attrLoading, setAttrLoading] = useState(false);

  // Brands
  const [brands,      setBrands]     = useState<TrendyolBrand[]>([]);
  const [brandSearch, setBrandSearch] = useState('');
  const [brandLoading, setBrandLoading] = useState(false);

  // ── Load existing settings ─────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res  = await apiClient.get(`/trendyol/product-settings/${productId}`);
      const d    = res.data?.data ?? res.data;
      const s    = d?.settings;
      if (s) {
        setHasExisting(true);
        setForm({
          trendyolCategoryId: s.trendyolCategoryId ?? '',
          trendyolBrandId:    s.trendyolBrandId    ?? null,
          attributes:         (s.attributes as Record<string, any>) ?? {},
          priceType:          (s.priceType as Settings['priceType']) ?? 'none',
          priceValue:         Number(s.priceValue ?? 0),
          cargoCompanyId:     s.cargoCompanyId    ?? null,
          deliveryDuration:   s.deliveryDuration  ?? null,
          vatRate:            s.vatRate            ?? 18,
          isOverride:         s.isOverride         ?? true,
        });
        // If category saved, load its attributes
        if (s.trendyolCategoryId) {
          fetchAttributes(s.trendyolCategoryId);
        }
      } else {
        setHasExisting(false);
        setForm(DEFAULT);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [isOpen, productId]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // ── Close on Escape ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ── Categories ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || categories.length > 0) return;
    setCatLoading(true);
    apiClient.get('/trendyol/trendyol-categories')
      .then(r => {
        const list = r.data?.data ?? r.data ?? [];
        setCategories(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setCatLoading(false));
  }, [isOpen]);

  const filteredCats = catSearch.length < 2
    ? []
    : categories.filter(c =>
        c.path.toLowerCase().includes(catSearch.toLowerCase()) ||
        c.name.toLowerCase().includes(catSearch.toLowerCase())
      ).slice(0, 40);

  const { requiredAttrs, optionalAttrs } = useMemo(() => ({
    requiredAttrs: attributes.filter(a => a.required),
    optionalAttrs: attributes.filter(a => !a.required),
  }), [attributes]);

  const missingRequiredCount = useMemo(
    () => requiredAttrs.filter(a => {
      const v = form.attributes[a.id];
      return v === '' || v == null;
    }).length,
    [requiredAttrs, form.attributes],
  );

  // ── Attributes ────────────────────────────────────────────────────────────
  const fetchAttributes = useCallback(async (catId: string) => {
    if (!catId) { setAttributes([]); return; }
    setAttrLoading(true);
    try {
      const res = await apiClient.get(`/trendyol/trendyol-categories/${catId}/attributes`);
      const list = res.data?.data ?? res.data ?? [];
      setAttributes(Array.isArray(list) ? list : []);
    } catch { setAttributes([]); }
    finally { setAttrLoading(false); }
  }, []);

  // ── Brands ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || brands.length > 0) return;
    setBrandLoading(true);
    apiClient.get('/trendyol/trendyol-brands')
      .then(r => {
        const list = r.data?.data ?? r.data ?? [];
        setBrands(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setBrandLoading(false));
  }, [isOpen]);

  const filteredBrands = brandSearch.length > 0
    ? brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())).slice(0, 50)
    : brands.slice(0, 50);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const setAttrValue = (attrId: string, value: any) =>
    setForm(f => ({ ...f, attributes: { ...f.attributes, [attrId]: value } }));

  // ── Live price preview ────────────────────────────────────────────────────
  const previewPrice = (() => {
    const base = productPrice;
    if (form.priceType === 'percentage') return base + base * (form.priceValue / 100);
    if (form.priceType === 'fixed')      return form.priceValue;
    return base;
  })();

  const fmtTRY = (n: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post('/trendyol/product-settings', { productId, ...form });
      toast.success('Trendyol ayarları kaydedildi.');
      setHasExisting(true);
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm('Override ayarları silinsin mi? Toplu entegrasyon ayarları geçerli olacak.')) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/trendyol/product-settings/${productId}`);
      toast.success('Ayarlar sıfırlandı.');
      setHasExisting(false);
      setForm(DEFAULT);
      setAttributes([]);
      onSaved?.();
    } catch { toast.error('Silinemedi.'); }
    finally { setDeleting(false); }
  };

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose}/>

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg">🔗</span>
              <h2 className="text-base font-bold text-slate-900">Trendyol Ürün Ayarları</h2>
              {hasExisting && (
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">Override aktif</span>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate max-w-sm">{productName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Override toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50 border border-orange-200">
              <div>
                <p className="text-sm font-semibold text-orange-900">Bu ürüne özel ayarları aktif et</p>
                <p className="text-xs text-orange-600 mt-0.5">Kapalıysa toplu entegrasyon ayarları kullanılır.</p>
              </div>
              <button
                onClick={() => set('isOverride', !form.isOverride)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  form.isOverride ? 'bg-orange-500' : 'bg-slate-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  form.isOverride ? 'translate-x-5' : ''
                }`}/>
              </button>
            </div>

            <div className={`space-y-6 transition-opacity ${form.isOverride ? '' : 'opacity-40 pointer-events-none'}`}>

              {/* ── Category ─────────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Trendyol Kategorisi
                </label>

                {form.trendyolCategoryId && (
                  <div className="flex items-center gap-2 mb-2 p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-xs">
                    <span className="flex-1 font-medium text-orange-800 truncate">
                      {categories.find(c => c.id === form.trendyolCategoryId)?.path ?? `ID: ${form.trendyolCategoryId}`}
                    </span>
                    <button onClick={() => {
                      set('trendyolCategoryId', '');
                      setAttributes([]);
                      setForm(f => ({ ...f, attributes: {} }));
                    }} className="text-orange-400 hover:text-orange-600 flex-shrink-0">✕</button>
                  </div>
                )}

                <div className="relative" ref={catRef}>
                  <input
                    type="text"
                    placeholder={catLoading ? 'Kategoriler yükleniyor...' : 'Kategori ara (en az 2 karakter)…'}
                    value={catSearch}
                    onChange={e => { setCatSearch(e.target.value); setCatDropOpen(true); }}
                    onFocus={() => setCatDropOpen(true)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                  {catDropOpen && filteredCats.length > 0 && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                      {filteredCats.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            set('trendyolCategoryId', c.id);
                            setCatSearch('');
                            setCatDropOpen(false);
                            setForm(f => ({ ...f, attributes: {} }));
                            fetchAttributes(c.id);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <span className="font-medium text-slate-800">{c.name}</span>
                          <span className="text-slate-400 ml-1">· {c.path}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {catDropOpen && catSearch.length >= 2 && filteredCats.length === 0 && !catLoading && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs text-slate-400">
                      Sonuç bulunamadı
                    </div>
                  )}
                </div>
              </div>

              {/* ── Dynamic Attributes ───────────────────────────────────── */}
              {form.trendyolCategoryId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Kategori Özellikleri
                    {attrLoading && <span className="ml-2 text-slate-400">(yükleniyor...)</span>}
                  </label>
                  {attributes.length === 0 && !attrLoading ? (
                    <p className="text-xs text-slate-400">Bu kategoride özellik tanımlı değil.</p>
                  ) : (
                    <div className="space-y-3">
                      {missingRequiredCount > 0 && (
                        <p className="text-xs text-amber-800 bg-amber-100 border border-amber-200 rounded-lg px-3 py-2">
                          {missingRequiredCount} zorunlu alan henüz doldurulmadı.
                        </p>
                      )}
                      <AttributeFieldsSection
                        title="Zorunlu alanlar"
                        subtitle="Trendyol’a gönderim için doldurulması gerekir"
                        tone="required"
                        attrs={requiredAttrs}
                        attributes={form.attributes}
                        setAttrValue={setAttrValue}
                        defaultOpen
                      />
                      <AttributeFieldsSection
                        title="Opsiyonel alanlar"
                        subtitle="İsteğe bağlı — ürünü zenginleştirir"
                        tone="optional"
                        attrs={optionalAttrs}
                        attributes={form.attributes}
                        setAttrValue={setAttrValue}
                        defaultOpen={optionalAttrs.length <= 8}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── Brand ────────────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trendyol Markası</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={brandLoading ? 'Markalar yükleniyor...' : 'Marka ara…'}
                    value={brandSearch}
                    onChange={e => setBrandSearch(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                  {form.trendyolBrandId && (
                    <button
                      onClick={() => { set('trendyolBrandId', null); setBrandSearch(''); }}
                      className="px-3 py-2 text-xs text-red-500 border border-red-200 rounded-xl hover:bg-red-50"
                    >
                      Temizle
                    </button>
                  )}
                </div>
                {form.trendyolBrandId && (
                  <p className="text-xs text-orange-700 mt-1 font-medium">
                    ✓ {brands.find(b => b.id === form.trendyolBrandId)?.name ?? `ID: ${form.trendyolBrandId}`}
                  </p>
                )}
                {brandSearch.length > 0 && (
                  <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                    {filteredBrands.length === 0 ? (
                      <p className="p-3 text-xs text-slate-400">Sonuç yok</p>
                    ) : filteredBrands.map(b => (
                      <button
                        key={b.id}
                        onClick={() => { set('trendyolBrandId', b.id); setBrandSearch(''); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-orange-50 transition-colors border-b border-slate-50 last:border-0 ${
                          form.trendyolBrandId === b.id ? 'text-orange-700 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Price Strategy ───────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Fiyat Stratejisi</label>
                <div className="flex gap-2 mb-3">
                  {([
                    { val: 'none',       label: 'Ürün fiyatı' },
                    { val: 'percentage', label: '% Arttır'    },
                    { val: 'fixed',      label: 'Sabit fiyat' },
                  ] as const).map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => set('priceType', opt.val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        form.priceType === opt.val
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {form.priceType !== 'none' && (
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.priceValue === 0 ? '' : String(form.priceValue)}
                        onChange={e => {
                          const v = e.target.value.replace(',', '.');
                          if (v === '' || /^\d*\.?\d*$/.test(v)) set('priceValue', v === '' ? 0 : Number(v));
                        }}
                        placeholder={form.priceType === 'percentage' ? 'Örn: 20' : 'Örn: 249.90'}
                        className="w-full pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                        {form.priceType === 'percentage' ? '%' : '₺'}
                      </span>
                    </div>

                    {/* Live preview */}
                    <div className="flex-1 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <p className="text-[10px] text-emerald-600 mb-0.5">Trendyol'daki Fiyat</p>
                      <p className="text-sm font-bold text-emerald-700">{fmtTRY(Math.max(0, previewPrice))}</p>
                      {form.priceType === 'percentage' && (
                        <p className="text-[10px] text-emerald-500">
                          {fmtTRY(productPrice)} → {fmtTRY(previewPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── VAT ──────────────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">KDV Oranı (%)</label>
                <select
                  value={form.vatRate}
                  onChange={e => set('vatRate', Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-400 bg-white"
                >
                  {[0, 1, 8, 10, 18, 20].map(v => <option key={v} value={v}>%{v}</option>)}
                </select>
              </div>

              {/* ── Shipping ─────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kargo Şirketi</label>
                  <select
                    value={form.cargoCompanyId ?? ''}
                    onChange={e => set('cargoCompanyId', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-400 bg-white"
                  >
                    <option value="">— Toplu ayar —</option>
                    {CARGO_COMPANIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Teslimat Süresi (gün)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.deliveryDuration ?? ''}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '');
                      set('deliveryDuration', v ? Number(v) : null);
                    }}
                    placeholder="Örn: 3"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>

            </div>{/* end override-gated section */}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-slate-100 flex-shrink-0">
          <div>
            {hasExisting && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors disabled:opacity-50"
              >
                {deleting ? 'Siliniyor...' : 'Ayarları Sıfırla'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              )}
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
