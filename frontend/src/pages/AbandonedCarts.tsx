import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  computeAbandonedCartStats,
  fetchAbandonedCarts,
  type AbandonedCartListItem,
} from '../services/abandonedCartApi.service';
import { Table } from '../components/ui/Table';

// ─── Labels & styles ──────────────────────────────────────────────────────────

type StatusFilter = '' | 'active' | 'recovered' | 'mail_sent' | 'expired';
type DateFilter   = '7d' | '30d' | 'all';

const STATUS_LABELS: Record<string, string> = {
  active:    'Terk edilmiş',
  recovered: 'Kurtarıldı',
  expired:   'Süresi doldu',
};

const STATUS_STYLE: Record<string, string> = {
  active:    'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
  recovered: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  expired:   'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fmtPercent(value: number) {
  return `%${value}`;
}

function customerLabel(c: AbandonedCartListItem): string {
  if (c.customerName?.trim()) return c.customerName.trim();
  if (c.email?.trim()) return c.email.trim();
  if (c.phone?.trim()) return c.phone.trim();
  return 'Misafir müşteri';
}

function itemCount(c: AbandonedCartListItem): number {
  if (typeof c.itemCount === 'number') return c.itemCount;
  return c.cartData?.items?.reduce((s, i) => s + (i.quantity ?? 1), 0) ?? 0;
}

function cartTotal(c: AbandonedCartListItem): number {
  return c.totalAmount ?? c.cartData?.total ?? 0;
}

function recoveryLabel(c: AbandonedCartListItem): string {
  if (c.status === 'recovered') return 'Siparişe dönüştü';
  if (c.reminderSent) return 'Mail gönderildi';
  return 'Bekliyor';
}

function matchesSearch(c: AbandonedCartListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    c.id,
    c.sessionId,
    c.customerName,
    c.email,
    c.phone,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function matchesDate(c: AbandonedCartListItem, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  const ts = new Date(c.updatedAt).getTime();
  const days = filter === '7d' ? 7 : 30;
  return ts >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function matchesStatus(c: AbandonedCartListItem, filter: StatusFilter): boolean {
  if (!filter) return true;
  if (filter === 'mail_sent') return Boolean(c.reminderSent) && c.status === 'active';
  return c.status === filter;
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function SummaryMetric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?:  string;
}) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function TableEmptyState() {
  return (
    <div className="empty-state py-14 px-6">
      <div className="empty-state-icon">
        <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <p className="empty-state-title">Henüz terk edilmiş sepet bulunmuyor.</p>
      <p className="empty-state-desc mx-auto">
        Müşteriler sepete ürün ekleyip alışverişi tamamlamadığında bu alanda listelenecektir.
      </p>
      <p className="text-[12px] text-slate-400 mt-4 max-w-md mx-auto text-center leading-relaxed">
        Geri kazanım e-postaları ve otomasyonlar sonraki fazda yönetilebilir.
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
      <p className="empty-state-title">Filtrelere uygun sepet bulunamadı</p>
      <p className="empty-state-desc mx-auto">
        Arama veya filtre kriterlerini değiştirerek tekrar deneyin.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AbandonedCarts() {
  const [allItems, setAllItems]       = useState<AbandonedCartListItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [dateFilter, setDateFilter]     = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery]   = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchAbandonedCarts();
      setAllItems(res.items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(
    () => computeAbandonedCartStats(allItems),
    [allItems],
  );

  const filteredItems = useMemo(() => {
    return allItems.filter(c =>
      matchesStatus(c, statusFilter)
      && matchesDate(c, dateFilter)
      && matchesSearch(c, searchQuery),
    );
  }, [allItems, statusFilter, dateFilter, searchQuery]);

  const hasActiveFilters = Boolean(statusFilter || dateFilter !== 'all' || searchQuery.trim());
  const showGlobalEmpty  = !loading && allItems.length === 0;
  const showFilteredEmpty = !loading && allItems.length > 0 && filteredItems.length === 0;

  const columns = useMemo(() => [
    {
      key:    'id',
      header: 'Sepet No',
      cell:   (c: AbandonedCartListItem) => (
        <span className="font-mono text-[12px] font-medium text-slate-900">{c.id}</span>
      ),
    },
    {
      key:    'customer',
      header: 'Müşteri',
      cell:   (c: AbandonedCartListItem) => (
        <div className="min-w-[140px]">
          <p className="text-slate-900">{customerLabel(c)}</p>
          {c.email && c.customerName && (
            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{c.email}</p>
          )}
          {c.phone && (
            <p className="text-[11px] text-slate-400">{c.phone}</p>
          )}
        </div>
      ),
    },
    {
      key:    'items',
      header: 'Ürün Sayısı',
      align:  'right' as const,
      cell:   (c: AbandonedCartListItem) => (
        <span className="tabular-nums text-slate-800">{itemCount(c)}</span>
      ),
    },
    {
      key:    'total',
      header: 'Sepet Tutarı',
      align:  'right' as const,
      cell:   (c: AbandonedCartListItem) => (
        <span className="tabular-nums text-slate-800">{fmtCurrency(cartTotal(c))}</span>
      ),
    },
    {
      key:    'status',
      header: 'Durum',
      cell:   (c: AbandonedCartListItem) => <StatusBadge status={c.status} />,
    },
    {
      key:    'activity',
      header: 'Son Aktivite',
      cell:   (c: AbandonedCartListItem) => (
        <span className="text-slate-600 whitespace-nowrap">{fmtDate(c.updatedAt)}</span>
      ),
    },
    {
      key:    'recovery',
      header: 'Kurtarma',
      cell:   (c: AbandonedCartListItem) => (
        <span className={`text-[12px] ${c.status === 'recovered' ? 'text-emerald-700 font-medium' : c.reminderSent ? 'text-indigo-600' : 'text-slate-500'}`}>
          {recoveryLabel(c)}
        </span>
      ),
    },
    {
      key:    'action',
      header: 'İşlem',
      align:  'right' as const,
      cell:   () => <span className="text-slate-300 text-[13px]">—</span>,
    },
  ], []);

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Terk Edilmiş Sepetler
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xl leading-relaxed">
            Alışverişi tamamlamayan müşterileri takip edin ve geri kazanım fırsatlarını yönetin.
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

      {/* Phase notice */}
      <div className="wn-card px-4 py-3 flex items-start gap-3 bg-indigo-50/40 border-indigo-100/80">
        <svg className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[13px] text-slate-600 leading-relaxed">
          Geri kazanım otomasyonları sonraki fazda eklenecek. Sepet kayıtları backend entegrasyonu
          tamamlandığında bu sayfada otomatik listelenecektir.
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryMetric label="Terk Edilmiş Sepet" value={stats.abandoned} />
        <SummaryMetric label="Kurtarılan Sepet" value={stats.recovered} />
        <SummaryMetric label="Potansiyel Ciro" value={fmtCurrency(stats.potentialRevenue)} />
        <SummaryMetric label="Kurtarma Oranı" value={fmtPercent(stats.recoveryRate)} />
        <SummaryMetric label="Son 7 Gün" value={stats.last7Days} sub="yeni / güncellenen" />
      </div>

      {/* Filters + table */}
      <div className="wn-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 space-y-3">
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="wn-label sr-only">Ara</label>
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Müşteri adı, e-posta, telefon veya sepet no ara…"
                className="wn-input w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="wn-select sm:w-44"
              aria-label="Durum filtresi"
            >
              <option value="">Tümü</option>
              <option value="active">Terk edilmiş</option>
              <option value="recovered">Kurtarıldı</option>
              <option value="mail_sent">Mail gönderildi</option>
              <option value="expired">Süresi doldu</option>
            </select>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as DateFilter)}
              className="wn-select sm:w-44"
              aria-label="Tarih filtresi"
            >
              <option value="7d">Son 7 gün</option>
              <option value="30d">Son 30 gün</option>
              <option value="all">Tüm zamanlar</option>
            </select>
          </div>
          {hasActiveFilters && !loading && (
            <p className="text-[12px] text-slate-500">
              {filteredItems.length} sepet gösteriliyor
              {allItems.length !== filteredItems.length && ` (${allItems.length} toplam)`}
            </p>
          )}
        </div>

        <div className="px-2 sm:px-3 pb-2">
          <Table
            data={filteredItems}
            columns={columns}
            keyExtractor={c => c.id}
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
