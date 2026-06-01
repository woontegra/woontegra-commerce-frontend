import { Link } from 'react-router-dom';
import type { Order } from '../../services/order.service';

const STATUS_LABELS: Record<string, string> = {
  PENDING:    'Bekliyor',
  PROCESSING: 'Hazırlanıyor',
  PAID:       'Ödendi',
  SHIPPED:    'Kargoda',
  DELIVERED:  'Teslim',
  CANCELLED:  'İptal',
};

function fmtCurrency(amount: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style:                 'currency',
    currency:              currency || 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day:    '2-digit',
    month:  'short',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function SourceBadge({ source }: { source?: string }) {
  if (source === 'TRENDYOL') {
    return (
      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
        Trendyol
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
      Woontegra
    </span>
  );
}

interface RecentOrdersSectionProps {
  orders:  Order[];
  loading: boolean;
}

export default function RecentOrdersSection({ orders, loading }: RecentOrdersSectionProps) {
  return (
    <div className="wn-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Son Siparişler</h2>
          <p className="text-xs text-slate-400 mt-0.5">Son 10 sipariş — tüm kanallar</p>
        </div>
        <Link to="/dashboard/orders" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
          Tümünü gör →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Henüz sipariş yok</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">İlk satışınız geldiğinde burada görünecek.</p>
          <Link
            to="/dashboard/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
          >
            Ürün Ekle
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-2 pb-3">Sipariş</th>
                <th className="px-2 pb-3">Kaynak</th>
                <th className="px-2 pb-3">Müşteri</th>
                <th className="px-2 pb-3">Durum</th>
                <th className="px-2 pb-3 text-right">Tutar</th>
                <th className="px-2 pb-3 text-right">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(order => {
                const num = order.displayOrderNumber ?? order.orderNumber;
                const date = order.orderDate ?? order.createdAt;
                const name = order.customerName
                  ?? (order.customer
                    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                    : '—');
                return (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-2 py-3">
                      <Link
                        to={`/dashboard/orders/${order.id}`}
                        className="font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        #{num}
                      </Link>
                    </td>
                    <td className="px-2 py-3">
                      <SourceBadge source={order.source} />
                    </td>
                    <td className="px-2 py-3 text-slate-700 truncate max-w-[140px]">{name}</td>
                    <td className="px-2 py-3">
                      <span className="text-xs font-medium text-slate-600">
                        {STATUS_LABELS[order.status] ?? order.externalStatusLabel ?? order.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right font-semibold text-slate-900 tabular-nums">
                      {fmtCurrency(order.totalAmount, order.currency)}
                    </td>
                    <td className="px-2 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                      {fmtDate(date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
