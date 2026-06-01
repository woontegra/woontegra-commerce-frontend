import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  countByStatus,
  loadStockTableRows,
  type StockTableRow,
} from '../utils/stockPageRows';
import type { StockStatus } from '../types/stock';
import { stockManagementService } from '../services/stockManagement.service';
import { Table } from '../components/ui/Table';

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<StockStatus, string> = {
  in_stock:     'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  low_stock:    'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
  out_of_stock: 'bg-red-50 text-red-800 ring-1 ring-red-100',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function matchesSearch(row: StockTableRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.productName,
    row.sku,
    row.variantLabel,
    row.id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function matchesStatusFilter(row: StockTableRow, filter: string): boolean {
  if (!filter) return true;
  return row.status === filter;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function SummaryMetric({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold mt-1 tabular-nums ${tone ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: StockStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[status]}`}>
      {stockManagementService.getStatusLabel(status)}
    </span>
  );
}

function TableEmptyState({ loadFailed }: { loadFailed: boolean }) {
  return (
    <div className="empty-state py-14 px-6">
      <div className="empty-state-icon">
        <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <p className="empty-state-title">
        {loadFailed
          ? 'Stok yönetimi için gerçek ürün verisi bulunamadı.'
          : 'Henüz stok takibi yapılacak ürün bulunmuyor.'}
      </p>
      <p className="empty-state-desc mx-auto">
        Ürünlerinizde stok bilgisi tanımlandığında bu sayfada stok durumu, düşük stok uyarıları
        ve tükenen ürünler listelenecektir.
      </p>
    </div>
  );
}

function FilteredEmptyState() {
  return (
    <div className="empty-state py-12 px-6">
      <p className="empty-state-title">Filtrelere uygun stok kaydı bulunamadı</p>
      <p className="empty-state-desc mx-auto">Arama veya durum filtresini değiştirerek tekrar deneyin.</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StockManagement() {
  const [rows, setRows]               = useState<StockTableRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadFailed, setLoadFailed]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery]   = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await loadStockTableRows();
      setRows(result.rows);
      setLoadFailed(result.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => countByStatus(rows), [rows]);

  const filteredRows = useMemo(
    () => rows.filter(r => matchesStatusFilter(r, statusFilter) && matchesSearch(r, searchQuery)),
    [rows, statusFilter, searchQuery],
  );

  const hasActiveFilters = Boolean(statusFilter || searchQuery.trim());
  const showGlobalEmpty  = !loading && rows.length === 0;
  const showFilteredEmpty = !loading && rows.length > 0 && filteredRows.length === 0;

  const columns = useMemo(() => [
    {
      key:    'product',
      header: 'Ürün',
      cell:   (r: StockTableRow) => (
        <div className="min-w-[160px]">
          <p className="font-medium text-slate-900">{r.productName}</p>
          {r.variantId && (
            <p className="text-[11px] text-slate-500 mt-0.5">{r.variantLabel}</p>
          )}
        </div>
      ),
    },
    {
      key:    'sku',
      header: 'SKU',
      cell:   (r: StockTableRow) => (
        <span className="font-mono text-[12px] text-slate-700">{r.sku ?? '—'}</span>
      ),
    },
    {
      key:    'variant',
      header: 'Varyant',
      cell:   (r: StockTableRow) => (
        <span className="text-[13px] text-slate-600">
          {r.variantId ? r.variantLabel : r.variantLabel ?? '—'}
        </span>
      ),
    },
    {
      key:    'status',
      header: 'Durum',
      cell:   (r: StockTableRow) => <StatusBadge status={r.status} />,
    },
    {
      key:    'total',
      header: 'Toplam Stok',
      align:  'right' as const,
      cell:   (r: StockTableRow) => (
        <span className="tabular-nums font-medium text-slate-900">{r.totalStock}</span>
      ),
    },
    {
      key:    'reserved',
      header: 'Rezerve',
      align:  'right' as const,
      cell:   () => (
        <span className="text-[12px] text-slate-400">Takip edilmiyor</span>
      ),
    },
    {
      key:    'available',
      header: 'Kullanılabilir',
      align:  'right' as const,
      cell:   (r: StockTableRow) => (
        <span className="tabular-nums font-medium text-slate-800">{r.available}</span>
      ),
    },
    {
      key:    'threshold',
      header: 'Eşik',
      align:  'right' as const,
      cell:   (r: StockTableRow) => (
        r.threshold != null
          ? <span className="tabular-nums text-slate-700">{r.threshold}</span>
          : <span className="text-[12px] text-slate-400">Tanımlanmamış</span>
      ),
    },
    {
      key:    'activity',
      header: 'Son Aktivite',
      cell:   (r: StockTableRow) => (
        <span className="text-slate-600 whitespace-nowrap text-[13px]">{fmtDate(r.updatedAt)}</span>
      ),
    },
    {
      key:    'action',
      header: 'İşlem',
      align:  'right' as const,
      cell:   (r: StockTableRow) => (
        <Link
          to={`/dashboard/products/${r.productId}/edit`}
          className="text-indigo-600 font-medium hover:text-indigo-800 hover:underline text-[13px]"
        >
          Ürüne git
        </Link>
      ),
    },
  ], []);

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Stok Yönetimi
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xl leading-relaxed">
            Ürün stoklarını takip edin; düşük stok ve tükenen ürünleri görün.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="btn btn-secondary shrink-0 self-start"
        >
          {refreshing ? 'Yenileniyor…' : 'Yenile'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryMetric label="Toplam Kayıt" value={stats.total} />
        <SummaryMetric label="Stokta" value={stats.inStock} tone="text-emerald-700" />
        <SummaryMetric label="Düşük Stok" value={stats.lowStock} tone="text-amber-700" />
        <SummaryMetric label="Tükendi" value={stats.outOfStock} tone="text-red-700" />
      </div>

      {(stats.lowStock > 0 || stats.outOfStock > 0) && (
        <div className="space-y-3">
          {stats.lowStock > 0 && (
            <div className="wn-card px-4 py-3 border-amber-100 bg-amber-50/50 flex items-start gap-3">
              <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-[13px] text-amber-900">
                <span className="font-medium">{stats.lowStock} kayıt</span> düşük stokta
                {rows.some(r => r.threshold == null) && (
                  <span className="text-amber-800/80"> (eşik tanımlı olmayan ürünlerde yalnızca stok miktarı gösterilir)</span>
                )}
              </p>
            </div>
          )}
          {stats.outOfStock > 0 && (
            <div className="wn-card px-4 py-3 border-red-100 bg-red-50/50 flex items-start gap-3">
              <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] text-red-900">
                <span className="font-medium">{stats.outOfStock} kayıt</span> stokta yok
              </p>
            </div>
          )}
        </div>
      )}

      <div className="wn-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ürün adı veya SKU ara…"
                className="wn-input w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="wn-select sm:w-44"
              aria-label="Durum filtresi"
            >
              <option value="">Tüm durumlar</option>
              <option value="in_stock">Stokta</option>
              <option value="low_stock">Düşük stok</option>
              <option value="out_of_stock">Tükendi</option>
            </select>
          </div>
          {hasActiveFilters && !loading && (
            <p className="text-[12px] text-slate-500 mt-2">
              {filteredRows.length} kayıt gösteriliyor
            </p>
          )}
        </div>

        <div className="px-2 sm:px-3 pb-2">
          <Table
            data={filteredRows}
            columns={columns}
            keyExtractor={r => r.id}
            loading={loading}
            emptyState={
              showGlobalEmpty
                ? <TableEmptyState loadFailed={loadFailed} />
                : showFilteredEmpty
                  ? <FilteredEmptyState />
                  : undefined
            }
          />
        </div>
      </div>

      <p className="text-[12px] text-slate-400 text-center">
        Stok güncelleme bu sayfadan yapılmaz; ürün düzenleme ekranından yönetilir.
      </p>
    </div>
  );
}
