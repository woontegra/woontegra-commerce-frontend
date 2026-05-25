import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { fetchMyOrder, type MyOrderDetail } from '../services/storefrontAccountApi';
import { formatTry } from '../utils/format';
import { getOrderShippingCardView } from '../utils/shipping';
import { getStoreOrderPaymentView } from '../utils/payment';
import { STORE_ORDER_STATUS_LABELS } from '../constants/returnRequest';
import type { ReturnRequestType } from '../services/storefrontReturnsApi';
import { BankTransferPaymentDetails } from '../components/BankTransferPaymentDetails';
import { OrderReturnRequestSection } from '../components/OrderReturnRequestSection';
import { StoreReturnRequestModal } from '../components/StoreReturnRequestModal';
import { useResendBankTransferEmail } from '../hooks/useResendBankTransferEmail';
import {
  BANK_TRANSFER_APPROVED_DESCRIPTION,
  hasBankTransferPaymentDetails,
  isBankTransferPaymentSettled,
  shouldShowBankTransferPaymentSection,
} from '../utils/bankTransferPayment';

function OrderPaymentCard({ order }: { order: MyOrderDetail }) {
  const p = getStoreOrderPaymentView(order);
  const provider = order.payment.provider;
  const status = order.payment.status;
  const bankApproved =
    provider === 'BANK_TRANSFER' &&
    isBankTransferPaymentSettled({
      paymentProvider: provider,
      paymentStatus: status,
      status: order.status,
    });
  const showBankEmailNote =
    provider === 'BANK_TRANSFER' && status === 'WAITING_BANK_TRANSFER';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm">
      <h3 className="font-medium text-slate-900 mb-3">Ödeme bilgileri</h3>
      <dl className="space-y-2">
        <div>
          <dt className="text-slate-500 text-xs">Ödeme yöntemi</dt>
          <dd className="font-medium text-slate-900">{p.providerLabel}</dd>
        </div>
        <div>
          <dt className="text-slate-500 text-xs">Ödeme durumu</dt>
          <dd className="font-medium text-slate-900">{p.statusLabel}</dd>
        </div>
        {p.dateText && p.dateKind === 'approved' && (
          <div>
            <dt className="text-slate-500 text-xs">
              {bankApproved ? 'Onay tarihi' : 'Ödeme tarihi'}
            </dt>
            <dd className="text-slate-900">{p.dateText}</dd>
          </div>
        )}
        {p.dateText && p.dateKind === 'failed' && (
          <div>
            <dt className="text-slate-500 text-xs">Başarısız ödeme tarihi</dt>
            <dd className="text-slate-900">{p.dateText}</dd>
          </div>
        )}
      </dl>
      {bankApproved ? (
        <p className="text-emerald-800 font-medium mt-3">{BANK_TRANSFER_APPROVED_DESCRIPTION}</p>
      ) : p.helperText ? (
        <p className="text-slate-600 mt-3">{p.helperText}</p>
      ) : null}
      {showBankEmailNote && (
        <p className="text-slate-500 text-xs mt-2">
          Ödeme bilgileri size e-posta ile gönderildi.
        </p>
      )}
    </div>
  );
}

function OrderBankTransferCard({
  order,
  tenantSlug,
}: {
  order: MyOrderDetail;
  tenantSlug?: string;
}) {
  const showSection = shouldShowBankTransferPaymentSection(order);
  const showResend = showSection && hasBankTransferPaymentDetails(order.bankTransferPayment);
  const { resend, isResending, feedback } = useResendBankTransferEmail(
    tenantSlug,
    order.orderNumber,
  );

  if (!showSection) return null;
  return (
    <BankTransferPaymentDetails
      bankTransferPayment={order.bankTransferPayment}
      showUnavailable
      resendEmail={showResend ? { onResend: () => void resend(), isResending, feedback } : undefined}
    />
  );
}

function OrderShippingCard({ order }: { order: MyOrderDetail }) {
  const view = getOrderShippingCardView(order.status, order);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm">
      <h3 className="font-medium text-slate-900 mb-3">Kargo bilgileri</h3>

      {view.kind === 'pending' && (
        <p className="text-slate-600">
          Siparişiniz kargoya verildiğinde takip bilgileri burada görünecektir.
        </p>
      )}

      {view.kind === 'shipped_no_tracking' && (
        <p className="text-slate-600">
          Siparişiniz kargoya verildi. Takip bilgileri mağaza tarafından ayrıca paylaşılacaktır.
        </p>
      )}

      {view.kind === 'shipped_with_tracking' && (
        <dl className="space-y-2">
          {view.carrier && (
            <div>
              <dt className="text-slate-500 text-xs">Kargo firması</dt>
              <dd className="font-medium text-slate-900">{view.carrier}</dd>
            </div>
          )}
          {view.trackingNumber && (
            <div>
              <dt className="text-slate-500 text-xs">Takip numarası</dt>
              <dd className="font-mono font-medium text-slate-900">{view.trackingNumber}</dd>
            </div>
          )}
          {view.shippedAtLabel && (
            <div>
              <dt className="text-slate-500 text-xs">Kargoya verilme tarihi</dt>
              <dd className="text-slate-900">{view.shippedAtLabel}</dd>
            </div>
          )}
          {view.trackingUrl && (
            <div className="pt-2">
              <a
                href={view.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                Kargomu Takip Et
              </a>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

export default function StoreOrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { tenant, storeLink } = useStorefrontTenant();
  const [order, setOrder] = useState<MyOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ReturnRequestType | null>(null);

  const load = async () => {
    if (!tenant?.slug || !orderNumber) return;
    setLoading(true);
    setError(null);
    try {
      const o = await fetchMyOrder(tenant.slug, orderNumber);
      setOrder(o);
    } catch (e: unknown) {
      setOrder(null);
      setError((e as Error)?.message || 'Sipariş bulunamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug, orderNumber]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Yükleniyor…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-red-700">{error || 'Sipariş bulunamadı.'}</p>
        <Link
          to={storeLink('/store/hesabim/siparisler')}
          className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
        >
          ← Siparişlerime dön
        </Link>
      </div>
    );
  }

  const addr = order.shippingAddress;
  const status = order.status;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMsg}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={storeLink('/store/hesabim/siparisler')}
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Siparişlerim
          </Link>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Sipariş #{order.orderNumber}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {new Date(order.createdAt).toLocaleString('tr-TR')}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-slate-100 text-sm font-medium text-slate-800">
          {STORE_ORDER_STATUS_LABELS[status] ?? status}
        </span>
      </div>

      <OrderReturnRequestSection
        order={order}
        storeLink={storeLink}
        onOpenModal={setModalType}
      />

      <OrderPaymentCard order={order} />

      <OrderBankTransferCard order={order} tenantSlug={tenant?.slug} />

      {addr && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm">
          <h3 className="font-medium text-slate-900 mb-2">Teslimat adresi</h3>
          <p className="font-medium">{addr.fullName}</p>
          <p className="text-slate-600 mt-1">{addr.phone}</p>
          <p className="text-slate-600 mt-1">
            {addr.addressLine}, {addr.district} / {addr.city}
            {addr.postalCode ? ` ${addr.postalCode}` : ''}
          </p>
        </div>
      )}

      <OrderShippingCard order={order} />

      <div>
        <h3 className="font-medium text-slate-900 mb-3">Ürünler</h3>
        <ul className="divide-y divide-slate-100 text-sm">
          {order.items.map(item => (
            <li key={item.id} className="py-3 flex justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">
                  {item.product?.name ?? 'Ürün'}
                  {item.variant?.name ? ` — ${item.variant.name}` : ''}
                </p>
                <p className="text-slate-500 text-xs">Adet: {item.quantity}</p>
              </div>
              <span className="font-medium shrink-0">{formatTry(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-100 pt-4 text-sm space-y-1 max-w-xs ml-auto">
        <div className="flex justify-between">
          <span className="text-slate-500">Ara toplam</span>
          <span>{formatTry(order.totals.itemsSubtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Kargo</span>
          <span>{formatTry(order.totals.shippingPrice)}</span>
        </div>
        <div className="flex justify-between font-semibold text-slate-900 pt-2 border-t border-slate-100">
          <span>Toplam</span>
          <span>{formatTry(order.totals.grandTotal)}</span>
        </div>
      </div>

      {tenant && modalType && (
        <StoreReturnRequestModal
          tenantSlug={tenant.slug}
          order={order}
          type={modalType}
          open={Boolean(modalType)}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setSuccessMsg('Talebiniz alınmıştır. Mağaza tarafından incelenecektir.');
            load();
          }}
        />
      )}
    </div>
  );
}
