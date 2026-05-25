import { useMemo, useState } from 'react';
import {
  buildSendPreview,
  moneyTr,
  type PriceStrategyForm,
  type SendPreviewBreakdown,
} from './trendyolPriceUtils';

const COMMISSION_PRESETS = [
  { label: 'Moda / Kozmetik (12%)', value: 12 },
  { label: 'Ev & Yaşam (15%)', value: 15 },
  { label: 'Elektronik (6%)', value: 6 },
  { label: 'Takı (8%)', value: 8 },
  { label: 'Kitap (10%)', value: 10 },
];

export interface PreviewProduct {
  id: string;
  name: string;
  salePrice: number;
  barcode?: string | null;
}

interface SendPreviewModalProps {
  products: PreviewProduct[];
  priceStrategy: PriceStrategyForm | null;
  onClose: () => void;
}

function PreviewCard({
  product,
  breakdown,
}: {
  product: PreviewProduct;
  breakdown: SendPreviewBreakdown;
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
      <div>
        <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
        {product.barcode && (
          <p className="text-xs text-gray-400 font-mono mt-0.5">{product.barcode}</p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-gray-500">Katalog fiyatı</dt>
        <dd className="text-right font-medium text-gray-800 tabular-nums">
          {moneyTr.format(breakdown.basePrice)} ₺
        </dd>
        <dt className="text-gray-500">Trendyol&apos;a gönderilecek</dt>
        <dd className="text-right font-bold text-orange-600 tabular-nums">
          {moneyTr.format(breakdown.finalPrice)} ₺
        </dd>
        <dt className="text-gray-500">KDV (dahil tahmini)</dt>
        <dd className="text-right text-amber-700 tabular-nums">
          −{moneyTr.format(breakdown.vatAmount)} ₺
        </dd>
        <dt className="text-gray-500">Komisyon (%{breakdown.commissionPct})</dt>
        <dd className="text-right text-red-600 tabular-nums">
          −{moneyTr.format(breakdown.commissionAmount)} ₺
        </dd>
        <dt className="text-gray-700 font-semibold border-t border-gray-100 pt-2 col-span-1">
          Tahmini net gelir
        </dt>
        <dd
          className={`text-right font-bold tabular-nums border-t border-gray-100 pt-2 ${
            breakdown.netAfterFees >= 0 ? 'text-green-700' : 'text-red-600'
          }`}
        >
          {moneyTr.format(breakdown.netAfterFees)} ₺
        </dd>
        <dt className="text-gray-400 text-xs col-span-2">
          Katalog maliyetine göre tahmini kâr:{' '}
          <span className={breakdown.netProfitVsCost >= 0 ? 'text-green-600' : 'text-red-500'}>
            {breakdown.netProfitVsCost >= 0 ? '+' : ''}
            {moneyTr.format(breakdown.netProfitVsCost)} ₺
          </span>
        </dt>
      </dl>
    </div>
  );
}

export function SendPreviewModal({ products, priceStrategy, onClose }: SendPreviewModalProps) {
  const [commissionPct, setCommissionPct] = useState(12);

  const previews = useMemo(
    () =>
      products.map(p => ({
        product: p,
        breakdown: buildSendPreview(p.salePrice, priceStrategy, commissionPct),
      })),
    [products, priceStrategy, commissionPct],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-gray-50 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
          <div>
            <h3 className="font-bold text-gray-900">Gönderim önizlemesi</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Genel ayarlardaki fiyat stratejisi uygulanır
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            aria-label="Kapat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-3 bg-white border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Tahmini komisyon oranı
          </label>
          <select
            value={commissionPct}
            onChange={e => setCommissionPct(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {COMMISSION_PRESETS.map(p => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {previews.map(({ product, breakdown }) => (
            <PreviewCard key={product.id} product={product} breakdown={breakdown} />
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-semibold"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
