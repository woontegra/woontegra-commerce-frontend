import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { trendyolApi } from '../../../pages/TrendyolIntegration';
import { useGeneralSettings } from './GeneralSettingsContext';

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

const VAT_RATES = [0, 1, 8, 10, 18, 20];

type ShippingForm = {
  cargoCompanyId: number;
  deliveryDuration: number;
  dimensionalWeight: number;
};

type PriceForm = {
  mode: 'none' | 'percent' | 'fixed';
  value: number;
  vatRate: number;
  vatIncluded: boolean;
  roundTo: number;
};

function validateShipping(f: ShippingForm): string | null {
  if (!f.cargoCompanyId) return 'Kargo firması seçin.';
  if (!f.deliveryDuration || f.deliveryDuration < 1) return 'Teslim süresi en az 1 gün olmalı.';
  if (!f.dimensionalWeight || f.dimensionalWeight <= 0) return 'Desi değeri 0\'dan büyük olmalı.';
  return null;
}

function validatePrice(f: PriceForm): string | null {
  if (f.mode === 'percent' && (f.value < 0 || Number.isNaN(f.value))) return 'Yüzde artış geçersiz.';
  if (f.mode === 'fixed' && (f.value < 0 || Number.isNaN(f.value))) return 'Sabit artış geçersiz.';
  if (f.vatRate < 0) return 'KDV oranı geçersiz.';
  return null;
}

export function GeneralSettingsPanel() {
  const qc = useQueryClient();
  const { isConfigured, markConfigured } = useGeneralSettings();

  const { data: shippingDefaults, isLoading: shippingLoading } = useQuery({
    queryKey: ['trendyol-shipping-defaults'],
    queryFn: trendyolApi.getShippingDefaults,
    staleTime: 0,
  });

  const { data: priceStrategy, isLoading: priceLoading } = useQuery({
    queryKey: ['trendyol-price-strategy'],
    queryFn: trendyolApi.getPriceStrategy,
    staleTime: 0,
  });

  const [shipping, setShipping] = useState<ShippingForm>({
    cargoCompanyId: 10,
    deliveryDuration: 3,
    dimensionalWeight: 1,
  });

  const [price, setPrice] = useState<PriceForm>({
    mode: 'none',
    value: 0,
    vatRate: 20,
    vatIncluded: false,
    roundTo: 2,
  });

  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (shippingDefaults) {
      setShipping({
        cargoCompanyId: shippingDefaults.cargoCompanyId ?? 10,
        deliveryDuration: shippingDefaults.deliveryDuration ?? 3,
        dimensionalWeight: shippingDefaults.dimensionalWeight ?? 1,
      });
    }
  }, [shippingDefaults]);

  useEffect(() => {
    if (priceStrategy) {
      setPrice({
        mode: (priceStrategy.mode ?? 'none') as PriceForm['mode'],
        value: Number(priceStrategy.value ?? 0),
        vatRate: Number(priceStrategy.vatRate ?? 20),
        vatIncluded: Boolean(priceStrategy.vatIncluded ?? false),
        roundTo: Number(priceStrategy.roundTo ?? 2),
      });
    }
  }, [priceStrategy]);

  const pricePreview =
    price.mode === 'percent'
      ? parseFloat((100 * (1 + price.value / 100)).toFixed(price.roundTo))
      : price.mode === 'fixed'
        ? parseFloat((100 + price.value).toFixed(price.roundTo))
        : null;

  const saveAll = async () => {
    const shipErr = validateShipping(shipping);
    if (shipErr) {
      toast.error(shipErr);
      return;
    }
    const priceErr = validatePrice(price);
    if (priceErr) {
      toast.error(priceErr);
      return;
    }

    setSaving(true);
    try {
      await trendyolApi.saveShippingDefaults(shipping);
      await trendyolApi.savePriceStrategy(price);
      qc.invalidateQueries({ queryKey: ['trendyol-shipping-defaults'] });
      qc.invalidateQueries({ queryKey: ['trendyol-price-strategy'] });
      markConfigured();
      toast.success('Genel ayarlar kaydedildi.');
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? err.message ?? 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  };

  const loading = shippingLoading || priceLoading;

  return (
    <div
      id="trendyol-general-settings"
      className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" aria-hidden>⚙️</span>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Genel Ayarlar</h2>
            <p className="text-xs text-gray-500 truncate">
              Kargo, desi ve fiyat stratejisi — tüm gönderim ve senkron işlemlerinde kullanılır
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 ml-1 flex-shrink-0 ${
              isConfigured
                ? 'text-green-800 bg-green-100 border border-green-300'
                : 'text-red-800 bg-red-50 border border-red-200'
            }`}
          >
            {isConfigured ? '✔ Kaydedildi' : '○ Kaydedilmedi'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-white"
          >
            {collapsed ? 'Genişlet' : 'Daralt'}
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      {!isConfigured && !collapsed && (
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-800">
          Ürün göndermeden veya fiyat senkronundan önce bu ayarları kaydedin.
        </div>
      )}

      {!collapsed && (
        <div className="p-5 space-y-5">
          {loading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Ayarlar yükleniyor…</p>
          ) : (
            <>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Kargo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Varsayılan kargo firması</label>
                    <select
                      value={shipping.cargoCompanyId}
                      onChange={e => setShipping(s => ({ ...s, cargoCompanyId: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {CARGO_COMPANIES.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Teslim süresi (gün)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={shipping.deliveryDuration}
                      onChange={e => setShipping(s => ({ ...s, deliveryDuration: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Varsayılan desi</label>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={shipping.dimensionalWeight}
                      onChange={e => setShipping(s => ({ ...s, dimensionalWeight: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Global fiyat stratejisi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Artış tipi</label>
                    <select
                      value={price.mode}
                      onChange={e => setPrice(p => ({ ...p, mode: e.target.value as PriceForm['mode'] }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="none">Artış yok</option>
                      <option value="percent">Yüzde (%)</option>
                      <option value="fixed">Sabit (₺)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Artış değeri</label>
                    <input
                      type="number"
                      min={0}
                      step={price.mode === 'percent' ? 0.1 : 1}
                      value={price.value}
                      disabled={price.mode === 'none'}
                      onChange={e => setPrice(p => ({ ...p, value: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">KDV oranı</label>
                    <select
                      value={price.vatRate}
                      onChange={e => setPrice(p => ({ ...p, vatRate: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {VAT_RATES.map(r => (
                        <option key={r} value={r}>%{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Yuvarlama</label>
                    <select
                      value={price.roundTo}
                      onChange={e => setPrice(p => ({ ...p, roundTo: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value={0}>Tam sayı</option>
                      <option value={2}>2 basamak</option>
                      <option value={4}>4 basamak</option>
                    </select>
                  </div>
                </div>

                {price.mode !== 'none' && pricePreview != null && (
                  <p className="mt-3 text-xs text-orange-800 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                    Örnek: 100 ₺ → <strong>{pricePreview.toLocaleString('tr-TR')} ₺</strong> Trendyol fiyatı
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
