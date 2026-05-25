import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStoreOrderStatusPoll } from '../hooks/useStoreOrderStatusPoll';

export default function StorePaymentFailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { storeLink, tenant } = useStorefrontTenant();
  const navigate = useNavigate();
  const decoded = orderNumber ? decodeURIComponent(orderNumber) : '';

  const { data, error, loading, attempts, done } = useStoreOrderStatusPoll(
    tenant?.slug,
    decoded || undefined,
  );

  const status = data?.order?.status;
  const orderId = data?.order?.id;

  useEffect(() => {
    if (status === 'PAID' && decoded) {
      navigate(storeLink(`/store/odeme-basarili/${encodeURIComponent(decoded)}`), { replace: true });
    }
  }, [status, decoded, navigate, storeLink]);

  if (error) {
    return (
      <FailShell decoded={decoded}>
        <h1 className="text-2xl font-bold text-slate-900">Doğrulama yapılamadı</h1>
        <p className="mt-2 text-slate-600 text-sm">{error}</p>
        <FailActions decoded={decoded} orderId={orderId} status={status} storeLink={storeLink} canRetry={false} />
      </FailShell>
    );
  }

  if (loading || (status === 'PENDING' && !done)) {
    return (
      <FailShell decoded={decoded}>
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto">
          <span className="inline-block w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Ödeme sonucu bekleniyor</h1>
        <p className="mt-2 text-slate-600 text-sm">Sonuç doğrulanıyor… ({attempts}/{6})</p>
        <FailActions decoded={decoded} orderId={orderId} status={status} storeLink={storeLink} canRetry={false} />
      </FailShell>
    );
  }

  if (status === 'PAID') {
    return (
      <FailShell decoded={decoded}>
        <p className="text-slate-600 text-sm">Ödeme onaylandı, yönlendiriliyorsunuz…</p>
      </FailShell>
    );
  }

  if (status === 'CANCELLED') {
    return (
      <FailShell decoded={decoded}>
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl font-bold">
          !
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Ödeme tamamlanamadı</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Sipariş: <span className="font-mono font-medium">{decoded}</span>
        </p>
        <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Sipariş iptal edildi ve stok iade edildi. Yeni sipariş vererek tekrar ödeyebilirsiniz.
        </p>
        <FailActions decoded={decoded} orderId={orderId} status={status} storeLink={storeLink} canRetry={false} />
      </FailShell>
    );
  }

  // PENDING after polling exhausted — allow retry PayTR if still pending
  return (
    <FailShell decoded={decoded}>
      <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl font-bold">
        ?
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Ödeme sonucu net değil</h1>
      <p className="mt-2 text-slate-600 text-sm">
        Ödeme henüz onaylanmadı. Tekrar deneyebilir veya bir süre sonra kontrol edebilirsiniz.
      </p>
      <FailActions decoded={decoded} orderId={orderId} status={status} storeLink={storeLink} canRetry />
    </FailShell>
  );
}

function FailShell({
  children,
}: {
  decoded: string;
  children: ReactNode;
}) {
  return <div className="max-w-lg mx-auto px-4 py-16 text-center">{children}</div>;
}

function FailActions({
  decoded,
  orderId,
  status,
  storeLink,
  canRetry = true,
}: {
  decoded: string;
  orderId?: string;
  status?: string;
  storeLink: (path: string) => string;
  canRetry?: boolean;
}) {
  const showRetry = canRetry && decoded && status === 'PENDING';

  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
      {showRetry && (
        <Link
          to={storeLink(`/store/odeme/paytr/${encodeURIComponent(decoded)}`)}
          state={{ orderId }}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
        >
          Ödemeyi tekrar dene
        </Link>
      )}
      <Link
        to={storeLink('/store/odeme')}
        className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
      >
        Yeni sipariş ver
      </Link>
    </div>
  );
}
