import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { fetchStoreOrderStatusOnce } from '../hooks/useStoreOrderStatusPoll';
import { startPaytrPayment } from '../services/storefrontPaytrApi';

type PaymentLocationState = {
  iframeUrl?: string;
  orderId?: string;
};

export default function StorePaymentPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { tenant, storeLink } = useStorefrontTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as PaymentLocationState;

  const decoded = orderNumber ? decodeURIComponent(orderNumber) : '';

  const [iframeUrl, setIframeUrl] = useState<string | null>(state.iframeUrl ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const paytrStartedRef = useRef(false);

  useEffect(() => {
    if (!tenant || !decoded) return;

    let cancelled = false;
    paytrStartedRef.current = false;

    (async () => {
      setLoading(true);
      setError(null);
      setBlocked(null);

      try {
        const statusRes = await fetchStoreOrderStatusOnce(tenant.slug, decoded);
        if (cancelled) return;

        if (!statusRes.success) {
          throw new Error(statusRes.error || 'Sipariş durumu alınamadı.');
        }

        const orderStatus = statusRes.order?.status;
        if (orderStatus === 'PAID') {
          navigate(storeLink(`/store/odeme-basarili/${encodeURIComponent(decoded)}`), { replace: true });
          return;
        }
        if (orderStatus === 'CANCELLED') {
          setBlocked(
            'Bu sipariş iptal edildi. Yeni sipariş oluşturarak tekrar ödeme yapabilirsiniz.',
          );
          return;
        }

        if (state.iframeUrl) {
          setIframeUrl(state.iframeUrl);
          return;
        }

        if (paytrStartedRef.current) return;
        paytrStartedRef.current = true;

        const payRes = await startPaytrPayment(tenant.slug, {
          orderNumber: decoded,
          orderId: state.orderId ?? statusRes.order?.id,
        });
        if (cancelled) return;

        if (!payRes.success || !payRes.iframeUrl) {
          throw new Error(payRes.error || 'Ödeme oturumu başlatılamadı.');
        }
        setIframeUrl(payRes.iframeUrl);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          (e as Error)?.message ??
          'Ödeme yüklenemedi.';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenant, decoded, state.iframeUrl, state.orderId, navigate, storeLink]);

  if (!tenant) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Ödeme</h1>
      <p className="text-sm text-slate-600 mb-6">
        Sipariş: <span className="font-mono font-medium">{decoded}</span>
      </p>

      {blocked && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {blocked}
          <div className="mt-3 flex gap-3">
            <Link to={storeLink('/store/odeme')} className="text-indigo-600 font-medium">
              Yeni sipariş ver
            </Link>
            <Link
              to={storeLink(`/store/odeme-basarisiz/${encodeURIComponent(decoded)}`)}
              className="text-slate-600"
            >
              Sipariş detayı
            </Link>
          </div>
        </div>
      )}

      {error && !blocked && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => navigate(storeLink('/store/odeme'))}
              className="text-indigo-600 font-medium"
            >
              Ödemeye dön
            </button>
            <Link to={storeLink('/store')} className="text-slate-600">
              Ana sayfa
            </Link>
          </div>
        </div>
      )}

      {loading && !blocked && (
        <p className="text-slate-600 text-sm">Sipariş ve ödeme formu hazırlanıyor…</p>
      )}

      {iframeUrl && !error && !blocked && (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <iframe
            src={iframeUrl}
            title="PayTR Ödeme"
            className="w-full min-h-[520px] border-0"
            scrolling="no"
          />
        </div>
      )}

      {!blocked && (
        <p className="mt-6 text-xs text-slate-500">
          Ödeme tamamlandığında otomatik yönlendirileceksiniz. Sayfayı kapatmayın.
        </p>
      )}
    </div>
  );
}
