import { Link, useParams } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { formatTry } from '../utils/format';

export default function StoreOrderSuccessPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { storeLink, tenant } = useStorefrontTenant();
  const total = typeof history.state?.usr?.total === 'number' ? history.state.usr.total : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
        ✓
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Siparişiniz alındı</h1>
      <p className="mt-2 text-slate-600 text-sm">
        Sipariş numaranız:{' '}
        <span className="font-mono font-semibold text-slate-900">{orderNumber ?? '—'}</span>
      </p>
      {total != null && (
        <p className="mt-1 text-slate-600 text-sm">
          Toplam: <span className="font-semibold">{formatTry(total)}</span>
        </p>
      )}
      <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        Ödeme entegrasyonu sonraki adımda eklenecek. Siparişiniz şu an <strong>ödeme bekliyor</strong> durumundadır.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to={storeLink('/store')}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
        >
          Ana sayfaya dön
        </Link>
        <Link
          to={storeLink('/store/hesabim/siparisler')}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
        >
          Siparişlerim
        </Link>
      </div>
      {tenant && (
        <p className="mt-6 text-xs text-slate-400">{tenant.name} — teşekkür ederiz.</p>
      )}
    </div>
  );
}
