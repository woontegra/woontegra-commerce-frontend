import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useOrder, useUpdateOrderStatus, useUpdateOrderShipping, useCancelOrder } from '../hooks/useOrders';
import type { UpdateOrderShippingDto } from '../services/order.service';
import type { OrderStatus } from '../services/order.service';
import {
  fetchReturnRequestsByOrder,
  type ReturnRequest,
  type ReturnRequestStatus,
  type ReturnRequestType,
} from '../services/returnRequest.service';

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:    'Bekliyor',
  PROCESSING: 'İşlemde',
  PAID:       'Ödendi',
  SHIPPED:    'Kargoda',
  DELIVERED:  'Teslim Edildi',
  CANCELLED:  'İptal',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:    'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  PAID:       'bg-green-100 text-green-800',
  SHIPPED:    'bg-purple-100 text-purple-800',
  DELIVERED:  'bg-emerald-100 text-emerald-800',
  CANCELLED:  'bg-red-100 text-red-800',
};

const RETURN_TYPE_LABELS: Record<ReturnRequestType, string> = {
  CANCEL_REQUEST: 'İptal talebi',
  RETURN_REQUEST: 'İade talebi',
};

const RETURN_STATUS_LABELS: Record<ReturnRequestStatus, string> = {
  PENDING:   'Beklemede',
  APPROVED:  'Onaylandı',
  REJECTED:  'Reddedildi',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
};

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'PROCESSING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

function fmtCurrency(amount: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style:                 'currency',
    currency:              currency || 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day:    '2-digit',
    month:  'long',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function AddressBlock({
  addr,
}: {
  addr: {
    fullName: string;
    phone: string;
    addressLine: string;
    district: string;
    city: string;
    postalCode: string;
  };
}) {
  return (
    <div className="text-sm text-slate-600 space-y-1">
      <p className="font-medium text-slate-900">{addr.fullName}</p>
      {addr.phone && <p>{addr.phone}</p>}
      <p>{addr.addressLine}</p>
      <p>
        {[addr.district, addr.city].filter(Boolean).join(' / ')}
        {addr.postalCode ? ` · ${addr.postalCode}` : ''}
      </p>
    </div>
  );
}

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading, error } = useOrder(orderId ?? '');
  const updateStatus = useUpdateOrderStatus();
  const updateShipping = useUpdateOrderShipping();
  const cancelOrder  = useCancelOrder();
  const [statusDraft, setStatusDraft] = useState<OrderStatus | ''>('');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [shippingTrackingNumber, setShippingTrackingNumber] = useState('');
  const [shippingTrackingUrl, setShippingTrackingUrl] = useState('');
  const [shippingUrlWarning, setShippingUrlWarning] = useState('');
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);

  useEffect(() => {
    if (!order) return;
    setShippingCarrier(order.shippingCarrier ?? '');
    setShippingTrackingNumber(order.shippingTrackingNumber ?? '');
    setShippingTrackingUrl(order.shippingTrackingUrl ?? '');
    setStatusDraft(order.status);
  }, [order?.id, order?.shippingCarrier, order?.shippingTrackingNumber, order?.shippingTrackingUrl, order?.status]);

  useEffect(() => {
    if (!orderId) return;
    fetchReturnRequestsByOrder(orderId)
      .then(setReturnRequests)
      .catch(() => setReturnRequests([]));
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center py-16">
        <p className="text-slate-600">Sipariş yüklenemedi veya bulunamadı.</p>
        <Link to="/dashboard/orders" className="mt-4 inline-block text-indigo-600 font-medium">
          Sipariş listesine dön
        </Link>
      </div>
    );
  }

  const admin = order.admin;
  const totals = admin?.totals ?? {
    itemsSubtotal:      order.items.reduce((s, i) => s + i.price * i.quantity, 0),
    shippingPrice:      order.shippingPrice ?? 0,
    cashOnDeliveryFee:  0,
    couponDiscount:     order.discountAmount ?? 0,
    campaignDiscount:   order.campaignDiscount ?? 0,
    grandTotal:         order.totalAmount,
  };

  const handleStatusSave = () => {
    if (!statusDraft || statusDraft === order.status) return;
    if (statusDraft === 'CANCELLED') {
      if (!window.confirm('Siparişi iptal etmek istediğinize emin misiniz? Stok iadesi yapılır.')) return;
      cancelOrder.mutate(order.id);
      return;
    }
    updateStatus.mutate({ id: order.id, status: statusDraft });
  };

  const validateTrackingUrl = (url: string): boolean => {
    const t = url.trim();
    if (!t) {
      setShippingUrlWarning('');
      return true;
    }
    if (!/^https?:\/\//i.test(t)) {
      setShippingUrlWarning('Takip linki http:// veya https:// ile başlamalıdır.');
      return false;
    }
    setShippingUrlWarning('');
    return true;
  };

  const buildShippingPayload = (markAsShipped: boolean): UpdateOrderShippingDto | null => {
    if (!validateTrackingUrl(shippingTrackingUrl)) return null;
    return {
      shippingCarrier:        shippingCarrier.trim() || undefined,
      shippingTrackingNumber: shippingTrackingNumber.trim() || undefined,
      shippingTrackingUrl:    shippingTrackingUrl.trim() || undefined,
      markAsShipped,
    };
  };

  const handleSaveShipping = (markAsShipped: boolean) => {
    const payload = buildShippingPayload(markAsShipped);
    if (!payload) return;
    if (markAsShipped && !shippingCarrier.trim() && !shippingTrackingNumber.trim()) {
      if (!window.confirm(
        'Kargo firması veya takip numarası girilmedi. Yine de kargoya verildi olarak işaretlemek istiyor musunuz?',
      )) {
        return;
      }
    }
    updateShipping.mutate(
      { id: order.id, data: payload },
      {
        onSuccess: () => {
          toast.success(
            markAsShipped
              ? 'Kargo bilgileri kaydedildi ve sipariş kargoya verildi olarak işaretlendi.'
              : 'Kargo bilgileri kaydedildi.',
          );
        },
      },
    );
  };

  const busy = updateStatus.isPending || cancelOrder.isPending || updateShipping.isPending;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/dashboard/orders" className="text-sm text-indigo-600 hover:underline">
            ← Siparişler
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Sipariş Detayı</h1>
          <p className="text-slate-500 text-sm mt-1">{order.orderNumber}</p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
            STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-700'
          }`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Sipariş özeti">
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Sipariş numarası</dt>
                <dd className="font-medium text-slate-900">{order.orderNumber}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Tarih</dt>
                <dd className="font-medium text-slate-900">{fmtDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Ödeme yöntemi</dt>
                <dd className="font-medium text-slate-900">
                  {admin?.payment.methodLabel ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Ödeme durumu</dt>
                <dd className="font-medium text-slate-900">
                  {admin?.payment.statusLabel ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Genel toplam</dt>
                <dd className="font-semibold text-indigo-600 text-lg">
                  {fmtCurrency(totals.grandTotal, order.currency)}
                </dd>
              </div>
              {admin?.isStorefrontOrder && (
                <div>
                  <dt className="text-slate-500">Kaynak</dt>
                  <dd className="font-medium text-slate-900">Mağaza vitrini</dd>
                </div>
              )}
            </dl>
          </Section>

          <Section title="Ürünler">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Ürün</th>
                    <th className="pb-2 font-medium text-right">Adet</th>
                    <th className="pb-2 font-medium text-right">Birim</th>
                    <th className="pb-2 font-medium text-right">Satır</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {order.items.map(item => (
                    <tr key={item.id}>
                      <td className="py-3">
                        <p className="font-medium text-slate-900">
                          {item.product?.name ?? 'Ürün'}
                        </p>
                        {item.variant && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Varyant: {item.variant.name}
                            {item.variant.sku ? ` · ${item.variant.sku}` : ''}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-right">{item.quantity}</td>
                      <td className="py-3 text-right">{fmtCurrency(item.price, order.currency)}</td>
                      <td className="py-3 text-right font-medium">
                        {fmtCurrency(item.lineTotal ?? item.price * item.quantity, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Tutar dökümü">
            <div className="space-y-2 text-sm max-w-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Ürün ara toplamı</span>
                <span>{fmtCurrency(totals.itemsSubtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Kargo ücreti</span>
                <span>{fmtCurrency(totals.shippingPrice, order.currency)}</span>
              </div>
              {totals.cashOnDeliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Kapıda ödeme ücreti</span>
                  <span>{fmtCurrency(totals.cashOnDeliveryFee, order.currency)}</span>
                </div>
              )}
              {totals.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Kupon indirimi</span>
                  <span>−{fmtCurrency(totals.couponDiscount, order.currency)}</span>
                </div>
              )}
              {totals.campaignDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Kampanya indirimi</span>
                  <span>−{fmtCurrency(totals.campaignDiscount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-slate-900 pt-2 border-t border-slate-100">
                <span>Genel toplam</span>
                <span>{fmtCurrency(totals.grandTotal, order.currency)}</span>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Genel toplam kargo ve ek ücretler dahildir.
              </p>
            </div>
          </Section>

          <div className="grid sm:grid-cols-2 gap-6">
            <Section title="Müşteri bilgileri">
              {order.customer ? (
                <dl className="text-sm space-y-2">
                  <div>
                    <dt className="text-slate-500">Ad soyad</dt>
                    <dd className="font-medium text-slate-900">
                      {order.customer.firstName} {order.customer.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">E-posta</dt>
                    <dd>{order.customer.email}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Telefon</dt>
                    <dd>{order.customer.phone || '—'}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate-500">Müşteri bilgisi yok.</p>
              )}
            </Section>

            <Section title="Teslimat adresi">
              {admin?.shippingAddress ? (
                <AddressBlock addr={admin.shippingAddress} />
              ) : (
                <p className="text-sm text-slate-500">Adres bilgisi bulunamadı.</p>
              )}
            </Section>
          </div>

          <Section title="Fatura adresi">
            {admin?.billingAddress?.sameAsShipping ? (
              <p className="text-sm text-slate-600">Teslimat adresi ile aynı.</p>
            ) : admin?.billingAddress ? (
              <div className="space-y-3">
                {admin.billingAddress.type === 'corporate' && (
                  <p className="text-xs font-medium text-indigo-700 bg-indigo-50 inline-block px-2 py-1 rounded">
                    Kurumsal fatura
                  </p>
                )}
                <AddressBlock addr={admin.billingAddress} />
                {admin.billingAddress.companyName && (
                  <p className="text-sm text-slate-600">
                    Firma: <span className="font-medium">{admin.billingAddress.companyName}</span>
                  </p>
                )}
                {(admin.billingAddress.taxNumber || admin.billingAddress.taxOffice) && (
                  <p className="text-sm text-slate-600">
                    {admin.billingAddress.taxOffice && `VD: ${admin.billingAddress.taxOffice}`}
                    {admin.billingAddress.taxNumber && ` · VKN: ${admin.billingAddress.taxNumber}`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Fatura adresi yok.</p>
            )}
          </Section>

          <Section title="Sipariş notları">
            {admin?.customerNote && (
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Müşteri notu</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{admin.customerNote}</p>
              </div>
            )}
            {admin?.systemNoteLines && admin.systemNoteLines.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Sistem / ödeme / kargo</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  {admin.systemNoteLines.map((line, i) => (
                    <li key={i} className="font-mono text-xs bg-slate-50 px-2 py-1 rounded">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {order.notes && (
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                  Ham not metni
                </summary>
                <pre className="mt-2 text-xs bg-slate-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {order.notes}
                </pre>
              </details>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Durum güncelle">
            <p className="text-xs text-slate-500 mb-3">
              İptal edildiğinde stok iadesi yapılır. Diğer geçişlerde stok tekrar düşülmez.
            </p>
            <select
              value={statusDraft || order.status}
              onChange={e => setStatusDraft(e.target.value as OrderStatus)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleStatusSave}
              disabled={busy || (statusDraft || order.status) === order.status}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? 'Kaydediliyor…' : 'Durumu kaydet'}
            </button>
          </Section>

          <Section title="Kargo bilgileri">
            <p className="text-xs text-slate-500 mb-3">
              Takip bilgilerini kaydedebilir veya kaydedip siparişi kargoya verildi olarak işaretleyebilirsiniz.
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-600 mb-1">Kargo firması</label>
                <input
                  type="text"
                  value={shippingCarrier}
                  onChange={e => setShippingCarrier(e.target.value)}
                  maxLength={200}
                  placeholder="Örn. Yurtiçi Kargo"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Takip numarası</label>
                <input
                  type="text"
                  value={shippingTrackingNumber}
                  onChange={e => setShippingTrackingNumber(e.target.value)}
                  maxLength={200}
                  placeholder="Kargo takip no"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Takip linki (isteğe bağlı)</label>
                <input
                  type="url"
                  value={shippingTrackingUrl}
                  onChange={e => {
                    setShippingTrackingUrl(e.target.value);
                    if (e.target.value.trim()) validateTrackingUrl(e.target.value);
                    else setShippingUrlWarning('');
                  }}
                  maxLength={2048}
                  placeholder="https://..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                />
                {shippingUrlWarning && (
                  <p className="text-xs text-amber-700 mt-1">{shippingUrlWarning}</p>
                )}
              </div>
              {order.shippedAt && (
                <p className="text-xs text-slate-500">
                  Kargoya verildi: {fmtDate(order.shippedAt)}
                </p>
              )}
              {order.shippingNotificationSentAt && (
                <p className="text-xs text-emerald-700">
                  Müşteriye kargo bildirimi gönderildi.
                </p>
              )}
              <button
                type="button"
                onClick={() => handleSaveShipping(false)}
                disabled={busy}
                className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                {updateShipping.isPending ? 'Kaydediliyor…' : 'Kargo bilgilerini kaydet'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveShipping(true)}
                disabled={busy || order.status === 'SHIPPED'}
                className="w-full py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {updateShipping.isPending ? 'İşleniyor…' : 'Kaydet ve kargoya verildi yap'}
              </button>
            </div>
          </Section>

          <Section title="İade / iptal talepleri">
            {returnRequests.length === 0 ? (
              <p className="text-sm text-slate-500">Bu sipariş için talep yok.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {returnRequests.map(r => (
                  <li key={r.id} className="flex justify-between gap-2 border border-slate-100 rounded-lg px-3 py-2">
                    <span>
                      <span className="font-medium">{r.requestNumber}</span>
                      <span className="text-slate-500 block text-xs">
                        {RETURN_TYPE_LABELS[r.type]} · {RETURN_STATUS_LABELS[r.status]}
                      </span>
                    </span>
                    <Link
                      to={`/dashboard/returns/${r.id}`}
                      className="text-indigo-600 text-xs font-medium shrink-0 hover:underline"
                    >
                      Detay
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/dashboard/returns"
              className="inline-block mt-3 text-sm text-indigo-600 font-medium hover:underline"
            >
              Tüm talepler →
            </Link>
          </Section>
        </div>
      </div>
    </div>
  );
}
