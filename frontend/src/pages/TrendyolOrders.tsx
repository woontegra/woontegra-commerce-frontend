import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';

interface TrendyolOrderItem {
  id:          string;
  barcode:     string;
  productName: string;
  quantity:    number;
  price:       number;
  productId:   string | null;
  variantId:   string | null;
}

interface TrendyolOrder {
  id:                  string;
  orderNumber:         string;
  status:              string;
  totalPrice:          number;
  orderDate:           string;
  customerFirstName:   string | null;
  customerLastName:    string | null;
  cargoTrackingNumber: string | null;
  stockDecremented:    boolean;
  items:               TrendyolOrderItem[];
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  Created:           { label: 'Yeni',         cls: 'bg-blue-50 text-blue-700 border-blue-200'    },
  Picking:           { label: 'Hazırlanıyor', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  Invoiced:          { label: 'Faturalandı',  cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  Shipped:           { label: 'Kargoda',      cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  Delivered:         { label: 'Teslim',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Cancelled:         { label: 'İptal',        cls: 'bg-red-50 text-red-700 border-red-200'       },
  UnDelivered:       { label: 'Teslim Yok',   cls: 'bg-red-50 text-red-600 border-red-200'       },
  Returned:          { label: 'İade',         cls: 'bg-orange-50 text-orange-700 border-orange-200' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? { label: status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TrendyolOrders() {
  const [orders,   setOrders]   = useState<TrendyolOrder[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [status,   setStatus]   = useState('');

  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set('status', status);
      const res = await apiClient.get(`/trendyol/orders?${params}`);
      const d = res.data?.data ?? res.data;
      setOrders(d.orders ?? []);
      setTotal(d.total ?? 0);
    } catch (err: any) {
      toast.error('Siparişler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.post('/trendyol/orders/sync');
      const d = res.data;
      toast.success(d.message ?? 'Sync tamamlandı');
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Sync başarısız');
    } finally {
      setSyncing(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="w-full space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Trendyol Siparişleri</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Her 5 dakikada otomatik çekilir · {total} sipariş
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          {syncing ? 'Çekiliyor...' : 'Şimdi Çek'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'Created', 'Picking', 'Invoiced', 'Shipped', 'Delivered', 'Cancelled'].map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              status === s
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
            }`}
          >
            {s === '' ? 'Tümü' : (STATUS_LABEL[s]?.label ?? s)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="wn-card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-28 bg-slate-100 rounded animate-pulse"/>
                <div className="h-4 w-20 bg-slate-100 rounded animate-pulse"/>
                <div className="ml-auto h-4 w-16 bg-slate-100 rounded animate-pulse"/>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl">📬</div>
            <p className="text-sm font-semibold text-slate-700">Henüz sipariş yok</p>
            <p className="text-xs text-slate-400 max-w-xs">
              "Şimdi Çek" butonuna tıklayarak Trendyol'dan siparişleri çekin.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Table head */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>Sipariş / Müşteri</span>
              <span>Tarih</span>
              <span>Tutar</span>
              <span>Durum</span>
              <span>Stok</span>
            </div>

            {orders.map(order => (
              <div key={order.id}>
                <button
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  className="w-full text-left grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">#{order.orderNumber}</p>
                    {(order.customerFirstName || order.customerLastName) && (
                      <p className="text-xs text-slate-400 truncate">
                        {[order.customerFirstName, order.customerLastName].filter(Boolean).join(' ')}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:block whitespace-nowrap">
                    {fmtDate(order.orderDate)}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 hidden sm:block">
                    {fmt(Number(order.totalPrice))}
                  </span>
                  <span className="hidden sm:block">
                    <StatusBadge status={order.status} />
                  </span>
                  <div className="hidden sm:flex items-center gap-1">
                    {order.stockDecremented ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" title="Stok düşüldü"/>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-400" title="Stok bekliyor"/>
                    )}
                  </div>
                  {/* Mobile row */}
                  <div className="sm:hidden flex flex-col items-end gap-1">
                    <StatusBadge status={order.status} />
                    <span className="text-sm font-semibold text-slate-800">{fmt(Number(order.totalPrice))}</span>
                  </div>
                </button>

                {/* Expanded items */}
                {expanded === order.id && (
                  <div className="px-6 pb-4 bg-slate-50 border-t border-slate-100">
                    <div className="mt-3 space-y-2">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-4 py-2 px-3 bg-white rounded-xl border border-slate-200 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">{item.productName || '—'}</p>
                            <p className="text-xs text-slate-400 font-mono">
                              Barkod: {item.barcode}
                              {item.productId && <span className="ml-2 text-emerald-600">✓ eşleşti</span>}
                              {!item.productId && <span className="ml-2 text-red-400">✗ eşleşmedi</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0 text-xs text-slate-500">
                            <span>{item.quantity} adet</span>
                            <span className="font-semibold text-slate-800">{fmt(Number(item.price))}</span>
                          </div>
                        </div>
                      ))}
                      {order.cargoTrackingNumber && (
                        <p className="text-xs text-slate-500 pt-1">
                          Kargo takip: <span className="font-mono font-semibold">{order.cargoTrackingNumber}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{total} siparişten {page * limit + 1}–{Math.min((page + 1) * limit, total)} gösteriliyor</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:border-slate-300 transition-colors"
            >
              ← Önceki
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:border-slate-300 transition-colors"
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
