import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductSearch, useDeleteProduct, useQuickUpdateProduct, useBulkDeleteProducts } from '../hooks/useProducts';
import type { ProductListItem, ProductListFilters } from '../services/product.service';
import { categoryService } from '../services/category.service';
import type { FlatCategoryNode } from '../services/category.service';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient, { extractErrorMessage } from '../services/apiClient';
import toast from 'react-hot-toast';
import { normalizeImageUrl } from '../utils/imageUtils';
import ProductSendValidationModal, { type ValidationReport } from '../components/trendyol/ProductSendValidationModal';
import ProductSendProgress from '../components/trendyol/ProductSendProgress';
import ProductTrendyolSettingsModal from '../components/trendyol/ProductTrendyolSettingsModal';
import ProductsCatalogOnboarding from '../components/products/ProductsCatalogOnboarding';
import { BulkPriceAdjustInputs } from '../components/pricing/BulkPriceAdjustInputs';
import { hasPriceAdjustment, parseOptionalSigned } from '../utils/priceAdjustInput';
import { useBranding } from '../context/BrandingContext';
import { buildStorefrontProductUrl } from '../utils/storefrontUrl';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ProductListItem already has flat fields from the optimized backend response
function getProductImage(p: ProductListItem): string | null {
  return normalizeImageUrl(p.mainImage);
}

function getProductPrice(p: ProductListItem): number {
  return Number(p.price ?? 0);
}

function getProductStock(p: ProductListItem): number {
  return Number(p.stock ?? 0);
}

function getVariantCount(p: ProductListItem): number {
  return p.variantCount ?? 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ isActive, status }: { isActive: boolean; status?: string }) {
  if (!isActive || status === 'draft') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"/>Taslak
      </span>
    );
  }
  if (status === 'archived') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400"/>Arşiv
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Aktif
    </span>
  );
}

function StockChip({ qty }: { qty: number }) {
  if (qty === 0) return <span className="text-[11px] font-semibold text-red-500">Tükendi</span>;
  if (qty < 10)  return <span className="text-[11px] font-semibold text-amber-500">Düşük</span>;
  return null; // normal stock — number already shown by InlineEditCell
}

function ImagePlaceholder() {
  return (
    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  );
}

function ProductThumb({ src, name }: { src: string | null; name: string }) {
  const [broken, setBroken] = useState(false);
  const normalized = normalizeImageUrl(src);

  return (
    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center">
      {normalized && !broken ? (
        <img
          src={normalized}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <ImagePlaceholder />
      )}
    </div>
  );
}

// ─── Inline editable cell ─────────────────────────────────────────────────────
//
// Stability rules:
//  - type="text" + inputMode="numeric" prevents browser from sanitising value
//    mid-keystroke (which is what causes cursor-jump with type="number")
//  - parent value syncs into local state ONLY when not editing — avoids wiping
//    an in-progress edit if a React Query refetch arrives at the wrong moment

function InlineEditCell({
  value, prefix, onSave,
}: {
  value: string | number;
  prefix?: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(String(value));
  const inputRef              = useRef<HTMLInputElement>(null);

  // Sync from parent only when we are NOT actively editing
  useEffect(() => {
    if (!editing) setVal(String(value));
  }, [value, editing]);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    const trimmed = val.trim();
    if (trimmed !== String(value)) onSave(trimmed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val, value, onSave]);

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {prefix && <span className="text-slate-400 text-xs">{prefix}</span>}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter')  commit();
            if (e.key === 'Escape') { setEditing(false); setVal(String(value)); }
          }}
          className="w-20 border border-indigo-400 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300 text-right"
          autoFocus
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Düzenlemek için tıkla"
      className="group inline-flex items-center gap-0.5 hover:bg-indigo-50 rounded-lg px-1.5 py-0.5 transition-colors"
    >
      {prefix && <span className="text-slate-400 text-xs">{prefix}</span>}
      <span className="text-sm font-semibold text-slate-800">{val}</span>
      <svg className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
      </svg>
    </button>
  );
}

// ─── Product row ──────────────────────────────────────────────────────────────

// ─── Trendyol status badge ─────────────────────────────────────────────────────

function TrendyolBadge({ status }: { status: string | null }) {
  if (!status) return null;
  if (status === 'SENT') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      Gönderildi
    </span>
  );
  if (status === 'ERROR') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      Hata
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
      {status}
    </span>
  );
}

const ProductRow = React.memo(function ProductRow({
  product, selected, onToggleSelect, onEdit, onDelete, onQuickUpdate, onSendToTrendyol, trendyolSending, onTrendyolSettings,
}: {
  product:             ProductListItem;
  selected:            boolean;
  onToggleSelect:      (id: string) => void;
  onEdit:              (id: string) => void;
  onDelete:            (p: ProductListItem) => void;
  onQuickUpdate:       (id: string, data: any) => void;
  onSendToTrendyol:    (id: string) => void;
  trendyolSending:     boolean;
  onTrendyolSettings:  (p: ProductListItem) => void;
}) {
  const img      = getProductImage(product);
  const price    = getProductPrice(product);
  const stock    = getProductStock(product);
  const variants = getVariantCount(product);
  const { branding } = useBranding();
  const storefrontSlug = branding.storefrontSlug?.trim() || null;
  const storefrontHref =
    product.slug && storefrontSlug
      ? buildStorefrontProductUrl(storefrontSlug, product.slug)
      : null;

  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors group ${selected ? 'bg-indigo-50/40' : ''}`}>
      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(product.id)}
          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
        />
      </td>

      {/* Product info */}
      <td className="px-3 py-3 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <ProductThumb src={img} name={product.name}/>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
            {product.slug && storefrontHref && (
              <a
                href={storefrontHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 hover:text-emerald-700 hover:underline font-mono truncate mt-0.5 max-w-full"
                title={storefrontHref}
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                <span className="truncate">{product.slug}</span>
              </a>
            )}
          </div>
        </div>
      </td>

      {/* SKU */}
      <td className="px-3 py-3 overflow-hidden">
        {product.sku ? (
          <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap">
            {product.sku}
          </span>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>

      {/* Category */}
      <td className="px-3 py-3 overflow-hidden">
        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap overflow-hidden text-ellipsis inline-block max-w-full">
          {product.category?.name ?? '—'}
        </span>
      </td>

      {/* Price (inline edit) */}
      <td className="px-3 py-3">
        <div className="flex justify-end">
          <InlineEditCell
            value={price.toFixed(2)}
            prefix="₺"
            onSave={v => onQuickUpdate(product.id, { price: Number(v) })}
          />
        </div>
      </td>

      {/* Stock (inline edit) */}
      <td className="px-3 py-3">
        <div className="flex flex-col items-end">
          <InlineEditCell
            value={stock}
            onSave={v => onQuickUpdate(product.id, { stock: Number(v) })}
          />
          <StockChip qty={stock}/>
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onQuickUpdate(product.id, { isActive: !product.isActive })}
          title="Durum değiştir"
          className="cursor-pointer"
        >
          <StatusBadge isActive={product.isActive} status={product.status}/>
        </button>
      </td>

      {/* Variants */}
      <td className="px-3 py-3 text-center">
        {variants > 0 ? (
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{variants}</span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {/* Trendyol send button */}
          <div className="flex flex-col items-end gap-0.5">
            {/* Trendyol settings cog button */}
            <button
              type="button"
              onClick={() => onTrendyolSettings(product)}
              title="Bu ürüne özel Trendyol ayarları"
              className="p-1.5 rounded-lg text-slate-300 hover:text-orange-500 hover:bg-orange-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </button>

            <button
              type="button"
              onClick={() => onSendToTrendyol(product.id)}
              disabled={trendyolSending}
              title={product.trendyolStatus === 'SENT' ? 'Tekrar gönder' : 'Trendyol\'a gönder'}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 disabled:opacity-50 ${
                product.trendyolStatus === 'SENT'
                  ? 'text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100'
                  : product.trendyolStatus === 'ERROR'
                  ? 'text-red-600 bg-red-50 border border-red-200 hover:bg-red-100'
                  : 'text-orange-500 bg-white border border-orange-200 hover:bg-orange-50 hover:border-orange-400'
              }`}
            >
              {trendyolSending ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              )}
              {product.trendyolStatus === 'SENT' ? 'Tekrar Gönder' : 'T\'yol\'a Gönder'}
            </button>
            <TrendyolBadge status={product.trendyolStatus} />
          </div>

          <button
            type="button"
            onClick={() => onEdit(product.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Düzenle
          </button>
          <button
            type="button"
            onClick={() => onDelete(product)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Sil"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          <td className="pl-4 pr-2 py-3 w-10"><div className="w-4 h-4 bg-slate-100 rounded animate-pulse"/></td>
          <td className="px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse flex-shrink-0"/>
              <div className="space-y-1.5">
                <div className="w-32 h-3 bg-slate-100 rounded animate-pulse"/>
                <div className="w-20 h-2.5 bg-slate-100 rounded animate-pulse"/>
              </div>
            </div>
          </td>
          <td className="px-3 py-3"><div className="w-14 h-5 bg-slate-100 rounded-md animate-pulse"/></td>
          <td className="px-3 py-3"><div className="w-16 h-5 bg-slate-100 rounded-full animate-pulse"/></td>
          <td className="px-3 py-3"><div className="w-16 h-4 bg-slate-100 rounded animate-pulse ml-auto"/></td>
          <td className="px-3 py-3"><div className="w-10 h-4 bg-slate-100 rounded animate-pulse ml-auto"/></td>
          <td className="px-3 py-3"><div className="w-14 h-5 bg-slate-100 rounded-full animate-pulse"/></td>
          <td className="px-3 py-3"><div className="w-8 h-5 bg-slate-100 rounded-full animate-pulse mx-auto"/></td>
          <td className="px-3 py-3"><div className="flex justify-end gap-1.5"><div className="w-14 h-7 bg-slate-100 rounded-lg animate-pulse"/><div className="w-7 h-7 bg-slate-100 rounded-lg animate-pulse"/></div></td>
        </tr>
      ))}
    </>
  );
}

// ─── XML Export button ────────────────────────────────────────────────────────

function XmlExportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/products/export/xml', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/xml;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `woontegra-products-${new Date().toISOString().slice(0, 10)}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('XML dosyası indirildi.');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Export başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-green-400 hover:text-green-600 text-slate-600 text-sm font-semibold transition-colors disabled:opacity-50"
      title="Tüm ürünleri XML olarak indir"
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
      )}
      {loading ? 'İndiriliyor…' : 'XML Dışa Aktar'}
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ search, onAdd }: { search: string; onAdd: () => void }) {
  if (search) {
    return (
      <tr>
        <td colSpan={8}>
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">Sonuç bulunamadı</p>
              <p className="text-xs text-slate-400 mt-1">"{search}" için eşleşen ürün yok.</p>
            </div>
          </div>
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td colSpan={8}>
        <div className="flex flex-col items-center py-24 gap-5">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <div className="text-center max-w-xs">
            <p className="text-base font-bold text-slate-800">Henüz ürün yok</p>
            <p className="text-sm text-slate-400 mt-1.5">
              İlk ürününüzü ekleyerek mağazanızı oluşturmaya başlayın.
            </p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            İlk Ürünü Ekle
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteDialog({
  product, onCancel, onConfirm, loading,
}: {
  product: ProductListItem;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-800">Ürünü Sil</h3>
        <p className="text-sm text-slate-500 mt-2">
          <strong className="text-slate-700">"{product.name}"</strong> ürününü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            İptal
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-60">
            {loading ? 'Siliniyor...' : 'Evet, Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk confirm dialog ──────────────────────────────────────────────────────

function BulkDeleteDialog({
  count, onCancel, onConfirm, loading,
}: {
  count: number; onCancel: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-800">{count} Ürünü Sil</h3>
        <p className="text-sm text-slate-500 mt-2">Seçili {count} ürün kalıcı olarak silinecek. Bu işlem geri alınamaz.</p>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            İptal
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-60">
            {loading ? 'Siliniyor...' : `${count} Ürünü Sil`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk: Category modal ─────────────────────────────────────────────────────

function BulkCategoryModal({
  count, categories, onCancel, onConfirm, loading,
}: {
  count:      number;
  categories: FlatCategoryNode[];
  onCancel:   () => void;
  onConfirm:  (categoryId: string | null) => void;
  loading:    boolean;
}) {
  const [selectedCat, setSelectedCat] = useState<string>('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Toplu Kategori Ata</h3>
            <p className="text-xs text-slate-400">{count} ürün seçili</p>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-4">Seçili {count} ürüne kategori atayın. Mevcut kategorilerin üzerine yazılır.</p>

        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kategori</label>
        <select
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
        >
          <option value="">— Kategori seçin —</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {'  '.repeat(c.level)}{c.level > 0 ? '↳ ' : ''}{c.name}
            </option>
          ))}
        </select>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            İptal
          </button>
          <button type="button" onClick={() => onConfirm(selectedCat || null)} disabled={loading || !selectedCat}
            className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors disabled:opacity-50">
            {loading ? 'Atanıyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk: Price modal ────────────────────────────────────────────────────────

export interface BulkPricePayload {
  productIds:  string[];
  percent?:    number;
  fixed?:      number;
  applyTo:     'product' | 'variants' | 'both';
  includeTax?: boolean;
}

function BulkPriceModal({
  count, onCancel, onConfirm, loading,
}: {
  count:     number;
  onCancel:  () => void;
  onConfirm: (payload: Omit<BulkPricePayload, 'productIds'>) => void;
  loading:   boolean;
}) {
  const [percentRaw, setPercentRaw] = useState('');
  const [fixedRaw,   setFixedRaw]   = useState('');
  const [applyTo,    setApplyTo]    = useState<BulkPricePayload['applyTo']>('product');
  const [includeTax, setIncludeTax] = useState(false);

  const hasChange = hasPriceAdjustment(percentRaw, fixedRaw);

  const handleConfirm = () => {
    if (!hasChange) return;
    const percent = parseOptionalSigned(percentRaw);
    const fixed = parseOptionalSigned(fixedRaw);
    onConfirm({
      ...(percent != null && percent !== 0 ? { percent } : {}),
      ...(fixed != null && fixed !== 0 ? { fixed } : {}),
      applyTo,
      includeTax,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Toplu Fiyat Güncelle</h3>
            <p className="text-xs text-slate-400">{count} ürün seçili</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <BulkPriceAdjustInputs
            percent={percentRaw}
            fixed={fixedRaw}
            onPercentChange={setPercentRaw}
            onFixedChange={setFixedRaw}
          />

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Neye uygulansın?</p>
            <div className="flex gap-2">
              {([
                { v: 'product',  label: 'Ana ürün' },
                { v: 'variants', label: 'Varyantlar' },
                { v: 'both',     label: 'İkisi de' },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setApplyTo(opt.v)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    applyTo === opt.v
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIncludeTax(t => !t)}
              className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${includeTax ? 'bg-indigo-500' : 'bg-slate-200'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-transform ${includeTax ? 'translate-x-4' : 'translate-x-0.5'}`}/>
            </div>
            <span className="text-sm text-slate-700">KDV dahil hesapla</span>
          </label>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            İptal
          </button>
          <button type="button" onClick={handleConfirm}
            disabled={loading || !hasChange}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            {loading ? 'Uygulanıyor…' : 'Toplu Güncelle'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk: Stock modal ────────────────────────────────────────────────────────

type StockAction = 'set' | 'increase' | 'decrease';

const STOCK_ACTIONS: Array<{ key: StockAction; label: string; hint: string }> = [
  { key: 'set',      label: 'Sabit Değer Yaz',      hint: 'Tüm ürünlerin stoğunu bu değere ayarla' },
  { key: 'increase', label: 'Mevcut Stoğa Ekle',     hint: 'Her ürünün mevcut stoğuna ekle' },
  { key: 'decrease', label: 'Mevcut Stoktan Düş',    hint: 'Her ürünün mevcut stoğundan çıkar (minimum 0)' },
];

function BulkStockModal({
  count, onCancel, onConfirm, loading,
}: {
  count:     number;
  onCancel:  () => void;
  onConfirm: (action: StockAction, value: number) => void;
  loading:   boolean;
}) {
  const [action, setAction] = useState<StockAction>('set');
  const [value,  setValue]  = useState('');
  const numVal = parseFloat(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Toplu Stok Güncelle</h3>
            <p className="text-xs text-slate-400">{count} ürün seçili</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {STOCK_ACTIONS.map(a => (
            <label key={a.key}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                action === a.key ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
              }`}>
              <input type="radio" name="stockAction" value={a.key}
                checked={action === a.key} onChange={() => setAction(a.key)}
                className="mt-0.5 accent-indigo-600"/>
              <div>
                <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                <p className="text-xs text-slate-400">{a.hint}</p>
              </div>
            </label>
          ))}
        </div>

        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Miktar</label>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="0"
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
        />

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            İptal
          </button>
          <button type="button" onClick={() => onConfirm(action, numVal)}
            disabled={loading || !value || isNaN(numVal) || numVal < 0}
            className="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-50">
            {loading ? 'Uygulanıyor…' : 'Uygula'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, total, limit, onChange }: {
  page: number; totalPages: number; total: number; limit: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

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
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-white">
      <span className="text-xs text-slate-400">{from}–{to} / {total} ürün</span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        {pages.map((p, i) => p === '...' ? (
          <span key={`e${i}`} className="px-1 text-xs text-slate-300">···</span>
        ) : (
          <button key={p} type="button" onClick={() => onChange(Number(p))}
            className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold transition-colors ${
              p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}>
            {p}
          </button>
        ))}
        <button type="button" disabled={page === totalPages} onClick={() => onChange(page + 1)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Products() {
  const navigate = useNavigate();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [searchInput,  setSearchInput]  = useState('');
  const [categoryId,   setCategoryId]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');  // '' | 'active' | 'draft'
  const [page,         setPage]         = useState(1);
  const [limit,        setLimit]        = useState(20);

  const debouncedSearch = useDebounce(searchInput, 350);

  // Reset page on filter/limit change
  useEffect(() => { setPage(1); }, [debouncedSearch, categoryId, statusFilter, limit]);

  const filters: ProductListFilters = {
    search:     debouncedSearch || undefined,
    categoryId: categoryId     || undefined,
    isActive:   statusFilter === 'active' ? true : statusFilter === 'draft' ? false : undefined,
    page,
    limit,
  };

  const { data, isLoading, isFetching } = useProductSearch(filters);
  const products: ProductListItem[] = data?.items ?? [];
  const meta = {
    total:      data?.total      ?? 0,
    page:       data?.page       ?? 1,
    limit:      data?.limit      ?? limit,
    totalPages: data?.totalPages ?? 0,
  };

  // ── Categories (for filter dropdown) ──────────────────────────────────────
  const { data: categories = [] } = useQuery<FlatCategoryNode[]>({
    queryKey: ['categories-flat'],
    queryFn:  () => categoryService.getFlat(),
    staleTime: 60_000,
  });

  const queryClient = useQueryClient();

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected  = products.length > 0 && products.every(p => selected.has(p.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); products.forEach(p => n.delete(p.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); products.forEach(p => n.add(p.id)); return n; });
    }
  };

  const toggleOne = useCallback((id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  // Clear selection on page change
  useEffect(() => { setSelected(new Set()); }, [page]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const deleteProduct     = useDeleteProduct();
  const quickUpdate       = useQuickUpdateProduct();
  const bulkDelete        = useBulkDeleteProducts();

  const [deleteTarget,      setDeleteTarget]      = useState<ProductListItem | null>(null);
  const [showBulkDelete,    setShowBulkDelete]    = useState(false);
  const [showBulkCategory,  setShowBulkCategory]  = useState(false);
  const [showBulkPrice,     setShowBulkPrice]     = useState(false);
  const [showBulkStock,     setShowBulkStock]     = useState(false);

  // ── Trendyol send flow (single + bulk via modal) ────────────────────────────
  const [trendyolSendingId, setTrendyolSendingId] = useState<string | null>(null);
  const [validationModal,   setValidationModal]   = useState<{
    open:       boolean;
    validating: boolean;
    sending:    boolean;          // true while /products/send is in-flight
    reports:    ValidationReport[];
    pendingIds: string[];
  }>({ open: false, validating: false, sending: false, reports: [], pendingIds: [] });
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  /** Step 1 — open modal + run pre-flight validation */
  const openSendFlow = useCallback(async (productIds: string[], singleId?: string) => {
    if (productIds.length === 0) return;
    if (singleId) setTrendyolSendingId(singleId);

    setValidationModal({ open: true, validating: true, sending: false, reports: [], pendingIds: productIds });

    try {
      const vRes    = await apiClient.post('/trendyol/products/validate', { productIds }, { skipErrorToast: true });
      const payload = vRes.data;
      const reports: ValidationReport[] =
        payload?.data ?? payload?.reports ?? (Array.isArray(payload) ? payload : []);
      setValidationModal(s => ({ ...s, validating: false, reports }));
    } catch {
      // Validate API down — keep modal open, let user decide to send anyway
      setValidationModal(s => ({ ...s, validating: false }));
    } finally {
      if (singleId) setTrendyolSendingId(null);
    }
  }, []);

  const handleSendToTrendyol = useCallback((productId: string) => {
    openSendFlow([productId], productId);
  }, [openSendFlow]);

  // ── Trendyol product settings modal ─────────────────────────────────────────
  const [trendyolSettingsModal, setTrendyolSettingsModal] = useState<{
    open:    boolean;
    product: { id: string; name: string; price: number } | null;
  }>({ open: false, product: null });

  const openTrendyolSettings = useCallback((p: ProductListItem) => {
    setTrendyolSettingsModal({
      open:    true,
      product: { id: p.id, name: p.name, price: Number(p.price ?? 0) },
    });
  }, []);

  const handleBulkSendToTrendyol = useCallback(() => {
    const ids = [...selected];
    if (ids.length === 0) return;
    openSendFlow(ids);
  }, [selected, openSendFlow]);

  /** Step 2 — user confirmed: call send API, keep modal open until response */
  const handleModalSend = useCallback(async (validIds: string[]) => {
    if (validIds.length === 0) {
      toast.error('Gönderilecek geçerli ürün bulunamadı.');
      return;
    }

    // Show spinner on the modal send button — do NOT close yet
    setValidationModal(s => ({ ...s, sending: true }));

    try {
      const res = await apiClient.post('/trendyol/products/send', {
        productIds:  validIds,
        skipInvalid: true,
      }, { skipErrorToast: true }); // component shows its own contextual toast
      const { batchId, queuedCount } = res.data as { batchId: string; queuedCount: number };

      // Success path — close modal, open progress panel, reset selection
      setValidationModal(s => ({ ...s, open: false, sending: false }));
      setActiveBatchId(batchId);
      setSelected(new Set());
      toast.success(`${queuedCount} ürün kuyruğa alındı.`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err: any) {
      // Failure path — keep modal open so user sees context, show error toast
      setValidationModal(s => ({ ...s, sending: false }));
      toast.error(`Trendyol hatası: ${extractErrorMessage(err, 'Gönderim başarısız.')}`);
    }
  }, [queryClient]);
  const [bulkOpLoading,     setBulkOpLoading]     = useState(false);

  const handleDelete = (p: ProductListItem) => setDeleteTarget(p);
  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteProduct.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleQuickUpdate = useCallback((id: string, data: any) => {
    quickUpdate.mutate({ id, ...data });
  }, [quickUpdate]);

  const applyBulkActivate = (active: boolean) => {
    const ids = [...selected];
    ids.forEach(id => quickUpdate.mutate({ id, isActive: active }));
    setSelected(new Set());
  };

  const applyBulkCategory = async (categoryId: string | null) => {
    setBulkOpLoading(true);
    try {
      const res = await apiClient.patch('/products/bulk/category', { ids: [...selected], categoryId });
      toast.success(`${res.data.updated ?? selected.size} ürüne kategori atandı.`);
      setShowBulkCategory(false);
      setSelected(new Set());
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Kategori atama başarısız.');
    } finally {
      setBulkOpLoading(false);
    }
  };

  const applyBulkPrice = async (payload: Omit<BulkPricePayload, 'productIds'>) => {
    setBulkOpLoading(true);
    try {
      const body = { ...payload, productIds: [...selected] };
      const res  = await apiClient.post('/products/bulk-price-update', body, { skipErrorToast: true });
      const d    = res.data;
      const updP = d?.updatedCount ?? d?.updated ?? selected.size;
      const updV = d?.updatedVariants ?? 0;
      const msg  = updV > 0
        ? `${updP} ürün + ${updV} varyant fiyatı güncellendi.`
        : `${updP} ürünün fiyatı güncellendi.`;
      toast.success(msg);
      setShowBulkPrice(false);
      setSelected(new Set());
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Fiyat güncelleme başarısız.';
      toast.error(msg);
    } finally {
      setBulkOpLoading(false);
    }
  };

  const applyBulkStock = async (action: StockAction, value: number) => {
    setBulkOpLoading(true);
    try {
      const res = await apiClient.patch('/products/bulk/stock', { ids: [...selected], action, value });
      toast.success(`${res.data.updated ?? selected.size} ürünün stoğu güncellendi.`);
      setShowBulkStock(false);
      setSelected(new Set());
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Stok güncelleme başarısız.');
    } finally {
      setBulkOpLoading(false);
    }
  };

  // ── Sorting ────────────────────────────────────────────────────────────────
  const [sortBy,  setSortBy]  = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: string }) => (
    <svg className={`w-3 h-3 ml-1 inline ${sortBy === field ? 'text-indigo-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d={sortBy === field && sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}/>
    </svg>
  );

  const activeFilters = [debouncedSearch, categoryId, statusFilter].filter(Boolean).length;

  /** Kullanıcı hesabında hiç ürün yokken (filtre/arama yok) tam onboarding gösterilir */
  const isTrueEmptyCatalog =
    !isLoading &&
    meta.total === 0 &&
    !debouncedSearch &&
    !categoryId &&
    !statusFilter;

  return (
    <div className="w-full space-y-5 page-enter">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ürünler</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {isLoading ? '...' : `${meta.total} ürün`}
            {isFetching && !isLoading && <span className="ml-2 text-indigo-400 text-xs">Yükleniyor...</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/products/import/xml')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 text-sm font-semibold transition-colors"
            title="XML ile toplu ürün yükle"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            XML İçe Aktar
          </button>
          <XmlExportButton />
          <button
            type="button"
            onClick={() => navigate('/dashboard/products/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Ürün Ekle
          </button>
        </div>
      </div>

      {/* ── Filters + Search ───────────────────────────────────────────── */}
      {!isTrueEmptyCatalog && (
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Ürün adı, SKU veya barkod ara..."
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors"
            />
            {searchInput && (
              <button type="button" onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>

          {/* Category filter */}
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white min-w-[160px]"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {'—'.repeat(c.level)}{c.level > 0 ? ' ' : ''}{c.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white min-w-[130px]"
          >
            <option value="">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="draft">Taslak</option>
          </select>

          {/* Clear filters */}
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setCategoryId(''); setStatusFilter(''); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Filtreleri Temizle
              <span className="bg-slate-200 text-slate-600 text-[11px] font-bold px-1.5 py-0.5 rounded-full">{activeFilters}</span>
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            {meta.total > 0 && <span className="text-xs text-slate-400">{meta.total} ürün</span>}
            {/* Per-page selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 whitespace-nowrap">Sayfa başına</span>
              <select
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── Bulk action bar ────────────────────────────────────────────── */}
      {someSelected && (
        <div className="bg-indigo-600 rounded-2xl px-5 py-3 flex flex-wrap items-center gap-3">
          {/* Count badge */}
          <div className="flex items-center gap-2">
            <span className="bg-white/25 text-white text-xs font-black px-2.5 py-1 rounded-lg">{selected.size}</span>
            <span className="text-white/90 text-sm font-semibold">ürün seçili</span>
          </div>

          <div className="w-px h-5 bg-white/20 hidden sm:block"/>

          {/* Status group */}
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => applyBulkActivate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
              </svg>
              Aktifleştir
            </button>
            <button type="button" onClick={() => applyBulkActivate(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Pasifleştir
            </button>
          </div>

          <div className="w-px h-5 bg-white/20 hidden sm:block"/>

          {/* Bulk ops group */}
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setShowBulkCategory(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
              </svg>
              Kategori Ata
            </button>
            <button type="button" onClick={() => setShowBulkPrice(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Fiyat Güncelle
            </button>
            <button type="button" onClick={() => setShowBulkStock(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              Stok Güncelle
            </button>
          </div>

          <div className="w-px h-5 bg-white/20 hidden sm:block"/>

          {/* Trendyol bulk send */}
          <button type="button" onClick={handleBulkSendToTrendyol}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            Trendyol'a Gönder ({selected.size})
          </button>

          <div className="w-px h-5 bg-white/20 hidden sm:block"/>

          {/* Danger group */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button type="button" onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/70 hover:bg-red-500 text-white text-xs font-bold transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Sil ({selected.size})
            </button>
            <button type="button" onClick={() => setSelected(new Set())}
              className="p-1.5 text-white/50 hover:text-white transition-colors" title="Seçimi temizle">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Boş katalog onboarding / tablo ─────────────────────────────── */}
      {isTrueEmptyCatalog ? (
        <ProductsCatalogOnboarding
          onManualAdd={() => navigate('/dashboard/products/new')}
          onXmlImport={() => navigate('/dashboard/products/import/xml')}
          onExcelPlaceholder={() => {
            toast(
              'Excel ile içe aktarma yakında. Toplu yükleme için şimdilik menüden «CSV İçe/Dışa Aktar» sayfasını kullanabilirsiniz.',
              { icon: 'ℹ️', duration: 5500 },
            );
          }}
        />
      ) : (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="pl-4 pr-2 py-3 text-left" style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  />
                </th>
                <th className="px-3 py-3 text-left" style={{ width: '24%', minWidth: 180 }}>
                  <button type="button" onClick={() => handleSort('name')}
                    className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 inline-flex items-center gap-1">
                    Ürün <SortIcon field="name"/>
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style={{ width: '11%', minWidth: 100 }}>SKU / Stok Kodu</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style={{ width: '13%', minWidth: 100 }}>Kategori</th>
                <th className="px-3 py-3 text-right" style={{ width: '11%', minWidth: 85 }}>
                  <button type="button" onClick={() => handleSort('price')}
                    className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 inline-flex items-center gap-1">
                    Fiyat <SortIcon field="price"/>
                  </button>
                </th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style={{ width: '8%', minWidth: 65 }}>Stok</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style={{ width: '10%', minWidth: 75 }}>Durum</th>
                <th className="px-3 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style={{ width: '7%', minWidth: 65 }}>Varyant</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style={{ minWidth: 100 }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton/>
              ) : products.length === 0 ? (
                <EmptyState search={debouncedSearch} onAdd={() => navigate('/dashboard/products/new')}/>
              ) : (
                products.map(p => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    selected={selected.has(p.id)}
                    onToggleSelect={toggleOne}
                    onEdit={id => navigate(`/dashboard/products/${id}/edit`)}
                    onDelete={handleDelete}
                    onQuickUpdate={handleQuickUpdate}
                    onSendToTrendyol={handleSendToTrendyol}
                    trendyolSending={trendyolSendingId === p.id || validationModal.open}
                    onTrendyolSettings={openTrendyolSettings}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
          onChange={setPage}
        />
      </div>
      )}

      {/* ── Tip bar ────────────────────────────────────────────────────── */}
      {!isLoading && products.length > 0 && (
        <p className="text-xs text-slate-400 text-center">
          💡 Fiyat veya stok hücresine tıklayarak inline düzenleme yapabilirsiniz. Durum rozetine tıklayarak aktif/pasif değiştirebilirsiniz.
        </p>
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteDialog
          product={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          loading={deleteProduct.isPending}
        />
      )}

      {showBulkDelete && (
        <BulkDeleteDialog
          count={selected.size}
          onCancel={() => setShowBulkDelete(false)}
          onConfirm={() => {
            bulkDelete.mutate([...selected], {
              onSuccess: (result) => {
                setShowBulkDelete(false);
                if (result.deleted > 0) {
                  setSelected(new Set());
                  setPage(1);
                }
              },
            });
          }}
          loading={bulkDelete.isPending}
        />
      )}

      {showBulkCategory && (
        <BulkCategoryModal
          count={selected.size}
          categories={categories}
          onCancel={() => setShowBulkCategory(false)}
          onConfirm={applyBulkCategory}
          loading={bulkOpLoading}
        />
      )}

      {showBulkPrice && (
        <BulkPriceModal
          count={selected.size}
          onCancel={() => setShowBulkPrice(false)}
          onConfirm={applyBulkPrice}
          loading={bulkOpLoading}
        />
      )}

      {showBulkStock && (
        <BulkStockModal
          count={selected.size}
          onCancel={() => setShowBulkStock(false)}
          onConfirm={applyBulkStock}
          loading={bulkOpLoading}
        />
      )}

      {/* ── Trendyol Validation Modal ───────────────────────────────────── */}
      <ProductSendValidationModal
        isOpen={validationModal.open}
        isValidating={validationModal.validating}
        isSending={validationModal.sending}
        reports={validationModal.reports}
        totalCount={validationModal.pendingIds.length}
        pendingIds={validationModal.pendingIds}
        onSendValid={handleModalSend}
        onCancel={() => {
          // Prevent closing while API call is in-flight
          if (validationModal.sending) return;
          setValidationModal(s => ({ ...s, open: false }));
        }}
      />

      {/* ── Trendyol Send Progress Panel ───────────────────────────────── */}
      {activeBatchId && (
        <div className="fixed bottom-5 right-5 z-40 w-96 shadow-2xl">
          <ProductSendProgress
            batchId={activeBatchId}
            onClose={() => setActiveBatchId(null)}
          />
        </div>
      )}

      {/* ── Trendyol Product Settings Modal ────────────────────────────── */}
      {trendyolSettingsModal.product && (
        <ProductTrendyolSettingsModal
          isOpen={trendyolSettingsModal.open}
          productId={trendyolSettingsModal.product.id}
          productName={trendyolSettingsModal.product.name}
          productPrice={trendyolSettingsModal.product.price}
          onClose={() => setTrendyolSettingsModal(s => ({ ...s, open: false }))}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
        />
      )}
    </div>
  );
}
