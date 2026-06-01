import { Link } from 'react-router-dom';

export type OrderStatusCounts = {
  PENDING:    number;
  PROCESSING: number;
  PAID:       number;
  SHIPPED:    number;
  DELIVERED:  number;
  CANCELLED:  number;
};

const STATUS_ROWS: Array<{
  key:   keyof OrderStatusCounts;
  label: string;
  tone:  string;
}> = [
  { key: 'PENDING',    label: 'Bekliyor',        tone: 'bg-amber-50 text-amber-800 border-amber-100' },
  { key: 'PROCESSING', label: 'Hazırlanıyor',    tone: 'bg-blue-50 text-blue-800 border-blue-100' },
  { key: 'SHIPPED',    label: 'Kargoda',         tone: 'bg-violet-50 text-violet-800 border-violet-100' },
  { key: 'DELIVERED',  label: 'Teslim edildi',   tone: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
  { key: 'CANCELLED',  label: 'İptal / iade',    tone: 'bg-red-50 text-red-800 border-red-100' },
];

interface OrderStatusSectionProps {
  counts:  OrderStatusCounts | null;
  readyToShip?: number;
  loading: boolean;
}

export default function OrderStatusSection({
  counts,
  readyToShip,
  loading,
}: OrderStatusSectionProps) {
  const total = counts
    ? Object.values(counts).reduce((s, n) => s + n, 0)
    : 0;

  return (
    <div className="wn-card p-6 h-full">
      <div className="mb-5">
        <h2 className="text-sm font-bold text-slate-900">Sipariş Durumları</h2>
        <p className="text-xs text-slate-400 mt-0.5">Tüm kanallar — vitrin + pazaryeri</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">Henüz sipariş yok</p>
      ) : (
        <div className="space-y-0">
          {STATUS_ROWS.map(({ key, label, tone }) => {
            const count = counts?.[key] ?? 0;
            const href = `/dashboard/orders?status=${key}`;
            return (
              <Link
                key={key}
                to={href}
                className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0
                           rounded-lg -mx-1 px-1 hover:bg-slate-50 transition-colors"
              >
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${tone}`}>
                  {label}
                </span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {count.toLocaleString('tr-TR')}
                </span>
              </Link>
            );
          })}

          {(readyToShip ?? 0) > 0 && (
            <Link
              to="/dashboard/orders?status=PAID"
              className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2.5 hover:bg-indigo-100/70 transition-colors"
            >
              <span className="text-xs font-semibold text-indigo-800">Kargoya hazır (ödendi)</span>
              <span className="text-sm font-bold text-indigo-900 tabular-nums">
                {readyToShip!.toLocaleString('tr-TR')}
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
