/**
 * TrendyolBrandMapping
 * Marka eşleştirme özet kartı.
 */

import { useQuery } from '@tanstack/react-query';
import { settingsApi } from './trendyol-settings-api';

export default function TrendyolBrandMapping() {
  const { data: localBrands, isLoading: lLoading } = useQuery({
    queryKey: ['local-brands-count'],
    queryFn:  settingsApi.getLocalBrands,
    staleTime: 60_000,
  });
  const { data: mapping, isLoading: mLoading } = useQuery({
    queryKey: ['brand-mapping-summary'],
    queryFn:  settingsApi.getBrandMapping,
    staleTime: 30_000,
  });

  const isLoading   = lLoading || mLoading;
  const totalLocal  = localBrands?.length ?? 0;
  const mappedCount = mapping ? Object.keys(mapping).filter(k => mapping[k]).length : 0;
  const unmapped    = totalLocal - mappedCount;
  const pct         = totalLocal > 0 ? Math.round(mappedCount / totalLocal * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900">Marka Eşleştirme</h3>
          <p className="text-[11px] text-gray-400">Yerel markalar → Trendyol marka veritabanı</p>
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
                <span className="text-xs text-gray-500">{mappedCount} / {totalLocal} marka eşleştirildi</span>
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
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"/> {unmapped} eksik
                </span>
              )}
            </div>

            {unmapped > 0 ? (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <p className="text-xs text-amber-700">
                  <strong>{unmapped} marka</strong> eşleştirilmemiş. Marka eksikliği ürün gönderimini engelleyebilir.
                </p>
              </div>
            ) : totalLocal > 0 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
                <p className="text-xs text-emerald-700">Tüm markalar eşleştirilmiş. ✓</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Henüz marka bulunamadı.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
