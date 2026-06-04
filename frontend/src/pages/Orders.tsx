import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  useOrders,
  useOrderStats,
  useUpdateOrderStatus,
  useBulkUpdateOrderStatus,
  useCancelOrder,
  useSyncTrendyolOrders,
} from '../hooks/useOrders';
import type {
  Order,
  OrderStatus,
  GetOrdersQuery,
  OrderPaymentProviderFilter,
  OrderPaymentStatusFilter,
  OrderSourceFilter,
} from '../services/order.service';
import Card from '../components/ui/Card';
import EmptyState from '../components/EmptyState';
import CreateManualOrderModal from '../components/orders/CreateManualOrderModal';
import { TableSkeleton } from '../components/Skeleton';
import {
  ORDER_PAYMENT_PROVIDER_LABELS,
  ORDER_PAYMENT_STATUS_LABELS,
} from '../utils/orderPaymentLabels';
import {
  ORDER_LIST_PAGE_SIZES,
  ORDER_LIST_DEFAULT_STATE,
  buildOrderListSearchParams,
  parseOrderListSearchParams,
  orderListStateToApiQuery,
  VALID_PAYMENT_PROVIDERS,
  VALID_PAYMENT_STATUSES,
  type OrderListUrlState,
} from '../utils/orderListQueryParams';

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING:    'Bekliyor',
  PROCESSING: 'İşlemde',
  PAID:       'Ödendi',
  SHIPPED:    'Kargoda',
  DELIVERED:  'Teslim Edildi',
  CANCELLED:  'İptal',
};

const BULK_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'PROCESSING', label: 'Hazırlanıyor' },
  { value: 'SHIPPED',    label: 'Kargoda' },
  { value: 'DELIVERED',  label: 'Teslim Edildi' },
  { value: 'CANCELLED',  label: 'İptal Edildi' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-amber-100 text-amber-700 border border-amber-200',
  PROCESSING: 'bg-blue-100  text-blue-700  border border-blue-200',
  PAID:       'bg-green-100 text-green-700 border border-green-200',
  SHIPPED:    'bg-purple-100 text-purple-700 border border-purple-200',
  DELIVERED:  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  CANCELLED:  'bg-red-100   text-red-700   border border-red-200',
};

const NEXT_STATUSES: Record<string, OrderStatus[]> = {
  PENDING:    ['PROCESSING', 'PAID', 'CANCELLED'],
  PROCESSING: ['PAID', 'SHIPPED', 'CANCELLED'],
  PAID:       ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED', 'CANCELLED'],
  DELIVERED:  [],
  CANCELLED:  [],
};

function fmtCurrency(amount: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style:    'currency',
    currency: currency || 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
    hour:  '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
      }`}
    >
      {label ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}

function hasStoreInvoice(order: Order): boolean {
  return Boolean(order.invoiceNumber?.trim() || order.invoiceUrl?.trim());
}

function hasStoreTracking(order: Order): boolean {
  return Boolean(
    order.shippingTrackingNumber?.trim() || order.shippingTrackingUrl?.trim(),
  );
}

function TrackingBadge({ order }: { order: Order }) {
  if (order.source === 'TRENDYOL') return null;
  const hasTracking = hasStoreTracking(order);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
        hasTracking
          ? 'bg-purple-50 text-purple-700 border border-purple-100'
          : 'bg-slate-50 text-slate-500 border border-slate-200'
      }`}
      title={hasTracking ? 'Kargo takip no veya link kayıtlı' : 'Kargo takip bilgisi girilmemiş'}
    >
      {hasTracking ? 'Takip var' : 'Takip yok'}
    </span>
  );
}

function InvoiceBadge({ order }: { order: Order }) {
  if (order.source === 'TRENDYOL') return null;
  const hasInvoice = hasStoreInvoice(order);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
        hasInvoice
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          : 'bg-slate-50 text-slate-500 border border-slate-200'
      }`}
      title={hasInvoice ? 'Fatura no veya link kayıtlı' : 'Fatura bilgisi girilmemiş'}
    >
      {hasInvoice ? 'Fatura var' : 'Fatura yok'}
    </span>
  );
}

function SourceBadge({ order }: { order: Order }) {
  const isTrendyol = order.source === 'TRENDYOL';
  const label = order.sourceLabel ?? (isTrendyol ? 'Trendyol' : 'Woontegra');
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isTrendyol
          ? 'bg-orange-50 text-orange-700 border border-orange-100'
          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
      }`}
    >
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label:    string;
  value:    string | number;
  subtitle?: string;
  icon:     React.ReactNode;
  color:    string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}

// ── Status update dropdown ─────────────────────────────────────────────────

function StatusDropdown({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder  = useCancelOrder();

  const statusKey = order.fulfillmentStatus ?? order.status;

  if (order.canEditStatus === false || order.source === 'TRENDYOL') {
    const label = order.externalStatusLabel ?? STATUS_LABELS[statusKey] ?? statusKey;
    return <StatusBadge status={statusKey} label={label} />;
  }

  const nexts = NEXT_STATUSES[order.status] ?? [];
  if (!nexts.length) return <StatusBadge status={order.status} />;

  const handleSelect = (status: OrderStatus) => {
    setOpen(false);
    if (status === 'CANCELLED') {
      if (!window.confirm('Siparişi iptal etmek istediğinize emin misiniz?')) return;
      cancelOrder.mutate(order.id);
    } else {
      updateStatus.mutate({ id: order.id, status });
    }
  };

  const busy = updateStatus.isPending || cancelOrder.isPending;

  return (
    <div className="relative" onBlur={() => setTimeout(() => setOpen(false), 120)}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="flex items-center gap-1 group"
      >
        <StatusBadge status={order.status} />
        {!busy && (
          <svg
            className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
        {busy && (
          <svg className="w-3.5 h-3.5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute z-30 left-0 top-8 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-sm">
          {nexts.map((s) => (
            <button
              key={s}
              onMouseDown={() => handleSelect(s)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${
                s === 'CANCELLED' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
              }`}
            >
              {STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const PAYMENT_PROVIDER_OPTIONS: { value: OrderPaymentProviderFilter | ''; label: string }[] = [
  { value: '', label: 'Tüm Ödeme Yöntemleri' },
  ...VALID_PAYMENT_PROVIDERS.map((p) => ({
    value: p,
    label: ORDER_PAYMENT_PROVIDER_LABELS[p] ?? p,
  })),
];

const PAYMENT_STATUS_OPTIONS: { value: OrderPaymentStatusFilter | ''; label: string }[] = [
  { value: '', label: 'Tüm Ödeme Durumları' },
  ...VALID_PAYMENT_STATUSES.map((s) => ({
    value: s,
    label: ORDER_PAYMENT_STATUS_LABELS[s] ?? s,
  })),
];

const SOURCE_OPTIONS: { value: OrderSourceFilter | ''; label: string }[] = [
  { value: '', label: 'Tüm Kaynaklar' },
  { value: 'storefront', label: 'Woontegra' },
  { value: 'trendyol', label: 'Trendyol' },
];

// ── Hızlı operasyon filtreleri (yalnızca frontend) ─────────────────────────

type QuickOpFilter =
  | 'all'
  | 'payment_pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'invoice_missing'
  | 'tracking_missing';

const QUICK_OP_PARAM = 'op';

const VALID_QUICK_OPS = new Set<string>([
  'all',
  'payment_pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'invoice_missing',
  'tracking_missing',
]);

/** Client-side yalnızca ödeme bekliyor (birleşik listede sunucu status filtresi yok). */
const CLIENT_SIDE_QUICK_OPS = new Set<QuickOpFilter>(['payment_pending']);

const SERVER_OPERATION_QUICK_OPS = new Set<QuickOpFilter>([
  'invoice_missing',
  'tracking_missing',
]);

const ORDER_ROW_CHECKBOX_CLASS =
  'h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer';

const QUICK_FILTER_BUTTONS: { id: QuickOpFilter; label: string }[] = [
  { id: 'all',              label: 'Tümü' },
  { id: 'payment_pending',  label: 'Ödeme Bekliyor' },
  { id: 'processing',       label: 'Hazırlanıyor' },
  { id: 'shipped',          label: 'Kargoda' },
  { id: 'delivered',        label: 'Teslim Edildi' },
  { id: 'cancelled',        label: 'İptal Edildi' },
  { id: 'invoice_missing',  label: 'Fatura Eksik' },
  { id: 'tracking_missing', label: 'Kargo Takip Eksik' },
];

const QUICK_OP_COUNT_CAP = 50;

function parseQuickOp(searchParams: URLSearchParams): QuickOpFilter | '' {
  const raw = searchParams.get(QUICK_OP_PARAM)?.trim();
  if (!raw || raw === 'all') return raw === 'all' ? 'all' : '';
  return VALID_QUICK_OPS.has(raw) ? (raw as QuickOpFilter) : '';
}

function buildOrdersPageParams(state: OrderListUrlState, op?: QuickOpFilter | ''): URLSearchParams {
  const params = buildOrderListSearchParams(state);
  if (op && op !== 'all') params.set(QUICK_OP_PARAM, op);
  return params;
}

function applyQuickOpToUrlState(op: QuickOpFilter, state: OrderListUrlState): OrderListUrlState {
  const base: OrderListUrlState = { ...state, page: 1 };

  switch (op) {
    case 'all':
      return { ...base, status: '', paymentStatus: '' };
    case 'processing':
      return { ...base, status: 'PROCESSING', paymentStatus: '' };
    case 'shipped':
      return { ...base, status: 'SHIPPED', paymentStatus: '' };
    case 'delivered':
      return { ...base, status: 'DELIVERED', paymentStatus: '' };
    case 'cancelled':
      return { ...base, status: 'CANCELLED', paymentStatus: '' };
    case 'payment_pending':
      return { ...base, status: '', paymentStatus: '' };
    case 'invoice_missing':
    case 'tracking_missing':
      return {
        ...base,
        status: '',
        paymentStatus: '',
        source: state.source === 'trendyol' ? '' : (state.source || 'storefront'),
      };
    default:
      return base;
  }
}

const PAYMENT_PROVIDER_COLORS: Record<string, string> = {
  PAYTR:            'bg-indigo-50 text-indigo-700 border border-indigo-100',
  BANK_TRANSFER:    'bg-sky-50 text-sky-700 border border-sky-100',
  CASH_ON_DELIVERY: 'bg-amber-50 text-amber-800 border border-amber-100',
  IYZICO:           'bg-violet-50 text-violet-700 border border-violet-100',
  BANK_POS:         'bg-slate-100 text-slate-700 border border-slate-200',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING:               'bg-amber-50 text-amber-700 border border-amber-100',
  WAITING_BANK_TRANSFER: 'bg-orange-50 text-orange-700 border border-orange-100',
  PAID:                  'bg-green-50 text-green-700 border border-green-100',
  APPROVED:              'bg-emerald-50 text-emerald-700 border border-emerald-100',
  FAILED:                'bg-red-50 text-red-700 border border-red-100',
  REFUNDED:              'bg-violet-50 text-violet-700 border border-violet-100',
  CANCELLED:             'bg-gray-100 text-gray-600 border border-gray-200',
};

/** Sipariş listesi — kısa ödeme etiketleri (filtre dropdown’ları ayrı kalır). */
const LIST_PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  PAYTR:            'PayTR',
  BANK_TRANSFER:    'Havale/EFT',
  CASH_ON_DELIVERY: 'Kapıda ödeme',
  IYZICO:           'iyzico',
  BANK_POS:         'Manuel/POS',
};

const LIST_PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID:                  'Ödendi',
  PENDING:               'Ödeme bekliyor',
  WAITING_BANK_TRANSFER: 'Ödeme bekliyor',
  FAILED:                'Başarısız',
  REFUNDED:              'İade edildi',
  APPROVED:              'Onaylandı',
  CANCELLED:             'İptal',
};

function resolvePaymentProviderKey(order: Order): string | null {
  const key = order.payment?.provider ?? order.paymentProvider ?? order.admin?.payment.provider;
  return key ? String(key).toUpperCase() : null;
}

function resolvePaymentStatusKey(order: Order): string | null {
  const key = order.payment?.status ?? order.paymentStatus;
  return key ? String(key).toUpperCase() : null;
}

function listPaymentProviderLabel(order: Order): string {
  const key = resolvePaymentProviderKey(order);
  if (!key) return 'Belirtilmemiş';
  return LIST_PAYMENT_PROVIDER_LABELS[key] ?? key;
}

function listPaymentStatusLabel(order: Order): string {
  const key = resolvePaymentStatusKey(order);
  if (!key) return 'Belirsiz';
  return LIST_PAYMENT_STATUS_LABELS[key] ?? key;
}

function orderFulfillmentStatus(order: Order): string {
  return String(order.fulfillmentStatus ?? order.status).toUpperCase();
}

function matchesQuickOp(order: Order, op: QuickOpFilter): boolean {
  switch (op) {
    case 'all':
      return true;
    case 'payment_pending': {
      if (order.source === 'TRENDYOL') return false;
      if (orderFulfillmentStatus(order) === 'CANCELLED') return false;
      const ps = resolvePaymentStatusKey(order);
      return ps === 'PENDING' || ps === 'WAITING_BANK_TRANSFER';
    }
    case 'processing':
      return orderFulfillmentStatus(order) === 'PROCESSING';
    case 'shipped':
      return orderFulfillmentStatus(order) === 'SHIPPED';
    case 'delivered':
      return orderFulfillmentStatus(order) === 'DELIVERED';
    case 'cancelled':
      return orderFulfillmentStatus(order) === 'CANCELLED';
    case 'invoice_missing':
      if (order.source === 'TRENDYOL') return false;
      return !hasStoreInvoice(order);
    case 'tracking_missing':
      if (order.source === 'TRENDYOL') return false;
      return !hasStoreTracking(order);
    default:
      return true;
  }
}

function PaymentProviderBadge({ order }: { order: Order }) {
  if (order.source === 'TRENDYOL') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-100">
        Pazaryeri
      </span>
    );
  }
  const key = resolvePaymentProviderKey(order);
  const label = listPaymentProviderLabel(order);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
        key ? (PAYMENT_PROVIDER_COLORS[key] ?? 'bg-gray-100 text-gray-600 border border-gray-200') : 'bg-gray-100 text-gray-500 border border-slate-200'
      }`}
      title={order.payment?.providerLabel ?? order.admin?.payment.methodLabel ?? label}
    >
      {label}
    </span>
  );
}

function PaymentStatusBadge({ order }: { order: Order }) {
  if (order.source === 'TRENDYOL') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-100">
        Pazaryeri
      </span>
    );
  }
  const key = resolvePaymentStatusKey(order);
  const label = listPaymentStatusLabel(order);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
        key ? (PAYMENT_STATUS_COLORS[key] ?? 'bg-gray-100 text-gray-600 border border-gray-200') : 'bg-gray-100 text-gray-500 border border-slate-200'
      }`}
      title={order.payment?.statusLabel ?? order.admin?.payment.statusLabel ?? label}
    >
      {label}
    </span>
  );
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeOp = useMemo(() => parseQuickOp(searchParams), [searchParams]);

  const { state: urlState, needsReplace } = useMemo(
    () => parseOrderListSearchParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (needsReplace) {
      setSearchParams(buildOrdersPageParams(urlState, activeOp || undefined), { replace: true });
    }
  }, [needsReplace, urlState, setSearchParams, activeOp]);

  const [searchInput, setSearchInput] = useState(urlState.search);
  const [manualOrderOpen, setManualOrderOpen] = useState(false);

  useEffect(() => {
    setSearchInput(urlState.search);
  }, [urlState.search]);

  const setListParams = useCallback(
    (next: OrderListUrlState, op: QuickOpFilter | '' = '', opts?: { replace?: boolean }) => {
      setSearchParams(buildOrdersPageParams(next, op || undefined), {
        replace: opts?.replace ?? false,
      });
    },
    [setSearchParams],
  );

  const patchFilters = useCallback(
    (patch: Partial<OrderListUrlState>, resetPage = true) => {
      setListParams(
        {
          ...urlState,
          ...patch,
          page: resetPage ? 1 : (patch.page ?? urlState.page),
        },
        '',
      );
    },
    [urlState, setListParams],
  );

  const applyQuickOp = useCallback(
    (op: QuickOpFilter) => {
      setListParams(applyQuickOpToUrlState(op, urlState), op);
    },
    [urlState, setListParams],
  );

  const needsClientQuickOp =
    !!activeOp && CLIENT_SIDE_QUICK_OPS.has(activeOp as QuickOpFilter);

  const apiQuery: GetOrdersQuery = useMemo(() => {
    const q = orderListStateToApiQuery(urlState);
    if (
      activeOp &&
      SERVER_OPERATION_QUICK_OPS.has(activeOp as QuickOpFilter)
    ) {
      return {
        ...q,
        operationFilter: activeOp as 'invoice_missing' | 'tracking_missing',
      };
    }
    if (needsClientQuickOp) {
      return { ...q, page: 1, limit: QUICK_OP_COUNT_CAP };
    }
    return q;
  }, [urlState, activeOp, needsClientQuickOp]);

  const { data: result, isLoading, isFetching } = useOrders(apiQuery);
  const { data: stats }                          = useOrderStats();
  const syncTrendyolOrders                       = useSyncTrendyolOrders();
  const bulkUpdateStatus                         = useBulkUpdateOrderStatus();
  const [bulkStatusChoice, setBulkStatusChoice]  = useState<OrderStatus | ''>('');

  const countSnapshotQuery: GetOrdersQuery = useMemo(
    () => ({
      page:  1,
      limit: QUICK_OP_COUNT_CAP,
      ...(urlState.source && urlState.source !== 'all' ? { source: urlState.source } : {}),
    }),
    [urlState.source],
  );

  const { data: countSnapshot } = useOrders(countSnapshotQuery);

  const orders     = result?.orders     ?? [];
  const page       = urlState.page;
  const limit      = urlState.limit;
  const search     = urlState.search;

  const {
    displayOrders,
    listTotal,
    listTotalPages,
  } = useMemo(() => {
    if (!needsClientQuickOp || !activeOp) {
      return {
        displayOrders: orders,
        listTotal:       result?.total      ?? 0,
        listTotalPages:  result?.totalPages ?? 1,
      };
    }

    const filtered = orders.filter((o) => matchesQuickOp(o, activeOp as QuickOpFilter));
    const start    = (page - 1) * limit;
    return {
      displayOrders:  filtered.slice(start, start + limit),
      listTotal:      filtered.length,
      listTotalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    };
  }, [needsClientQuickOp, activeOp, orders, result?.total, result?.totalPages, page, limit]);

  const quickOpCounts = useMemo(() => {
    const snapshot = countSnapshot?.orders ?? [];
    const cap = countSnapshot?.total != null && countSnapshot.total > QUICK_OP_COUNT_CAP;

    const countFromSnapshot = (op: QuickOpFilter) => {
      const n = snapshot.filter((o) => matchesQuickOp(o, op)).length;
      return cap ? `${n}+` : String(n);
    };

    return {
      all:              String(stats?.totalCount ?? stats?.total ?? countSnapshot?.total ?? '—'),
      payment_pending:  countFromSnapshot('payment_pending'),
      processing:       countFromSnapshot('processing'),
      shipped:          countFromSnapshot('shipped'),
      delivered:        countFromSnapshot('delivered'),
      cancelled:        countFromSnapshot('cancelled'),
      invoice_missing:  '—',
      tracking_missing: '—',
    } as Record<QuickOpFilter, string>;
  }, [countSnapshot, stats]);

  const activeQuickCount = useMemo(() => {
    if (!activeOp || activeOp === 'all') return null;
    if (needsClientQuickOp) {
      const n = listTotal;
      const capped = (result?.total ?? 0) > QUICK_OP_COUNT_CAP;
      return capped ? `${n}+` : String(n);
    }
    return String(listTotal);
  }, [activeOp, needsClientQuickOp, listTotal, result?.total]);

  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const rowNumberBase = (page - 1) * limit;

  const pageOrderIds = useMemo(
    () => displayOrders.map((o) => o.id),
    [displayOrders],
  );

  const selectedOnPageCount = useMemo(
    () => pageOrderIds.filter((id) => selectedOrderIds.has(id)).length,
    [pageOrderIds, selectedOrderIds],
  );

  const allPageSelected =
    displayOrders.length > 0 && selectedOnPageCount === displayOrders.length;
  const somePageSelected =
    selectedOnPageCount > 0 && selectedOnPageCount < displayOrders.length;

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (el) el.indeterminate = somePageSelected;
  }, [somePageSelected]);

  useEffect(() => {
    setSelectedOrderIds(new Set());
  }, [
    urlState.page,
    urlState.limit,
    urlState.search,
    urlState.status,
    urlState.paymentProvider,
    urlState.paymentStatus,
    urlState.source,
    activeOp,
  ]);

  const toggleOrderSelection = useCallback((id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllPage = useCallback(() => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageOrderIds.forEach((id) => next.delete(id));
      } else {
        pageOrderIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [allPageSelected, pageOrderIds]);

  const clearSelection = useCallback(() => {
    setSelectedOrderIds(new Set());
  }, []);

  const selectedCount = selectedOrderIds.size;

  const bulkEligibleIds = useMemo(() => {
    const byId = new Map(displayOrders.map((o) => [o.id, o]));
    return [...selectedOrderIds].filter((id) => {
      const o = byId.get(id);
      return o && o.source !== 'TRENDYOL' && o.canEditStatus !== false;
    });
  }, [selectedOrderIds, displayOrders]);

  const handleBulkStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const status = e.target.value as OrderStatus | '';
      setBulkStatusChoice(status);
      if (!status) return;

      if (bulkEligibleIds.length === 0) {
        window.alert('Seçili siparişlerden durumu güncellenebilir mağaza siparişi yok.');
        setBulkStatusChoice('');
        return;
      }

      const label =
        BULK_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
      if (
        !window.confirm(
          `Seçili ${bulkEligibleIds.length} siparişin durumu ${label} yapılacak. Devam edilsin mi?`,
        )
      ) {
        setBulkStatusChoice('');
        return;
      }

      bulkUpdateStatus.mutate(
        { orderIds: bulkEligibleIds, status },
        {
          onSuccess: () => {
            clearSelection();
            setBulkStatusChoice('');
          },
          onError: () => {
            setBulkStatusChoice('');
          },
        },
      );
    },
    [bulkEligibleIds, bulkUpdateStatus, clearSelection],
  );

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    patchFilters({ search: searchInput.trim(), page: 1 });
  }, [searchInput, patchFilters]);

  const handleStatusChange = (s: OrderStatus | '') => {
    patchFilters({ status: s, page: 1 });
  };

  const handlePaymentProviderChange = (v: OrderPaymentProviderFilter | '') => {
    patchFilters({ paymentProvider: v, page: 1 });
  };

  const handlePaymentStatusChange = (v: OrderPaymentStatusFilter | '') => {
    patchFilters({ paymentStatus: v, page: 1 });
  };

  const handleSourceChange = (v: OrderSourceFilter | '') => {
    patchFilters({ source: v, page: 1 });
  };

  const patchPage = useCallback(
    (nextPage: number) => {
      if (activeOp && activeOp !== 'all') {
        setListParams({ ...urlState, page: nextPage }, activeOp);
      } else {
        patchFilters({ page: nextPage }, false);
      }
    },
    [activeOp, urlState, setListParams, patchFilters],
  );

  const handleClear = () => {
    setSearchInput('');
    setListParams(ORDER_LIST_DEFAULT_STATE, '', { replace: true });
  };

  const hasFilter =
    !!urlState.search
    || !!urlState.status
    || !!urlState.paymentProvider
    || !!urlState.paymentStatus
    || !!urlState.source
    || (!!activeOp && activeOp !== 'all');

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Siparişler</h1>
          <p className="text-sm text-gray-500 mt-0.5">Woontegra ve Trendyol siparişlerinizi tek listeden yönetin</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setManualOrderOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700
                       text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Manuel Sipariş Oluştur
          </button>
          <button
            type="button"
            onClick={() => syncTrendyolOrders.mutate()}
            disabled={syncTrendyolOrders.isPending}
            title="Trendyol'dan siparişleri şimdi senkronize eder"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600
                       disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg
                       transition-colors"
          >
            <svg
              className={`w-4 h-4 ${syncTrendyolOrders.isPending ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {syncTrendyolOrders.isPending ? 'Çekiliyor...' : 'Trendyol Siparişlerini Çek'}
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Sipariş"
          value={stats?.totalCount ?? stats?.total ?? '—'}
          subtitle={
            stats != null && (stats.storefrontCount != null || stats.trendyolCount != null)
              ? `Woontegra: ${stats.storefrontCount ?? 0} · Trendyol: ${stats.trendyolCount ?? 0}`
              : undefined
          }
          color="bg-indigo-50"
          icon={
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Bekleyen"
          value={stats?.pending ?? '—'}
          subtitle={
            stats != null && (stats.storefrontPending != null || stats.trendyolPending != null)
              ? `Woontegra: ${stats.storefrontPending ?? 0} · Trendyol: ${stats.trendyolPending ?? 0}`
              : undefined
          }
          color="bg-amber-50"
          icon={
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Ödendi"
          value={stats?.paid ?? '—'}
          subtitle="Woontegra vitrin siparişleri"
          color="bg-green-50"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Bugünkü Gelir"
          value={
            stats != null
              ? fmtCurrency(stats.todayRevenue)
              : '—'
          }
          subtitle="Woontegra vitrin siparişleri"
          color="bg-purple-50"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Hızlı operasyon filtreleri */}
      <Card className="p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2.5">
          Hızlı filtreler
        </p>
        <div
          className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-thin"
          role="tablist"
          aria-label="Sipariş hızlı filtreleri"
        >
          {QUICK_FILTER_BUTTONS.map((f) => {
            const isActive =
              f.id === 'all' ? !activeOp || activeOp === 'all' : activeOp === f.id;
            const count = quickOpCounts[f.id];
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => applyQuickOp(f.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium
                  border transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-700'
                }`}
              >
                <span>{f.label}</span>
                {count && count !== '—' && (
                  <span
                    className={`inline-flex min-w-[1.25rem] justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isActive && activeQuickCount != null ? activeQuickCount : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {needsClientQuickOp && (result?.total ?? 0) > QUICK_OP_COUNT_CAP && (
          <p className="text-[11px] text-amber-700 mt-2 leading-relaxed">
            Ödeme bekliyor filtresi son {QUICK_OP_COUNT_CAP} sipariş örneğine göre sayılır.
          </p>
        )}
      </Card>

      {/* Filter bar */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Sipariş no, müşteri adı veya e-posta..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                         bg-white text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Status filter */}
          <select
            value={urlState.status}
            onChange={(e) => handleStatusChange(e.target.value as OrderStatus | '')}
            className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-indigo-400
                       bg-white text-gray-900"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={urlState.paymentProvider}
            onChange={(e) => handlePaymentProviderChange(e.target.value as OrderPaymentProviderFilter | '')}
            className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-indigo-400
                       bg-white text-gray-900"
          >
            {PAYMENT_PROVIDER_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={urlState.paymentStatus}
            onChange={(e) => handlePaymentStatusChange(e.target.value as OrderPaymentStatusFilter | '')}
            className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-indigo-400
                       bg-white text-gray-900"
          >
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={urlState.source}
            onChange={(e) => handleSourceChange(e.target.value as OrderSourceFilter | '')}
            className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-indigo-400
                       bg-white text-gray-900"
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700
                       rounded-lg transition-colors"
          >
            Ara
          </button>

          {hasFilter && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200
                         rounded-lg hover:bg-gray-50 transition-colors"
            >
              Temizle
            </button>
          )}
        </form>
      </Card>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : displayOrders.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title={hasFilter ? 'Sipariş bulunamadı' : 'Henüz sipariş yok'}
            description={
              hasFilter
                ? 'Filtrelerinizi değiştirerek tekrar deneyin.'
                : 'Müşterileriniz sipariş verdiğinde burada görünecek.'
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Fetching overlay */}
          {isFetching && !isLoading && (
            <div className="h-0.5 bg-indigo-100 overflow-hidden">
              <div className="h-full bg-indigo-500 animate-pulse" />
            </div>
          )}

          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2.5 border-b border-indigo-100 bg-indigo-50/70">
              <span className="text-[13px] font-medium text-indigo-900">
                {selectedCount} sipariş seçildi
                {bulkEligibleIds.length > 0 && bulkEligibleIds.length < selectedCount && (
                  <span className="text-indigo-600/90 font-normal">
                    {' '}
                    ({bulkEligibleIds.length} güncellenebilir)
                  </span>
                )}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulkStatusChoice}
                  onChange={handleBulkStatusChange}
                  disabled={bulkUpdateStatus.isPending || bulkEligibleIds.length === 0}
                  aria-label="Seçili siparişlerin durumunu güncelle"
                  className="text-[12px] font-medium text-indigo-900 bg-white border border-indigo-200
                             rounded-lg px-2.5 py-1.5 min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed
                             focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">Durumu Güncelle</option>
                  {BULK_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-[12px] font-medium text-indigo-700 hover:text-indigo-900 px-2.5 py-1 rounded-lg
                             hover:bg-indigo-100/80 transition-colors"
                >
                  Seçimi temizle
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="w-10 px-2 sm:px-3 py-3 text-center">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAllPage}
                      disabled={displayOrders.length === 0}
                      aria-label="Sayfadaki tüm siparişleri seç"
                      className={ORDER_ROW_CHECKBOX_CLASS}
                    />
                  </th>
                  <th className="w-11 px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
                    Müşteri
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Sipariş
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Kaynak
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Ödeme Yöntemi
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Ödeme Durumu
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayOrders.map((order, index) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    rowNumber={rowNumberBase + index + 1}
                    isSelected={selectedOrderIds.has(order.id)}
                    onToggleSelect={() => toggleOrderSelection(order.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>
                {listTotal} sipariş
                {search && ` • "${search}" araması`}
                {activeOp && activeOp !== 'all' && (
                  <> • {QUICK_FILTER_BUTTONS.find((f) => f.id === activeOp)?.label}</>
                )}
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  const nextLimit = Number(e.target.value);
                  if (activeOp && activeOp !== 'all') {
                    setListParams({ ...urlState, limit: nextLimit, page: 1 }, activeOp);
                  } else {
                    patchFilters({ limit: nextLimit, page: 1 });
                  }
                }}
                className="py-1 pl-2 pr-6 text-xs border border-gray-200 rounded bg-white focus:outline-none
                           focus:ring-1 focus:ring-indigo-400"
              >
                {ORDER_LIST_PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>{s} / sayfa</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => patchPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹ Önceki
              </button>
              <span className="px-3 py-1.5 text-sm font-medium text-gray-700">
                {page} / {listTotalPages}
              </span>
              <button
                onClick={() => patchPage(Math.min(listTotalPages, page + 1))}
                disabled={page >= listTotalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki ›
              </button>
            </div>
          </div>
        </Card>
      )}

      <CreateManualOrderModal
        isOpen={manualOrderOpen}
        onClose={() => setManualOrderOpen(false)}
      />
    </div>
  );
}

// ── Order row ──────────────────────────────────────────────────────────────

function OrderRow({
  order,
  rowNumber,
  isSelected,
  onToggleSelect,
}: {
  order: Order;
  rowNumber: number;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const customerName = order.customerName
    ?? (order.customer
      ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
      : '—');

  const displayNumber = order.displayOrderNumber ?? order.orderNumber;
  const displayDate = order.orderDate ?? order.createdAt;
  const isTrendyol = order.source === 'TRENDYOL';

  const shippingPrice = order.admin?.totals.shippingPrice ?? order.shippingPrice ?? 0;
  const customerEmail = order.customer?.email ?? order.customerEmail ?? '';
  const customerPhone = order.customer?.phone?.trim() || '';

  return (
    <tr
      className={`transition-colors group ${
        isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50/70' : 'hover:bg-gray-50/60'
      }`}
    >
      <td className="w-10 px-2 sm:px-3 py-4 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`${displayNumber} siparişini seç`}
          className={ORDER_ROW_CHECKBOX_CLASS}
        />
      </td>
      <td className="w-11 px-2 py-4 text-center text-xs font-medium text-slate-500 tabular-nums">
        {rowNumber}
      </td>

      <td className="px-5 py-4 min-w-[140px]">
        <div className="text-sm font-medium text-gray-900 leading-snug">{customerName}</div>
        {customerEmail && (
          <div className="text-xs text-gray-500 mt-1 break-all leading-relaxed">{customerEmail}</div>
        )}
        {customerPhone && (
          <div className="text-xs text-gray-500 mt-0.5 tabular-nums">{customerPhone}</div>
        )}
      </td>

      <td className="px-5 py-4 min-w-[120px]">
        <div className="text-sm font-semibold text-gray-900">{displayNumber}</div>
        {isTrendyol ? (
          <div className="text-[10px] text-orange-600 font-medium mt-0.5">Trendyol</div>
        ) : order.admin?.isStorefrontOrder ? (
          <div className="text-[10px] text-indigo-600 font-medium mt-0.5">Vitrin</div>
        ) : null}
        <div className="flex flex-wrap gap-1 mt-1.5 sm:hidden">
          <SourceBadge order={order} />
          <InvoiceBadge order={order} />
          <TrackingBadge order={order} />
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5 md:hidden">
          <PaymentProviderBadge order={order} />
          <PaymentStatusBadge order={order} />
        </div>
      </td>

      <td className="px-5 py-4 hidden sm:table-cell">
        <div className="flex flex-col items-start gap-1">
          <SourceBadge order={order} />
          <InvoiceBadge order={order} />
          <TrackingBadge order={order} />
        </div>
      </td>

      <td className="px-5 py-4 hidden md:table-cell">
        <PaymentProviderBadge order={order} />
      </td>

      <td className="px-5 py-4 hidden lg:table-cell">
        <PaymentStatusBadge order={order} />
      </td>

      <td className="px-5 py-4 text-right">
        <div className="text-sm font-semibold text-gray-900">
          {fmtCurrency(Number(order.totalAmount), order.currency)}
        </div>
        {shippingPrice > 0 && (
          <div className="text-xs text-gray-500 mt-0.5">
            Kargo dahil ({fmtCurrency(shippingPrice, order.currency)})
          </div>
        )}
      </td>

      <td className="px-5 py-4">
        <StatusDropdown order={order} />
      </td>

      <td className="px-5 py-4">
        <div className="text-sm text-gray-600">{fmtDate(displayDate)}</div>
      </td>

      <td className="px-5 py-4 text-right">
        {isTrendyol ? (
          <Link
            to={`/dashboard/orders/trendyol/${order.id}`}
            className="text-orange-600 hover:text-orange-800 text-sm font-medium"
            title="Trendyol sipariş detayı"
          >
            Detay →
          </Link>
        ) : (
          <Link
            to={`/dashboard/orders/${order.id}`}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Detay →
          </Link>
        )}
      </td>
    </tr>
  );
}
