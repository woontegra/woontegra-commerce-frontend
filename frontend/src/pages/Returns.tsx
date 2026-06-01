import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchReturnRequests,
  type ReturnRequest,
  type ReturnRequestStatus,
  type ReturnRequestType,
} from '../services/returnRequest.service';
import { Table } from '../components/ui/Table';

// ─── Labels & styles ──────────────────────────────────────────────────────────

const RETURN_TYPE_LABELS: Record<ReturnRequestType, string> = {
  CANCEL_REQUEST: 'İptal talebi',
  RETURN_REQUEST: 'İade talebi',
};

const RETURN_STATUS_LABELS: Record<ReturnRequestStatus, string> = {
  PENDING:   'Beklemede',
  APPROVED:  'Onaylandı',
  REJECTED:  'Reddedildi',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal edildi',
};

const STATUS_STYLE: Record<ReturnRequestStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
  APPROVED:  'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  REJECTED:  'bg-red-50 text-red-800 ring-1 ring-red-100',
  COMPLETED: 'bg-blue-50 text-blue-800 ring-1 ring-blue-100',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

const TYPE_STYLE: Record<ReturnRequestType, string> = {
  CANCEL_REQUEST: 'bg-orange-50 text-orange-800 ring-1 ring-orange-100',
  RETURN_REQUEST: 'bg-violet-50 text-violet-800 ring-1 ring-violet-100',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style:                 'currency',
    currency:              currency || 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function customerName(r: ReturnRequest): string {
  if (!r.customer) return '—';
  return `${r.customer.firstName} ${r.customer.lastName}`.trim() || '—';
}

function getReturnRequestAmount(r: ReturnRequest): number | null {
  const itemsTotal = r.items?.reduce((sum, item) => {
    if (item.linePrice != null && item.linePrice > 0) return sum + item.linePrice;
    return sum;
  }, 0);
  if (itemsTotal != null && itemsTotal > 0) return itemsTotal;
  if (r.order?.totalAmount != null) return r.order.totalAmount;
  return null;
}

function matchesSearch(r: ReturnRequest, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    r.requestNumber,
    r.order?.orderNumber,
    customerName(r),
    r.customer?.email,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

// ─── UI primitives ──────────────────────────────────────────────────────────────

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ReturnRequestStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
      {RETURN_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function TypeBadge({ type }: { type: ReturnRequestType }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${TYPE_STYLE[type] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
      {RETURN_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function TableEmptyState() {
  return (
    <div className="empty-state py-14 px-6">
      <div className="empty-state-icon">
        <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="empty-state-title">Henüz iade veya iptal talebi bulunmuyor.</p>
      <p className="empty-state-desc mx-auto">
        Müşteriler iade veya iptal talebi oluşturduğunda burada listelenecektir.
      </p>
    </div>
  );
}

function FilteredEmptyState() {
  return (
    <div className="empty-state py-12 px-6">
      <div className="empty-state-icon">
        <svg className="w-9 h-9 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p className="empty-state-title">Filtrelere uygun talep bulunamadı</p>
      <p className="empty-state-desc mx-auto">
        Arama veya filtre kriterlerini değiştirerek tekrar deneyin.
      </p>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function Returns() {
  const [allItems, setAllItems]   = useState<ReturnRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [searchQuery, setSearchQuery]   = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchReturnRequests({ limit: 500 });
        if (!cancelled) {
          setAllItems(res.items);
          setTotalCount(res.total ?? res.items.length);
        }
      } catch (e: unknown) {
        if (!cancelled) setError((e as Error)?.message || 'Talepler yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => ({
    total:    totalCount || allItems.length,
    pending:  allItems.filter(r => r.status === 'PENDING').length,
    approved: allItems.filter(r => r.status === 'APPROVED').length,
    rejected: allItems.filter(r => r.status === 'REJECTED').length,
  }), [allItems, totalCount]);

  const filteredItems = useMemo(() => {
    return allItems.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (typeFilter && r.type !== typeFilter) return false;
      if (!matchesSearch(r, searchQuery)) return false;
      return true;
    });
  }, [allItems, statusFilter, typeFilter, searchQuery]);

  const hasActiveFilters = Boolean(statusFilter || typeFilter || searchQuery.trim());
  const showGlobalEmpty  = !loading && !error && allItems.length === 0;
  const showFilteredEmpty = !loading && !error && allItems.length > 0 && filteredItems.length === 0;

  const columns = useMemo(() => [
    {
      key:    'requestNumber',
      header: 'Talep No',
      cell:   (r: ReturnRequest) => (
        <span className="font-medium text-slate-900">{r.requestNumber}</span>
      ),
    },
    {
      key:    'orderNumber',
      header: 'Sipariş No',
      cell:   (r: ReturnRequest) => (
        r.order?.orderNumber ? (
          <Link
            to={`/dashboard/orders/${r.orderId}`}
            className="text-indigo-600 hover:text-indigo-800 hover:underline"
            onClick={e => e.stopPropagation()}
          >
            {r.order.orderNumber}
          </Link>
        ) : (
          <span className="text-slate-400">—</span>
        )
      ),
    },
    {
      key:    'customer',
      header: 'Müşteri',
      cell:   (r: ReturnRequest) => (
        <div className="min-w-[120px]">
          <p className="text-slate-900">{customerName(r)}</p>
          {r.customer?.email && (
            <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{r.customer.email}</p>
          )}
        </div>
      ),
    },
    {
      key:    'type',
      header: 'Tür',
      cell:   (r: ReturnRequest) => <TypeBadge type={r.type} />,
    },
    {
      key:    'status',
      header: 'Durum',
      cell:   (r: ReturnRequest) => <StatusBadge status={r.status} />,
    },
    {
      key:    'amount',
      header: 'Tutar',
      align:  'right' as const,
      cell:   (r: ReturnRequest) => {
        const amount = getReturnRequestAmount(r);
        return amount != null ? (
          <span className="tabular-nums text-slate-800">{fmtCurrency(amount)}</span>
        ) : (
          <span className="text-slate-400">—</span>
        );
      },
    },
    {
      key:    'date',
      header: 'Tarih',
      cell:   (r: ReturnRequest) => (
        <span className="text-slate-600 whitespace-nowrap">{fmtDate(r.createdAt)}</span>
      ),
    },
    {
      key:    'action',
      header: 'İşlem',
      align:  'right' as const,
      cell:   (r: ReturnRequest) => (
        <Link
          to={`/dashboard/returns/${r.id}`}
          className="text-indigo-600 font-medium hover:text-indigo-800 hover:underline text-[13px]"
          onClick={e => e.stopPropagation()}
        >
          Detay
        </Link>
      ),
    },
  ], []);

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
          İade / İptal Talepleri
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">Mağaza müşteri iade ve iptal talepleri</p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryMetric label="Toplam Talep" value={stats.total} />
        <SummaryMetric label="Bekleyen" value={stats.pending} />
        <SummaryMetric label="Onaylanan" value={stats.approved} />
        <SummaryMetric label="Reddedilen" value={stats.rejected} />
      </div>

      {/* Filters + table */}
      <div className="wn-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="wn-label sr-only">Ara</label>
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Sipariş no, müşteri veya talep no ara…"
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
              {Object.entries(RETURN_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="wn-select sm:w-44"
              aria-label="Tür filtresi"
            >
              <option value="">Tüm türler</option>
              <option value="RETURN_REQUEST">İade talebi</option>
              <option value="CANCEL_REQUEST">İptal talebi</option>
            </select>
          </div>
          {hasActiveFilters && !loading && (
            <p className="text-[12px] text-slate-500">
              {filteredItems.length} talep gösteriliyor
              {allItems.length !== filteredItems.length && ` (${allItems.length} toplam)`}
            </p>
          )}
        </div>

        {error && (
          <div className="px-5 py-4 border-b border-red-100 bg-red-50/50">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="px-2 sm:px-3 pb-2">
          <Table
            data={filteredItems}
            columns={columns}
            keyExtractor={r => r.id}
            loading={loading}
            emptyState={
              showGlobalEmpty
                ? <TableEmptyState />
                : showFilteredEmpty
                  ? <FilteredEmptyState />
                  : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
