/**
 * TrendyolPriceSettings
 * Global fiyat stratejisi — yüzde artış, sabit artış, KDV oranı, yuvarlama.
 * TrendyolIntegration.tsx#PriceStrategyPanel'ın bağımsız kardeşidir.
 */

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi, VAT_RATES } from './trendyol-settings-api';

type Mode = 'none' | 'percent' | 'fixed';

export default function TrendyolPriceSettings() {
  const qc = useQueryClient();

  const { data: strategy, isLoading } = useQuery({
    queryKey: ['trendyol-price-strategy'],
    queryFn:  settingsApi.getPriceStrategy,
    staleTime: 0,
  });

  const [form, setForm] = useState({
    mode:        'none' as Mode,
    value:       0,
    vatRate:     20,
    vatIncluded: false,
    roundTo:     2,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (strategy) setForm({
      mode:        (strategy.mode ?? 'none') as Mode,
      value:       Number(strategy.value   ?? 0),
      vatRate:     Number(strategy.vatRate ?? 20),
      vatIncluded: Boolean(strategy.vatIncluded ?? false),
      roundTo:     Number(strategy.roundTo ?? 2),
    });
  }, [strategy]);

  const preview = (() => {
    const base = 100;
    if (form.mode === 'percent') return parseFloat((base * (1 + form.value / 100)).toFixed(form.roundTo));
    if (form.mode === 'fixed')   return parseFloat((base + form.value).toFixed(form.roundTo));
    return null;
  })();

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.savePriceStrategy(form);
      qc.invalidateQueries({ queryKey: ['trendyol-price-strategy'] });
      toast.success('Fiyat stratejisi kaydedildi.');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Global Fiyat Stratejisi</h3>
            <p className="text-[11px] text-gray-400">Trendyol'a gönderilecek fiyatı otomatik artır. Ürün bazlı override mümkün.</p>
          </div>
        </div>
        <button onClick={save} disabled={saving || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors flex-shrink-0">
          {saving && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse"/>)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              {/* Mode */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Artış Yöntemi</label>
                <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value as Mode }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option value="none">Artış yok — orijinal fiyat</option>
                  <option value="percent">Yüzde artış (%)</option>
                  <option value="fixed">Sabit artış (₺)</option>
                </select>
              </div>

              {/* Value */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {form.mode === 'percent' ? 'Artış Yüzdesi (%)' : form.mode === 'fixed' ? 'Sabit Artış (₺)' : 'Artış Değeri'}
                </label>
                <div className="relative">
                  <input type="number" min="0" step={form.mode === 'percent' ? 0.1 : 1}
                    value={form.value} disabled={form.mode === 'none'}
                    onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-400"/>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {form.mode === 'percent' ? '%' : '₺'}
                  </span>
                </div>
              </div>

              {/* VAT rate */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">KDV Oranı (%)</label>
                <select value={form.vatRate} onChange={e => setForm(f => ({ ...f, vatRate: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  {VAT_RATES.map(r => <option key={r} value={r}>%{r}{r === 20 ? ' (Varsayılan)' : ''}</option>)}
                </select>
              </div>

              {/* Rounding */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Yuvarlama</label>
                <select value={form.roundTo} onChange={e => setForm(f => ({ ...f, roundTo: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option value={0}>Tam sayı</option>
                  <option value={2}>2 basamak (varsayılan)</option>
                  <option value={4}>4 basamak</option>
                </select>
              </div>
            </div>

            {/* VAT included checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
              <input type="checkbox" checked={form.vatIncluded}
                onChange={e => setForm(f => ({ ...f, vatIncluded: e.target.checked }))}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"/>
              <span className="text-sm text-gray-700">Temel fiyat KDV dahil (bilgilendirme amaçlı)</span>
            </label>

            {/* Live preview */}
            {form.mode !== 'none' && preview !== null && (
              <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
                <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p className="text-sm text-orange-800">
                  <strong>Örnek:</strong> 100 ₺ ürün →{' '}
                  <strong>Trendyol'a {preview.toLocaleString('tr-TR')} ₺</strong> gönderilecek
                  {form.mode === 'percent' ? ` (%${form.value} artış)` : ` (+${form.value} ₺ artış)`}
                </p>
              </div>
            )}

            {form.mode === 'none' && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Şu an artış yok — ürün fiyatı olduğu gibi Trendyol'a gönderilir.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
