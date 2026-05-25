/**
 * TrendyolAttributeMapping
 * Özellik eşleştirme özet kartı.
 */

import { useQuery } from '@tanstack/react-query';
import { settingsApi } from './trendyol-settings-api';

export default function TrendyolAttributeMapping() {
  const { data: localAttrs, isLoading: lLoading } = useQuery({
    queryKey: ['local-attributes-count'],
    queryFn:  settingsApi.getLocalAttributes,
    staleTime: 60_000,
  });
  const { data: mapping, isLoading: mLoading } = useQuery({
    queryKey: ['attribute-mapping-summary'],
    queryFn:  settingsApi.getAttributeMapping,
    staleTime: 30_000,
  });

  const isLoading   = lLoading || mLoading;
  const totalLocal  = localAttrs?.length ?? 0;
  const mappedCount = mapping ? Object.keys(mapping).filter(k => mapping[k] != null && mapping[k] !== '').length : 0;
  const unmapped    = totalLocal - mappedCount;
  const pct         = totalLocal > 0 ? Math.round(mappedCount / totalLocal * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900">Özellik Eşleştirme</h3>
          <p className="text-[11px] text-gray-400">Ürün özellikleri → Trendyol özellikleri</p>
        </div>
        <a href="/dashboard/marketplaces/trendyol"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors flex-shrink-0">
          Düzenle
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </a>
      </div>

      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse"/>
            <div className="h-2 bg-gray-100 rounded-full animate-pulse"/>
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">{mappedCount} / {totalLocal} özellik eşleştirildi</span>
                <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600' : pct > 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-emerald-400' : pct > 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> {mappedCount} eşleştirildi
              </span>
              {unmapped > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"/> {unmapped} eşleştirilmemiş
                </span>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="text-xs text-blue-700">
                Özellik eşleştirme opsiyoneldir. Ancak Trendyol bazı kategorilerde zorunlu özellikler talep edebilir.
                Tam konfigürasyon için <a href="/dashboard/marketplaces/trendyol" className="font-bold underline">Özellik Eşleştirme</a> sayfasına gidin.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
