import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import {
  fetchMyOrders,
  fetchMyOrderSummary,
  type MyOrderSummary,
  type MyOrderSummaryStats,
  type MyOrdersPagination,
} from '../services/storefrontAccountApi';
import { formatTry } from '../utils/format';
import { getOrderShippingSummaryView } from '../utils/shipping';
import {
  getStoreOrderPaymentView,
  PAYMENT_STATUS_TONE_CLASS,
} from '../utils/payment';
import { STORE_ORDER_STATUS_LABELS } from '../constants/returnRequest';
import {
  STORE_ORDER_FILTER_TABS,
  buildStoreOrdersSearchParams,
  emptyMessageForTab,
  getTabSummaryCount,
  isPaymentWaitingOrder,
  parseStoreOrdersListState,
  tabToApiParams,
  type StoreOrderListFilterTab,
} from '../utils/storeOrderListQuery';

function OrderListPaymentSummary({ order }: { order: MyOrderSummary }) {
  const payment = getStoreOrderPaymentView(order);
  return (
    <div className="space-y-0.5 text-xs">
      <p className="font-medium text-slate-800">{payment.providerLabel}</p>
      <p className={PAYMENT_STATUS_TONE_CLASS[payment.statusTone]}>{payment.statusLabel}</p>
    </div>
  );
}

function OrderListShippingSummary({ order }: { order: MyOrderSummary }) {
  const summary = getOrderShippingSummaryView(order.status, order);
  if (!summary.shouldShow) return null;

  if (summary.fallbackText) {
    return <p className="text-xs text-slate-500">{summary.fallbackText}</p>;
  }

  return (
    <div className="space-y-0.5 text-xs text-slate-600">
      {summary.carrierText && (
        <p>
          <span className="text-slate-500">Kargo:</span>{' '}
          <span className="font-medium text-slate-800">{summary.carrierText}</span>
        </p>
      )}
      {summary.trackingNumberText && (
        <p>
          <span className="text-slate-500">Takip No:</span>{' '}
          <span className="font-mono font-medium text-slate-800">{summary.trackingNumberText}</span>
        </p>
      )}
      {summary.trackingButtonVisible && summary.trackingUrl && (
        <a
          href={summary.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-indigo-600 font-medium hover:underline"
        >
          Takip Et
        </a>
      )}
    </div>
  );
}

export default function StoreOrdersPage() {
  const { tenant, storeLink } = useStorefrontTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<MyOrderSummary[]>([]);
  const [pagination, setPagination] = useState<MyOrdersPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MyOrderSummaryStats | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const { tab, page, needsReplace } = useMemo(
    () => parseStoreOrdersListState(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (!tenant?.slug || !needsReplace) return;
    setSearchParams(buildStoreOrdersSearchParams(tab, tenant.slug, { page }), { replace: true });
  }, [needsReplace, tab, page, tenant?.slug, setSearchParams]);

  const apiParams = useMemo(() => tabToApiParams(tab, page), [tab, page]);

  const ordersFetchInFlight = useRef(false);

  const loadOrders = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!tenant?.slug || ordersFetchInFlight.current) return;
      ordersFetchInFlight.current = true;
      if (!opts?.background) {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await fetchMyOrders(tenant.slug, apiParams);
        setOrders(result.orders);
        setPagination(result.pagination);
        if (!opts?.background) setError(null);
      } catch (e: unknown) {
        if (!opts?.background) {
          setError((e as Error)?.message || 'Siparişler yüklenemedi.');
        }
      } finally {
        if (!opts?.background) setLoading(false);
        ordersFetchInFlight.current = false;
      }
    },
    [tenant?.slug, apiParams],
  );

  const summaryFetchInFlight = useRef(false);

  const loadSummary = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!tenant?.slug || summaryFetchInFlight.current) return;
      summaryFetchInFlight.current = true;
      if (!opts?.background) setSummaryLoading(true);
      try {
        const stats = await fetchMyOrderSummary(tenant.slug);
        setSummary(stats);
      } catch {
        if (!opts?.background) setSummary(null);
      } finally {
        if (!opts?.background) setSummaryLoading(false);
        summaryFetchInFlight.current = false;
      }
    },
    [tenant?.slug],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useRefreshOnFocus({
    enabled: Boolean(tenant?.slug),
    onRefresh: async () => {
      await Promise.all([
        loadOrders({ background: true }),
        loadSummary({ background: true }),
      ]);
    },
  });

  const formatTabBadge = (tabId: StoreOrderListFilterTab) => {
    if (summaryLoading) return '…';
    const count = getTabSummaryCount(tabId, summary);
    if (count == null) return null;
    return String(count);
  };

  const setFilterTab = (next: StoreOrderListFilterTab) => {
    if (!tenant?.slug) return;
    setSearchParams(buildStoreOrdersSearchParams(next, tenant.slug), { replace: false });
  };

  const goToPage = (nextPage: number) => {
    if (!tenant?.slug) return;
    setSearchParams(buildStoreOrdersSearchParams(tab, tenant.slug, { page: nextPage }), { replace: false });
  };

  const emptyMessage = emptyMessageForTab(tab);
  const showPagination = !loading && !error && pagination && pagination.total > 0;
  const totalPages = pagination?.totalPages ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">Siparişlerim</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {STORE_ORDER_FILTER_TABS.map((t) => {
          const badge = formatTabBadge(t.id);
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
              }`}
            >
              <span>{t.label}</span>
              {badge != null && (
                <span
                  className={`inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                  aria-label={`${t.label} sipariş sayısı`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && <p className="mt-4 text-sm text-slate-500">Yükleniyor…</p>}
      {error && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      )}

      {!loading && orders.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="py-2 pr-3 font-medium">Sipariş no</th>
                <th className="py-2 pr-3 font-medium">Tarih</th>
                <th className="py-2 pr-3 font-medium">Durum</th>
                <th className="py-2 pr-3 font-medium min-w-[7rem]">Kargo</th>
                <th className="py-2 pr-3 font-medium">Ödeme</th>
                <th className="py-2 pr-3 font-medium text-right">Toplam</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-slate-50">
                  <td className="py-3 pr-3 font-medium text-slate-900">#{o.orderNumber}</td>
                  <td className="py-3 pr-3 text-slate-600">
                    {new Date(o.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="py-3 pr-3">
                    <span>{STORE_ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
                    {o.status === 'SHIPPED' && (
                      <span className="block text-xs text-purple-700 font-medium mt-0.5">
                        Kargoda
                      </span>
                    )}
                    {tab === 'WAITING_PAYMENT' || isPaymentWaitingOrder(o) ? (
                      <span className="block text-xs text-amber-700 font-medium mt-0.5">
                        Ödeme bekleniyor
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <OrderListShippingSummary order={o} />
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <OrderListPaymentSummary order={o} />
                  </td>
                  <td className="py-3 pr-3 text-right font-medium">{formatTry(o.totalAmount)}</td>
                  <td className="py-3 text-right">
                    <Link
                      to={storeLink(
                        `/store/hesabim/siparisler/${encodeURIComponent(o.orderNumber)}`,
                      )}
                      className="text-indigo-600 hover:underline"
                    >
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPagination && pagination && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">
            {pagination.total} sipariş
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={loading || !pagination.hasPrevPage}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Önceki
            </button>
            <span className="px-2 text-sm font-medium text-slate-700">
              Sayfa {pagination.page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={loading || !pagination.hasNextPage}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
