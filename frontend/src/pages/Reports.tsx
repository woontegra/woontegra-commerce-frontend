import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

type ReportType = 'sales' | 'products' | 'customers';
type DateRange = '7days' | '30days' | '90days' | 'custom';

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>('sales');
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<any>(null);
  const [productsData, setProductsData] = useState<any>(null);
  const [customersData, setCustomersData] = useState<any>(null);

  useEffect(() => {
    fetchReportData();
  }, [activeReport, dateRange]);

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();

    if (dateRange === '7days') {
      start.setDate(end.getDate() - 7);
    } else if (dateRange === '30days') {
      start.setDate(end.getDate() - 30);
    } else if (dateRange === '90days') {
      start.setDate(end.getDate() - 90);
    } else if (dateRange === 'custom') {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();

      if (activeReport === 'sales') {
        const response = await api.get('/reports/sales', {
          params: { startDate, endDate, groupBy: 'day' },
        });
        setSalesData(response.data.data);
      } else if (activeReport === 'products') {
        const response = await api.get('/reports/products', {
          params: { startDate, endDate, limit: 10 },
        });
        setProductsData(response.data.data);
      } else if (activeReport === 'customers') {
        const response = await api.get('/reports/customers', {
          params: { startDate, endDate },
        });
        setCustomersData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      const response = await api.get('/reports/export', {
        params: { type: activeReport, startDate, endDate },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeReport}-report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export başarısız oldu');
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Raporlar</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Detaylı satış ve performans analizi</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          CSV İndir
        </button>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveReport('sales')}
          className={`px-4 py-2 rounded-xl font-medium transition ${
            activeReport === 'sales'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Satış Raporu
        </button>
        <button
          onClick={() => setActiveReport('products')}
          className={`px-4 py-2 rounded-xl font-medium transition ${
            activeReport === 'products'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Ürün Performansı
        </button>
        <button
          onClick={() => setActiveReport('customers')}
          className={`px-4 py-2 rounded-xl font-medium transition ${
            activeReport === 'customers'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Müşteri Analizi
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tarih Aralığı:</span>
          <button
            onClick={() => setDateRange('7days')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              dateRange === '7days'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            Son 7 Gün
          </button>
          <button
            onClick={() => setDateRange('30days')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              dateRange === '30days'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            Son 30 Gün
          </button>
          <button
            onClick={() => setDateRange('90days')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              dateRange === '90days'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            Son 90 Gün
          </button>
          <button
            onClick={() => setDateRange('custom')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              dateRange === 'custom'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            Özel
          </button>
          {dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={fetchReportData}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
              >
                Uygula
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Sales Report */}
          {activeReport === 'sales' && salesData && (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Gelir</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    ${salesData.summary.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Sipariş</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {salesData.summary.totalOrders}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ortalama Sipariş Değeri</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    ${salesData.summary.averageOrderValue.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Sales Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Satış Trendi</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData.salesByDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Gelir" />
                    <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} name="Sipariş" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Status Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sipariş Durumları</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(salesData.statusBreakdown).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(salesData.statusBreakdown).map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Product Performance */}
          {activeReport === 'products' && productsData && (
            <div className="space-y-8">
              {/* Top Products */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">En Çok Satan Ürünler</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={productsData.topProducts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="productName" stroke="#9ca3af" style={{ fontSize: '12px' }} angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="totalRevenue" fill="#3b82f6" name="Gelir" />
                    <Bar dataKey="totalSold" fill="#10b981" name="Satılan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kategori Performansı</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Kategori</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Gelir</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Satılan</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Ürün Sayısı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsData.categoryBreakdown.map((cat: any, index: number) => (
                        <tr key={index} className="border-b dark:border-gray-700">
                          <td className="py-3 px-4 text-gray-900 dark:text-white">{cat.category}</td>
                          <td className="py-3 px-4 text-right text-gray-900 dark:text-white">${cat.totalRevenue.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-gray-900 dark:text-white">{cat.totalSold}</td>
                          <td className="py-3 px-4 text-right text-gray-900 dark:text-white">{cat.productCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Customer Analytics */}
          {activeReport === 'customers' && customersData && (
            <div className="space-y-8">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Müşteri</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {customersData.summary.totalCustomers}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aktif Müşteri</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {customersData.summary.activeCustomers}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ortalama Müşteri Değeri</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    ${customersData.summary.averageCustomerValue.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Top Customers */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">En Değerli Müşteriler</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Müşteri</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Harcama</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Sipariş Sayısı</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Ort. Sipariş</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customersData.topCustomers.map((customer: any, index: number) => (
                        <tr key={index} className="border-b dark:border-gray-700">
                          <td className="py-3 px-4 text-gray-900 dark:text-white">{customer.customerName}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{customer.email}</td>
                          <td className="py-3 px-4 text-right text-gray-900 dark:text-white">${customer.totalSpent.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-gray-900 dark:text-white">{customer.orderCount}</td>
                          <td className="py-3 px-4 text-right text-gray-900 dark:text-white">${customer.averageOrderValue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer Segments */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Müşteri Segmentleri</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">VIP</p>
                    <p className="text-2xl font-semibold text-purple-900 dark:text-purple-300">{customersData.segments.vip}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">&gt;$1000</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Düzenli</p>
                    <p className="text-2xl font-semibold text-blue-900 dark:text-blue-300">{customersData.segments.regular}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">$100-$1000</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-1">Yeni</p>
                    <p className="text-2xl font-semibold text-green-900 dark:text-green-300">{customersData.segments.new}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">&lt;$100</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
