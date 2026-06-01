import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { fetchStoreOrderStatusOnce } from '../hooks/useStoreOrderStatusPoll';
import {
  clearIyzicoCheckoutSession,
  readIyzicoCheckoutSession,
} from '../services/storefrontIyzicoApi';

function injectCheckoutForm(container: HTMLElement, checkoutHtml: string): void {
  container.innerHTML = checkoutHtml;
  const scripts = container.querySelectorAll('script');
  scripts.forEach(oldScript => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach(attr =>
      newScript.setAttribute(attr.name, attr.value),
    );
    newScript.textContent = oldScript.textContent;
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });
}

export default function StoreIyzicoPaymentPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { tenant, storeLink } = useStorefrontTenant();
  const navigate = useNavigate();
  const formContainerRef = useRef<HTMLDivElement>(null);

  const decoded = orderNumber ? decodeURIComponent(orderNumber) : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant || !decoded) return;

    let cancelled = false;

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
          clearIyzicoCheckoutSession(decoded);
          navigate(storeLink(`/store/odeme-basarili/${encodeURIComponent(decoded)}`), { replace: true });
          return;
        }
        if (orderStatus === 'CANCELLED') {
          clearIyzicoCheckoutSession(decoded);
          setBlocked(
            'Bu sipariş iptal edildi. Yeni sipariş oluşturarak tekrar ödeme yapabilirsiniz.',
          );
          return;
        }

        const html = readIyzicoCheckoutSession(decoded);
        if (!html) {
          setError('Ödeme oturumu bulunamadı. Lütfen tekrar deneyin.');
          return;
        }

        setCheckoutHtml(html);
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
  }, [tenant, decoded, navigate, storeLink]);

  useEffect(() => {
    if (!checkoutHtml || !formContainerRef.current) return;
    injectCheckoutForm(formContainerRef.current, checkoutHtml);
  }, [checkoutHtml]);

  if (!tenant) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">iyzico ile Güvenli Ödeme</h1>
      <p className="text-sm text-slate-600 mb-2">
        Sipariş: <span className="font-mono font-medium">{decoded}</span>
      </p>
      <p className="text-sm text-slate-500 mb-6">
        Ödeme işleminiz iyzico güvenli ödeme altyapısı ile tamamlanacaktır.
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
            <Link to={storeLink('/store/odeme')} className="text-indigo-600 font-medium">
              Ödemeye dön
            </Link>
            <Link to={storeLink('/store')} className="text-slate-600">
              Ana sayfa
            </Link>
          </div>
        </div>
      )}

      {loading && !blocked && (
        <p className="text-slate-600 text-sm">Ödeme formu hazırlanıyor…</p>
      )}

      {checkoutHtml && !error && !blocked && (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white p-4">
          <div ref={formContainerRef} id="iyzipay-checkout-form" className="responsive min-h-[420px]" />
        </div>
      )}

      {!blocked && !error && (
        <p className="mt-6 text-xs text-slate-500">
          Ödeme tamamlandığında otomatik yönlendirileceksiniz. Sayfayı kapatmayın.
        </p>
      )}
    </div>
  );
}
