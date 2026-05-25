import { Link } from 'react-router-dom';
import {
  ORDER_PAYMENT_PROVIDER_LABELS,
  ORDER_PAYMENT_STATUS_LABELS,
  PAYMENT_PROVIDER_SUMMARY_KEYS,
  PAYMENT_STATUS_SUMMARY_KEYS,
  emptyPaymentSummary,
  type PaymentSummary,
} from '../../utils/orderPaymentLabels';
import {
  ordersFilterLinkForProvider,
  ordersFilterLinkForStatus,
} from '../../utils/orderListQueryParams';

interface PaymentSummarySectionProps {
  summary: PaymentSummary | null | undefined;
  loading: boolean;
  days: number;
}

function SummaryList({
  items,
  labels,
  tone,
  loading,
  linkForKey,
}: {
  items: Array<{ key: string; count: number }>;
  labels: Record<string, string>;
  tone: 'provider' | 'status';
  loading: boolean;
  linkForKey?: (key: string) => string | null;
}) {
  const providerTones: Record<string, string> = {
    PAYTR:            'bg-indigo-50 text-indigo-800 border-indigo-100',
    BANK_TRANSFER:    'bg-sky-50 text-sky-800 border-sky-100',
    CASH_ON_DELIVERY: 'bg-amber-50 text-amber-900 border-amber-100',
    IYZICO:           'bg-violet-50 text-violet-800 border-violet-100',
    BANK_POS:         'bg-slate-100 text-slate-700 border-slate-200',
    UNKNOWN:          'bg-gray-50 text-gray-600 border-gray-200',
  };
  const statusTones: Record<string, string> = {
    PENDING:               'bg-amber-50 text-amber-800 border-amber-100',
    WAITING_BANK_TRANSFER: 'bg-orange-50 text-orange-800 border-orange-100',
    PAID:                  'bg-emerald-50 text-emerald-800 border-emerald-100',
    APPROVED:              'bg-green-50 text-green-800 border-green-100',
    FAILED:                'bg-red-50 text-red-800 border-red-100',
    CANCELLED:             'bg-gray-100 text-gray-600 border-gray-200',
    UNKNOWN:               'bg-gray-50 text-gray-500 border-gray-200',
  };
  const tones = tone === 'provider' ? providerTones : statusTones;

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.map(({ key, count }) => {
        const href = linkForKey?.(key) ?? null;
        const row = (
          <>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                tones[key] ?? 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              {labels[key] ?? key}
            </span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {count.toLocaleString('tr-TR')}
            </span>
          </>
        );

        if (href) {
          return (
            <Link
              key={key}
              to={href}
              className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0
                         rounded-lg -mx-1 px-1 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Sipariş listesinde filtrele"
            >
              {row}
            </Link>
          );
        }

        return (
          <div
            key={key}
            className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0"
          >
            {row}
          </div>
        );
      })}
    </div>
  );
}

export default function PaymentSummarySection({
  summary,
  loading,
  days,
}: PaymentSummarySectionProps) {
  const data = summary ?? emptyPaymentSummary();

  const providerItems = PAYMENT_PROVIDER_SUMMARY_KEYS.map((key) => ({
    key,
    count: data.byProvider[key] ?? 0,
  }));

  const statusItems = PAYMENT_STATUS_SUMMARY_KEYS.map((key) => ({
    key,
    count: data.byStatus[key] ?? 0,
  }));

  const totalOrders = providerItems.reduce((s, i) => s + i.count, 0);
  const hasData = totalOrders > 0;

  return (
    <div className="wn-card p-6">
      <div className="mb-5">
        <h2 className="text-sm font-bold text-slate-900">Ödeme Özeti</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Son {days} gün — vitrin siparişleri (ödeme yöntemi / durum)
        </p>
      </div>

      {!loading && !hasData ? (
        <p className="text-sm text-slate-500 py-4 text-center">Henüz ödeme verisi yok</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Ödeme Yöntemleri
            </h3>
            <SummaryList
              items={providerItems}
              labels={ORDER_PAYMENT_PROVIDER_LABELS}
              tone="provider"
              loading={loading}
              linkForKey={ordersFilterLinkForProvider}
            />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Ödeme Durumları
            </h3>
            <SummaryList
              items={statusItems}
              labels={ORDER_PAYMENT_STATUS_LABELS}
              tone="status"
              loading={loading}
              linkForKey={ordersFilterLinkForStatus}
            />
          </div>
        </div>
      )}
    </div>
  );
}
