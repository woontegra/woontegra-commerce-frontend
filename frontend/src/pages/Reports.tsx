import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api from '../services/api';
import { orderService, type Order } from '../services/order.service';
import { productService } from '../services/product.service';
import { customerService } from '../services/customer.service';
import { loadStockTableRows } from '../utils/stockPageRows';
import { Table } from '../components/ui/Table';
import {
  aggregateCities,
  breakdownEntries,
  cancelReturnRate,
  countFromBreakdown,
  fmtCurrency,
  fmtDateTime,
  fmtNumber,
  fmtPercent,
  fmtShortDate,
  getReportDateRange,
  hasChartData,
  isInDateRange,
  labelOrderStatus,
  paymentMethodBreakdown,
  topRevenueDays,
  toNumber,
  type DateRangeKey,
  type ReportTab,
} from '../utils/reportsPageHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalesReportData {
  summary?: {
    totalRevenue?: unknown;
    totalOrders?: unknown;
    averageOrderValue?: unknown;
  };
  salesByDate?: Array<{ date: string; revenue?: unknown; orders?: unknown }>;
  statusBreakdown?: Record<string, unknown>;
  recentOrders?: Array<Record<string, unknown>>;
  paymentMethodBreakdown?: Array<{ method?: string; label?: string; count?: unknown }>;
  topRevenueDays?: Array<{ date: string; revenue?: unknown; orders?: unknown }>;
}

interface ProductsReportData {
  summary?: {
    totalProducts?: unknown;
    productsWithSales?: unknown;
    productsWithoutSales?: unknown;
    topSellerName?: string;
    lowStockCount?: unknown;
    outOfStockCount?: unknown;
  };
  topProducts?: Array<{
    productId?: string;
    productName?: string;
    totalRevenue?: unknown;
    totalSold?: unknown;
  }>;
  topRevenueProducts?: Array<{
    productName?: string;
    totalRevenue?: unknown;
    totalSold?: unknown;
  }>;
  lowStockProducts?: Array<{ productName?: string; sku?: string; stock?: unknown }>;
  unsoldProducts?: Array<{ productName?: string; sku?: string; stock?: unknown }>;
  categoryBreakdown?: Array<{
    category?: string;
    totalRevenue?: unknown;
    totalSold?: unknown;
    productCount?: unknown;
  }>;
}

interface CustomersReportData {
  summary?: {
    totalCustomers?: unknown;
    activeCustomers?: unknown;
    newCustomers?: unknown;
    repeatCustomers?: unknown;
    repeatRate?: unknown;
    averageCustomerValue?: unknown;
  };
  topCustomers?: Array<{
    customerName?: string;
    email?: string;
    totalSpent?: unknown;
    orderCount?: unknown;
    averageOrderValue?: unknown;
  }>;
  customersByDate?: Array<{ date: string; count?: unknown }>;
  segments?: { vip?: unknown; regular?: unknown; new?: unknown };
  cityBreakdown?: Array<{ city?: string; count?: unknown }>;
}

interface SalesExtras {
  recentOrders: Order[];
  paymentPendingCount: number | null;
  deliveredCount: number | null;
  paymentMethods: Array<{ label: string; count: number }>;
}

interface ProductExtras {
  totalProducts: number | null;
  lowStockCount: number | null;
  outOfStockCount: number | null;
  lowStockRows: Array<{ productName: string; sku: string; stock: number }>;
}

interface CustomerExtras {
  newThisMonth: number | null;
  cityBreakdown: Array<{ city: string; count: number }>;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function SummaryMetric({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string | number;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold mt-1 tabular-nums leading-tight ${valueClassName ?? 'text-slate-900'}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartEmpty({ message = 'Seçilen tarih aralığında yeterli veri bulunmuyor.' }) {
  return (
    <div className="flex items-center justify-center h-52 text-center px-6">
      <p className="text-[13px] text-slate-500 max-w-sm">{message}</p>
    </div>
  );
}

function PageEmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="wn-card empty-state py-16 px-6">
      <div className="empty-state-icon">
        <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-desc mx-auto max-w-md">{desc}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label, valueKey }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-slate-500 mb-1 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-slate-800">
          {p.name}:{' '}
          <span className="font-semibold">
            {valueKey === 'currency' ? fmtCurrency(p.value) : fmtNumber(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

const DATE_PRESETS: Array<{ key: DateRangeKey; label: string }> = [
  { key: '7days',     label: 'Son 7 Gün' },
  { key: '30days',    label: 'Son 30 Gün' },
  { key: '90days',    label: 'Son 90 Gün' },
  { key: 'thisMonth', label: 'Bu Ay' },
  { key: 'lastMonth', label: 'Geçen Ay' },
  { key: 'custom',    label: 'Özel Aralık' },
];

const TAB_LABELS: Record<ReportTab, string> = {
  sales:     'Satış Raporu',
  products:  'Ürün Performansı',
  customers: 'Müşteri Analizi',
};

async function fetchSalesExtras(startDate: string, endDate: string): Promise<SalesExtras> {
  try {
    const [recentRes, pendingRes, deliveredRes, batchRes] = await Promise.all([
      orderService.getAll({ limit: 8 }),
      orderService.getAll({ paymentStatus: 'PENDING', limit: 1 }),
      orderService.getAll({ status: 'DELIVERED', limit: 1 }),
      orderService.getAll({ limit: 150 }),
    ]);

    const inRange = batchRes.orders.filter(o =>
      isInDateRange(o.orderDate ?? o.createdAt, startDate, endDate),
    );

    return {
      recentOrders:        recentRes.orders.slice(0, 8),
      paymentPendingCount: pendingRes.total,
      deliveredCount:      deliveredRes.total,
      paymentMethods:      paymentMethodBreakdown(inRange),
    };
  } catch {
    return {
      recentOrders:        [],
      paymentPendingCount: null,
      deliveredCount:      null,
      paymentMethods:      [],
    };
  }
}

async function fetchProductExtras(): Promise<ProductExtras> {
  try {
    const [catalog, stockStats, stockResult] = await Promise.all([
      productService.search({ limit: 1 }),
      api.get('/stock/stats').catch(() => null),
      loadStockTableRows().catch(() => ({ rows: [], loadFailed: true })),
    ]);

    const statsBody = stockStats?.data?.data ?? stockStats?.data ?? {};
    const stockRows = stockResult.rows ?? [];
    const lowRows = stockRows
      .filter(r => r.status === 'low_stock' || r.status === 'out_of_stock')
      .slice(0, 10)
      .map(r => ({
        productName: r.productName,
        sku:         r.sku ?? '—',
        stock:       r.available,
      }));

    return {
      totalProducts:   catalog.total ?? null,
      lowStockCount:   statsBody.lowStockCount ?? statsBody.lowStock ?? null,
      outOfStockCount: statsBody.outOfStockCount ?? statsBody.outOfStock ?? null,
      lowStockRows:    lowRows,
    };
  } catch {
    return {
      totalProducts:   null,
      lowStockCount:   null,
      outOfStockCount: null,
      lowStockRows:    [],
    };
  }
}

async function fetchCustomerExtras(): Promise<CustomerExtras> {
  try {
    const [stats, list] = await Promise.all([
      customerService.getStats().catch(() => null),
      customerService.getAll({ limit: 200 }),
    ]);
    return {
      newThisMonth:  stats?.newThisMonth ?? null,
      cityBreakdown: aggregateCities(list.customers),
    };
  } catch {
    return { newThisMonth: null, cityBreakdown: [] };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportTab>('sales');
  const [dateRange, setDateRange]       = useState<DateRangeKey>('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate]     = useState('');
  const [loading, setLoading]           = useState(true);
  const [exporting, setExporting]       = useState(false);

  const [salesData, setSalesData]         = useState<SalesReportData | null>(null);
  const [productsData, setProductsData]   = useState<ProductsReportData | null>(null);
  const [customersData, setCustomersData] = useState<CustomersReportData | null>(null);
  const [salesExtras, setSalesExtras]     = useState<SalesExtras | null>(null);
  const [productExtras, setProductExtras] = useState<ProductExtras | null>(null);
  const [customerExtras, setCustomerExtras] = useState<CustomerExtras | null>(null);
  const [fetchError, setFetchError]       = useState(false);

  const { startDate, endDate } = useMemo(
    () => getReportDateRange(dateRange, customStartDate, customEndDate),
    [dateRange, customStartDate, customEndDate],
  );

  const fetchReportData = useCallback(async () => {
    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) return;

    setLoading(true);
    setFetchError(false);

    try {
      if (activeReport === 'sales') {
        const [reportRes, extras] = await Promise.all([
          api.get('/reports/sales', { params: { startDate, endDate, groupBy: 'day' } }),
          fetchSalesExtras(startDate, endDate),
        ]);
        setSalesData(reportRes.data?.data ?? reportRes.data);
        setSalesExtras(extras);
      } else if (activeReport === 'products') {
        const [reportRes, extras] = await Promise.all([
          api.get('/reports/products', { params: { startDate, endDate, limit: 20 } }),
          fetchProductExtras(),
        ]);
        setProductsData(reportRes.data?.data ?? reportRes.data);
        setProductExtras(extras);
      } else {
        const [reportRes, extras] = await Promise.all([
          api.get('/reports/customers', { params: { startDate, endDate } }),
          fetchCustomerExtras(),
        ]);
        setCustomersData(reportRes.data?.data ?? reportRes.data);
        setCustomerExtras(extras);
      }
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [activeReport, startDate, endDate, dateRange, customStartDate, customEndDate]);

  useEffect(() => { void fetchReportData(); }, [fetchReportData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/reports/export', {
        params: { type: activeReport, startDate, endDate },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeReport}-rapor.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Rapor dışa aktarılamadı.');
    } finally {
      setExporting(false);
    }
  };

  // ─── Derived: Sales ─────────────────────────────────────────────────────────

  const salesDerived = useMemo(() => {
    if (!salesData) return null;
    const totalOrders = toNumber(salesData.summary?.totalOrders);
    const statusRows  = breakdownEntries(salesData.statusBreakdown);
    const trend       = (salesData.salesByDate ?? []).map(row => ({
      date:    fmtShortDate(row.date),
      rawDate: row.date,
      revenue: toNumber(row.revenue),
      orders:  toNumber(row.orders),
    }));
    const topDays = salesData.topRevenueDays?.length
      ? salesData.topRevenueDays
      : topRevenueDays(salesData.salesByDate);

    const paymentRows = salesData.paymentMethodBreakdown?.length
      ? salesData.paymentMethodBreakdown.map(r => ({
          label: String(r.label ?? r.method ?? 'Belirtilmemiş'),
          count: toNumber(r.count),
        }))
      : (salesExtras?.paymentMethods ?? []);

    return {
      totalRevenue:      toNumber(salesData.summary?.totalRevenue),
      totalOrders,
      averageOrderValue: toNumber(salesData.summary?.averageOrderValue),
      cancelReturnRate:  cancelReturnRate(salesData.statusBreakdown, totalOrders),
      paymentPending:    salesExtras?.paymentPendingCount,
      delivered:         salesExtras?.deliveredCount
        ?? countFromBreakdown(salesData.statusBreakdown, ['DELIVERED']),
      trend,
      statusRows,
      topDays,
      paymentRows,
      hasTrend: hasChartData(trend) && trend.some(r => r.revenue > 0 || r.orders > 0),
      hasStatus: statusRows.length > 0,
    };
  }, [salesData, salesExtras]);

  // ─── Derived: Products ──────────────────────────────────────────────────────

  const productsDerived = useMemo(() => {
    if (!productsData) return null;
    const topProducts = productsData.topProducts ?? [];
    const topByRevenue = productsData.topRevenueProducts?.length
      ? productsData.topRevenueProducts
      : [...topProducts].sort((a, b) => toNumber(b.totalRevenue) - toNumber(a.totalRevenue));

    const soldCount = toNumber(productsData.summary?.productsWithSales)
      || topProducts.filter(p => toNumber(p.totalSold) > 0).length;
    const totalProducts = toNumber(productsData.summary?.totalProducts)
      || productExtras?.totalProducts
      || 0;
    const unsoldCount = toNumber(productsData.summary?.productsWithoutSales)
      || (totalProducts > 0 ? Math.max(totalProducts - soldCount, 0) : 0);

    return {
      totalProducts:    totalProducts || null,
      withSales:        soldCount || null,
      withoutSales:     unsoldCount || null,
      topSeller:        productsData.summary?.topSellerName
        ?? topProducts[0]?.productName
        ?? '—',
      lowStock:         toNumber(productsData.summary?.lowStockCount)
        || productExtras?.lowStockCount
        || 0,
      outOfStock:       toNumber(productsData.summary?.outOfStockCount)
        || productExtras?.outOfStockCount
        || 0,
      topProducts,
      topByRevenue,
      lowStockRows:     productsData.lowStockProducts?.length
        ? productsData.lowStockProducts.map(r => ({
            productName: String(r.productName ?? '—'),
            sku:         String(r.sku ?? '—'),
            stock:       toNumber(r.stock),
          }))
        : (productExtras?.lowStockRows ?? []),
      unsoldRows:       productsData.unsoldProducts ?? [],
      categories:       productsData.categoryBreakdown ?? [],
      hasTopProducts:   hasChartData(topProducts),
    };
  }, [productsData, productExtras]);

  // ─── Derived: Customers ─────────────────────────────────────────────────────

  const customersDerived = useMemo(() => {
    if (!customersData) return null;
    const topCustomers = customersData.topCustomers ?? [];
    const repeatFromList = topCustomers.filter(c => toNumber(c.orderCount) > 1).length;
    const repeatCustomers = toNumber(customersData.summary?.repeatCustomers) || repeatFromList;
    const totalCustomers  = toNumber(customersData.summary?.totalCustomers);
    const repeatRate = customersData.summary?.repeatRate != null
      ? toNumber(customersData.summary?.repeatRate)
      : (totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : null);

    const cityRows = customersData.cityBreakdown?.length
      ? customersData.cityBreakdown.map(r => ({
          city:  String(r.city ?? '—'),
          count: toNumber(r.count),
        }))
      : (customerExtras?.cityBreakdown ?? []);

    return {
      totalCustomers,
      newCustomers: toNumber(customersData.summary?.newCustomers)
        || customerExtras?.newThisMonth
        || 0,
      repeatCustomers,
      repeatRate,
      averageValue: toNumber(customersData.summary?.averageCustomerValue),
      topCustomers,
      topByOrders:  [...topCustomers].sort((a, b) => toNumber(b.orderCount) - toNumber(a.orderCount)),
      topBySpend:   [...topCustomers].sort((a, b) => toNumber(b.totalSpent) - toNumber(a.totalSpent)),
      trend:        customersData.customersByDate ?? [],
      segments:     customersData.segments,
      cityRows,
      hasTrend:     hasChartData(customersData.customersByDate),
      hasCity:      cityRows.length > 0,
    };
  }, [customersData, customerExtras]);

  const showGlobalEmpty = !loading && !fetchError && (
    (activeReport === 'sales' && salesDerived && salesDerived.totalOrders === 0)
    || (activeReport === 'products' && productsDerived
      && !productsDerived.totalProducts
      && !productsDerived.hasTopProducts
      && productsDerived.lowStockRows.length === 0)
    || (activeReport === 'customers' && customersDerived && customersDerived.totalCustomers === 0)
  );

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Raporlar</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Satış, ürün ve müşteri performansını tek ekranda analiz edin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting || loading}
          className="btn btn-secondary shrink-0 disabled:opacity-50"
        >
          {exporting ? 'İndiriliyor…' : 'Raporu CSV İndir'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['sales', 'products', 'customers'] as ReportTab[]).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveReport(tab)}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium transition ${
              activeReport === tab
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'wn-card text-slate-600 hover:text-slate-900'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="wn-card px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-slate-500 mr-1">Tarih aralığı</span>
          {DATE_PRESETS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setDateRange(p.key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                dateRange === p.key
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {dateRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="wn-input text-[13px]" />
            <span className="text-slate-400">—</span>
            <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="wn-input text-[13px]" />
            <button type="button" onClick={() => void fetchReportData()} className="btn btn-primary text-[13px]">
              Uygula
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : fetchError ? (
        <PageEmptyState
          title="Rapor verisi yüklenemedi."
          desc="Bağlantınızı kontrol edip tekrar deneyin. Sorun devam ederse destek ekibine başvurun."
        />
      ) : showGlobalEmpty ? (
        <PageEmptyState
          title="Henüz yeterli sipariş verisi oluşmadı."
          desc="Satışlar başladıkça raporlar burada gösterilecektir."
        />
      ) : (
        <>
          {/* ── SALES ── */}
          {activeReport === 'sales' && salesDerived && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                <SummaryMetric label="Toplam Ciro" value={fmtCurrency(salesDerived.totalRevenue)} />
                <SummaryMetric label="Toplam Sipariş" value={fmtNumber(salesDerived.totalOrders)} />
                <SummaryMetric label="Ort. Sipariş Tutarı" value={fmtCurrency(salesDerived.averageOrderValue)} />
                <SummaryMetric
                  label="İptal / İade Oranı"
                  value={salesDerived.cancelReturnRate == null ? '—' : fmtPercent(salesDerived.cancelReturnRate)}
                />
                <SummaryMetric
                  label="Ödeme Bekleyen"
                  value={salesDerived.paymentPending == null ? '—' : fmtNumber(salesDerived.paymentPending)}
                />
                <SummaryMetric label="Teslim Edilen" value={fmtNumber(salesDerived.delivered)} />
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="wn-card p-5">
                  <h2 className="text-[14px] font-semibold text-slate-900 mb-4">Ciro Trendi</h2>
                  {salesDerived.hasTrend ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={salesDerived.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={v => fmtNumber(v)} />
                        <Tooltip content={<ChartTooltip valueKey="currency" />} />
                        <Line type="monotone" dataKey="revenue" name="Ciro" stroke="#4f46e5" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmpty />
                  )}
                </div>

                <div className="wn-card p-5">
                  <h2 className="text-[14px] font-semibold text-slate-900 mb-4">Sipariş Adedi Trendi</h2>
                  {salesDerived.hasTrend ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={salesDerived.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                        <Tooltip content={<ChartTooltip valueKey="number" />} />
                        <Line type="monotone" dataKey="orders" name="Sipariş" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmpty />
                  )}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="wn-card p-5">
                  <h2 className="text-[14px] font-semibold text-slate-900 mb-4">Sipariş Durum Dağılımı</h2>
                  {salesDerived.hasStatus ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={salesDerived.statusRows}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={entry => `${entry.name}: ${entry.value}`}
                        >
                          {salesDerived.statusRows.map(row => (
                            <Cell key={row.key} fill={row.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmpty />
                  )}
                </div>

                <div className="wn-card p-5">
                  <h2 className="text-[14px] font-semibold text-slate-900 mb-4">Ödeme Yöntemine Göre Dağılım</h2>
                  {salesDerived.paymentRows.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={salesDerived.paymentRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Sipariş" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmpty message="Seçilen aralıkta ödeme yöntemi dağılımı oluşturulamadı." />
                  )}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="wn-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-[14px] font-semibold text-slate-900">Son Siparişler</h2>
                  </div>
                  <Table
                    data={salesExtras?.recentOrders ?? []}
                    keyExtractor={o => o.id}
                    emptyState={
                      <div className="empty-state py-10 px-4">
                        <p className="empty-state-desc">Son sipariş bulunamadı.</p>
                      </div>
                    }
                    columns={[
                      {
                        key: 'order', header: 'Sipariş',
                        cell: (o: Order) => (
                          <span className="font-medium text-slate-900">{o.displayOrderNumber ?? o.orderNumber}</span>
                        ),
                      },
                      {
                        key: 'date', header: 'Tarih',
                        cell: (o: Order) => (
                          <span className="text-[13px] text-slate-600">{fmtDateTime(o.orderDate ?? o.createdAt)}</span>
                        ),
                      },
                      {
                        key: 'status', header: 'Durum',
                        cell: (o: Order) => (
                          <span className="text-[12px] text-slate-600">{labelOrderStatus(o.status)}</span>
                        ),
                      },
                      {
                        key: 'total', header: 'Tutar', align: 'right',
                        cell: (o: Order) => (
                          <span className="font-medium tabular-nums">{fmtCurrency(o.totalAmount)}</span>
                        ),
                      },
                    ]}
                  />
                </div>

                <div className="wn-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-[14px] font-semibold text-slate-900">En Çok Ciro Getiren Günler</h2>
                  </div>
                  <Table
                    data={salesDerived.topDays}
                    keyExtractor={r => String(r.date)}
                    emptyState={<ChartEmpty />}
                    columns={[
                      {
                        key: 'date', header: 'Gün',
                        cell: r => <span className="text-slate-800">{fmtShortDate(String(r.date))}</span>,
                      },
                      {
                        key: 'revenue', header: 'Ciro', align: 'right',
                        cell: r => <span className="font-medium tabular-nums">{fmtCurrency(r.revenue)}</span>,
                      },
                      {
                        key: 'orders', header: 'Sipariş', align: 'right',
                        cell: r => <span className="tabular-nums">{fmtNumber((r as { orders?: unknown }).orders)}</span>,
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {activeReport === 'products' && productsDerived && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                <SummaryMetric label="Toplam Ürün" value={productsDerived.totalProducts ?? '—'} />
                <SummaryMetric label="Satışı Olan" value={productsDerived.withSales ?? '—'} />
                <SummaryMetric label="Satışsız Ürün" value={productsDerived.withoutSales ?? '—'} />
                <SummaryMetric label="En Çok Satan" value={productsDerived.topSeller} valueClassName="text-base" />
                <SummaryMetric label="Düşük Stok" value={fmtNumber(productsDerived.lowStock)} valueClassName="text-amber-700" />
                <SummaryMetric label="Tükenen" value={fmtNumber(productsDerived.outOfStock)} valueClassName="text-red-700" />
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="wn-card p-5">
                  <h2 className="text-[14px] font-semibold text-slate-900 mb-4">En Çok Satan Ürünler</h2>
                  {productsDerived.hasTopProducts ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={productsDerived.topProducts.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="productName" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={70} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalSold" name="Adet" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmpty />
                  )}
                </div>

                <div className="wn-card p-5">
                  <h2 className="text-[14px] font-semibold text-slate-900 mb-4">En Çok Ciro Getiren Ürünler</h2>
                  {productsDerived.hasTopProducts ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={productsDerived.topByRevenue.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="productName" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={70} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtNumber(v)} />
                        <Tooltip formatter={(v) => fmtCurrency(v)} />
                        <Bar dataKey="totalRevenue" name="Ciro" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmpty />
                  )}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="wn-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-[14px] font-semibold text-slate-900">Düşük Stok / Tükenen Ürünler</h2>
                  </div>
                  <Table
                    data={productsDerived.lowStockRows}
                    keyExtractor={r => `${r.sku}-${r.productName}`}
                    emptyState={
                      <div className="empty-state py-10 px-4">
                        <p className="empty-state-desc">Düşük stok kaydı bulunamadı.</p>
                      </div>
                    }
                    columns={[
                      { key: 'name', header: 'Ürün', cell: r => <span className="font-medium">{r.productName}</span> },
                      { key: 'sku',  header: 'SKU',  cell: r => <span className="text-slate-500 font-mono text-[12px]">{r.sku}</span> },
                      { key: 'stock', header: 'Stok', align: 'right', cell: r => <span className="tabular-nums">{fmtNumber(r.stock)}</span> },
                    ]}
                  />
                </div>

                <div className="wn-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-[14px] font-semibold text-slate-900">Kategori Performansı</h2>
                  </div>
                  <Table
                    data={productsDerived.categories}
                    keyExtractor={r => String(r.category ?? 'cat')}
                    emptyState={
                      <div className="empty-state py-10 px-4">
                        <p className="empty-state-desc">Kategori verisi bulunamadı.</p>
                      </div>
                    }
                    columns={[
                      { key: 'cat', header: 'Kategori', cell: r => <span>{r.category}</span> },
                      { key: 'rev', header: 'Ciro', align: 'right', cell: r => fmtCurrency(r.totalRevenue) },
                      { key: 'sold', header: 'Satılan', align: 'right', cell: r => fmtNumber(r.totalSold) },
                      { key: 'cnt', header: 'Ürün', align: 'right', cell: r => fmtNumber(r.productCount) },
                    ]}
                  />
                </div>
              </div>

              {productsDerived.unsoldRows.length > 0 && (
                <div className="wn-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-[14px] font-semibold text-slate-900">Satış Almayan Ürünler</h2>
                  </div>
                  <Table
                    data={productsDerived.unsoldRows}
                    keyExtractor={r => `${r.productName}-${r.sku}`}
                    columns={[
                      { key: 'name', header: 'Ürün', cell: r => String(r.productName ?? '—') },
                      { key: 'sku', header: 'SKU', cell: r => String(r.sku ?? '—') },
                      { key: 'stock', header: 'Stok', align: 'right', cell: r => fmtNumber(r.stock) },
                    ]}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── CUSTOMERS ── */}
          {activeReport === 'customers' && customersDerived && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryMetric label="Toplam Müşteri" value={fmtNumber(customersDerived.totalCustomers)} />
                <SummaryMetric label="Yeni Müşteri" value={fmtNumber(customersDerived.newCustomers)} />
                <SummaryMetric label="Tekrar Alışveriş" value={fmtNumber(customersDerived.repeatCustomers)} />
                <SummaryMetric label="Ort. Sipariş Değeri" value={fmtCurrency(customersDerived.averageValue)} />
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="wn-card p-5">
                  <h2 className="text-[14px] font-semibold text-slate-900 mb-1">Tekrar Satın Alma Oranı</h2>
                  <p className="text-3xl font-semibold text-indigo-700 mt-3 tabular-nums">
                    {customersDerived.repeatRate == null ? '—' : fmtPercent(customersDerived.repeatRate)}
                  </p>
                  <p className="text-[12px] text-slate-500 mt-2">
                    Birden fazla sipariş veren müşteri oranı
                  </p>
                </div>

                <div className="wn-card p-5">
                  <h2 className="text-[14px] font-semibold text-slate-900 mb-4">Yeni Müşteri Trendi</h2>
                  {customersDerived.hasTrend ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={customersDerived.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => fmtShortDate(String(v))} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" name="Yeni müşteri" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmpty message="Yeni müşteri trendi bu aralık için API tarafından sağlanmıyor." />
                  )}
                </div>
              </div>

              {customersDerived.segments && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="wn-card p-4 text-center">
                    <p className="text-[12px] text-violet-600 font-medium">VIP</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">{fmtNumber(customersDerived.segments.vip)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">₺1.000+ harcama</p>
                  </div>
                  <div className="wn-card p-4 text-center">
                    <p className="text-[12px] text-blue-600 font-medium">Düzenli</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">{fmtNumber(customersDerived.segments.regular)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">₺100 – ₺1.000</p>
                  </div>
                  <div className="wn-card p-4 text-center">
                    <p className="text-[12px] text-emerald-600 font-medium">Yeni</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">{fmtNumber(customersDerived.segments.new)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">₺100 altı</p>
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="wn-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-[14px] font-semibold text-slate-900">En Çok Sipariş Veren Müşteriler</h2>
                  </div>
                  <Table
                    data={customersDerived.topByOrders}
                    keyExtractor={r => `${r.email}-${r.customerName}`}
                    emptyState={<ChartEmpty message="Müşteri listesi bulunamadı." />}
                    columns={[
                      { key: 'name', header: 'Müşteri', cell: r => <span className="font-medium">{r.customerName}</span> },
                      { key: 'email', header: 'E-posta', cell: r => <span className="text-slate-500 text-[13px]">{r.email}</span> },
                      { key: 'orders', header: 'Sipariş', align: 'right', cell: r => fmtNumber(r.orderCount) },
                    ]}
                  />
                </div>

                <div className="wn-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-[14px] font-semibold text-slate-900">En Çok Harcama Yapan Müşteriler</h2>
                  </div>
                  <Table
                    data={customersDerived.topBySpend}
                    keyExtractor={r => `${r.email}-${r.customerName}`}
                    columns={[
                      { key: 'name', header: 'Müşteri', cell: r => <span className="font-medium">{r.customerName}</span> },
                      { key: 'spent', header: 'Toplam', align: 'right', cell: r => fmtCurrency(r.totalSpent) },
                      { key: 'avg', header: 'Ort.', align: 'right', cell: r => fmtCurrency(r.averageOrderValue) },
                    ]}
                  />
                </div>
              </div>

              <div className="wn-card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-[14px] font-semibold text-slate-900">Şehir Bazlı Müşteri Dağılımı</h2>
                </div>
                {customersDerived.hasCity ? (
                  <Table
                    data={customersDerived.cityRows}
                    keyExtractor={r => r.city}
                    columns={[
                      { key: 'city', header: 'Şehir', cell: r => r.city },
                      { key: 'count', header: 'Müşteri', align: 'right', cell: r => fmtNumber(r.count) },
                    ]}
                  />
                ) : (
                  <div className="py-10 px-4 text-center text-[13px] text-slate-500">
                    Şehir bilgisi olan müşteri kaydı bulunamadı.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
