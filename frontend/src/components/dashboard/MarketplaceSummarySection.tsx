import { Link } from 'react-router-dom';
import type { TrendyolStats } from '../trendyol/settings/trendyol-settings-api';

interface OverviewSlice {
  sentProducts?:    number;
  failedProducts?:  number;
  successRate?:     number;
  recentSent?:      Array<{ productName: string | null; createdAt: string }>;
  topErrors?:       Array<{ productName: string | null; errorCount: number }>;
}

interface MarketplaceSummarySectionProps {
  trendyol:   TrendyolStats | null;
  overview:   OverviewSlice | null;
  trendyolOrders?: number;
  waitingQuestions?: number;
  loading:    boolean;
}

function fmt(n: number | undefined | null): string {
  if (n == null) return '—';
  return n.toLocaleString('tr-TR');
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-xs font-medium text-slate-600">{label}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
      <span className="text-sm font-medium text-slate-900 tabular-nums">{value}</span>
    </div>
  );
}

export default function MarketplaceSummarySection({
  trendyol,
  overview,
  trendyolOrders,
  waitingQuestions,
  loading,
}: MarketplaceSummarySectionProps) {
  const connected = trendyol?.connected ?? false;

  return (
    <div className="wn-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-slate-900">Pazaryeri Özeti</h2>
            <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100/80">
              Trendyol
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Entegrasyon durumu ve pazaryeri metrikleri</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard/marketplaces/trendyol"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            Trendyol Paneline Git
          </Link>
          <Link
            to="/dashboard/marketplaces"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Pazaryerleri
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
          ))}</div>
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
          ))}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Bağlantı</h3>
            <MetricRow
              label="Durum"
              value={connected ? 'Bağlı' : 'Bağlı değil'}
              sub={trendyol?.supplierId ? `Supplier: ${trendyol.supplierId}` : undefined}
            />
            <MetricRow label="Son senkron" value={timeAgo(trendyol?.lastSync)} />
            <MetricRow label="Trendyol sipariş sayısı" value={fmt(trendyolOrders)} />
            <MetricRow label="Cevap bekleyen sorular" value={fmt(waitingQuestions)} />
          </div>

          <div>
            <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Ürün gönderimi</h3>
            <MetricRow label="Gönderilen ürün" value={fmt(overview?.sentProducts ?? trendyol?.sent)} />
            <MetricRow label="Hatalı gönderim" value={fmt(overview?.failedProducts ?? trendyol?.errors)} />
            <MetricRow
              label="Başarı oranı"
              value={overview?.successRate != null ? `%${overview.successRate}` : '—'}
            />
          </div>

          <div>
            <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Son gönderimler</h3>
            {!overview?.recentSent?.length ? (
              <p className="text-xs text-slate-400 py-4 text-center">Henüz gönderim yapılmamış</p>
            ) : (
              <div className="space-y-2">
                {overview.recentSent.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="truncate text-slate-700 font-medium flex-1">
                      {s.productName ?? 'Ürün'}
                    </span>
                    <span className="text-slate-400 flex-shrink-0">{timeAgo(s.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}

            {(overview?.topErrors?.length ?? 0) > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-red-600 mb-2">Hatalı ürünler</p>
                {overview!.topErrors!.slice(0, 3).map((t, i) => (
                  <div key={i} className="flex justify-between text-xs py-1">
                    <span className="truncate text-slate-600">{t.productName ?? '—'}</span>
                    <span className="font-medium text-red-600 ml-2">{t.errorCount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
