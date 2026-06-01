import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import apiClient from '../services/apiClient';
import { useAppStore } from '../store/useAppStore';
import { useOrderStats, useOrders } from '../hooks/useOrders';
import { useMarketplaceQuestionStats } from '../hooks/useMarketplaceQuestionStats';
import { orderService, type OrderStatus } from '../services/order.service';
import { fetchReturnRequests } from '../services/returnRequest.service';
import { settingsApi } from '../components/trendyol/settings/trendyol-settings-api';
import type { TrendyolStats } from '../components/trendyol/settings/trendyol-settings-api';
import PaymentSummarySection from '../components/dashboard/PaymentSummarySection';
import OrderStatusSection, { type OrderStatusCounts } from '../components/dashboard/OrderStatusSection';
import MarketplaceSummarySection from '../components/dashboard/MarketplaceSummarySection';
import ActionRequiredPanel, { type ActionItem } from '../components/dashboard/ActionRequiredPanel';
import RecentOrdersSection from '../components/dashboard/RecentOrdersSection';
import type { PaymentSummary } from '../utils/orderPaymentLabels';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewData {
  totalProducts?:   number;
  sentProducts?:    number;
  failedProducts?:  number;
  skippedProducts?: number;
  successRate?:     number;
  last7Days?:       Array<{ date: string; success: number; error: number }>;
  recentSent?:      Array<{ productId: string | null; productName: string | null; createdAt: string }>;
  topErrors?:       Array<{ productId: string | null; productName: string | null; errorCount: number }>;
  paymentSummary?:  PaymentSummary;
}

interface SalesChartPoint {
  date:    string;
  revenue: number;
  orders:  number;
}

interface DashboardExtras {
  statusCounts:     OrderStatusCounts | null;
  readyToShip:      number | null;
  paymentPending:   number | null;
  paymentFailed:    number | null;
  pendingReturns:   number | null;
  todayOrders:      number | null;
  lowStockCount:    number | null;
  salesChart:       SalesChartPoint[];
}

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('tr-TR');
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style:                 'currency',
    currency:              'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'short' })}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function dateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear()
    && d.getMonth() === t.getMonth()
    && d.getDate() === t.getDate();
}

async function fetchStatusCounts(): Promise<OrderStatusCounts> {
  const results = await Promise.all(
    ORDER_STATUSES.map(async (status) => {
      try {
        const res = await orderService.getAll({ status, limit: 1 });
        return { status, count: res.total };
      } catch {
        return { status, count: 0 };
      }
    }),
  );
  return results.reduce((acc, { status, count }) => {
    acc[status] = count;
    return acc;
  }, {} as OrderStatusCounts);
}

async function fetchOrderTotal(query: Parameters<typeof orderService.getAll>[0]): Promise<number | null> {
  try {
    const res = await orderService.getAll({ ...query, limit: 1 });
    return res.total;
  } catch {
    return null;
  }
}

async function fetchLowStockCount(): Promise<number | null> {
  try {
    const res = await apiClient.get<{ success: boolean; data: { lowStockCount: number } }>(
      '/stock/stats',
      { skipErrorToast: true },
    );
    return res.data?.data?.lowStockCount ?? null;
  } catch {
    return null;
  }
}

async function fetchSalesChart(days: 7 | 30): Promise<SalesChartPoint[]> {
  try {
    const { startDate, endDate } = dateRange(days);
    const res = await apiClient.get<{
      success: boolean;
      data: { salesByDate: Array<{ date: string; revenue: number; orders: number }> };
    }>('/reports/sales', {
      params: { startDate, endDate, groupBy: 'day' },
      skipErrorToast: true,
    });
    return (res.data?.data?.salesByDate ?? []).map(row => ({
      date:    shortDate(row.date),
      revenue: row.revenue,
      orders:  row.orders,
    }));
  } catch {
    return [];
  }
}

async function fetchTodayOrdersFromRecent(): Promise<number | null> {
  try {
    const res = await orderService.getAll({ limit: 100 });
    const count = res.orders.filter(o => isToday(o.orderDate ?? o.createdAt)).length;
    return count;
  } catch {
    return null;
  }
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:   string;
  value:   string;
  sub?:    string;
  icon:    React.ReactNode;
  iconBg:  string;
  loading: boolean;
  href?:   string;
}

function StatCard({ label, value, sub, icon, iconBg, loading, href }: StatCardProps) {
  const inner = (
    <>
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="wn-card p-5 flex flex-col gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-20 bg-slate-100 rounded animate-pulse" />
          <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const cls = 'wn-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow';
  if (href) {
    return <Link to={href} className={cls}>{inner}</Link>;
  }
  return <div className={cls}>{inner}</div>;
}

function SalesChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg text-xs">
      <p className="text-slate-500 mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-600">
            {p.dataKey === 'revenue' ? 'Ciro' : 'Sipariş'}:
          </span>
          <span className="font-bold text-slate-900">
            {p.dataKey === 'revenue'
              ? fmtCurrency(p.value)
              : fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAppStore(s => s.user);

  const [days, setDays]               = useState<7 | 30>(7);
  const [overview, setOverview]       = useState<OverviewData | null>(null);
  const [trendyol, setTrendyol]       = useState<TrendyolStats | null>(null);
  const [extras, setExtras]           = useState<DashboardExtras>({
    statusCounts:   null,
    readyToShip:    null,
    paymentPending: null,
    paymentFailed:  null,
    pendingReturns: null,
    todayOrders:    null,
    lowStockCount:  null,
    salesChart:     [],
  });
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [extrasLoading, setExtrasLoading]     = useState(true);
  const [lastRefresh, setLastRefresh]         = useState<Date | null>(null);

  const { data: orderStats, isLoading: statsLoading, refetch: refetchStats } = useOrderStats();
  const { data: recentData, isLoading: ordersLoading, refetch: refetchOrders } = useOrders({ limit: 10 });
  const { waitingAnswer, loading: questionsLoading } = useMarketplaceQuestionStats();

  const loading = overviewLoading || extrasLoading || statsLoading;

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await apiClient.get(`/reports/overview?days=${days}`, { skipErrorToast: true });
      setOverview(res.data?.data ?? res.data);
    } catch {
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [days]);

  const fetchExtras = useCallback(async () => {
    setExtrasLoading(true);
    try {
      const [
        statusCounts,
        readyToShip,
        paymentPending,
        paymentFailed,
        returnsRes,
        todayOrders,
        lowStockCount,
        salesChart,
        trendyolStats,
      ] = await Promise.all([
        fetchStatusCounts(),
        fetchOrderTotal({ status: 'PAID' }),
        fetchOrderTotal({ paymentStatus: 'PENDING' }),
        fetchOrderTotal({ paymentStatus: 'FAILED' }),
        fetchReturnRequests({ status: 'PENDING', limit: 1 }).catch(() => ({ total: null as number | null })),
        fetchTodayOrdersFromRecent(),
        fetchLowStockCount(),
        fetchSalesChart(days),
        settingsApi.getStats().catch(() => null),
      ]);

      setTrendyol(trendyolStats);
      setExtras({
        statusCounts,
        readyToShip,
        paymentPending,
        paymentFailed,
        pendingReturns: returnsRes.total,
        todayOrders,
        lowStockCount,
        salesChart,
      });
    } catch {
      // Partial failure — keep safe defaults
    } finally {
      setExtrasLoading(false);
    }
  }, [days]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchOverview(),
      fetchExtras(),
      refetchStats(),
      refetchOrders(),
    ]);
    setLastRefresh(new Date());
  }, [fetchOverview, fetchExtras, refetchStats, refetchOrders]);

  useEffect(() => { void fetchOverview(); }, [fetchOverview]);
  useEffect(() => { void fetchExtras(); }, [fetchExtras]);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  const actionItems: ActionItem[] = useMemo(() => [
    {
      id:       'ship',
      label:    'Kargoya verilmesi gereken siparişler',
      count:    extras.readyToShip,
      href:     '/dashboard/orders?status=PAID',
      tone:     'indigo',
      emptyMsg: 'Kargoya hazır bekleyen sipariş yok',
    },
    {
      id:       'payment',
      label:    'Ödeme bekleyen siparişler',
      count:    extras.paymentPending,
      href:     '/dashboard/orders?paymentStatus=PENDING',
      tone:     'amber',
      emptyMsg: 'Ödeme bekleyen sipariş yok',
    },
    {
      id:       'returns',
      label:    'İade / iptal talepleri',
      count:    extras.pendingReturns,
      href:     '/dashboard/returns',
      tone:     'red',
      emptyMsg: 'Bekleyen iade talebi yok',
    },
    {
      id:       'questions',
      label:    'Cevap bekleyen müşteri soruları',
      count:    questionsLoading ? null : waitingAnswer,
      href:     '/dashboard/marketplace-questions',
      tone:     'indigo',
      emptyMsg: 'Cevap bekleyen soru yok',
    },
    {
      id:       'trendyol-errors',
      label:    'Hatalı Trendyol ürün gönderimleri',
      count:    overview?.failedProducts ?? null,
      href:     '/dashboard/marketplaces/trendyol',
      tone:     'orange',
      emptyMsg: 'Hatalı Trendyol gönderimi yok',
    },
    {
      id:       'stock',
      label:    'Kritik stok ürünleri',
      count:    extras.lowStockCount,
      href:     '/dashboard/stock',
      tone:     'amber',
      emptyMsg: 'Kritik stok bulunmuyor',
    },
  ], [extras, overview, waitingAnswer, questionsLoading]);

  const hasAnyOrders = (orderStats?.totalCount ?? orderStats?.total ?? 0) > 0;
  const chartHasData = extras.salesChart.some(p => p.revenue > 0 || p.orders > 0);

  return (
    <div className="w-full space-y-8 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            {greeting}, {user?.firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            E-ticaret operasyon özeti
            {lastRefresh && (
              <span className="ml-2 text-slate-400 text-xs">
                · {timeAgo(lastRefresh.toISOString())} güncellendi
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 gap-1">
            {([7, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  days === d
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {d} gün
              </button>
            ))}
          </div>
          <button
            onClick={() => void refreshAll()}
            disabled={loading}
            title="Yenile"
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-40"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : 'text-slate-500'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Quick start — only when no products */}
      {!loading && (overview?.totalProducts ?? 0) === 0 && (
        <div className="wn-card p-6 border-indigo-200 bg-indigo-50/40">
          <h2 className="text-base font-bold text-slate-900">Hızlı Başlangıç</h2>
          <p className="text-sm text-slate-600 mt-1">Mağazanızı kurup ilk satışa hazırlanın.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <Link to="/dashboard/products/new" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors">
              <p className="font-semibold text-slate-800">İlk ürününü ekle</p>
              <p className="text-xs text-slate-500 mt-1">Tek ürünle başlayıp mağazanı hemen yayına al.</p>
            </Link>
            <Link to="/dashboard/products/import/xml" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors">
              <p className="font-semibold text-slate-800">XML ile yükle</p>
              <p className="text-xs text-slate-500 mt-1">Toplu ürün aktarımı için XML import sihirbazını kullan.</p>
            </Link>
            <Link to="/dashboard/settings" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors">
              <p className="font-semibold text-slate-800">Tema seç</p>
              <p className="text-xs text-slate-500 mt-1">Markana uygun görünümü ayarlayıp satışa hazırlan.</p>
            </Link>
          </div>
        </div>
      )}

      {/* Top stat cards — e-commerce operations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard
          loading={statsLoading}
          label="Bugünkü Ciro"
          value={fmtCurrency(orderStats?.todayRevenue)}
          sub="Onaylı vitrin siparişleri"
          iconBg="bg-indigo-100"
          href="/dashboard/reports"
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        <StatCard
          loading={extrasLoading}
          label="Bugünkü Sipariş"
          value={fmt(extras.todayOrders)}
          sub="Son 100 siparişten hesaplanır"
          iconBg="bg-emerald-100"
          href="/dashboard/orders"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
          }
        />
        <StatCard
          loading={statsLoading}
          label="Bekleyen Sipariş"
          value={fmt(orderStats?.pending)}
          sub="Onay / hazırlık bekleyen"
          iconBg="bg-amber-100"
          href="/dashboard/orders?status=PENDING"
          icon={
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        <StatCard
          loading={extrasLoading}
          label="Kargoya Hazır"
          value={fmt(extras.readyToShip)}
          sub="Ödendi, kargo bekliyor"
          iconBg="bg-violet-100"
          href="/dashboard/orders?status=PAID"
          icon={
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
            </svg>
          }
        />
        <StatCard
          loading={questionsLoading}
          label="Cevap Bekleyen Sorular"
          value={fmt(waitingAnswer)}
          sub="Pazaryeri müşteri soruları"
          iconBg="bg-sky-100"
          href="/dashboard/marketplace-questions"
          icon={
            <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
            </svg>
          }
        />
        <StatCard
          loading={extrasLoading}
          label="Kritik Stok"
          value={extras.lowStockCount == null ? '—' : fmt(extras.lowStockCount)}
          sub={extras.lowStockCount == null ? 'Stok API kullanılamıyor' : 'Eşik altı ürünler'}
          iconBg="bg-red-100"
          href="/dashboard/stock"
          icon={
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          }
        />
      </div>

      {/* Order status + Payment summary */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <OrderStatusSection
          counts={extras.statusCounts}
          readyToShip={extras.readyToShip ?? undefined}
          loading={extrasLoading}
        />
        <PaymentSummarySection
          summary={overview?.paymentSummary}
          loading={overviewLoading}
          days={days}
          variant="compact"
        />
      </div>

      {/* Sales chart */}
      <div className="wn-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Satış Grafiği</h2>
            <p className="text-xs text-slate-400 mt-0.5">Son {days} gün — ciro ve sipariş adedi (vitrin)</p>
          </div>
        </div>

        {extrasLoading ? (
          <div className="h-56 bg-slate-50 rounded-xl animate-pulse" />
        ) : !chartHasData ? (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-slate-700">Henüz satış verisi yok</p>
            <p className="text-xs text-slate-400 mt-1">İlk siparişleriniz geldiğinde grafik burada görünecek.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={extras.salesChart} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
                axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<SalesChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(value) => (value === 'revenue' ? 'Ciro' : 'Sipariş')}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#4f46e5"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                strokeDasharray="4 3"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Action required */}
      <ActionRequiredPanel items={actionItems} loading={loading || questionsLoading} />

      {/* Recent orders */}
      <RecentOrdersSection
        orders={recentData?.orders ?? []}
        loading={ordersLoading}
      />

      {/* Marketplace summary — Trendyol */}
      <MarketplaceSummarySection
        trendyol={trendyol}
        overview={overview}
        trendyolOrders={orderStats?.trendyolCount}
        waitingQuestions={waitingAnswer}
        loading={overviewLoading || extrasLoading}
      />

      {/* Quick links */}
      <div className="wn-card p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Hızlı Erişim</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {[
            { label: 'Ürün Ekle',         href: '/dashboard/products/new',           bg: 'bg-indigo-50  text-indigo-700',  icon: '➕' },
            { label: 'Siparişler',        href: '/dashboard/orders',                 bg: 'bg-emerald-50 text-emerald-700', icon: '🛍️' },
            { label: 'İade Talepleri',    href: '/dashboard/returns',                bg: 'bg-red-50     text-red-700',     icon: '↩️' },
            { label: 'Müşteri Soruları',  href: '/dashboard/marketplace-questions',  bg: 'bg-sky-50     text-sky-700',     icon: '💬' },
            { label: 'Pazaryerleri',      href: '/dashboard/marketplaces',           bg: 'bg-orange-50  text-orange-700',  icon: '🔗' },
            { label: 'Raporlar',          href: '/dashboard/reports',                bg: 'bg-purple-50  text-purple-700',  icon: '📊' },
            { label: 'Ayarlar',           href: '/dashboard/settings',               bg: 'bg-slate-100  text-slate-700',   icon: '⚙️' },
          ].map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-sm font-semibold ${item.bg}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Empty orders hint */}
      {!loading && !hasAnyOrders && (overview?.totalProducts ?? 0) > 0 && (
        <div className="wn-card p-5 border-slate-200 bg-slate-50/50 text-center">
          <p className="text-sm text-slate-600">
            Ürünleriniz hazır — ilk siparişinizi bekliyorsunuz.
            {' '}
            <Link to="/dashboard/orders" className="text-indigo-600 font-semibold hover:underline">
              Siparişleri görüntüle
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
