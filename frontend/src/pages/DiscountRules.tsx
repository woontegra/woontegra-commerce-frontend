import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  computeDiscountRuleStats,
  fetchDiscountRules,
  RULE_KIND_LABELS,
  STATUS_LABELS,
  type DiscountRuleKind,
  type DiscountRuleListItem,
  type DiscountRuleStatus,
} from '../services/discountRulesApi.service';
import { Table } from '../components/ui/Table';

// ─── Styles ───────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<DiscountRuleStatus, string> = {
  active:    'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  scheduled: 'bg-blue-50 text-blue-800 ring-1 ring-blue-100',
  inactive:  'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  expired:   'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
};

const KIND_STYLE: Record<DiscountRuleKind, string> = {
  product:  'bg-violet-50 text-violet-800 ring-1 ring-violet-100',
  category: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100',
  cart:     'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
  shipping: 'bg-teal-50 text-teal-800 ring-1 ring-teal-100',
  other:    'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style:                 'currency',
    currency:              'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  }).format(new Date(iso));
}

function matchesSearch(rule: DiscountRuleListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    rule.name,
    rule.targetLabel,
    rule.discountLabel,
    RULE_KIND_LABELS[rule.ruleKind],
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function matchesStatus(rule: DiscountRuleListItem, filter: string): boolean {
  if (!filter) return true;
  return rule.status === filter;
}

function matchesKind(rule: DiscountRuleListItem, filter: string): boolean {
  if (!filter) return true;
  return rule.ruleKind === filter;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[110px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: DiscountRuleStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function KindBadge({ kind }: { kind: DiscountRuleKind }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${KIND_STYLE[kind]}`}>
      {RULE_KIND_LABELS[kind]}
    </span>
  );
}

function TableEmptyState() {
  return (
    <div className="empty-state py-14 px-6">
      <div className="empty-state-icon">
        <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </div>
      <p className="empty-state-title">Henüz indirim kuralı oluşturulmamış.</p>
      <p className="empty-state-desc mx-auto">
        Ürün, kategori veya sepet bazlı otomatik indirimler oluşturduğunuzda burada listelenecektir.
      </p>
      <p className="text-[12px] text-slate-400 mt-4 max-w-md mx-auto text-center leading-relaxed">
        İndirim motoru sonraki fazda kuponlar ve kampanyalarla birlikte genişletilebilir.
        Bu sayfa kupon ve kampanya yönetiminden ayrıdır.
      </p>
    </div>
  );
}

function FilteredEmptyState() {
  return (
    <div className="empty-state py-12 px-6">
      <p className="empty-state-title">Filtrelere uygun kural bulunamadı</p>
      <p className="empty-state-desc mx-auto">Arama veya filtre kriterlerini değiştirerek tekrar deneyin.</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscountRules() {
  const [allItems, setAllItems]         = useState<DiscountRuleListItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [kindFilter, setKindFilter]     = useState('');
  const [searchQuery, setSearchQuery]   = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchDiscountRules();
      setAllItems(res.items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => computeDiscountRuleStats(allItems), [allItems]);

  const filteredItems = useMemo(
    () => allItems.filter(r =>
      matchesStatus(r, statusFilter)
      && matchesKind(r, kindFilter)
      && matchesSearch(r, searchQuery),
    ),
    [allItems, statusFilter, kindFilter, searchQuery],
  );

  const hasActiveFilters = Boolean(statusFilter || kindFilter || searchQuery.trim());
  const showGlobalEmpty   = !loading && allItems.length === 0;
  const showFilteredEmpty = !loading && allItems.length > 0 && filteredItems.length === 0;

  const handleCreateClick = () => {
    toast('İndirim kuralı oluşturma sonraki fazda aktif olacak.', { icon: 'ℹ️' });
  };

  const columns = useMemo(() => [
    {
      key:    'name',
      header: 'Kural Adı',
      cell:   (r: DiscountRuleListItem) => (
        <span className="font-medium text-slate-900">{r.name}</span>
      ),
    },
    {
      key:    'kind',
      header: 'Tip',
      cell:   (r: DiscountRuleListItem) => <KindBadge kind={r.ruleKind} />,
    },
    {
      key:    'discount',
      header: 'İndirim',
      cell:   (r: DiscountRuleListItem) => (
        <span className="font-medium text-slate-800">{r.discountLabel}</span>
      ),
    },
    {
      key:    'target',
      header: 'Hedef',
      cell:   (r: DiscountRuleListItem) => (
        <span className="text-[13px] text-slate-600">{r.targetLabel}</span>
      ),
    },
    {
      key:    'status',
      header: 'Durum',
      cell:   (r: DiscountRuleListItem) => <StatusBadge status={r.status} />,
    },
    {
      key:    'start',
      header: 'Başlangıç',
      cell:   (r: DiscountRuleListItem) => (
        <span className="text-slate-600 whitespace-nowrap text-[13px]">{fmtDate(r.startDate)}</span>
      ),
    },
    {
      key:    'end',
      header: 'Bitiş',
      cell:   (r: DiscountRuleListItem) => (
        <span className="text-slate-600 whitespace-nowrap text-[13px]">{fmtDate(r.endDate)}</span>
      ),
    },
    {
      key:    'usage',
      header: 'Kullanım',
      align:  'right' as const,
      cell:   (r: DiscountRuleListItem) => (
        <span className="tabular-nums text-slate-800">{r.usageCount}</span>
      ),
    },
    {
      key:    'savings',
      header: 'Tasarruf',
      align:  'right' as const,
      cell:   (r: DiscountRuleListItem) => (
        r.totalSavings > 0
          ? <span className="tabular-nums text-slate-800">{fmtCurrency(r.totalSavings)}</span>
          : <span className="text-slate-400">₺0,00</span>
      ),
    },
    {
      key:    'action',
      header: 'İşlem',
      align:  'right' as const,
      cell:   () => (
        <span
          className="text-[12px] text-slate-400"
          title="Düzenleme sonraki fazda aktif olacak."
        >
          —
        </span>
      ),
    },
  ], []);

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            İndirim Kuralları
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xl leading-relaxed">
            Sepet, ürün ve kategori bazlı otomatik indirim kurallarını yönetin.
            Kupon ve kampanya yönetimi ayrı sayfalardadır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="btn btn-secondary"
          >
            {refreshing ? 'Yenileniyor…' : 'Yenile'}
          </button>
          <button
            type="button"
            onClick={handleCreateClick}
            disabled
            title="İndirim kuralı oluşturma sonraki fazda aktif olacak."
            className="btn btn-primary opacity-50 cursor-not-allowed"
          >
            Yeni İndirim Kuralı
          </button>
        </div>
      </div>

      <div className="wn-card px-4 py-3 flex items-start gap-3 bg-indigo-50/40 border-indigo-100/80">
        <svg className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[13px] text-slate-600 leading-relaxed">
          Otomatik indirim kuralları backend entegrasyonu tamamlandığında bu sayfada listelenecektir.
          İndirim motoru sonraki fazda kuponlar ve kampanyalarla birlikte genişletilebilir.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryMetric label="Aktif Kurallar" value={stats.active} />
        <SummaryMetric label="Planlanmış" value={stats.scheduled} />
        <SummaryMetric label="Süresi Dolan" value={stats.expired} />
        <SummaryMetric label="Toplam Tasarruf" value={fmtCurrency(stats.totalSavings)} />
        <SummaryMetric label="Kullanım Sayısı" value={stats.usageCount} />
      </div>

      <div className="wn-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 space-y-3">
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Kural adı, hedef veya indirim ara…"
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
              <option value="active">Aktif</option>
              <option value="scheduled">Planlanmış</option>
              <option value="inactive">Pasif</option>
              <option value="expired">Süresi doldu</option>
            </select>
            <select
              value={kindFilter}
              onChange={e => setKindFilter(e.target.value)}
              className="wn-select sm:w-48"
              aria-label="Kural tipi filtresi"
            >
              <option value="">Tüm tipler</option>
              <option value="product">Ürün indirimi</option>
              <option value="category">Kategori indirimi</option>
              <option value="cart">Sepet indirimi</option>
              <option value="shipping">Kargo indirimi</option>
            </select>
          </div>
          {hasActiveFilters && !loading && (
            <p className="text-[12px] text-slate-500">
              {filteredItems.length} kural gösteriliyor
              {allItems.length !== filteredItems.length && ` (${allItems.length} toplam)`}
            </p>
          )}
        </div>

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
