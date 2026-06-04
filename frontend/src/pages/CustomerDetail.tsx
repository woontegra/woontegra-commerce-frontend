import { useEffect, useMemo, useState } from 'react';
import CreateManualOrderModal, {
  BLOCKED_CUSTOMER_MANUAL_ORDER_MSG,
} from '../components/orders/CreateManualOrderModal';
import { Link, useParams } from 'react-router-dom';
import { useCustomer, useUpdateCustomer } from '../hooks/useCustomers';
import { useCustomerOrders } from '../hooks/useOrders';
import type { Order, OrderStatus } from '../services/order.service';
import type { Customer } from '../services/customer.service';
import Card from '../components/ui/Card';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import {
  ORDER_PAYMENT_PROVIDER_LABELS,
  ORDER_PAYMENT_STATUS_LABELS,
} from '../utils/orderPaymentLabels';

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:    'Bekliyor',
  PROCESSING: 'Hazırlanıyor',
  PAID:       'Ödendi',
  SHIPPED:    'Kargoda',
  DELIVERED:  'Teslim Edildi',
  CANCELLED:  'İptal',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-amber-50 text-amber-700 border border-amber-100',
  PROCESSING: 'bg-blue-50 text-blue-700 border border-blue-100',
  PAID:       'bg-emerald-50 text-emerald-700 border border-emerald-100',
  SHIPPED:    'bg-violet-50 text-violet-700 border border-violet-100',
  DELIVERED:  'bg-emerald-50 text-emerald-700 border border-emerald-100',
  CANCELLED:  'bg-red-50 text-red-700 border border-red-100',
};

function fmtCurrency(n: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso));
}

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/** Panel müşteri kaydındaki adres alanları → modal teslimat textarea */
function buildInitialShippingAddress(customer: Customer): string | undefined {
  const lines: string[] = [];
  const street = customer.address?.trim();
  if (street) lines.push(street);
  const city = customer.city?.trim();
  const zip = customer.zipCode?.trim();
  if (city || zip) {
    lines.push([city, zip].filter(Boolean).join(' '));
  }
  const country = customer.country?.trim();
  if (country) lines.push(country);
  return lines.length > 0 ? lines.join('\n') : undefined;
}

function paymentStatusLabel(order: Order): string {
  if (order.payment?.statusLabel && order.payment.statusLabel !== '—') {
    return order.payment.statusLabel;
  }
  if (order.admin?.payment.statusLabel && order.admin.payment.statusLabel !== '—') {
    return order.admin.payment.statusLabel;
  }
  if (order.paymentStatus) {
    return ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus;
  }
  return 'Belirsiz';
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </Card>
  );
}

function formatConsentLabel(granted: boolean | undefined, at: string | null | undefined): string {
  if (!at && !granted) return 'Kayıt yok';
  if (granted) return 'Evet';
  return 'Hayır';
}

function formatConsentDate(at: string | null | undefined): string {
  if (!at) return '—';
  return fmtDateTime(at);
}

function CustomerNotesPanel({ customer }: { customer: Customer }) {
  const updateCustomer = useUpdateCustomer();
  const [internalNote, setInternalNote] = useState('');
  const [isRisky, setIsRisky] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');

  useEffect(() => {
    setInternalNote(customer.internalNote ?? '');
    setIsRisky(customer.isRisky ?? false);
    setIsBlocked(customer.isBlocked ?? false);
    setBlockedReason(customer.blockedReason ?? '');
  }, [customer]);

  const handleSave = () => {
    updateCustomer.mutate({
      id: customer.id,
      data: {
        internalNote:  internalNote.trim() || null,
        isRisky,
        isBlocked,
        blockedReason: isBlocked ? (blockedReason.trim() || null) : null,
      },
    });
  };

  const busy = updateCustomer.isPending;

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Müşteri notları</h2>
        <p className="text-xs text-gray-500 mt-1">
          Yalnızca satıcı panelinde görünür. Müşteri bu notu göremez.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">İç not</label>
        <textarea
          value={internalNote}
          onChange={e => setInternalNote(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Örn. sık iade talebi, özel indirim notu, iletişim geçmişi…"
          disabled={busy}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900
                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30
                     disabled:opacity-60 resize-y min-h-[96px]"
        />
      </div>

      <div className="space-y-3 pt-1 border-t border-gray-100">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isRisky}
            onChange={e => setIsRisky(e.target.checked)}
            disabled={busy}
            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <span>
            <span className="font-medium text-gray-900">Riskli müşteri</span>
            <span className="block text-xs text-gray-500">Liste ve detayda uyarı badge&apos;i gösterilir.</span>
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isBlocked}
            onChange={e => setIsBlocked(e.target.checked)}
            disabled={busy}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <span>
            <span className="font-medium text-gray-900">Engellenen müşteri</span>
            <span className="block text-xs text-gray-500">
              Checkout/giriş engeli sonraki adımda eklenecek; işaret şimdiden kaydedilir.
            </span>
          </span>
        </label>

        {isBlocked && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Engelleme sebebi</label>
            <input
              type="text"
              value={blockedReason}
              onChange={e => setBlockedReason(e.target.value)}
              maxLength={500}
              placeholder="Örn. sahte sipariş, ödeme sorunu"
              disabled={busy}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={busy}
        className="btn btn-primary text-sm disabled:opacity-60"
      >
        {busy ? 'Kaydediliyor…' : 'Not ve durumu kaydet'}
      </button>
    </Card>
  );
}

export default function CustomerDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: customer, isLoading, isError, error } = useCustomer(id);
  const { data: orders = [], isLoading: ordersLoading } = useCustomerOrders(id);
  const [manualOrderOpen, setManualOrderOpen] = useState(false);

  const lastOrderDate = useMemo(() => {
    if (!orders.length) return null;
    return orders.reduce((latest, o) => {
      const t = new Date(o.createdAt).getTime();
      return t > latest ? t : latest;
    }, 0);
  }, [orders]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/customers" className="text-sm text-indigo-600 hover:underline">
          ← Müşterilere dön
        </Link>
        <Card className="p-8 text-center">
          <p className="text-gray-600">
            {(error as { response?: { data?: { error?: string } } })?.response?.data?.error
              ?? 'Müşteri bulunamadı veya erişim yetkiniz yok.'}
          </p>
        </Card>
      </div>
    );
  }

  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const initialShippingAddress = buildInitialShippingAddress(customer);
  const addressParts = [
    customer.address,
    customer.city,
    customer.zipCode,
    customer.country,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/dashboard/customers"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Müşterilere dön
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">{fullName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customer.email}</p>
          {(customer.isRisky || customer.isBlocked) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {customer.isRisky && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-100">
                  Riskli
                </span>
              )}
              {customer.isBlocked && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                  Engelli
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0">
          <button
            type="button"
            disabled={customer.isBlocked === true}
            onClick={() => setManualOrderOpen(true)}
            title={
              customer.isBlocked
                ? BLOCKED_CUSTOMER_MANUAL_ORDER_MSG
                : 'Bu müşteri için manuel sipariş oluştur'
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700
                       text-white text-sm font-semibold rounded-lg transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Bu müşteri için sipariş oluştur
          </button>
          {customer.isBlocked && (
            <p className="text-[11px] text-amber-800 leading-snug max-w-[240px] sm:text-right">
              {BLOCKED_CUSTOMER_MANUAL_ORDER_MSG}
            </p>
          )}
        </div>
      </div>

      <CustomerNotesPanel customer={customer} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sipariş sayısı" value={String(customer.orderCount)} />
        <StatCard
          label="Toplam harcama"
          value={customer.totalSpent > 0 ? fmtCurrency(customer.totalSpent) : '—'}
        />
        <StatCard
          label="Son sipariş"
          value={lastOrderDate ? fmtDate(new Date(lastOrderDate).toISOString()) : '—'}
        />
        <StatCard label="Kayıt tarihi" value={fmtDate(customer.createdAt)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">İletişim ve adres</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Ad soyad</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{fullName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">E-posta</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{customer.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Telefon</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{customer.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Adres</dt>
              <dd className="font-medium text-gray-900 mt-0.5 whitespace-pre-line">
                {addressParts.length ? addressParts.join('\n') : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Müşteri oluşturulma</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{fmtDateTime(customer.createdAt)}</dd>
            </div>
          </dl>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">İzin kayıtları</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">KVKK izni</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {formatConsentLabel(customer.kvkkConsent, customer.kvkkConsentAt)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">KVKK izin tarihi</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {formatConsentDate(customer.kvkkConsentAt)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Pazarlama izni</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {formatConsentLabel(customer.marketingConsent, customer.marketingConsentAt)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Pazarlama izin tarihi</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {formatConsentDate(customer.marketingConsentAt)}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden p-0">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Sipariş geçmişi</h2>
          </div>

          {ordersLoading ? (
            <div className="p-5">
              <TableSkeleton />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              }
              title="Henüz sipariş yok"
              description="Bu müşteriye ait vitrin siparişi bulunmuyor."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sipariş</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tarih</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Durum</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Ödeme</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tutar</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {fmtDateTime(order.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-600">{paymentStatusLabel(order)}</span>
                        {order.paymentProvider && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {ORDER_PAYMENT_PROVIDER_LABELS[order.paymentProvider] ?? order.paymentProvider}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">
                        {fmtCurrency(Number(order.totalAmount), order.currency)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/dashboard/orders/${order.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Detay →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <CreateManualOrderModal
        isOpen={manualOrderOpen}
        onClose={() => setManualOrderOpen(false)}
        initialCustomerId={customer.id}
        initialCustomerName={fullName}
        initialCustomerEmail={customer.email}
        initialCustomerPhone={customer.phone ?? ''}
        initialCustomerIsBlocked={customer.isBlocked === true}
        initialShippingAddress={initialShippingAddress}
      />
    </div>
  );
}
