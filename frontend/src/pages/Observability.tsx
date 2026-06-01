import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Table } from '../components/ui/Table';
import {
  observabilityApi,
  type LogEntry,
} from '../services/observability.service';
import {
  categoryFilterOptions,
  categoryToModule,
  isTechnicalLog,
  matchesCategoryFilter,
  matchesResultFilter,
  presentActivity,
  resultBadgeClass,
  type ActivityCategory,
  type ActivityResult,
} from '../utils/activityHistoryPresenter';

type DateFilter = '24h' | '7d' | '30d' | 'all';
type ResultFilter = '' | ActivityResult;

const DATE_FILTERS: Array<{ value: DateFilter; label: string }> = [
  { value: '24h', label: 'Son 24 saat' },
  { value: '7d',  label: 'Son 7 gün' },
  { value: '30d', label: 'Son 30 gün' },
  { value: 'all', label: 'Tümü' },
];

const RESULT_FILTERS: Array<{ value: ResultFilter; label: string }> = [
  { value: '',        label: 'Tüm sonuçlar' },
  { value: 'success', label: 'Başarılı' },
  { value: 'warning', label: 'Uyarı' },
  { value: 'error',   label: 'Hata' },
];

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function matchesDate(row: LogEntry, filter: DateFilter) {
  if (filter === 'all') return true;
  const ms = Date.now() - new Date(row.createdAt).getTime();
  if (filter === '24h') return ms <= 24 * 60 * 60 * 1000;
  if (filter === '7d')  return ms <= 7 * 24 * 60 * 60 * 1000;
  return ms <= 30 * 24 * 60 * 60 * 1000;
}

function SummaryMetric({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[100px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold mt-1 tabular-nums ${tone ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function TableEmptyState() {
  return (
    <div className="empty-state py-14 px-6">
      <div className="empty-state-icon">
        <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="empty-state-title">Henüz işlem kaydı bulunmuyor.</p>
      <p className="empty-state-desc mx-auto max-w-md">
        Mağazanızda gerçekleşen işlemler burada listelenecektir.
      </p>
    </div>
  );
}

function ActivityDetailModal({ row, onClose }: { row: LogEntry; onClose: () => void }) {
  const view = presentActivity(row);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-slate-200 p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">İşlem Detayı</h2>
            <p className="text-[13px] text-slate-500 mt-1">{fmtDateTime(row.createdAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost text-[13px]">Kapat</button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-[13px]">
          <div><span className="text-slate-500">Kategori:</span> <span className="font-medium">{view.categoryLabel}</span></div>
          <div><span className="text-slate-500">İşlem:</span> <span className="font-medium">{view.operation}</span></div>
          <div>
            <span className="text-slate-500">Sonuç:</span>{' '}
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${resultBadgeClass(view.result)}`}>
              {view.resultLabel}
            </span>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Açıklama</p>
          <p className="text-[13px] text-slate-800 whitespace-pre-wrap break-words">{view.description}</p>
        </div>

        {row.errorMessage && (
          <div>
            <p className="text-[11px] font-medium text-red-500 uppercase tracking-wide mb-1">Hata detayı</p>
            <p className="text-[13px] text-red-700 whitespace-pre-wrap break-words">{row.errorMessage}</p>
          </div>
        )}

        <details className="rounded-xl border border-slate-100 bg-slate-50/80">
          <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium text-slate-600">
            Teknik kayıt bilgisi
          </summary>
          <div className="px-4 pb-4 space-y-3 text-[12px] text-slate-600">
            {row.traceId && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500">Trace ID:</span>
                <code className="font-mono break-all">{row.traceId}</code>
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-800 text-[11px]"
                  onClick={() => {
                    void navigator.clipboard.writeText(row.traceId!);
                    toast.success('Trace ID kopyalandı.');
                  }}
                >
                  Kopyala
                </button>
              </div>
            )}
            <div><span className="text-slate-500">Kaynak modül:</span> {row.module}</div>
            <div><span className="text-slate-500">Aksiyon:</span> <code className="font-mono">{row.action}</code></div>
            {row.status && <div><span className="text-slate-500">Durum kodu:</span> {row.status}</div>}
            <div>
              <p className="text-slate-500 mb-1">Orijinal mesaj</p>
              <p className="whitespace-pre-wrap break-words">{row.message}</p>
            </div>
            {row.stack && (
              <div>
                <p className="text-slate-500 mb-1">Stack</p>
                <pre className="text-[11px] bg-white border border-slate-100 rounded-lg p-3 overflow-x-auto">{row.stack}</pre>
              </div>
            )}
            {row.metadata && Object.keys(row.metadata).length > 0 && (
              <div>
                <p className="text-slate-500 mb-1">Metadata</p>
                <pre className="text-[11px] bg-white border border-slate-100 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

export default function Observability() {
  const [items, setItems]           = useState<LogEntry[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);

  const [category, setCategory]       = useState<'' | ActivityCategory>('');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('');
  const [dateFilter, setDateFilter]   = useState<DateFilter>('7d');
  const [search, setSearch]           = useState('');
  const [showTechnical, setShowTechnical] = useState(false);
  const [detailRow, setDetailRow]     = useState<LogEntry | null>(null);

  const [stats, setStats] = useState({
    total:    0,
    errors:   0,
    warnings: 0,
    success:  0,
    last24h:  0,
  });

  const apiModule = categoryToModule(category);

  const loadStats = useCallback(async (module?: string, searchQ?: string) => {
    try {
      const base = { limit: 1, page: 1, module, search: searchQ || undefined };
      const [all, err, warn, recent] = await Promise.all([
        observabilityApi.getLogs(base),
        observabilityApi.getLogs({ ...base, level: 'error' }),
        observabilityApi.getLogs({ ...base, level: 'warn' }),
        observabilityApi.getLogs({ ...base, limit: 100, page: 1 }),
      ]);
      const visible = recent.items.filter(r => !isTechnicalLog(r));
      const last24h = visible.filter(r =>
        Date.now() - new Date(r.createdAt).getTime() <= 24 * 60 * 60 * 1000,
      ).length;
      setStats({
        total:    all.total,
        errors:   err.total,
        warnings: warn.total,
        success:  Math.max(0, all.total - err.total - warn.total),
        last24h,
      });
      setApiAvailable(true);
    } catch {
      setStats({ total: 0, errors: 0, warnings: 0, success: 0, last24h: 0 });
      setApiAvailable(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const apiLevel = resultFilter === 'error' ? 'error'
        : resultFilter === 'warning' ? 'warn'
          : undefined;

      const r = await observabilityApi.getLogs({
        page,
        limit: 30,
        module: apiModule,
        level:  apiLevel,
        search: search.trim() || undefined,
      });
      setItems(r.items);
      setTotal(r.total);
      setTotalPages(r.totalPages);
      setApiAvailable(true);
    } catch {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setApiAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [page, apiModule, resultFilter, search]);

  useEffect(() => {
    void loadStats(apiModule, search.trim() || undefined);
  }, [loadStats, apiModule, search]);

  useEffect(() => { void loadLogs(); }, [loadLogs]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 350);
    return () => clearTimeout(t);
  }, [search, category, resultFilter, dateFilter, showTechnical]);

  const filteredItems = useMemo(() => items.filter(row => {
    if (!showTechnical && isTechnicalLog(row)) return false;
    if (!matchesCategoryFilter(row, category)) return false;
    if (!matchesResultFilter(row, resultFilter)) return false;
    if (!matchesDate(row, dateFilter)) return false;
    return true;
  }), [items, showTechnical, category, resultFilter, dateFilter]);

  const columns = useMemo(() => [
    {
      key:    'date',
      header: 'Tarih',
      cell:   (row: LogEntry) => (
        <span className="text-[12px] text-slate-600 whitespace-nowrap">{fmtDateTime(row.createdAt)}</span>
      ),
    },
    {
      key:    'category',
      header: 'Kategori',
      cell:   (row: LogEntry) => (
        <span className="text-[13px] text-slate-700">{presentActivity(row).categoryLabel}</span>
      ),
    },
    {
      key:    'operation',
      header: 'İşlem',
      cell:   (row: LogEntry) => (
        <span className="text-[13px] font-medium text-slate-900">{presentActivity(row).operation}</span>
      ),
    },
    {
      key:    'result',
      header: 'Sonuç',
      cell:   (row: LogEntry) => {
        const view = presentActivity(row);
        return (
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium ${resultBadgeClass(view.result)}`}>
            {view.resultLabel}
          </span>
        );
      },
    },
    {
      key:    'description',
      header: 'Açıklama',
      cell:   (row: LogEntry) => (
        <span className="text-[13px] text-slate-600 line-clamp-2" title={presentActivity(row).description}>
          {presentActivity(row).description}
        </span>
      ),
    },
    {
      key:    'detail',
      header: 'Detay',
      align:  'right' as const,
      cell:   (row: LogEntry) => (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setDetailRow(row); }}
          className="text-[13px] font-medium text-indigo-600 hover:text-indigo-800"
        >
          Görüntüle
        </button>
      ),
    },
  ], []);

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">İşlem Geçmişi</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Mağazanızda gerçekleşen sistem, entegrasyon ve operasyon işlemlerini takip edin.
        </p>
        {!apiAvailable && (
          <p className="text-[12px] text-amber-700 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 inline-block">
            İşlem kayıtları şu an yüklenemiyor. Yeni işlemler oluştukça burada görünecektir.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryMetric label="Toplam İşlem" value={stats.total} />
        <SummaryMetric label="Hata" value={stats.errors} tone="text-red-700" />
        <SummaryMetric label="Uyarı" value={stats.warnings} tone="text-amber-700" />
        <SummaryMetric label="Başarılı" value={stats.success} tone="text-emerald-700" />
        <SummaryMetric label="Son 24 Saat" value={stats.last24h} />
      </div>

      <div className="wn-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex flex-col xl:flex-row xl:flex-wrap gap-3">
            <select
              value={category}
              onChange={e => setCategory(e.target.value as '' | ActivityCategory)}
              className="wn-select sm:w-44"
              aria-label="Kategori"
            >
              {categoryFilterOptions().map(o => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={resultFilter}
              onChange={e => setResultFilter(e.target.value as ResultFilter)}
              className="wn-select sm:w-40"
              aria-label="Sonuç"
            >
              {RESULT_FILTERS.map(o => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as DateFilter)}
              className="wn-select sm:w-40"
              aria-label="Tarih"
            >
              {DATE_FILTERS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="İşlem veya açıklama ara…"
              className="wn-input flex-1 min-w-[200px]"
            />
          </div>
          <label className="flex items-center gap-2 mt-3 text-[13px] text-slate-600 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={showTechnical}
              onChange={e => setShowTechnical(e.target.checked)}
              className="rounded border-slate-300"
            />
            Teknik kayıtları göster
          </label>
          {(search || category || resultFilter || dateFilter !== '7d' || showTechnical) && !loading && (
            <p className="text-[12px] text-slate-500 mt-2">{filteredItems.length} kayıt gösteriliyor</p>
          )}
        </div>

        <div className="px-2 sm:px-3 pb-2">
          <Table
            data={filteredItems}
            columns={columns}
            keyExtractor={r => r.id}
            loading={loading}
            emptyState={!loading ? <TableEmptyState /> : undefined}
          />
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500">
            <span>{total.toLocaleString('tr-TR')} kayıt</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="btn btn-ghost text-[12px] disabled:opacity-40"
              >
                Önceki
              </button>
              <span>{page} / {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn btn-ghost text-[12px] disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {detailRow && <ActivityDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </div>
  );
}
