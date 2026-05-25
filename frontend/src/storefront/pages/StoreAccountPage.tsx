import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStorefrontAuth } from '../hooks/StorefrontAuthProvider';
import {
  fetchMyOrders,
  fetchMyOrderSummary,
  type MyOrderSummary,
  type MyOrderSummaryStats,
} from '../services/storefrontAccountApi';
import { formatTry } from '../utils/format';
import { ORDER_STATUS_LABELS, OrderStatus } from '../../types/orderLifecycle';

const links = [
  { path: '', label: 'Özet' },
  { path: 'siparisler', label: 'Siparişlerim' },
  { path: 'iade-taleplerim', label: 'İade / İptal Taleplerim' },
  { path: 'adresler', label: 'Adreslerim' },
  { path: 'profil', label: 'Profilim' },
] as const;

export default function StoreAccountPage() {
  const { storeLink } = useStorefrontTenant();
  const { isAuthenticated, loading, logout } = useStorefrontAuth();
  const location = useLocation();
  const base = storeLink('/store/hesabim');

  const isIndex =
    !location.pathname.includes('/hesabim/') ||
    location.pathname.endsWith('/hesabim') ||
    location.pathname.endsWith('/hesabim/');

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-500 text-sm">
        Yükleniyor…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={storeLink('/store/giris')} replace />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Hesabım</h1>
        <button
          type="button"
          onClick={() => logout()}
          className="text-sm text-slate-600 hover:text-red-600"
        >
          Çıkış yap
        </button>
      </div>
      <div className="grid md:grid-cols-4 gap-8">
        <aside className="space-y-1">
          {links.map(l => {
            const to = l.path ? storeLink(`/store/hesabim/${l.path}`) : base;
            const active =
              l.path === '' ? isIndex : location.pathname.includes(l.path);
            return (
              <Link
                key={l.path}
                to={to}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            to={storeLink('/store/favoriler')}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Favorilerim
          </Link>
        </aside>
        <div className="md:col-span-3">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const RECENT_ORDERS_LIMIT = 5;

export function StoreAccountOverview() {
  const { storeLink, tenant } = useStorefrontTenant();
  const { customer } = useStorefrontAuth();
  const [orders, setOrders] = useState<MyOrderSummary[]>([]);
  const [ordersTotal, setOrdersTotal] = useState<number | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [summary, setSummary] = useState<MyOrderSummaryStats | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const recentOrdersInFlight = useRef(false);

  const loadRecentOrders = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!tenant?.slug || recentOrdersInFlight.current) return;
      recentOrdersInFlight.current = true;
      if (!opts?.background) setOrdersLoading(true);
      try {
        const { orders: list, pagination } = await fetchMyOrders(tenant.slug, {
          page: 1,
          limit: RECENT_ORDERS_LIMIT,
        });
        setOrders(list);
        setOrdersTotal(pagination.total);
      } catch {
        if (!opts?.background) {
          setOrders([]);
          setOrdersTotal(null);
        }
      } finally {
        if (!opts?.background) setOrdersLoading(false);
        recentOrdersInFlight.current = false;
      }
    },
    [tenant?.slug],
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
    void loadRecentOrders();
  }, [loadRecentOrders]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useRefreshOnFocus({
    enabled: Boolean(tenant?.slug),
    onRefresh: async () => {
      await Promise.all([
        loadRecentOrders({ background: true }),
        loadSummary({ background: true }),
      ]);
    },
  });

  const formatShortcutCount = (value: number | undefined) => {
    if (summaryLoading) return '…';
    if (summary == null || value == null) return '—';
    return String(value);
  };

  if (!customer) return null;

  const fullName = `${customer.firstName} ${customer.lastName}`.trim();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm space-y-2">
        <h2 className="font-semibold text-slate-900 text-base mb-3">Üyelik bilgileri</h2>
        <p>
          <span className="text-slate-500">Ad soyad:</span>{' '}
          <span className="font-medium text-slate-900">{fullName || '—'}</span>
        </p>
        <p>
          <span className="text-slate-500">E-posta:</span>{' '}
          <span className="font-medium text-slate-900">{customer.email}</span>
        </p>
        <p>
          <span className="text-slate-500">Telefon:</span>{' '}
          <span className="font-medium text-slate-900">{customer.phone || '—'}</span>
        </p>
        <div className="pt-4 flex flex-wrap gap-3">
          <Link
            to={storeLink('/store/hesabim/adresler')}
            className="text-indigo-600 font-medium hover:underline"
          >
            Adreslerime git →
          </Link>
          <Link
            to={storeLink('/store/hesabim/siparisler')}
            className="text-indigo-600 font-medium hover:underline"
          >
            Siparişlerime git →
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Ödeme Bekleyen Siparişlerim</h2>
            <span
              className="shrink-0 min-w-[2rem] text-center rounded-full bg-amber-50 text-amber-800 text-sm font-semibold px-2 py-0.5 tabular-nums"
              aria-label="Ödeme bekleyen sipariş sayısı"
            >
              {formatShortcutCount(summary?.waitingPayment)}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Havale/EFT veya ödeme bekleyen siparişlerinizi görüntüleyin.
          </p>
          <Link
            to={storeLink('/store/hesabim/siparisler?filter=WAITING_PAYMENT')}
            className="inline-block mt-4 text-sm font-medium text-indigo-600 hover:underline"
          >
            Ödeme bekleyenleri gör →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Kargodaki Siparişlerim</h2>
            <span
              className="shrink-0 min-w-[2rem] text-center rounded-full bg-indigo-50 text-indigo-800 text-sm font-semibold px-2 py-0.5 tabular-nums"
              aria-label="Kargodaki sipariş sayısı"
            >
              {formatShortcutCount(summary?.shipped)}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Takip bilgisi olan ve kargoya verilen siparişlerinizi görüntüleyin.
          </p>
          <Link
            to={storeLink('/store/hesabim/siparisler?status=SHIPPED')}
            className="inline-block mt-4 text-sm font-medium text-indigo-600 hover:underline"
          >
            Kargodaki siparişleri gör →
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-semibold text-slate-900">Son siparişler</h2>
            {!ordersLoading && ordersTotal != null && ordersTotal > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">Toplam {ordersTotal} sipariş</p>
            )}
          </div>
          <Link
            to={storeLink('/store/hesabim/siparisler')}
            className="text-sm text-indigo-600 hover:underline"
          >
            Tüm siparişleri gör
          </Link>
        </div>
        {ordersLoading && <p className="text-sm text-slate-500">Yükleniyor…</p>}
        {!ordersLoading && orders.length === 0 && (
          <p className="text-sm text-slate-500">Henüz siparişiniz bulunmuyor.</p>
        )}
        {!ordersLoading && orders.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {orders.map(o => (
              <li key={o.id} className="py-3 flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <Link
                    to={storeLink(
                      `/store/hesabim/siparisler/${encodeURIComponent(o.orderNumber)}`,
                    )}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    #{o.orderNumber}
                  </Link>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {new Date(o.createdAt).toLocaleDateString('tr-TR')} ·{' '}
                    {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                  </p>
                </div>
                <span className="font-medium">{formatTry(o.totalAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
