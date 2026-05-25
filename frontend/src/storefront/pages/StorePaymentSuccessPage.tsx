import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStoreOrderStatusPoll } from '../hooks/useStoreOrderStatusPoll';
import { formatTry } from '../utils/format';

export default function StorePaymentSuccessPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { storeLink, tenant } = useStorefrontTenant();
  const decoded = orderNumber ? decodeURIComponent(orderNumber) : '';

  const { data, error, loading, attempts, done } = useStoreOrderStatusPoll(
    tenant?.slug,
    decoded || undefined,
  );

  const status = data?.order?.status;
  const total = data?.order?.totalAmount;

  if (error) {
    return (
      <StatusShell orderNumber={decoded}>
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
          ?
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Doğrulama yapılamadı</h1>
        <p className="mt-2 text-slate-600 text-sm">{error}</p>
        <FooterLinks storeLink={storeLink} tenantName={tenant?.name} />
      </StatusShell>
    );
  }

  if (loading || (status === 'PENDING' && !done)) {
    return (
      <StatusShell orderNumber={decoded}>
        <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
          <span className="inline-block w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Ödemeniz kontrol ediliyor</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Sipariş: <span className="font-mono font-medium">{decoded}</span>
        </p>
        <p className="mt-4 text-xs text-slate-500">
          PayTR bildirimi işleniyor… ({attempts}/{6})
        </p>
        <FooterLinks storeLink={storeLink} tenantName={tenant?.name} />
      </StatusShell>
    );
  }

  if (status === 'CANCELLED') {
    return (
      <StatusShell orderNumber={decoded}>
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl font-bold">
          !
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Ödeme tamamlanamadı</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Siparişiniz iptal edildi. Stok iade edilmiştir.
        </p>
        <Link
          to={storeLink(`/store/odeme-basarisiz/${encodeURIComponent(decoded)}`)}
          className="mt-6 inline-block text-indigo-600 font-medium text-sm"
        >
          Detaylar ve tekrar deneme
        </Link>
        <FooterLinks storeLink={storeLink} tenantName={tenant?.name} />
      </StatusShell>
    );
  }

  if (status === 'PAID') {
    return (
      <StatusShell orderNumber={decoded}>
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Ödemeniz alındı</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Sipariş numaranız:{' '}
          <span className="font-mono font-semibold text-slate-900">{decoded}</span>
        </p>
        {total != null && (
          <p className="mt-1 text-slate-600 text-sm">
            Toplam: <span className="font-semibold">{formatTry(total)}</span>
          </p>
        )}
        <p className="mt-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          Sipariş durumu: <strong>Ödendi</strong>
          {data?.payment?.status === 'SUCCESS' ? ' (PayTR onaylandı)' : ''}
        </p>
        <FooterLinks storeLink={storeLink} tenantName={tenant?.name} />
      </StatusShell>
    );
  }

  // PENDING after max attempts
  return (
    <StatusShell orderNumber={decoded}>
      <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
        …
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Ödeme sonucu bekleniyor</h1>
      <p className="mt-2 text-slate-600 text-sm">
        Ödemeniz henüz onaylanmadı. Birkaç dakika sonra tekrar kontrol edin veya destek ile iletişime geçin.
      </p>
      <p className="mt-2 text-xs text-slate-500 font-mono">Durum: {status ?? 'PENDING'}</p>
      <FooterLinks storeLink={storeLink} tenantName={tenant?.name} />
    </StatusShell>
  );
}

function StatusShell({
  orderNumber,
  children,
}: {
  orderNumber: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      {children}
      {!orderNumber && (
        <p className="mt-4 text-sm text-red-600">Sipariş numarası eksik.</p>
      )}
    </div>
  );
}

function FooterLinks({
  storeLink,
  tenantName,
}: {
  storeLink: (path: string) => string;
  tenantName?: string;
}) {
  return (
    <>
      <div className="mt-8">
        <Link
          to={storeLink('/store')}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold inline-block"
        >
          Ana sayfaya dön
        </Link>
      </div>
      {tenantName && (
        <p className="mt-6 text-xs text-slate-400">{tenantName} — teşekkür ederiz.</p>
      )}
    </>
  );
}
