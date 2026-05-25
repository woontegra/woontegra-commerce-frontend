import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast as hotToast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import {
  DndContext, closestCenter,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { productService } from '../services/product.service';
import { categoryService } from '../services/category.service';
import type { FlatCategoryNode } from '../services/category.service';
import apiClient from '../services/apiClient';
import CategoryTreeSelect from '../components/CategoryTreeSelect';
import attributeService from '../services/attribute.service';
import type { CategoryAttribute } from '../services/attribute.service';
import { normalizeImageUrl } from '../utils/imageUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductFormData {
  // General
  name:            string;
  description:     string;
  categoryId:      string;
  brand:           string;
  barcode:         string;
  unit:            string;
  // Pricing
  price:           string;
  basePrice:       string;
  discountPrice:   string;
  vatRate:         string;
  currency:        string;
  // Stock
  stock:           string;
  stockUnit:       string;
  minStock:        string;
  sku:             string;
  // SEO
  slug:            string;
  metaTitle:       string;
  metaDescription: string;
  // Shipping
  weight:           string;
  width:            string;
  height:           string;
  length:           string;
  desi:             string;
  shippingCost:     string;
  freeShipping:     boolean;
  // Trendyol shipping
  cargoCompanyId:   string;
  deliveryDuration: string;
  // Advanced
  isActive:        boolean;
  status:          string;
  publishAt:       string;
}

interface ImageItem {
  id:         string;
  url:        string;
  uploading?: boolean;
  error?:     string;
}

// A single selectable value inside a VariantOption (carries valueId for relational mapping)
interface VariantValueItem {
  label:   string;
  valueId: string | null;   // null for manual / free-text options
}

interface VariantOption {
  id:     string;           // attributeId (or random uid for manual options)
  name:   string;
  values: VariantValueItem[];
}

// One attribute→value cell inside a VariantRow (replaces the combination JSON blob)
interface VariantAttrCell {
  attributeId: string;
  attrName:    string;
  label:       string;
  valueId:     string | null;
}

interface VariantRow {
  key:             string;
  combination:     Record<string, string>;   // legacy display cache {attrName: label}
  displayName?:    string;                   // pre-computed human label from backend
  attributeValues: VariantAttrCell[];        // relational payload sent to backend
  price:           string;
  discountPrice:   string;                   // variant-level discount override (empty = inherit product)
  stock:           string;
  sku:             string;
  barcode:         string;
  isActive:        boolean;
  id?:             string;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

function slugify(t: string) {
  return t.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

// Result of cartesian: both a display combination map AND full relational cells
interface CartesianCombo {
  combination:     Record<string, string>;
  attributeValues: VariantAttrCell[];
}

function cartesian(opts: VariantOption[]): CartesianCombo[] {
  if (!opts.length) return [];
  return opts.reduce<CartesianCombo[]>((acc, opt) => {
    if (!opt.values.length) return acc;
    const newItems: CartesianCombo[] = opt.values.map(v => ({
      combination:     { [opt.name]: v.label },
      attributeValues: [{ attributeId: opt.id, attrName: opt.name, label: v.label, valueId: v.valueId }],
    }));
    if (!acc.length) return newItems;
    return acc.flatMap(prev => newItems.map(ni => ({
      combination:     { ...prev.combination, ...ni.combination },
      attributeValues: [...prev.attributeValues, ...ni.attributeValues],
    })));
  }, []);
}

// Stable key from relational attribute cells (sorted by attributeId)
function comboKey(cells: VariantAttrCell[]): string {
  if (!cells.length) return '';
  return [...cells]
    .sort((a, b) => a.attributeId.localeCompare(b.attributeId))
    .map(c => `${c.attributeId}:${c.valueId ?? c.label}`)
    .join('|');
}

// Legacy key from plain combination map (for backward compat when loading old variants)
function legacyComboKey(c: Record<string, string>): string {
  return Object.keys(c).sort().map(k => `${k}:${c[k]}`).join('|');
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastItem { id: string; type: 'success' | 'error' | 'info'; msg: string }

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const add = (type: ToastItem['type'], msg: string) => {
    const id = uid();
    setToasts(t => [...t, { id, type, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return { toasts, success: (m: string) => add('success', m), error: (m: string) => add('error', m), info: (m: string) => add('info', m) };
}

function ToastList({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          t.type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' :
          t.type === 'error'   ? 'bg-white border-red-200 text-red-700' :
                                 'bg-white border-slate-200 text-slate-700'}`}>
          {t.type === 'success' && <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">✓</span>}
          {t.type === 'error'   && <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">✕</span>}
          {t.type === 'info'    && <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">i</span>}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Rich Text Editor ─────────────────────────────────────────────────────────

function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref     = useRef<HTMLDivElement>(null);
  const init    = useRef(false);
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    if (ref.current && !init.current) { ref.current.innerHTML = value || ''; init.current = true; }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exec = (cmd: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const isEmpty = !value || value === '<br>' || value === '<div><br></div>';

  const tools: { cmd: string; label: React.ReactNode; title: string }[] = [
    { cmd: 'bold',                label: <strong className="text-[13px]">B</strong>,   title: 'Kalın' },
    { cmd: 'italic',              label: <em className="text-[13px]">I</em>,             title: 'İtalik' },
    { cmd: 'underline',           label: <u className="text-[13px]">U</u>,               title: 'Altı çizili' },
    { cmd: 'insertUnorderedList', label: <span className="text-[13px]">• Liste</span>,   title: 'Madde listesi' },
    { cmd: 'insertOrderedList',   label: <span className="text-[13px]">1. Liste</span>,  title: 'Numaralı liste' },
  ];

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-150 ${focus ? 'border-indigo-400 ring-2 ring-indigo-500/15' : 'border-slate-200'}`}>
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-100">
        {tools.map((t, i) => (
          <React.Fragment key={t.cmd}>
            {i === 3 && <div className="w-px h-4 bg-slate-200 mx-1.5" />}
            <button type="button" title={t.title} onMouseDown={e => { e.preventDefault(); exec(t.cmd); }}
              className="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors">{t.label}</button>
          </React.Fragment>
        ))}
      </div>
      <div className="relative">
        {isEmpty && !focus && (
          <div className="absolute inset-0 p-4 text-sm text-slate-400 pointer-events-none">
            Ürün açıklamasını buraya yazın — ne kadar detaylı olursa satış o kadar yüksek...
          </div>
        )}
        <div ref={ref} contentEditable suppressContentEditableWarning
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          onInput={() => ref.current && onChange(ref.current.innerHTML)}
          className="min-h-[180px] p-4 text-sm text-slate-700 focus:outline-none"
          style={{ lineHeight: '1.75' }} />
      </div>
    </div>
  );
}

// ─── Sortable Image ───────────────────────────────────────────────────────────

function SortableImage({ img, isMain, onSetMain, onRemove }: {
  img: ImageItem; isMain: boolean; onSetMain: (id: string) => void; onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 20 : undefined };
  const [imgBroken, setImgBroken] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100 transition-all hover:border-indigo-200">
      <div {...attributes} {...listeners}
        className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-lg bg-white/90 shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5.5" cy="4" r="1.2"/><circle cx="5.5" cy="8" r="1.2"/><circle cx="5.5" cy="12" r="1.2"/>
          <circle cx="10.5" cy="4" r="1.2"/><circle cx="10.5" cy="8" r="1.2"/><circle cx="10.5" cy="12" r="1.2"/>
        </svg>
      </div>
      {img.uploading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-2">
          <svg className="w-6 h-6 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-[10px] text-slate-400">Yükleniyor...</span>
        </div>
      ) : img.error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-xs text-red-500 text-center p-3">{img.error}</div>
      ) : imgBroken || !normalizeImageUrl(img.url) ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
      ) : (
        <img
          src={normalizeImageUrl(img.url)!}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
          onError={() => setImgBroken(true)}
        />
      )}
      {isMain && (
        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-indigo-500 text-white text-[10px] font-bold tracking-wide shadow-sm">ANA</div>
      )}
      <div className="absolute top-1.5 right-1.5 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isMain && (
          <button type="button" onClick={() => onSetMain(img.id)} title="Ana görsel yap"
            className="w-6 h-6 rounded-lg bg-white/90 shadow-sm flex items-center justify-center hover:bg-indigo-50 transition-colors">
            <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </button>
        )}
        <button type="button" onClick={() => onRemove(img.id)}
          className="w-6 h-6 rounded-lg bg-white/90 shadow-sm flex items-center justify-center hover:bg-red-50 transition-colors">
          <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, required, hint, error, children, fieldId }: {
  label: string; required?: boolean; hint?: string; error?: string;
  children: React.ReactNode; fieldId?: string;
}) {
  return (
    <div className="space-y-1.5" {...(fieldId ? { 'data-field': fieldId } : {})}>
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          {label}{required && <span className="text-red-400 normal-case font-normal ml-1">*</span>}
        </label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general',  label: 'Genel',        icon: '📝' },
  { id: 'pricing',  label: 'Fiyat & Stok', icon: '💰' },
  { id: 'media',    label: 'Medya',        icon: '🖼️' },
  { id: 'seo',      label: 'SEO',          icon: '🔍' },
  { id: 'variants', label: 'Varyantlar',   icon: '🎛️' },
  { id: 'shipping', label: 'Kargo',        icon: '🚚' },
  { id: 'advanced', label: 'Gelişmiş',     icon: '⚙️' },
] as const;
type TabId = (typeof TABS)[number]['id'];

// ─── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({ form, images, options: _options, variantRows, categories, onTabChange, currentId }: {
  form:        any;
  images:      ImageItem[];
  options:     VariantOption[];
  variantRows: VariantRow[];
  categories:  FlatCategoryNode[];
  onTabChange: (tab: TabId) => void;
  currentId:   string | null;
}) {
  const { watch, setValue } = form;
  const name        = watch('name');
  const price       = watch('price');
  const basePrice   = watch('basePrice');
  const categoryId  = watch('categoryId');
  const description = watch('description');
  const slug        = watch('slug');
  const sku         = watch('sku');
  const isActive    = watch('isActive');

  const selectedCategory = categories.find((c: any) => c.id === categoryId);
  const uploadedImages   = images.filter(i => !i.uploading && !i.error);

  const { score, missing } = useMemo(() => {
    let s = 0;
    const m: { label: string; tab: TabId }[] = [];

    if (name?.trim())                    s += 20; else m.push({ label: 'Ürün adı',  tab: 'general'  });
    if (price && Number(price) > 0)      s += 20; else m.push({ label: 'Fiyat',     tab: 'pricing'  });
    if (description && description.length > 10) s += 15; else m.push({ label: 'Açıklama', tab: 'general' });
    if (categoryId)                      s += 15; else m.push({ label: 'Kategori',  tab: 'general'  });
    if (uploadedImages.length > 0)       s += 15; else m.push({ label: 'Görsel',    tab: 'media'    });
    if (sku?.trim())                     s += 10; else m.push({ label: 'SKU kodu',  tab: 'pricing'  });
    if (slug?.trim())                    s += 5;

    return { score: s, missing: m.slice(0, 4) };
  }, [name, price, description, categoryId, uploadedImages.length, sku, slug]);

  return (
    <div className="space-y-4">
      <div className="wn-card p-5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Yayın Durumu</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { val: true,  label: 'Aktif',  desc: 'Görünür',  dot: 'bg-emerald-400' },
            { val: false, label: 'Taslak', desc: 'Gizli',    dot: 'bg-slate-300'   },
          ].map(opt => (
            <button key={String(opt.val)} type="button" onClick={() => setValue('isActive', opt.val)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                isActive === opt.val ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
              <div className={`w-2 h-2 rounded-full mb-2 ${opt.dot}`}/>
              <p className="text-xs font-bold text-slate-800">{opt.label}</p>
              <p className="text-[10px] text-slate-400">{opt.desc}</p>
            </button>
          ))}
        </div>
        {uploadedImages.length > 0 ? (
          <div className="flex gap-1.5">
            {uploadedImages.slice(0,3).map((img, i) => (
              <div key={img.id} className={`rounded-xl overflow-hidden bg-slate-100 flex-1 aspect-square ${i === 0 ? 'ring-2 ring-indigo-400' : ''}`}>
                <img
                  src={normalizeImageUrl(img.url) ?? ''}
                  className="w-full h-full object-cover"
                  alt=""
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            ))}
            {uploadedImages.length > 3 && (
              <div className="flex-1 aspect-square rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <span className="text-xs font-semibold text-slate-500">+{uploadedImages.length - 3}</span>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => onTabChange('media')}
            className="w-full h-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-indigo-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/>
            </svg>
            Görsel Ekle
          </button>
        )}
      </div>

      <div className="wn-card p-5 space-y-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Özet</p>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-600 text-sm font-bold">₺</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Satış Fiyatı</p>
            {price && Number(price) > 0
              ? <p className="text-sm font-bold text-slate-800">₺{Number(price).toLocaleString('tr', {minimumFractionDigits: 2})}</p>
              : <p className="text-xs text-slate-300 italic">Girilmedi</p>}
          </div>
        </div>

        {basePrice && Number(basePrice) > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Kâr Marjı</p>
              {(() => {
                const margin = ((Number(price) - Number(basePrice)) / Number(price)) * 100;
                return (
                  <p className={`text-sm font-bold ${margin >= 30 ? 'text-emerald-600' : margin >= 15 ? 'text-amber-500' : 'text-red-500'}`}>
                    %{margin.toFixed(1)}
                  </p>
                );
              })()}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Kategori</p>
            {selectedCategory
              ? <p className="text-xs font-semibold text-indigo-600">{selectedCategory.name}</p>
              : <button type="button" onClick={() => onTabChange('general')} className="text-xs text-slate-300 italic hover:text-indigo-500 transition-colors">Seçilmedi →</button>}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-slate-400">URL Slug</p>
            <p className="text-xs font-mono text-slate-600 truncate">
              {slug || (name ? <span className="text-slate-300">/urun/{slugify(name)}</span> : <span className="text-slate-300">Otomatik</span>)}
            </p>
          </div>
        </div>

        {variantRows.length > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
              </svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Varyant</p>
              <p className="text-xs font-semibold text-slate-700">{variantRows.length} kombinasyon</p>
            </div>
          </div>
        )}
      </div>

      <div className="wn-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tamamlanma</p>
          <span className={`text-base font-black ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-slate-400'}`}>
            %{score}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${score >= 80 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-indigo-400'}`}
            style={{ width: `${score}%` }}
          />
        </div>
        {score >= 80 ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-emerald-500 text-base">✓</span>
            <p className="text-xs font-semibold text-emerald-700">Ürün yayına hazır!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400">Eksikler — tamamlayarak sıralamayı yükselt:</p>
            {missing.map(m => (
              <button key={m.label} type="button" onClick={() => onTabChange(m.tab)}
                className="flex items-center gap-2 w-full text-left group">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors flex-shrink-0"/>
                <span className="text-xs text-slate-500 group-hover:text-indigo-500 transition-colors">{m.label}</span>
                <span className="text-[10px] text-slate-300 group-hover:text-indigo-400 ml-auto transition-colors">→</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {currentId && (
        <div className="wn-card p-5 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kayıt Detayı</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { t: 'Ürün Adı',   ok: !!name?.trim() },
              { t: 'Fiyat',      ok: !!(price && Number(price) > 0) },
              { t: 'Kategori',   ok: !!categoryId },
              { t: 'Görsel',     ok: uploadedImages.length > 0 },
            ].map(({ t, ok }) => (
              <span key={t} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {ok ? '✓' : '○'} {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Attribute Section ────────────────────────────────────────────────────────

interface AttrSectionProps {
  categoryId: string;
  values:     Record<string, string>;
  onChange:   (attributeId: string, val: string) => void;
}

function ChipSelect({
  attr, val, isVariant, onChange,
}: {
  attr: CategoryAttribute['attribute'];
  val: string;
  isVariant: boolean;
  onChange: (v: string) => void;
}) {
  const selected = val ? val.split(',').filter(Boolean) : [];

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter(s => s !== value)
      : [...selected, value];
    onChange(next.join(','));
  };

  return (
    <div className={`flex flex-wrap gap-2 p-3 rounded-xl border-2 min-h-[48px] ${
      isVariant ? 'border-purple-300 bg-purple-50/40' : 'border-gray-200 bg-white'
    }`}>
      {attr.values.map(v => {
        const checked = selected.includes(v.value);
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => toggle(v.value)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
              checked
                ? isVariant
                  ? 'border-purple-500 bg-purple-100 text-purple-800'
                  : 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
            }`}
          >
            {v.color && (
              <span
                className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                style={{ background: v.color }}
              />
            )}
            {v.label}
          </button>
        );
      })}
      {attr.values.length === 0 && (
        <span className="text-xs text-gray-400">Değer tanımlanmamış</span>
      )}
    </div>
  );
}

function AttributeSection({ categoryId, values, onChange }: AttrSectionProps) {
  const { data: catAttrs = [], isLoading } = useQuery<CategoryAttribute[]>({
    queryKey: ['category-attrs', categoryId],
    queryFn:  () => attributeService.getCategoryAttributes(categoryId),
    enabled:  !!categoryId,
    staleTime: 30_000,
  });

  if (!categoryId) return null;
  if (isLoading) {
    return (
      <div className="wn-card p-6">
        <div className="h-4 bg-slate-100 rounded animate-pulse w-40 mb-3" />
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  const standardAttrs = catAttrs.filter(ca => !ca.isVariant);
  if (standardAttrs.length === 0) return null;

  const renderField = (ca: CategoryAttribute) => {
    const attr = ca.attribute;
    const val  = values[attr.id] ?? '';

    const labelEl = (
      <div className="flex items-center gap-2 mb-1.5">
        <label className="block text-xs font-medium text-slate-700">
          {attr.name}
          {ca.required && <span className="text-red-500 ml-1">*</span>}
          {attr.unit   && <span className="text-slate-400 ml-1">({attr.unit})</span>}
        </label>
      </div>
    );

    if (attr.type === 'select') {
      return (
        <div key={attr.id}>
          {labelEl}
          <select
            value={val}
            onChange={e => onChange(attr.id, e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white"
          >
            <option value="">-- Seçiniz --</option>
            {attr.values.map(v => (
              <option key={v.id} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (attr.type === 'multiselect' || attr.type === 'color') {
      return (
        <div key={attr.id} className="sm:col-span-2">
          {labelEl}
          <ChipSelect attr={attr} val={val} isVariant={false} onChange={v => onChange(attr.id, v)} />
        </div>
      );
    }

    if (attr.type === 'boolean') {
      return (
        <div key={attr.id}>
          {labelEl}
          <div className="flex gap-2">
            {['true', 'false'].map(bval => (
              <button
                key={bval}
                type="button"
                onClick={() => onChange(attr.id, bval)}
                className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                  val === bval
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {bval === 'true' ? 'Evet' : 'Hayır'}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={attr.id}>
        {labelEl}
        <input
          type={attr.type === 'number' ? 'number' : 'text'}
          value={val}
          onChange={e => onChange(attr.id, e.target.value)}
          placeholder={attr.type === 'number' ? '0' : `${attr.name} girin`}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    );
  };

  return (
    <div className="wn-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-800">Ürün Özellikleri</h3>
        <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
          {standardAttrs.length} özellik
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {standardAttrs.map(renderField)}
      </div>
    </div>
  );
}

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab({ form, categories, attrValues, onAttrChange, isAutoBarcode }: {
  form: any;
  categories: FlatCategoryNode[];
  attrValues: Record<string, string>;
  isAutoBarcode?: boolean;
  onAttrChange: (attrId: string, val: string) => void;
}) {
  const { register, control, watch, formState: { errors } } = form;
  const name       = watch('name');
  const categoryId = watch('categoryId');
  const selected   = categories.find(c => c.id === categoryId);

  return (
    <div className="space-y-6">
      <div className="wn-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Temel Bilgiler</h3>
          <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Zorunlu alanlar *</span>
        </div>

        <Field label="Ürün Adı" required error={errors.name?.message} fieldId="name">
          <input
            {...register('name', {
              required: 'Ürün adı zorunludur.',
              minLength: { value: 2, message: 'En az 2 karakter giriniz.' },
              maxLength: { value: 500, message: 'Ürün adı 500 karakteri geçemez.' },
              validate: (v: string) => !!v?.trim() || 'Ürün adı boş olamaz.',
            })}
            placeholder="Örn: Pamuklu Oversize Tişört"
            className={`wn-input ${errors.name ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
          />
          {name && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
              <svg className="w-3 h-3 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
              URL önizleme:&nbsp;
              <span className="font-mono text-indigo-500 font-medium">/urun/{slugify(name)}</span>
            </div>
          )}
        </Field>

        <Field label="Açıklama" hint="HTML + zengin metin desteği">
          <Controller
            name="description"
            control={control}
            render={({ field }) => <RichEditor value={field.value || ''} onChange={field.onChange}/>}
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            💡 İpucu: Malzeme, kullanım alanı ve öne çıkan özellikleri belirtin. Daha uzun açıklamalar arama sıralamasını yükseltir.
          </p>
        </Field>
      </div>

      <div className="wn-card p-6 space-y-5">
        <h3 className="text-sm font-semibold text-slate-800">Kategori & Marka</h3>

        <Field label="Kategori">
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <CategoryTreeSelect
                categories={categories}
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
          {selected && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-slate-300">Yol:</span>
              <span className="font-mono text-indigo-500 font-medium">/{selected.path}</span>
            </div>
          )}
          {categories.length === 0 && (
            <p className="text-[11px] text-amber-500 mt-1.5">Henüz kategori yok — Kategoriler sayfasından oluşturun.</p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Marka" hint="Opsiyonel">
            <input {...register('brand')} placeholder="Örn: Nike, Adidas..." className="wn-input"/>
          </Field>
          <Field label="Birim" hint="Satış birimi">
            <Controller name="unit" control={control} render={({ field }) => (
              <select {...field} className="wn-select">
                {['adet','kg','gram','litre','ml','metre','cm','paket','kutu','çift'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            )}/>
          </Field>
        </div>
      </div>

      <AttributeSection
        categoryId={categoryId}
        values={attrValues}
        onChange={onAttrChange}
      />

      <div className="wn-card p-6 space-y-5">
        <h3 className="text-sm font-semibold text-slate-800">Ürün Kodu & Barkod</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="SKU / Stok Kodu" hint="Benzersiz" fieldId="sku">
            <input {...register('sku')} placeholder="Örn: TSH-001-RED-M" className="wn-input font-mono text-sm"/>
          </Field>
          <Field label="Barkod" hint="EAN-13 / QR" fieldId="barcode">
            <div className="relative">
              <input {...register('barcode')} placeholder="8690123456789" className="wn-input font-mono text-sm"/>
              {isAutoBarcode && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200 pointer-events-none">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Otomatik
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isAutoBarcode
                ? 'Sistem tarafından otomatik üretildi — kendi barkodunuzu yazarak değiştirebilirsiniz.'
                : 'EAN-13, Code-128 veya QR barkod değeri'}
            </p>
          </Field>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing Tab ──────────────────────────────────────────────────────────────

function PricingTab({ form }: { form: any }) {
  const { register, control, watch, formState: { errors } } = form;
  const price         = Number(watch('price') || 0);
  const basePrice     = Number(watch('basePrice') || 0);
  const discountPrice = Number(watch('discountPrice') || 0);
  const vatRate       = Number(watch('vatRate') || 0);

  const profit       = price - basePrice;
  const margin       = basePrice > 0 && price > 0 ? ((profit / price) * 100) : null;
  const vatAmount    = price * (vatRate / 100);
  const priceWithVat = price + vatAmount;

  // Effective customer price
  const hasDiscount        = discountPrice > 0 && discountPrice < price;
  const displayPrice       = hasDiscount ? discountPrice : price;
  const discountPct        = hasDiscount ? Math.round((1 - discountPrice / price) * 100) : 0;
  const discountWithVat    = displayPrice + displayPrice * (vatRate / 100);

  return (
    <div className="space-y-6">
      <div className="wn-card p-6 space-y-5">
        <h3 className="text-sm font-semibold text-slate-800">Fiyatlandırma</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Satış Fiyatı" required error={errors.price?.message} fieldId="price">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">₺</span>
              <input {...register('price', {
                required: 'Satış fiyatı zorunludur.',
                validate: (v: string) => {
                  if (v === '' || v == null) return 'Satış fiyatı zorunludur.';
                  const n = Number(v);
                  if (isNaN(n)) return 'Geçerli bir sayı giriniz.';
                  if (n < 0)   return 'Fiyat negatif olamaz.';
                  return true;
                },
              })}
                type="text" inputMode="decimal" placeholder="0.00"
                className={`wn-input pl-8 ${errors.price ? 'border-red-300 focus:border-red-400' : ''}`}/>
            </div>
          </Field>
          <Field label="Alış Fiyatı" hint="Maliyet">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">₺</span>
              <input {...register('basePrice')} type="text" inputMode="decimal" placeholder="0.00" className="wn-input pl-8"/>
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="İndirimli Fiyat" error={errors.discountPrice?.message} fieldId="discountPrice">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">₺</span>
              <input {...register('discountPrice', {
                validate: (v: string) => {
                  if (!v) return true;
                  const n = Number(v);
                  if (isNaN(n) || n < 0) return 'İndirimli fiyat negatif olamaz.';
                  return true;
                },
              })} type="text" inputMode="decimal" placeholder="0.00"
                className={`wn-input pl-8 ${errors.discountPrice ? 'border-red-300' : ''}`}/>
            </div>
          </Field>
          <Field label="KDV Oranı" hint="%">
            <div className="relative">
              <input {...register('vatRate')} type="text" inputMode="numeric" placeholder="18" className="wn-input pr-10"/>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">%</span>
            </div>
          </Field>
        </div>
      </div>

      {price > 0 && (
        <div className="wn-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Kâr Analizi</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 mb-1.5 uppercase tracking-wide">Satış</p>
              <p className="text-lg font-black text-slate-800">₺{price.toLocaleString('tr')}</p>
            </div>
            {basePrice > 0 ? (
              <>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-[11px] text-slate-400 mb-1.5 uppercase tracking-wide">Alış</p>
                  <p className="text-lg font-black text-slate-600">₺{basePrice.toLocaleString('tr')}</p>
                </div>
                <div className={`p-4 rounded-xl border text-center ${profit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <p className="text-[11px] text-slate-400 mb-1.5 uppercase tracking-wide">Kâr</p>
                  <p className={`text-lg font-black ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {profit >= 0 ? '+' : ''}₺{profit.toLocaleString('tr')}
                  </p>
                </div>
              </>
            ) : (
              <div className="col-span-2 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-3">
                <span className="text-amber-400 text-lg">💡</span>
                <p className="text-xs text-amber-700">Kâr hesabı için <strong>alış fiyatı</strong> girin.</p>
              </div>
            )}
          </div>

          {margin !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Kâr Marjı</span>
                <span className={`font-black text-sm ${margin >= 30 ? 'text-emerald-600' : margin >= 15 ? 'text-amber-500' : 'text-red-500'}`}>
                  %{margin.toFixed(1)}
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${margin >= 30 ? 'bg-emerald-400' : margin >= 15 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.min(100, margin)}%` }}/>
              </div>
              <p className="text-[11px] text-slate-400">
                {margin >= 30 ? '✅ Sağlıklı kâr marjı' : margin >= 15 ? '⚠️ Düşük marj — fiyatı gözden geçirin' : '❌ Zarar riski — alış fiyatını kontrol edin'}
              </p>
            </div>
          )}

          {vatRate > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
              <span className="text-slate-500">KDV Dahil Fiyat (%{vatRate})</span>
              <span className="font-bold text-slate-800">₺{priceWithVat.toLocaleString('tr', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Müşteri Fiyat Önizlemesi ─────────────────────────────────── */}
      {price > 0 && (
        <div className="wn-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Müşteri Fiyat Önizlemesi</h3>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Mağazada böyle görünür</span>
          </div>

          {/* Price display */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white flex items-end gap-4">
            {hasDiscount ? (
              <>
                {/* Discounted price — prominent */}
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">İndirimli Fiyat</p>
                  <p className="text-3xl font-black text-slate-900">
                    ₺{discountPrice.toLocaleString('tr', { minimumFractionDigits: 2 })}
                  </p>
                  {vatRate > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      KDV dahil ₺{discountWithVat.toLocaleString('tr', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                {/* Original price — strikethrough */}
                <div className="pb-1">
                  <p className="text-[10px] text-slate-400 mb-0.5">Normal Fiyat</p>
                  <p className="text-xl text-slate-400 line-through">
                    ₺{price.toLocaleString('tr', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {/* Discount badge */}
                <div className="pb-1 ml-auto">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-black shadow-sm">
                    %{discountPct} İndirim
                  </span>
                </div>
              </>
            ) : (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Satış Fiyatı</p>
                <p className="text-3xl font-black text-slate-900">
                  ₺{price.toLocaleString('tr', { minimumFractionDigits: 2 })}
                </p>
                {vatRate > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    KDV dahil ₺{priceWithVat.toLocaleString('tr', { minimumFractionDigits: 2 })}
                  </p>
                )}
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mt-2 inline-block">
                  💡 İndirimli fiyat girmek için yukarıdaki alanı doldurun
                </p>
              </div>
            )}
          </div>

          {/* Savings callout */}
          {hasDiscount && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="text-xs text-emerald-700 font-medium">
                Müşteri <strong>₺{(price - discountPrice).toLocaleString('tr', { minimumFractionDigits: 2 })}</strong> tasarruf ediyor
              </p>
            </div>
          )}
        </div>
      )}

      <div className="wn-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Stok</h3>
          <span className="text-[11px] text-slate-400">0 = tükendi gösterir</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Stok Miktarı" error={errors.stock?.message} fieldId="stock">
              <input {...register('stock', {
                validate: (v: string) => {
                  if (!v && v !== '0') return true;
                  const n = Number(v);
                  if (isNaN(n) || n < 0) return 'Stok negatif olamaz.';
                  return true;
                },
              })} type="text" inputMode="decimal" placeholder="0"
                className={`wn-input ${errors.stock ? 'border-red-300' : ''}`}/>
            </Field>
          </div>
          <Field label="Birim">
            <Controller name="stockUnit" control={control} render={({ field }) => (
              <select {...field} className="wn-select">
                {['adet','kg','gram','litre','ml','metre','cm','paket','kutu','çift'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            )}/>
          </Field>
        </div>
        <Field label="Minimum Stok Uyarısı" hint="Bu seviyenin altına düşünce uyarı gönderilir">
          <input {...register('minStock')} type="text" inputMode="decimal" placeholder="Örn: 5" className="wn-input"/>
        </Field>
        <p className="text-[11px] text-slate-400">
          💡 kg / litre / metre gibi birimler için ondalıklı giriş yapabilirsiniz.
        </p>
      </div>
    </div>
  );
}

// ─── Media Tab ────────────────────────────────────────────────────────────────

function MediaTab({ images, mainImageId, setMainImageId, onAdd, onRemove, onReorder }: {
  images: ImageItem[]; mainImageId: string | null; setMainImageId: (id: string) => void;
  onAdd: (file: File) => void; onRemove: (id: string) => void; onReorder: (imgs: ImageItem[]) => void;
}) {
  const sensors  = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    Array.from(e.dataTransfer.files).forEach(f => f.type.startsWith('image/') && onAdd(f));
  }, [onAdd]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oi = images.findIndex(i => i.id === active.id);
    const ni = images.findIndex(i => i.id === over.id);
    onReorder(arrayMove(images, oi, ni));
  };

  const uploaded = images.filter(i => !i.uploading && !i.error);

  return (
    <div className="space-y-6">
      <div className="wn-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Ürün Görselleri</h3>
            <p className="text-xs text-slate-400 mt-0.5">Vitrin görseliniz satışa doğrudan etki eder</p>
          </div>
          {uploaded.length > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold">
              {uploaded.length} görsel
            </span>
          )}
        </div>

        <div
          onDragEnter={e => { e.preventDefault(); setDrag(true); }}
          onDragOver={e => e.preventDefault()}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
            drag ? 'border-indigo-400 bg-indigo-50 scale-[1.01]' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80'
          }`}
        >
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => {
            Array.from(e.target.files ?? []).forEach(f => onAdd(f)); e.target.value = '';
          }}/>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">Görsel sürükle & bırak veya tıkla</p>
          <p className="text-xs text-slate-400 mt-1.5">PNG, JPG, WEBP — Maksimum 10 MB</p>
        </div>

        {images.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">⭐ <strong>Ana görsel</strong> vitrin resmi — ★ ile seçin</p>
              <p className="text-xs text-slate-400">Sürükle → sırala</p>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={images.map(i => i.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {images.map((img, idx) => (
                    <SortableImage
                      key={img.id} img={img}
                      isMain={mainImageId === img.id || (idx === 0 && !mainImageId)}
                      onSetMain={setMainImageId}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SEO Tab ──────────────────────────────────────────────────────────────────

function SeoTab({ form }: { form: any }) {
  const { register, watch, setValue } = form;
  const name  = watch('name');
  const slug  = watch('slug');
  const title = watch('metaTitle');
  const desc  = watch('metaDescription');

  return (
    <div className="space-y-6">
      <div className="wn-card p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">URL & Slug</h3>
          <p className="text-xs text-slate-400 mt-1">Ürün URL'si arama motorları için kritiktir.</p>
        </div>
        <Field label="Slug (Ürün URL)">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs select-none font-mono">/urun/</span>
              <input {...register('slug')} placeholder="urun-adi" className="wn-input pl-[3.4rem] font-mono text-sm"/>
            </div>
            <button type="button" onClick={() => name && setValue('slug', slugify(name))}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors whitespace-nowrap font-semibold">
              ↺ Otomatik
            </button>
          </div>
        </Field>
      </div>

      <div className="wn-card p-6 space-y-5">
        <h3 className="text-sm font-semibold text-slate-800">Meta Bilgileri</h3>
        <Field label="Meta Başlık" hint={`${(title || '').length}/60`}>
          <input {...register('metaTitle')} placeholder="Arama motorlarında görünen başlık" maxLength={60} className="wn-input"/>
          <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${(title||'').length > 50 ? 'bg-amber-400' : 'bg-indigo-400'}`}
              style={{ width: `${Math.min(100, ((title||'').length/60)*100)}%` }}/>
          </div>
        </Field>
        <Field label="Meta Açıklama" hint={`${(desc || '').length}/160`}>
          <textarea {...register('metaDescription')} placeholder="Arama motorlarında görünen açıklama" maxLength={160} rows={3} className="wn-input resize-none"/>
        </Field>

        {(title || desc) && (
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2.5">🔍 Google Önizleme</p>
            <p className="text-blue-700 text-[15px] font-medium leading-snug">{title || 'Ürün Başlığı'}</p>
            <p className="text-green-700 text-xs">maganiz.com › urun › {slug || 'urun-adi'}</p>
            <p className="text-slate-600 text-[13px] leading-relaxed">{desc || 'Ürün açıklaması...'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Variants Tab ─────────────────────────────────────────────────────────────

// VariantTableRow stability pattern:
//
//  Root cause of cursor-jumping:
//    type="number" + onChange → setVariantRows → new `row` object → React.memo
//    sees new reference even though values are same → re-render → DOM diffing
//    moves cursor to end.
//
//  Fix: keep local state for the three numeric inputs (price, discountPrice, stock)
//  and only propagate to parent on blur.  The parent value syncs back via useEffect
//  ONLY when the difference is "external" (bulk update, reset, etc.) — detected by
//  comparing against `lastCommitted` ref so our own blur-triggered update doesn't
//  create a sync loop.
//
//  All three numeric inputs use type="text" + inputMode="decimal" so the browser
//  never sanitises the value mid-keystroke, which is the other half of cursor-jump.

const VariantTableRow = React.memo(function VariantTableRow({
  row, defaultPrice, defaultDiscountPrice, onChange, onToggleActive, selected, onToggleSelect,
}: {
  row:                    VariantRow;
  defaultPrice:           string;
  defaultDiscountPrice:   string;
  onChange:               (key: string, field: keyof VariantRow, val: string) => void;
  onToggleActive:         (key: string) => void;
  selected:               boolean;
  onToggleSelect:         (key: string) => void;
}) {
  // ── Local draft state (keeps inputs stable between parent re-renders) ──────
  const [localPrice,    setLocalPrice]    = useState(row.price);
  const [localDiscount, setLocalDiscount] = useState(row.discountPrice);
  const [localStock,    setLocalStock]    = useState(row.stock);

  // Track the last value we committed so we can distinguish our own blur-triggered
  // parent updates from genuine external changes (bulk edits, resets, etc.)
  const committed = useRef({ price: row.price, discount: row.discountPrice, stock: row.stock });

  // Sync from parent only when parent changed externally (not due to our own commit)
  useEffect(() => {
    if (row.price !== committed.current.price) {
      setLocalPrice(row.price);
      committed.current.price = row.price;
    }
  }, [row.price]);

  useEffect(() => {
    if (row.discountPrice !== committed.current.discount) {
      setLocalDiscount(row.discountPrice);
      committed.current.discount = row.discountPrice;
    }
  }, [row.discountPrice]);

  useEffect(() => {
    if (row.stock !== committed.current.stock) {
      setLocalStock(row.stock);
      committed.current.stock = row.stock;
    }
  }, [row.stock]);

  // Also sync all three when the row KEY changes (user switched to a different variant)
  const prevKey = useRef(row.key);
  if (prevKey.current !== row.key) {
    prevKey.current = row.key;
    // Synchronous state update during render — safe in React 18 when gated on ref
    setLocalPrice(row.price);
    setLocalDiscount(row.discountPrice);
    setLocalStock(row.stock);
    committed.current = { price: row.price, discount: row.discountPrice, stock: row.stock };
  }

  // Commit handlers — call parent only on blur
  const commitPrice = useCallback(() => {
    committed.current.price = localPrice;
    onChange(row.key, 'price', localPrice);
  }, [localPrice, onChange, row.key]);

  const commitDiscount = useCallback(() => {
    committed.current.discount = localDiscount;
    onChange(row.key, 'discountPrice', localDiscount);
  }, [localDiscount, onChange, row.key]);

  const commitStock = useCallback(() => {
    committed.current.stock = localStock;
    onChange(row.key, 'stock', localStock);
  }, [localStock, onChange, row.key]);

  // Derived display values (computed from parent row, not local draft, for badge)
  const effectivePrice    = row.price         !== '' ? Number(row.price)         : (defaultPrice         ? Number(defaultPrice)         : 0);
  const effectiveDiscount = row.discountPrice !== '' ? Number(row.discountPrice) : (defaultDiscountPrice ? Number(defaultDiscountPrice) : 0);
  const hasDiscount       = effectiveDiscount > 0 && effectiveDiscount < effectivePrice;
  const discountPct       = hasDiscount ? Math.round((1 - effectiveDiscount / effectivePrice) * 100) : 0;

  const inputCls = 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 text-right bg-white';

  return (
    <tr className={`border-b border-slate-100 transition-colors group ${
      !row.isActive ? 'bg-gray-50/80 opacity-60' : selected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'
    }`}>
      <td className="pl-4 pr-2 py-2.5 w-8">
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(row.key)} className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"/>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap gap-1 items-center">
          {Object.entries(row.combination).length > 0
            ? Object.entries(row.combination).map(([k, v]) => (
                <span key={k} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-semibold whitespace-nowrap">
                  {k}: <strong>{v}</strong>
                </span>
              ))
            : row.displayName
              ? <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-semibold">{row.displayName}</span>
              : <span className="text-slate-400 text-xs italic">Varyant</span>
          }
        </div>
      </td>

      {/* Satış Fiyatı — local state, commit on blur */}
      <td className="px-2 py-2.5">
        <input
          type="text" inputMode="decimal"
          value={localPrice}
          onChange={e => setLocalPrice(e.target.value)}
          onBlur={commitPrice}
          onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          placeholder={defaultPrice || 'Varsayılan'}
          className={`w-24 placeholder:text-gray-300 ${inputCls}`}
        />
      </td>

      {/* İndirimli Fiyat — local state, commit on blur */}
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-1.5">
          <input
            type="text" inputMode="decimal"
            value={localDiscount}
            onChange={e => setLocalDiscount(e.target.value)}
            onBlur={commitDiscount}
            onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            placeholder={defaultDiscountPrice || '—'}
            className={`w-24 placeholder:text-gray-300 ${hasDiscount ? 'border-emerald-300 focus:ring-emerald-400 border rounded-lg px-2 py-1.5 text-sm focus:outline-none text-right bg-white' : inputCls}`}
          />
          {hasDiscount && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded whitespace-nowrap">
              -%{discountPct}
            </span>
          )}
        </div>
      </td>

      {/* Stok — local state, commit on blur */}
      <td className="px-2 py-2.5">
        <input
          type="text" inputMode="numeric"
          value={localStock}
          onChange={e => setLocalStock(e.target.value)}
          onBlur={commitStock}
          onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          placeholder="0"
          className={`w-20 ${inputCls}`}
        />
      </td>

      {/* SKU & Barcode — text inputs, no change needed */}
      <td className="px-2 py-2.5">
        <input type="text" value={row.sku}
          onChange={e => onChange(row.key, 'sku', e.target.value)}
          placeholder="Otomatik"
          className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-gray-300 bg-white"/>
      </td>
      <td className="px-2 py-2.5">
        <input type="text" value={row.barcode}
          onChange={e => onChange(row.key, 'barcode', e.target.value)}
          placeholder="—"
          className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-gray-300 bg-white"/>
      </td>
      <td className="px-3 py-2.5 text-center">
        <button type="button" onClick={() => onToggleActive(row.key)}
          className={`w-9 h-5 rounded-full relative transition-colors ${row.isActive ? 'bg-green-400' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${row.isActive ? 'translate-x-4' : ''}`} />
        </button>
      </td>
    </tr>
  );
});

function VariantsTab({ categoryId, options, setOptions, variantRows, setVariantRows, defaultPrice, defaultDiscountPrice }: {
  categoryId:            string;
  options:               VariantOption[];
  setOptions:            React.Dispatch<React.SetStateAction<VariantOption[]>>;
  variantRows:           VariantRow[];
  setVariantRows:        React.Dispatch<React.SetStateAction<VariantRow[]>>;
  defaultPrice:          string;
  defaultDiscountPrice:  string;
}) {
  // attrId → selected VariantValueItems (carries both label and valueId)
  const [attrSelections, setAttrSelections] = useState<Record<string, VariantValueItem[]>>({});

  const { data: _rawVariantAttrs, isLoading: attrsLoading } = useQuery<CategoryAttribute[]>({
    queryKey: ['category-attrs-variant', categoryId],
    queryFn:  async () => {
      const all = await attributeService.getCategoryAttributes(categoryId);
      return all.filter(ca => ca.isVariant);
    },
    enabled:   !!categoryId,
    staleTime: 30_000,
  });
  const variantAttrs = useMemo(() => _rawVariantAttrs ?? [], [_rawVariantAttrs]);

  useEffect(() => { setAttrSelections({}); }, [categoryId]); // clear on category change

  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  // When attribute list loads for an existing product, rebuild attrSelections
  // from whatever was already set in options (which came from existing variantRows).
  useEffect(() => {
    if (!variantAttrs.length) return;
    const currentOptions = optionsRef.current;
    if (!currentOptions.length) return;
    const restored: Record<string, VariantValueItem[]> = {};
    variantAttrs.forEach(ca => {
      const match = currentOptions.find(o => o.id === ca.attribute.id || o.name === ca.attribute.name);
      if (match && match.values.length) {
        // match.values is already VariantValueItem[] (set by the server-load useEffect)
        restored[ca.attribute.id] = match.values;
      }
    });
    if (Object.keys(restored).length) setAttrSelections(restored);
  }, [variantAttrs]);

  useEffect(() => {
    const attrOpts: VariantOption[] = variantAttrs
      .map(ca => ({
        id:     ca.attribute.id,
        name:   ca.attribute.name,
        values: attrSelections[ca.attribute.id] ?? [],
      }))
      .filter(o => o.values.length > 0);

    setOptions(prev => {
      const attrIds   = new Set(variantAttrs.map(ca => ca.attribute.id));
      const attrNames = new Set(variantAttrs.map(ca => ca.attribute.name));
      const manual    = prev.filter(o => !attrIds.has(o.id) && !attrNames.has(o.name));
      const next      = [...attrOpts, ...manual];

      if (
        next.length === prev.length &&
        next.every((o, i) =>
          o.id === prev[i].id &&
          o.name === prev[i].name &&
          o.values.length === prev[i].values.length &&
          o.values.every((v, j) => v.label === prev[i].values[j].label && v.valueId === prev[i].values[j].valueId)
        )
      ) return prev;
      return next;
    });
  }, [attrSelections, variantAttrs]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleAttrValue = (attrId: string, item: VariantValueItem) => {
    setAttrSelections(prev => {
      const current = prev[attrId] ?? [];
      const isSelected = current.some(v => v.label === item.label);
      const next = isSelected
        ? current.filter(v => v.label !== item.label)
        : [...current, item];
      return { ...prev, [attrId]: next };
    });
  };

  const [optName,    setOptName]    = useState('');
  const [optVals,    setOptVals]    = useState('');
  const [showManual, setShowManual] = useState(false);

  const addManual = () => {
    const name = optName.trim();
    const vals = optVals.split(',').map(v => v.trim()).filter(Boolean);
    if (!name || !vals.length) return;
    // Manual options have no attributeId → use uid() as placeholder, valueId = null
    setOptions(prev => [...prev, {
      id:     uid(),
      name,
      values: vals.map(label => ({ label, valueId: null })),
    }]);
    setOptName(''); setOptVals('');
  };

  const removeOption = (id: string) => setOptions(prev => prev.filter(o => o.id !== id));

  const [bulkMode, setBulkMode] = useState<null | 'price' | 'discount' | 'pricePercent' | 'stock'>(null);
  const [bulkVal,  setBulkVal]  = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const combinations = useMemo(() => cartesian(options), [options]);

  useEffect(() => {
    setVariantRows(prev => {
      if (!combinations.length) return [];
      return combinations.map(combo => {
        const key      = comboKey(combo.attributeValues);
        const existing = prev.find(r => r.key === key);
        return existing ?? {
          key,
          combination:     combo.combination,
          attributeValues: combo.attributeValues,
          price:           '',
          discountPrice:   '',
          stock:           '0',
          sku:             '',
          barcode:         '',
          isActive:        true,
        };
      });
    });
  }, [combinations]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRow = useCallback((key: string, field: keyof VariantRow, val: string) => {
    setVariantRows(prev => prev.map(r => r.key === key ? { ...r, [field]: val } : r));
  }, [setVariantRows]);

  const toggleActive = useCallback((key: string) => {
    setVariantRows(prev => prev.map(r => r.key === key ? { ...r, isActive: !r.isActive } : r));
  }, [setVariantRows]);

  const allSelected = variantRows.length > 0 && selected.size === variantRows.length;
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(variantRows.map(r => r.key)));
  const toggleSel   = useCallback((key: string) => setSelected(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  }), []);

  const targetKeys = selected.size > 0 ? [...selected] : variantRows.map(r => r.key);

  const applyBulk = () => {
    const v = bulkVal.trim();
    if (!v) { setBulkMode(null); return; }
    setVariantRows(prev => prev.map(r => {
      if (!targetKeys.includes(r.key)) return r;
      if (bulkMode === 'price')        return { ...r, price: v };
      if (bulkMode === 'discount')     return { ...r, discountPrice: v };
      if (bulkMode === 'stock')        return { ...r, stock: v };
      if (bulkMode === 'pricePercent') {
        const base = r.price ? Number(r.price) : (defaultPrice ? Number(defaultPrice) : 0);
        return { ...r, price: (base * (1 + Number(v) / 100)).toFixed(2) };
      }
      return r;
    }));
    setBulkMode(null); setBulkVal('');
  };

  const activeCount    = variantRows.filter(r => r.isActive).length;
  const withPriceCount = variantRows.filter(r => r.price).length;

  const attrIds    = new Set(variantAttrs.map(ca => ca.attribute.id));
  const attrNames  = new Set(variantAttrs.map(ca => ca.attribute.name));
  const manualOpts = options.filter(o => !attrIds.has(o.id) && !attrNames.has(o.name));

  return (
    <div className="space-y-5" data-field="variants">
      {!categoryId ? (
        <div className="wn-card p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">Önce bir kategori seçin</p>
          <p className="text-xs text-slate-400 mt-1">Kategori seçince varyant özellikleri otomatik gelecek.</p>
        </div>
      ) : attrsLoading ? (
        <div className="wn-card p-6 space-y-4 animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-40"/>
          <div className="h-12 bg-slate-100 rounded-xl"/>
          <div className="h-12 bg-slate-100 rounded-xl"/>
        </div>
      ) : variantAttrs.length > 0 ? (
        <div className="wn-card p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Varyant Seçenekleri</h3>
              <p className="text-xs text-slate-400 mt-0.5">İstediğiniz değerleri seçin — kombinasyonlar otomatik oluşur.</p>
            </div>
            {combinations.length > 0 && (
              <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full">
                {combinations.length} kombinasyon
              </span>
            )}
          </div>

          {variantAttrs.map(ca => {
            const attr     = ca.attribute;
            const sel      = attrSelections[attr.id] ?? [];
            return (
              <div key={attr.id} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">{attr.name}</span>
                  {sel.length > 0 && (
                    <>
                      <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">{sel.length} seçili</span>
                      <button type="button" onClick={() => setAttrSelections(p => ({ ...p, [attr.id]: [] }))}
                        className="text-[11px] text-slate-400 hover:text-red-500 transition-colors ml-auto">Temizle</button>
                    </>
                  )}
                </div>
                {attr.values.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map(v => {
                      const isChecked = sel.some(s => s.label === v.label);
                      return (
                        <button key={v.id} type="button" onClick={() => toggleAttrValue(attr.id, { label: v.label, valueId: v.id })}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                            isChecked
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                          }`}>
                          {v.color && (
                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${isChecked ? 'border-indigo-400' : 'border-white'} shadow-sm`}
                              style={{ background: v.color }}/>
                          )}
                          {isChecked ? (
                            <svg className="w-3 h-3 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                          ) : (
                            <span className="w-3 h-3 rounded border border-slate-300 flex-shrink-0 bg-white"/>
                          )}
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Bu attribute için değer tanımlanmamış.</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="wn-card p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Bu kategoride varyant özelliği yok</p>
            <p className="text-xs text-slate-400 mt-1">
              <strong>Özellikler</strong> sayfasından kategoriye attribute atayın ve <strong>isVariant</strong> işaretleyin.
            </p>
          </div>
        </div>
      )}

      <div className="wn-card overflow-hidden">
        <button type="button" onClick={() => setShowManual(p => !p)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            <span className="text-sm font-semibold text-slate-700">Manuel Seçenek Ekle</span>
            {manualOpts.length > 0 && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">{manualOpts.length}</span>}
          </div>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${showManual ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        {showManual && (
          <div className="px-5 pb-5 pt-1 space-y-3 border-t border-slate-100">
            {manualOpts.length > 0 && (
              <div className="space-y-2">
                {manualOpts.map(opt => (
                  <div key={opt.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-700 block mb-1.5">{opt.name}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {opt.values.map(v => (
                          <span key={v.label} className="px-2 py-0.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600">{v.label}</span>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={() => removeOption(opt.id)}
                      className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-medium">Seçenek Adı</label>
                <input value={optName} onChange={e => setOptName(e.target.value)}
                  placeholder="Örn: Materyal" className="wn-input text-sm"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addManual())}/>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-medium">Değerler <span className="text-slate-400">(virgülle)</span></label>
                <input value={optVals} onChange={e => setOptVals(e.target.value)}
                  placeholder="Pamuk, Polyester" className="wn-input text-sm"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addManual())}/>
              </div>
            </div>
            <button type="button" onClick={addManual}
              className="w-full px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition-colors">
              + Ekle
            </button>
          </div>
        )}
      </div>

      {variantRows.length > 0 ? (
        <div className="wn-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex items-center gap-3 flex-wrap">
            <div className="flex-1">
              <span className="text-sm font-bold text-slate-800">{variantRows.length} Varyant</span>
              <span className="text-xs text-slate-400 ml-2">
                {activeCount}/{variantRows.length} aktif
                {withPriceCount > 0 && ` · ${withPriceCount} özel fiyatlı`}
              </span>
            </div>
            {bulkMode ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {bulkMode === 'price' ? 'Fiyat ₺' : bulkMode === 'pricePercent' ? 'Değişim %' : 'Stok'}
                  {selected.size > 0 ? ` (${selected.size} seçili)` : ' (tümü)'}:
                </span>
                <input autoFocus type="text" inputMode="decimal" value={bulkVal} onChange={e => setBulkVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyBulk()}
                  className="w-24 border border-indigo-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder={bulkMode === 'pricePercent' ? '+10' : '0'}/>
                <button type="button" onClick={applyBulk}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">Uygula</button>
                <button type="button" onClick={() => { setBulkMode(null); setBulkVal(''); }}
                  className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {selected.size > 0 && <span className="text-xs text-indigo-600 font-medium mr-1">{selected.size} seçili</span>}
                <button type="button" onClick={() => setBulkMode('price')} className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">💲 Fiyat Ayarla</button>
                <button type="button" onClick={() => setBulkMode('discount')} className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-emerald-50 text-emerald-600 border-emerald-200 transition-colors">🏷️ İndirim Ayarla</button>
                <button type="button" onClick={() => setBulkMode('pricePercent')} className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">📈 % Artır/Azalt</button>
                <button type="button" onClick={() => setBulkMode('stock')} className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">📦 Stok Ayarla</button>
                <button type="button"
                  onClick={() => setVariantRows(prev => prev.map(r => targetKeys.includes(r.key) ? { ...r, isActive: true } : r))}
                  className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-green-50 text-green-600 transition-colors">✅ Aktifleştir</button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="pl-4 pr-2 py-3 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"/>
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Varyant</th>
                  <th className="px-2 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-28">Fiyat ₺</th>
                  <th className="px-2 py-3 text-left text-[11px] font-semibold text-emerald-500 uppercase tracking-wider w-36">İndirimli ₺</th>
                  <th className="px-2 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-24">Stok</th>
                  <th className="px-2 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-32">SKU</th>
                  <th className="px-2 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-32">Barkod</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-16">Aktif</th>
                </tr>
              </thead>
              <tbody>
                {variantRows.map(row => (
                  <VariantTableRow key={row.key} row={row} defaultPrice={defaultPrice}
                    defaultDiscountPrice={defaultDiscountPrice}
                    onChange={updateRow} onToggleActive={toggleActive}
                    selected={selected.has(row.key)} onToggleSelect={toggleSel}/>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-[11px] text-slate-400">Boş fiyat/indirim = ürün ana fiyatından miras alınır. SKU boş bırakılırsa otomatik atanır.</p>
          </div>
        </div>
      ) : options.length > 0 ? (
        <div className="wn-card p-6 text-center text-xs text-slate-400">Hiç seçim yapılmadı — yukarıdan değer seçin.</div>
      ) : null}
    </div>
  );
}

// ─── Trendyol Cargo Companies (static list from official docs) ───────────────
const TRENDYOL_CARGO_COMPANIES = [
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

// ─── Shipping Tab ─────────────────────────────────────────────────────────────

function ShippingTab({ form, productId }: { form: any; productId?: string }) {
  const { register, watch, setValue } = form;
  const free   = watch('freeShipping');
  const width  = Number(watch('width')  || 0);
  const height = Number(watch('height') || 0);
  const length = Number(watch('length') || 0);
  const desiManual = watch('desi');

  const autoDesi = (width && height && length)
    ? +((width * height * length) / 3000).toFixed(2)
    : null;
  const desiDisplay = desiManual ? Number(desiManual) : autoDesi ?? 0;

  const shippingHint = desiDisplay > 0
    ? desiDisplay <= 1    ? '✅ Hafif kargo — standart tarife geçerli'
    : desiDisplay <= 3    ? '📦 Orta boy kargo — çoğu firma kabul eder'
    : desiDisplay <= 10   ? '🚚 Büyük kargo — özel anlaşma gerekebilir'
                          : '🏗️ Çok büyük kargo — lojistik firması ile görüşün'
    : null;

  return (
    <div className="space-y-6">
      <div className="wn-card p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Boyut & Ağırlık</h3>
          <p className="text-xs text-slate-400 mt-1">Ölçüler girilince desi otomatik hesaplanır.</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="En" hint="cm">
            <div className="relative">
              <input {...register('width')} type="text" inputMode="decimal" placeholder="0" className="wn-input pr-8"/>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">cm</span>
            </div>
          </Field>
          <Field label="Boy" hint="cm">
            <div className="relative">
              <input {...register('height')} type="text" inputMode="decimal" placeholder="0" className="wn-input pr-8"/>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">cm</span>
            </div>
          </Field>
          <Field label="Yükseklik" hint="cm">
            <div className="relative">
              <input {...register('length')} type="text" inputMode="decimal" placeholder="0" className="wn-input pr-8"/>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">cm</span>
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Desi" hint={autoDesi && !desiManual ? `Otomatik: ${autoDesi}` : 'Hacimsel ağırlık'}>
            <input {...register('desi')} type="text" inputMode="decimal" placeholder={autoDesi ? String(autoDesi) : '0.00'} className="wn-input"/>
            {autoDesi && !desiManual && (
              <p className="text-[11px] text-indigo-500 mt-1">⚡ {width}×{height}×{length}/3000 = <strong>{autoDesi}</strong> desi</p>
            )}
          </Field>
          <Field label="Ağırlık" hint="kg">
            <div className="relative">
              <input {...register('weight')} type="text" inputMode="decimal" placeholder="0.00" className="wn-input pr-10"/>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs select-none">kg</span>
            </div>
          </Field>
        </div>
        {shippingHint && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">{shippingHint}</div>
        )}
      </div>

      <div className="wn-card p-6 space-y-5">
        <h3 className="text-sm font-semibold text-slate-800">Kargo Ücreti</h3>
        <div onClick={() => setValue('freeShipping', !free)}
          className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${free ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
          <div className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5 pointer-events-none ${free ? 'bg-emerald-500' : 'bg-slate-200'}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${free ? 'translate-x-5' : 'translate-x-0'}`}/>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Ücretsiz Kargo</p>
            <p className="text-xs text-slate-500 mt-0.5">{free ? '✅ Bu ürün için kargo bedavaya gönderilir' : 'Kargo ücreti eklenmedi'}</p>
          </div>
        </div>
        {!free && (
          <Field label="Kargo Ücreti">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">₺</span>
              <input {...register('shippingCost')} type="text" inputMode="decimal" placeholder="0.00" className="wn-input pl-8"/>
            </div>
          </Field>
        )}
      </div>

      {/* ── Trendyol Kargo Ayarları ── */}
      <div className="wn-card p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <h3 className="text-sm font-semibold text-slate-800">Trendyol Kargo Ayarları</h3>
          </div>
          <p className="text-xs text-slate-400">Bu ürün Trendyol'a gönderilirken kullanılacak kargo bilgileri. Boş bırakılırsa global Trendyol ayarları geçerli olur.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Kargo Firması">
            <select {...register('cargoCompanyId')} className="wn-input">
              <option value="">Global ayarı kullan</option>
              {TRENDYOL_CARGO_COMPANIES.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name} (ID: {c.id})</option>
              ))}
            </select>
          </Field>
          <Field label="Teslimat Süresi" hint="gün">
            <div className="relative">
              <input {...register('deliveryDuration')} type="text" inputMode="numeric"
                placeholder="Global ayarı kullan"
                className="wn-input pr-10"/>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs select-none">gün</span>
            </div>
          </Field>
        </div>
        <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-xl text-xs text-orange-700 border border-orange-100">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>Trendyol sözleşmenizdeki kargo firmasından farklı bir firma seçmek ürününüzün yayına çıkmasını engelleyebilir.</span>
        </div>
      </div>

      {/* ── Trendyol Fiyat Override ── */}
      {productId && <TrendyolPriceOverridePanel productId={productId} />}
    </div>
  );
}

// ─── Trendyol Price Override Panel ───────────────────────────────────────────

const TRENDYOL_VAT_RATES = [0, 1, 8, 10, 18, 20];

function TrendyolPriceOverridePanel({ productId }: { productId: string }) {
  const qc = useQueryClient();

  const { data: override, isLoading } = useQuery({
    queryKey: ['trendyol-price-override', productId],
    queryFn:  () => apiClient.get(`/trendyol/price-override/${productId}`).then(r => r.data as { customPrice?: number; mode?: string; value?: number; vatRate?: number } | null),
    staleTime: 0,
    retry: false,
  });

  const [form, setForm] = React.useState({
    enabled:     false,
    customPrice: '',
    mode:        'none' as 'none' | 'percent' | 'fixed',
    value:       '',
    vatRate:     '',
  });
  const [saving, setSaving]   = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [hasOverride, setHasOverride] = React.useState(false);

  React.useEffect(() => {
    if (override) {
      setHasOverride(true);
      setForm({
        enabled:     true,
        customPrice: override.customPrice != null ? String(override.customPrice) : '',
        mode:        (override.mode as any) ?? 'none',
        value:       override.value != null ? String(override.value) : '',
        vatRate:     override.vatRate != null ? String(override.vatRate) : '',
      });
    }
  }, [override]);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.post(`/trendyol/price-override/${productId}`, {
        customPrice: form.customPrice ? Number(form.customPrice) : undefined,
        mode:        form.mode !== 'none' ? form.mode : undefined,
        value:       form.value ? Number(form.value) : undefined,
        vatRate:     form.vatRate ? Number(form.vatRate) : undefined,
      });
      qc.invalidateQueries({ queryKey: ['trendyol-price-override', productId] });
      setHasOverride(true);
      hotToast.success('Trendyol fiyat ayarı kaydedildi.');
    } catch {
      hotToast.error('Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await apiClient.delete(`/trendyol/price-override/${productId}`);
      qc.invalidateQueries({ queryKey: ['trendyol-price-override', productId] });
      setHasOverride(false);
      setForm({ enabled: false, customPrice: '', mode: 'none', value: '', vatRate: '' });
      hotToast.success('Trendyol fiyat ayarı kaldırıldı.');
    } catch {
      hotToast.error('Silme sırasında hata oluştu.');
    } finally {
      setRemoving(false);
    }
  };

  // Live preview for custom calculation (not custom price)
  const previewPrice = React.useMemo(() => {
    if (form.customPrice) return null; // custom price is self-explanatory
    if (!form.mode || form.mode === 'none') return null;
    const base = 100;
    const v    = Number(form.value) || 0;
    if (form.mode === 'percent') return parseFloat((base * (1 + v / 100)).toFixed(2));
    if (form.mode === 'fixed')   return parseFloat((base + v).toFixed(2));
    return null;
  }, [form.customPrice, form.mode, form.value]);

  if (isLoading) return null;

  return (
    <div className="wn-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-orange-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              Trendyol Fiyat Override
              {hasOverride && (
                <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Aktif</span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Bu ürün için global Trendyol fiyat stratejisini geçersiz kıl.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasOverride && (
            <button onClick={remove} disabled={removing}
              className="px-3 py-1.5 text-xs border border-red-200 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 transition-colors">
              {removing ? 'Kaldırılıyor…' : 'Override Kaldır'}
            </button>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors">
            {saving
              ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
            }
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* ── Option A: Fixed custom price ── */}
      <div className="p-4 border border-gray-200 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Seçenek A — Özel Fiyat</p>
        <p className="text-xs text-gray-500">Trendyol'a gönderilecek kesin fiyatı belirle. Strateji ve artış göz ardı edilir.</p>
        <div className="relative w-48">
          <input type="text" inputMode="decimal" placeholder="Boş bırak = kullanma"
            value={form.customPrice}
            onChange={e => setForm(f => ({ ...f, customPrice: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₺</span>
        </div>
      </div>

      {/* ── Option B: Custom increase ── */}
      <div className={`p-4 border rounded-xl space-y-3 transition-opacity ${form.customPrice ? 'opacity-40 pointer-events-none' : 'border-gray-200'}`}>
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Seçenek B — Artış Override</p>
        <p className="text-xs text-gray-500">Global strateji yerine bu ürüne özel artış uygula.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Artış Yöntemi</label>
            <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value as any }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="none">Global stratejiyi kullan</option>
              <option value="percent">Yüzde artış (%)</option>
              <option value="fixed">Sabit artış (₺)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              {form.mode === 'percent' ? 'Yüzde (%)' : form.mode === 'fixed' ? 'Tutar (₺)' : 'Değer'}
            </label>
            <input type="text" inputMode="decimal"
              disabled={form.mode === 'none'}
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              placeholder={form.mode === 'none' ? '—' : '0'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-400"/>
          </div>
        </div>

        {previewPrice !== null && (
          <p className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
            Örnek: 100 ₺ → Trendyol'a <strong>{previewPrice.toLocaleString('tr-TR')} ₺</strong>
          </p>
        )}
      </div>

      {/* ── KDV override ── */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">KDV Oranı Override (%)</label>
        <select value={form.vatRate} onChange={e => setForm(f => ({ ...f, vatRate: e.target.value }))}
          className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="">Global KDV oranını kullan</option>
          {TRENDYOL_VAT_RATES.map(r => <option key={r} value={String(r)}>%{r}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Advanced Tab ─────────────────────────────────────────────────────────────

function AdvancedTab({ form }: { form: any }) {
  const { register, watch, setValue } = form;
  const isActive  = watch('isActive');
  const publishAt = watch('publishAt');

  return (
    <div className="space-y-6">
      <div className="wn-card p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Yayın Durumu</h3>
          <p className="text-xs text-slate-400 mt-1">Ürünün mağazada görünürlüğünü kontrol edin.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { val: true,  label: 'Aktif',  desc: 'Mağazada görünür', dot: 'bg-emerald-400' },
            { val: false, label: 'Taslak', desc: 'Mağazada gizli',   dot: 'bg-slate-300'   },
          ].map(opt => (
            <button key={String(opt.val)} type="button" onClick={() => setValue('isActive', opt.val)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isActive === opt.val ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}>
              <div className={`w-2.5 h-2.5 rounded-full mb-2.5 ${opt.dot}`}/>
              <p className="text-sm font-bold text-slate-800">{opt.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="wn-card p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Zamanlanmış Yayın</h3>
          <p className="text-xs text-slate-400 mt-1">Belirli bir tarihte otomatik yayına alın.</p>
        </div>
        <Field label="Yayın Tarihi & Saati" hint="Opsiyonel">
          <input {...register('publishAt')} type="datetime-local" className="wn-input"/>
        </Field>
        {publishAt && (
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-xs text-indigo-700 font-medium">
              {new Date(publishAt).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })} tarihinde otomatik yayınlanacak
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── localStorage draft helpers ───────────────────────────────────────────────

function draftKey(tenantId: string) { return `product_draft_${tenantId}`; }

function saveDraft(tenantId: string, data: object) {
  try { localStorage.setItem(draftKey(tenantId), JSON.stringify({ ...data, _savedAt: Date.now() })); }
  catch { /* quota exceeded */ }
}

function loadDraft(tenantId: string): Record<string, any> | null {
  try { const raw = localStorage.getItem(draftKey(tenantId)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

function clearDraft(tenantId: string) {
  try { localStorage.removeItem(draftKey(tenantId)); } catch { /* ignore */ }
}

// ─── UI Skeletons ─────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="-mx-6 -my-6 min-h-screen bg-slate-50 animate-pulse">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center gap-4">
        <div className="h-4 w-16 bg-slate-200 rounded"/>
        <div className="w-px h-5 bg-slate-200"/>
        <div className="h-6 w-48 bg-slate-200 rounded flex-1"/>
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-slate-100 rounded-xl"/>
          <div className="h-9 w-28 bg-slate-200 rounded-xl"/>
        </div>
      </div>
      {/* Tab bar skeleton */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-1">
        {Array.from({length: 7}).map((_, i) => (
          <div key={i} className="h-11 w-20 bg-slate-100 rounded mx-0.5"/>
        ))}
      </div>
      {/* Content skeleton */}
      <div className="px-6 py-8 grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-6">
          <div className="wn-card p-6 space-y-4">
            <div className="h-4 w-32 bg-slate-200 rounded"/>
            <div className="h-10 bg-slate-100 rounded-xl"/>
            <div className="h-32 bg-slate-100 rounded-xl"/>
          </div>
          <div className="wn-card p-6 space-y-4">
            <div className="h-4 w-32 bg-slate-200 rounded"/>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-slate-100 rounded-xl"/>
              <div className="h-10 bg-slate-100 rounded-xl"/>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="wn-card p-5 h-48 bg-white"/>
          <div className="wn-card p-5 h-36 bg-white"/>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="-mx-6 -my-6 min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Ürün yüklenemedi</h2>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            ← Geri dön
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-sm text-white font-bold transition-colors"
          >
            Tekrar dene
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// Default form values — used both for new products and as reset base
const FORM_DEFAULTS: ProductFormData = {
  name: '', description: '', categoryId: '', brand: '', barcode: '', unit: 'adet',
  price: '', basePrice: '', discountPrice: '', vatRate: '20', currency: 'TRY',
  stock: '0', stockUnit: 'adet', minStock: '', sku: '',
  slug: '', metaTitle: '', metaDescription: '',
  weight: '', width: '', height: '', length: '', desi: '', shippingCost: '', freeShipping: false,
  cargoCompanyId: '', deliveryDuration: '',
  isActive: true, status: 'draft', publishAt: '',
};

// Map server product object → ProductFormData
function serverToForm(existing: any): ProductFormData {
  const cf: any       = existing.customFields ?? {};
  const pricing: any  = existing.pricing      ?? {};
  const shipping: any = existing.shipping     ?? {};
  const stock: any    = existing.stock        ?? {};

  return {
    name:            existing.name        ?? '',
    description:     existing.description ?? '',
    categoryId:      existing.categoryId  ?? '',
    brand:           existing.brand       ?? cf.brand ?? '',
    barcode:         existing.barcode     ?? '',
    unit:            existing.unit        ?? 'adet',
    price:           String(pricing.salePrice     ?? existing.price ?? ''),
    basePrice:       String(pricing.purchasePrice ?? existing.basePrice ?? ''),
    discountPrice:   String(pricing.discountPrice ?? cf.discountPrice ?? ''),
    vatRate:         String(pricing.vatRate       ?? cf.vatRate ?? '20'),
    currency:        pricing.currency ?? 'TRY',
    stock:           String(stock.quantity  ?? '0'),
    stockUnit:       stock.unit ?? 'adet',
    minStock:        stock.minStock != null ? String(stock.minStock) : '',
    sku:             existing.sku  ?? '',
    slug:            existing.slug ?? '',
    metaTitle:       cf.metaTitle       ?? '',
    metaDescription: cf.metaDescription ?? '',
    weight:          String(shipping.weight       ?? cf.weight ?? ''),
    width:           String(shipping.width        ?? ''),
    height:          String(shipping.height       ?? ''),
    length:          String(shipping.length       ?? ''),
    desi:            String(shipping.desi         ?? cf.desi ?? ''),
    shippingCost:    String(shipping.shippingCost ?? cf.shippingCost ?? ''),
    freeShipping:     shipping.freeShipping ?? cf.freeShipping ?? false,
    cargoCompanyId:   shipping.cargoCompanyId   != null ? String(shipping.cargoCompanyId)   : '',
    deliveryDuration: shipping.deliveryDuration != null ? String(shipping.deliveryDuration) : '',
    isActive:         existing.isActive ?? true,
    status:          existing.status   ?? 'active',
    publishAt:       cf.publishAt ?? '',
  };
}

export default function ProductEdit() {
  const navigate    = useNavigate();
  const { id: urlId } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const toast       = useToast();

  const user     = useAppStore(s => s.user);
  const tenantId = user?.tenantId ?? 'default';

  // ── UI state (local only) ─────────────────────────────────────────────────
  const [activeTab,   setActiveTab]   = useState<TabId>('general');
  const [saving,      setSaving]      = useState(false);
  const [saveStep,    setSaveStep]    = useState('');
  const [isSaving,    setIsSaving]    = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Images — managed outside RHF because of file-upload state (uploading, error)
  const [images,      setImages]      = useState<ImageItem[]>([]);
  const [mainImageId, setMainImageId] = useState<string | null>(null);
  // Variants — managed outside RHF because of complex combination logic
  const [options,     setOptions]     = useState<VariantOption[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  // Attributes — per-category dynamic fields
  const [attrValues, setAttrValues]   = useState<Record<string, string>>({});
  // Draft restore banner (new products only)
  const [hasDraft,       setHasDraft]       = useState(false);
  const [draftDismissed, setDraftDismissed] = useState(false);

  // currentId: from URL for edit, set after creation for new
  const [currentId, setCurrentId] = useState<string | null>(urlId ?? null);

  const autoSaveTimer  = useRef<ReturnType<typeof setTimeout>>(undefined);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Autosave: abort controller cancels in-flight request when new changes arrive
  const abortCtrl      = useRef<AbortController | null>(null);
  // Separate snapshots for form vs variants — only changed sections get saved
  const lastFormSnap   = useRef<string>('');
  const lastVarSnap    = useRef<string>('');
  // Mirror of `saving` (manual save) as ref so the autosave timer reads latest without stale closure
  const savingRef      = useRef(false);

  const form = useForm<ProductFormData>({ defaultValues: FORM_DEFAULTS });
  const { handleSubmit, watch, reset, register } = form;
  const watchAll    = watch();
  const isActive    = watch('isActive');

  // Keep savingRef in sync with `saving` so the autosave timer can check it without stale closure
  useEffect(() => { savingRef.current = saving; }, [saving]);

  // ── SERVER STATE — source of truth for existing products ──────────────────
  // staleTime: 0 → always refetch on mount/navigation, so page refresh
  // picks up the latest backend data automatically.
  const {
    data: existing,
    isLoading,
    isError,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['product', currentId],
    queryFn:  async () => {
      if (!currentId) return null;
      const res     = await apiClient.get(`/products/${currentId}`);
      const product = res.data as any;
      // Handle both wrapped { data: product } and already-unwrapped shapes
      return product?.id ? product : (product?.data ?? null);
    },
    enabled:   !!currentId,
    staleTime: 0,            // always fetch fresh on mount → refresh is safe
    retry:     1,            // one retry on network error, then show error screen
    refetchOnWindowFocus: false,  // don't refetch mid-editing
  });

  // ── Seed form from backend data ───────────────────────────────────────────
  // Runs once when query resolves (existing goes from undefined → object)
  // This is the single place where server data enters the form.
  useEffect(() => {
    if (!existing) return;

    // 1. Form fields — built from server shape
    reset(serverToForm(existing));

    // 2. Images
    const imgList: { id: string; url: string }[] =
      Array.isArray(existing.productImages) && existing.productImages.length
        ? existing.productImages.map((img: any) => ({ id: img.id ?? uid(), url: img.url }))
        : (Array.isArray(existing.images) ? existing.images.map((url: string) => ({ id: uid(), url })) : []);

    if (imgList.length) {
      setImages(imgList.map(i => ({ ...i, uploading: false })));
      const main = existing.productImages?.find((i: any) => i.isMain);
      if (main) setMainImageId(main.id);
    }

    // 3. Variant rows from DB (source of truth for per-variant fields)
    if (Array.isArray(existing.variants) && existing.variants.length > 0) {
      const rows: VariantRow[] = existing.variants.map((v: any) => {
        // Build relational attributeValues from variantAttributes (new model)
        const attrCells: VariantAttrCell[] = Array.isArray(v.variantAttributes)
          ? v.variantAttributes.map((va: any) => ({
              attributeId: va.attributeId,
              attrName:    va.attribute?.name ?? '',
              label:       va.attributeValue?.label ?? va.textValue ?? '',
              valueId:     va.valueId ?? null,
            }))
          : [];

        // Fallback: derive cells from combination JSON if no relational data yet
        const combination: Record<string, string> = v.combination ?? {};
        const effectiveCells = attrCells.length > 0
          ? attrCells
          : Object.entries(combination).map(([attrName, label]) => ({
              attributeId: attrName, // placeholder — no real ID for legacy data
              attrName,
              label: label as string,
              valueId: null,
            }));

        const key = effectiveCells.length > 0
          ? comboKey(effectiveCells)
          : legacyComboKey(combination);

        return {
          id:            v.id,
          key,
          combination,
          displayName:   v.displayName ?? undefined,
          attributeValues: effectiveCells,
          price:         v.price         != null ? String(v.price)         : '',
          discountPrice: v.discountPrice != null ? String(v.discountPrice) : '',
          stock:         String(v.stockQuantity ?? 0),
          sku:           v.sku     ?? '',
          barcode:       v.barcode ?? '',
          isActive:      v.isActive ?? true,
        };
      });
      setVariantRows(rows);

      // 4. Reconstruct options from variantAttributes so checkboxes show as selected
      //    Build VariantOption[] from unique per-attribute selections across all rows
      const optMap = new Map<string, VariantOption>();
      for (const row of rows) {
        for (const cell of row.attributeValues) {
          const opt = optMap.get(cell.attributeId) ?? {
            id:     cell.attributeId,
            name:   cell.attrName,
            values: [] as VariantValueItem[],
          };
          if (!opt.values.some(x => x.label === cell.label)) {
            opt.values.push({ label: cell.label, valueId: cell.valueId });
          }
          optMap.set(cell.attributeId, opt);
        }
      }
      if (optMap.size > 0) setOptions([...optMap.values()]);
    } else if (existing.variantOptions) {
      // Fallback: use stored variantOptions (old format — convert values to VariantValueItem[])
      const legacyOpts = (existing.variantOptions as any[]).map((o: any) => ({
        id:     o.id ?? uid(),
        name:   o.name ?? '',
        values: Array.isArray(o.values)
          ? o.values.map((v: any) => typeof v === 'string' ? { label: v, valueId: null } : v)
          : [],
      })) as VariantOption[];
      setOptions(legacyOpts);
    }

    // 5. Attribute values
    if (Array.isArray(existing.attributeValues) && existing.attributeValues.length) {
      const avMap: Record<string, string> = {};
      for (const av of existing.attributeValues) {
        const value = av.attributeValue?.value ?? av.value;
        if (!value) continue;
        const prev = avMap[av.attributeId];
        avMap[av.attributeId] = prev ? `${prev},${value}` : value;
      }
      setAttrValues(avMap);
    }
  }, [existing, reset]);

  // ── Draft restore (new products only) ────────────────────────────────────
  // For existing products the backend is the source of truth — no draft needed.
  useEffect(() => {
    if (currentId) return;
    const draft = loadDraft(tenantId);
    if (draft?._savedAt) setHasDraft(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const restoreDraft = useCallback(() => {
    const draft = loadDraft(tenantId);
    if (!draft) return;
    const { _savedAt, _images, _attrValues, _options, _variantRows, ...formData } = draft;
    reset(formData as ProductFormData);
    if (Array.isArray(_images))      setImages(_images);
    if (_attrValues)                 setAttrValues(_attrValues);
    if (Array.isArray(_options))     setOptions(_options);
    if (Array.isArray(_variantRows)) setVariantRows(_variantRows);
    setHasDraft(false);
    toast.success('Taslak geri yüklendi');
  }, [tenantId, reset, toast]);

  const dismissDraft = useCallback(() => {
    clearDraft(tenantId);
    setHasDraft(false);
    setDraftDismissed(true);
  }, [tenantId]);

  // ── Draft autosave (new products only, debounced 2s) ─────────────────────
  useEffect(() => {
    if (currentId)       return; // editing existing → backend auto-save instead
    if (draftDismissed)  return;

    clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      const sig = watchAll.name || watchAll.price || watchAll.categoryId;
      if (!sig) return;
      saveDraft(tenantId, { ...watchAll, _images: images, _attrValues: attrValues, _options: options, _variantRows: variantRows });
    }, 2000);

    return () => clearTimeout(draftSaveTimer.current);
  }, [watchAll, images, attrValues, options, variantRows, currentId, tenantId, draftDismissed]);

  // ── Category list (for tree select & right panel) ─────────────────────────
  const { data: categories = [] } = useQuery<FlatCategoryNode[]>({
    queryKey: ['categories', 'flat'],
    queryFn:  () => categoryService.getFlat(),
    staleTime: 60_000,
  });

  const handleAttrChange = useCallback((attributeId: string, val: string) => {
    setAttrValues(prev => ({ ...prev, [attributeId]: val }));
  }, []);

  // ── Build save payload ─────────────────────────────────────────────────────
  const buildPayload = useCallback((values: ProductFormData, isActiveOverride?: boolean) => {
    const uploadedImages = images.filter(i => !i.uploading && !i.error);

    const cf: Record<string, any> = {};
    if (values.metaTitle)       cf.metaTitle       = values.metaTitle;
    if (values.metaDescription) cf.metaDescription = values.metaDescription;
    if (values.publishAt)       cf.publishAt       = values.publishAt;

    const w = values.width  ? Number(values.width)  : null;
    const h = values.height ? Number(values.height) : null;
    const l = values.length ? Number(values.length) : null;
    const autoDesi = (w && h && l) ? +((w * h * l) / 3000).toFixed(2) : null;
    const desi     = values.desi ? Number(values.desi) : autoDesi;

    return {
      name:           values.name,
      description:    values.description || null,
      categoryId:     values.categoryId  || null,
      brand:          values.brand       || null,
      barcode:        values.barcode     || null,
      unit:           values.unit        || 'adet',
      sku:            values.sku         || null,
      slug:           values.slug        || undefined,
      price:          values.price ? Number(values.price) : 0,
      isActive:       isActiveOverride ?? values.isActive,
      status:         isActiveOverride === true ? 'active' : isActiveOverride === false ? 'draft' : (values.status ?? 'draft'),
      hasVariants:    options.length > 0,
      variantOptions: options.length > 0 ? options : null,
      customFields:   Object.keys(cf).length ? cf : null,
      pricing: {
        salePrice:     values.price ? Number(values.price) : 0,
        purchasePrice: values.basePrice     ? Number(values.basePrice)     : null,
        discountPrice: values.discountPrice ? Number(values.discountPrice) : null,
        vatRate:       Number(values.vatRate ?? 20),
        currency:      values.currency || 'TRY',
      },
      shipping: {
        weight:           values.weight           ? Number(values.weight)           : null,
        width: w, height: h, length: l, desi,
        freeShipping:     values.freeShipping ?? false,
        shippingCost:     values.shippingCost     ? Number(values.shippingCost)     : null,
        cargoCompanyId:   values.cargoCompanyId   ? Number(values.cargoCompanyId)   : null,
        deliveryDuration: values.deliveryDuration ? Number(values.deliveryDuration) : null,
      },
      stock: {
        quantity: Number(values.stock ?? 0),
        unit:     values.stockUnit || 'adet',
        minStock: values.minStock ? Number(values.minStock) : null,
      },
      images: uploadedImages.map((img, idx) => ({
        url: img.url, order: idx,
        isMain: mainImageId ? img.id === mainImageId : idx === 0,
      })),
    };
  }, [images, mainImageId, options]);

  // ── Core save (4 steps) ───────────────────────────────────────────────────
  const doSave = useCallback(async (values: ProductFormData, activeOverride?: boolean) => {
    const payload = buildPayload(values, activeOverride);
    const { images: imgPayload, stock: stockPayload, pricing, shipping, ...mainPayload } = payload as any;

    let pid = currentId;

    // STEP 1 — Product
    setSaveStep('Ürün kaydediliyor…');
    if (pid) {
      try {
        await apiClient.put(`/products/${pid}`, { ...mainPayload, pricing, shipping, stock: stockPayload });
      } catch (err: any) {
        const detail = err?.response?.data?.details;
        const msg    = err?.response?.data?.error ?? err?.message ?? 'Ürün güncellenemedi';
        throw new Error(detail ? `${msg}: ${JSON.stringify(detail)}` : msg);
      }
    } else {
      let res;
      try {
        res = await apiClient.post('/products', { ...mainPayload, pricing, shipping, stock: stockPayload });
      } catch (err: any) {
        const detail = err?.response?.data?.details;
        const msg    = err?.response?.data?.error ?? err?.message ?? 'Ürün oluşturulamadı';
        throw new Error(detail ? `${msg}: ${JSON.stringify(detail)}` : msg);
      }
      const created = res.data as any;
      pid = created?.id ?? created?.data?.id;
      if (!pid) throw new Error('Ürün oluşturuldu ama ID alınamadı. Sayfayı yenileyip tekrar deneyin.');
      setCurrentId(pid);
    }

    // STEP 2 — Images (non-fatal)
    const readyImages = imgPayload?.filter((i: any) => !i.uploading && i.url?.startsWith('http'));
    if (readyImages?.length) {
      setSaveStep('Görseller kaydediliyor…');
      try { await apiClient.put(`/products/${pid}/images`, { images: readyImages }); }
      catch { console.warn('[doSave] Image save failed'); }
    }

    // STEP 3 — Variants (fatal — data integrity matters)
    if (options.length > 0) {
      setSaveStep('Varyantlar kaydediliyor…');
      const vPayload = variantRows.map(row => ({
        id:            row.id,
        name:          row.attributeValues.map(av => av.label).join(' / ')
                       || Object.values(row.combination).join(' / '),
        price:         row.price         !== '' ? Number(row.price)         : null,
        discountPrice: row.discountPrice !== '' ? Number(row.discountPrice) : null,
        sku:           row.sku.trim()     || null,
        barcode:       row.barcode.trim() || null,
        stock:         Number(row.stock ?? 0),
        combination:   row.combination,
        isActive:      row.isActive,
        // Relational payload: one entry per attribute cell
        attributeValues: row.attributeValues
          .filter(av => !!av.attributeId)
          .map(av => ({
            attributeId: av.attributeId,
            valueId:     av.valueId    ?? null,
            textValue:   av.valueId    ? null : av.label,
            label:       av.label,
          })),
      }));
      try {
        await apiClient.put(`/products/${pid}/variants`, { options, variants: vPayload });
      } catch (err: any) {
        throw new Error(err?.response?.data?.error ?? err?.message ?? 'Varyantlar kaydedilemedi');
      }
    } else if (currentId) {
      try { await apiClient.put(`/products/${pid}/variants`, { options: [], variants: [] }); }
      catch { /* non-fatal */ }
    }

    // STEP 4 — Attributes (non-fatal)
    const attrPayload = Object.entries(attrValues)
      .filter(([, v]) => v !== '')
      .flatMap(([attributeId, val]) =>
        val.includes(',')
          ? val.split(',').filter(Boolean).map(v => ({ attributeId, value: v }))
          : [{ attributeId, value: val }]
      );
    if (attrPayload.length > 0) {
      setSaveStep('Özellikler kaydediliyor…');
      try { await attributeService.saveProductValues(pid!, attrPayload); }
      catch { console.warn('[doSave] Attribute save failed'); }
    }

    setSaveStep('');
    return pid!;
  }, [currentId, buildPayload, options, variantRows, attrValues]);

  // ── Production autosave — 800ms debounce, cancel-token, split endpoints ──
  //
  // • Only fires for existing products (currentId must be set).
  // • Separately tracks form-state vs variant-state; only calls the endpoint
  //   that actually changed — PATCH /products/:id OR PUT /products/:id/variants.
  // • Each keypress burst gets one AbortController; the previous in-flight
  //   request is cancelled (AbortError) before a new one starts.
  // • While a manual save (Publish / Draft) is running, autosave skips its
  //   turn to avoid racing on the same resource.
  // • lastSavedAt updates only when the request fully completes (not on abort).
  useEffect(() => {
    if (!currentId) return;

    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      // Skip if a manual save is in progress
      if (savingRef.current) return;

      // ── Build stable snapshots ────────────────────────────────────────
      const formSnap = JSON.stringify({
        ...watchAll,
        _imgs:    images.map(i => i.url),
        _imgMain: mainImageId,
      });
      const varSnap = JSON.stringify(
        variantRows.map(r => ({
          key:      r.key,
          price:    r.price,
          stock:    r.stock,
          sku:      r.sku,
          barcode:  r.barcode,
          isActive: r.isActive,
        }))
      );

      const formChanged     = formSnap !== lastFormSnap.current;
      const variantsChanged = varSnap  !== lastVarSnap.current;
      if (!formChanged && !variantsChanged) return;

      // ── Cancel in-flight request, start fresh ─────────────────────────
      abortCtrl.current?.abort();
      abortCtrl.current = new AbortController();
      const { signal } = abortCtrl.current;

      setIsSaving(true);

      try {
        // ── PATCH main product (form + images) ──────────────────────────
        if (formChanged) {
          const full = buildPayload(watchAll);
          const { images: imgPayload, stock: stockPayload, pricing, shipping, ...mainPayload } = full as any;

          await apiClient.patch(
            `/products/${currentId}`,
            { ...mainPayload, pricing, shipping, stock: stockPayload },
            { signal },
          );

          // Images: only send when list actually has ready items
          const readyImgs = (imgPayload as any[]).filter(
            (i: any) => !i.uploading && i.url?.startsWith('http'),
          );
          if (readyImgs.length) {
            await apiClient.put(
              `/products/${currentId}/images`,
              { images: readyImgs },
              { signal },
            );
          }

          lastFormSnap.current = formSnap;
        }

        // ── PUT variants (separate endpoint) ────────────────────────────
        if (variantsChanged) {
          const vPayload = variantRows.map(row => ({
            id:            row.id,
            name:          row.attributeValues.map(av => av.label).join(' / ')
                           || Object.values(row.combination).join(' / '),
            price:         row.price         !== '' ? Number(row.price)         : null,
            discountPrice: row.discountPrice !== '' ? Number(row.discountPrice) : null,
            sku:           row.sku.trim()     || null,
            barcode:       row.barcode.trim() || null,
            stock:         Number(row.stock ?? 0),
            combination:   row.combination,
            isActive:      row.isActive,
            attributeValues: row.attributeValues
              .filter(av => !!av.attributeId)
              .map(av => ({
                attributeId: av.attributeId,
                valueId:     av.valueId ?? null,
                textValue:   av.valueId ? null : av.label,
                label:       av.label,
              })),
          }));

          await apiClient.put(
            `/products/${currentId}/variants`,
            { options, variants: vPayload },
            { signal },
          );

          lastVarSnap.current = varSnap;
        }

        // Only mark saved when the full round-trip completed (not on abort)
        if (!signal.aborted) setLastSavedAt(new Date());
      } catch (err: any) {
        // AbortController / Axios cancel — newer request replaced this one, silent
        if (
          err?.name === 'AbortError'      ||
          err?.code === 'ERR_CANCELED'    ||
          err?.code === 'CANCELLED'       ||
          err?.message === 'canceled'
        ) return;
        console.warn('[autosave]', err?.message);
      } finally {
        if (!signal.aborted) setIsSaving(false);
      }
    }, 800);

    return () => clearTimeout(autoSaveTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchAll, images, variantRows, currentId]);

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleAddImage = useCallback(async (file: File) => {
    const id = uid();
    setImages(prev => [...prev, { id, url: URL.createObjectURL(file), uploading: true }]);
    try {
      const remoteUrl = await productService.uploadImage(file);
      setImages(prev => prev.map(img => img.id === id ? { ...img, url: remoteUrl, uploading: false } : img));
    } catch {
      setImages(prev => prev.map(img => img.id === id ? { ...img, uploading: false, error: 'Yükleme başarısız' } : img));
    }
  }, []);

  // ── Validation helpers ────────────────────────────────────────────────────

  // Field key → which tab it lives on + its data-field anchor id
  const FIELD_TAB_MAP = useMemo(
    () => ({
      name:          { tab: 'general'  as TabId, fieldId: 'name'          },
      price:         { tab: 'pricing'  as TabId, fieldId: 'price'         },
      discountPrice: { tab: 'pricing'  as TabId, fieldId: 'discountPrice' },
      stock:         { tab: 'pricing'  as TabId, fieldId: 'stock'         },
      sku:           { tab: 'general'  as TabId, fieldId: 'sku'           },
      barcode:       { tab: 'general'  as TabId, fieldId: 'barcode'       },
    }),
    [],
  );

  /** Switch tab, then smooth-scroll to the field and focus its first input. */
  const focusField = useCallback((fieldId: string, tab: TabId) => {
    setActiveTab(tab);
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${fieldId}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.querySelector<HTMLElement>('input,select,textarea')?.focus({ preventScroll: true });
    }, 60);
  }, [setActiveTab]);

  /**
   * Called by handleSubmit when RHF field-level validation fails.
   * Switches to the tab containing the first error and shows a toast.
   */
  const onInvalid = useCallback((rhfErrors: Record<string, any>) => {
    const firstKey = Object.keys(rhfErrors)[0] as keyof typeof FIELD_TAB_MAP;
    const cfg = FIELD_TAB_MAP[firstKey];
    toast.error(rhfErrors[firstKey]?.message ?? 'Lütfen zorunlu alanları doldurun.');
    if (cfg) focusField(cfg.fieldId, cfg.tab);
  }, [FIELD_TAB_MAP, focusField, toast]);

  /**
   * Cross-field & business-logic checks that RHF can't validate on its own.
   * Returns true if everything passes, false (+ shows toast + scrolls) otherwise.
   */
  const validateExtras = useCallback((values: ProductFormData): boolean => {
    // discount price must be strictly less than sale price
    if (values.discountPrice) {
      const dp = Number(values.discountPrice);
      const sp = Number(values.price || 0);
      if (dp < 0) {
        form.setError('discountPrice', { type: 'manual', message: 'İndirimli fiyat negatif olamaz.' });
        toast.error('İndirimli fiyat negatif olamaz.');
        focusField('discountPrice', 'pricing');
        return false;
      }
      if (sp > 0 && dp >= sp) {
        form.setError('discountPrice', { type: 'manual', message: 'İndirimli fiyat satış fiyatından küçük olmalıdır.' });
        toast.error('İndirimli fiyat satış fiyatından küçük olmalıdır.');
        focusField('discountPrice', 'pricing');
        return false;
      }
    }

    // basePrice sanity check
    if (values.basePrice) {
      const bp = Number(values.basePrice);
      if (bp < 0) {
        form.setError('basePrice', { type: 'manual', message: 'Alış fiyatı negatif olamaz.' });
        toast.error('Alış fiyatı negatif olamaz.');
        focusField('price', 'pricing');
        return false;
      }
    }

    // variants: options picked but no combinations generated
    if (options.length > 0 && variantRows.length === 0) {
      toast.error('Varyant seçenekleri ayarlandı fakat hiç kombinasyon oluşmadı. Değerleri seçin.');
      focusField('variants', 'variants');
      return false;
    }

    // variants: every row is inactive
    if (variantRows.length > 0 && variantRows.every(r => !r.isActive)) {
      toast.error('En az bir aktif varyant olmalıdır.');
      focusField('variants', 'variants');
      return false;
    }

    return true;
  }, [form, options, variantRows, toast, focusField]);

  // ── Submit handlers ───────────────────────────────────────────────────────
  const handleDraft = handleSubmit(async values => {
    // Cross-field + business-logic checks (RHF field checks ran above)
    if (!validateExtras(values)) return;

    // Cancel any pending autosave — manual save takes precedence
    clearTimeout(autoSaveTimer.current);
    abortCtrl.current?.abort();

    setSaving(true);
    try {
      await doSave(values, false);
      lastFormSnap.current = '';
      lastVarSnap.current  = '';
      clearDraft(tenantId);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Taslak kaydedildi');
      navigate('/dashboard/products');
    } catch (err: any) {
      toast.error(err?.message ?? 'Kayıt başarısız');
      console.error('[handleDraft]', err);
    } finally { setSaving(false); setSaveStep(''); }
  }, onInvalid);

  const handlePublish = handleSubmit(async values => {
    // Cross-field + business-logic checks (RHF field checks ran above)
    if (!validateExtras(values)) return;

    // Cancel any pending autosave — manual save takes precedence
    clearTimeout(autoSaveTimer.current);
    abortCtrl.current?.abort();

    setSaving(true);
    try {
      await doSave(values, true);
      lastFormSnap.current = '';
      lastVarSnap.current  = '';
      clearDraft(tenantId);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(currentId ? 'Ürün güncellendi!' : 'Ürün yayınlandı!');
      navigate('/dashboard/products');
    } catch (err: any) {
      toast.error(err?.message ?? 'Kayıt başarısız');
      console.error('[handlePublish]', err);
    } finally { setSaving(false); setSaveStep(''); }
  }, onInvalid);

  const pendingUploads = images.some(i => i.uploading);

  // ── Loading state ─────────────────────────────────────────────────────────
  // Only show skeleton when fetching an EXISTING product (not new form).
  if (currentId && isLoading) {
    return <PageSkeleton />;
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (currentId && isError) {
    const msg = (fetchError as any)?.response?.data?.error
      ?? (fetchError as any)?.message
      ?? 'Sunucuya bağlanılamadı.';
    return (
      <ErrorScreen
        message={msg}
        onRetry={() => refetch()}
        onBack={() => navigate('/dashboard/products')}
      />
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="-mx-6 -my-6 min-h-screen bg-slate-50">
      <ToastList toasts={toast.toasts}/>

      {/* Draft restore banner (new products only) */}
      {hasDraft && !currentId && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="flex-1 text-sm text-amber-800 font-medium">
            Kaydedilmemiş bir taslak bulundu. Kaldığınız yerden devam etmek ister misiniz?
          </p>
          <button type="button" onClick={restoreDraft}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors">
            Geri Yükle
          </button>
          <button type="button" onClick={dismissDraft}
            className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors">
            Yoksay
          </button>
        </div>
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="w-full px-6 py-3 flex items-center gap-3">
          <button type="button" onClick={() => navigate('/dashboard/products')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Ürünler
          </button>

          <div className="w-px h-5 bg-slate-200 flex-shrink-0"/>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <input
              {...register('name')}
              placeholder="Ürün adını buraya yazın..."
              className="text-sm font-semibold text-slate-800 bg-transparent border-0 border-b-2 border-transparent focus:border-indigo-400 focus:outline-none placeholder-slate-300 min-w-0 max-w-xs flex-shrink"
            />
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide flex-shrink-0 ${
              isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {isActive ? 'AKTİF' : 'TASLAK'}
            </span>
          </div>

          {/* Autosave indicator */}
          {isSaving ? (
            <span className="text-xs text-slate-400 flex items-center gap-1.5 flex-shrink-0 select-none">
              <svg className="w-3 h-3 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Kaydediliyor…
            </span>
          ) : lastSavedAt ? (
            <span className="text-xs text-emerald-600 flex items-center gap-1 flex-shrink-0 select-none">
              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              Kaydedildi&nbsp;{lastSavedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}

          <div className="flex items-center gap-2 flex-shrink-0">
            {saving && saveStep && (
              <span className="text-xs text-indigo-500 hidden sm:block">{saveStep}</span>
            )}
            <button type="button" onClick={handleDraft} disabled={saving}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50">
              {saving ? '...' : 'Taslak'}
            </button>
            <button type="button" onClick={handlePublish} disabled={saving || pendingUploads}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-sm font-bold text-white transition-colors disabled:opacity-60 flex items-center gap-2 min-w-[120px] justify-center">
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Kaydediliyor…
                </>
              ) : currentId ? 'Güncelle & Yayınla' : 'Yayınla'}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="w-full px-6">
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(tab => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-150 border-b-2 -mb-px flex items-center gap-1.5 ${
                  activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                }`}>
                {tab.label}
                {tab.id === 'variants' && variantRows.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold leading-none">{variantRows.length}</span>
                )}
                {tab.id === 'media' && images.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold leading-none">{images.filter(i=>!i.uploading).length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="w-full px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
          {/* Left — Tab content */}
          <div>
            <form
              onSubmit={e => e.preventDefault()}
              className={saving ? 'pointer-events-none opacity-60 transition-opacity duration-150 select-none' : 'transition-opacity duration-150'}
            >
              <div className={activeTab === 'general'  ? 'block' : 'hidden'}>
                <GeneralTab form={form} categories={categories} attrValues={attrValues} onAttrChange={handleAttrChange} isAutoBarcode={!!(existing as any)?.isAutoBarcode}/>
              </div>
              <div className={activeTab === 'pricing'  ? 'block' : 'hidden'}>
                <PricingTab form={form}/>
              </div>
              <div className={activeTab === 'media'    ? 'block' : 'hidden'}>
                <MediaTab
                  images={images} mainImageId={mainImageId} setMainImageId={setMainImageId}
                  onAdd={handleAddImage}
                  onRemove={id => setImages(prev => prev.filter(i => i.id !== id))}
                  onReorder={setImages}
                />
              </div>
              <div className={activeTab === 'seo'      ? 'block' : 'hidden'}>
                <SeoTab form={form}/>
              </div>
              <div className={activeTab === 'variants' ? 'block' : 'hidden'}>
                <VariantsTab
                  categoryId={watchAll.categoryId ?? ''}
                  options={options} setOptions={setOptions}
                  variantRows={variantRows} setVariantRows={setVariantRows}
                  defaultPrice={watchAll.price ?? ''}
                  defaultDiscountPrice={watchAll.discountPrice ?? ''}
                />
              </div>
              <div className={activeTab === 'shipping' ? 'block' : 'hidden'}>
                <ShippingTab form={form} productId={urlId} />
              </div>
              <div className={activeTab === 'advanced' ? 'block' : 'hidden'}>
                <AdvancedTab form={form}/>
              </div>
            </form>
          </div>

          {/* Right — Sticky panel */}
          <div className="sticky top-[120px] h-fit">
            <RightPanel
              form={form}
              images={images}
              options={options}
              variantRows={variantRows}
              categories={categories}
              onTabChange={setActiveTab}
              currentId={currentId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
