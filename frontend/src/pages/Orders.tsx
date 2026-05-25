import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  useOrders,
  useOrderStats,
  useUpdateOrderStatus,
  useCancelOrder,
} from '../hooks/useOrders';
import type {
  Order,
  OrderStatus,
  GetOrdersQuery,
  OrderPaymentProviderFilter,
  OrderPaymentStatusFilter,
} from '../services/order.service';
import Card from '../components/ui/Card';
import EmptyState from '../components/EmptyState';
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon:  React.ReactNode;
  color: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      </div>
    </Card>
  );
}

// ── Status update dropdown ─────────────────────────────────────────────────

function StatusDropdown({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder  = useCancelOrder();

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
  CANCELLED:             'bg-gray-100 text-gray-600 border border-gray-200',
};

function PaymentProviderBadge({ order }: { order: Order }) {
  const label = order.payment?.providerLabel
    ?? order.admin?.payment.methodLabel
    ?? 'Belirtilmemiş';
  const key = order.payment?.provider ?? order.paymentProvider ?? order.admin?.payment.provider;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium max-w-[140px] truncate ${
        key ? (PAYMENT_PROVIDER_COLORS[key] ?? 'bg-gray-100 text-gray-600 border border-gray-200') : 'bg-gray-100 text-gray-500 border border-gray-200'
      }`}
      title={label}
    >
      {label}
    </span>
  );
}

function PaymentStatusBadge({ order }: { order: Order }) {
  const label = order.payment?.statusLabel
    ?? order.admin?.payment.statusLabel
    ?? 'Belirsiz';
  const key = order.payment?.status ?? order.paymentStatus;
  const display = label === '—' ? 'Belirsiz' : label;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        key ? (PAYMENT_STATUS_COLORS[key] ?? 'bg-gray-100 text-gray-600 border border-gray-200') : 'bg-gray-100 text-gray-500 border border-gray-200'
      }`}
    >
      {display}
    </span>
  );
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { state: urlState, needsReplace } = useMemo(
    () => parseOrderListSearchParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (needsReplace) {
      setSearchParams(buildOrderListSearchParams(urlState), { replace: true });
    }
  }, [needsReplace, urlState, setSearchParams]);

  const [searchInput, setSearchInput] = useState(urlState.search);

  useEffect(() => {
    setSearchInput(urlState.search);
  }, [urlState.search]);

  const applyUrlState = useCallback(
    (next: OrderListUrlState, opts?: { replace?: boolean }) => {
      setSearchParams(buildOrderListSearchParams(next), { replace: opts?.replace ?? false });
    },
    [setSearchParams],
  );

  const patchFilters = useCallback(
    (patch: Partial<OrderListUrlState>, resetPage = true) => {
      applyUrlState({
        ...urlState,
        ...patch,
        page: resetPage ? 1 : (patch.page ?? urlState.page),
      });
    },
    [urlState, applyUrlState],
  );

  const apiQuery: GetOrdersQuery = useMemo(
    () => orderListStateToApiQuery(urlState),
    [urlState],
  );

  const { data: result, isLoading, isFetching } = useOrders(apiQuery);
  const { data: stats }                          = useOrderStats();

  const orders     = result?.orders     ?? [];
  const total      = result?.total      ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const page       = urlState.page;
  const limit      = urlState.limit;
  const search     = urlState.search;

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

  const handleClear = () => {
    setSearchInput('');
    setSearchParams(buildOrderListSearchParams(ORDER_LIST_DEFAULT_STATE), { replace: true });
  };

  const hasFilter =
    !!urlState.search
    || !!urlState.status
    || !!urlState.paymentProvider
    || !!urlState.paymentStatus;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Siparişler</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tüm müşteri siparişlerinizi yönetin</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Sipariş"
          value={stats?.total ?? '—'}
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
          color="bg-purple-50"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

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
      ) : orders.length === 0 ? (
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

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Sipariş
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Müşteri
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
                {orders.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>
                {total} sipariş
                {search && ` • "${search}" araması`}
              </span>
              <select
                value={limit}
                onChange={(e) => patchFilters({ limit: Number(e.target.value), page: 1 })}
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
                onClick={() => patchFilters({ page: Math.max(1, page - 1) }, false)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹ Önceki
              </button>
              <span className="px-3 py-1.5 text-sm font-medium text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => patchFilters({ page: Math.min(totalPages, page + 1) }, false)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki ›
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Order row ──────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: Order }) {
  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
    : '—';

  const shippingPrice = order.admin?.totals.shippingPrice ?? order.shippingPrice ?? 0;

  return (
    <tr className="hover:bg-gray-50/60 transition-colors group">
      <td className="px-5 py-4">
        <div className="text-sm font-semibold text-gray-900">{order.orderNumber}</div>
        {order.admin?.isStorefrontOrder && (
          <div className="text-[10px] text-indigo-600 font-medium mt-0.5">Vitrin</div>
        )}
        <div className="flex flex-wrap gap-1 mt-1.5 md:hidden">
          <PaymentProviderBadge order={order} />
          <PaymentStatusBadge order={order} />
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="text-sm font-medium text-gray-900">{customerName}</div>
        <div className="text-xs text-gray-400 mt-0.5">{order.customer?.email}</div>
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
        <div className="text-sm text-gray-600">{fmtDate(order.createdAt)}</div>
      </td>

      <td className="px-5 py-4 text-right">
        <Link
          to={`/dashboard/orders/${order.id}`}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          Detay →
        </Link>
      </td>
    </tr>
  );
}
