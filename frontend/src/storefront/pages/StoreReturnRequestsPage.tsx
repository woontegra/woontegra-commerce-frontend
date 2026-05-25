import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStorefrontAuth } from '../hooks/StorefrontAuthProvider';
import { getReturn, listReturns, type ReturnRequest } from '../services/storefrontReturnsApi';
import { formatTry } from '../utils/format';
import { STORE_ORDER_STATUS_LABELS } from '../constants/returnRequest';
import {
  formatReturnItemsSummary,
  returnRequestStatusLabel,
  returnRequestStatusTone,
  returnRequestTypeLabel,
  RETURN_STATUS_TONE_CLASS,
} from '../utils/returnRequestView';

function ReturnRequestCard({
  request,
  storeLink,
}: {
  request: ReturnRequest;
  storeLink: (path: string) => string;
}) {
  const tone = returnRequestStatusTone(request.status);
  const orderNumber = request.order?.orderNumber;
  const orderHref = orderNumber
    ? storeLink(`/store/hesabim/siparisler/${encodeURIComponent(orderNumber)}`)
    : null;

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{returnRequestTypeLabel(request.type)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Talep no: {request.requestNumber}</p>
        </div>
        <span
          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${RETURN_STATUS_TONE_CLASS[tone]}`}
        >
          {returnRequestStatusLabel(request.status)}
        </span>
      </div>

      <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {orderNumber && (
          <div>
            <dt className="text-slate-500">Sipariş</dt>
            <dd className="font-medium text-slate-900 mt-0.5">#{orderNumber}</dd>
          </div>
        )}
        <div>
          <dt className="text-slate-500">Talep tarihi</dt>
          <dd className="text-slate-800 mt-0.5">
            {new Date(request.createdAt).toLocaleString('tr-TR')}
          </dd>
        </div>
        {request.order?.status && (
          <div>
            <dt className="text-slate-500">Sipariş durumu</dt>
            <dd className="text-slate-800 mt-0.5">
              {STORE_ORDER_STATUS_LABELS[request.order.status] ?? request.order.status}
            </dd>
          </div>
        )}
        {request.order?.totalAmount != null && (
          <div>
            <dt className="text-slate-500">Sipariş tutarı</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {formatTry(request.order.totalAmount)}
            </dd>
          </div>
        )}
      </dl>

      <div>
        <p className="text-xs text-slate-500">Talep nedeni</p>
        <p className="text-slate-800 mt-0.5">{request.reason}</p>
      </div>

      {request.items.length > 0 && (
        <div>
          <p className="text-xs text-slate-500">Ürün özeti</p>
          <p className="text-slate-800 mt-0.5">{formatReturnItemsSummary(request.items)}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        {orderHref && (
          <Link to={orderHref} className="text-indigo-600 font-medium hover:underline">
            Siparişi Görüntüle
          </Link>
        )}
        <Link
          to={storeLink(`/store/hesabim/iade-taleplerim/${request.id}`)}
          className="text-slate-600 hover:text-indigo-600 hover:underline"
        >
          Talep detayı
        </Link>
      </div>
    </article>
  );
}

function ReturnList() {
  const { storeLink, tenant } = useStorefrontTenant();
  const [items, setItems] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant?.slug) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listReturns(tenant.slug);
      setItems(list);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Talepleriniz yüklenirken bir sorun oluştu.',
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tenant?.slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-3">
        <p>{error || 'Talepleriniz yüklenirken bir sorun oluştu.'}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-700 text-sm font-medium hover:bg-red-50"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-sm text-slate-600 space-y-4 py-2">
        <p>Henüz iade veya iptal talebiniz bulunmuyor.</p>
        <p className="text-slate-500">
          Sipariş detayından uygun siparişler için talep oluşturabilirsiniz.
        </p>
        <Link
          to={storeLink('/store/hesabim/siparisler')}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          Siparişlerime Git
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(r => (
        <ReturnRequestCard key={r.id} request={r} storeLink={storeLink} />
      ))}
    </div>
  );
}

function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const { storeLink, tenant } = useStorefrontTenant();
  const [item, setItem] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant?.slug || !id) return;
    setLoading(true);
    setError(null);
    try {
      const r = await getReturn(tenant.slug, id);
      setItem(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Talep detayı şu anda yüklenemedi.');
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [tenant?.slug, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;

  if (error || !item) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{error || 'Bulunamadı.'}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm text-indigo-600 font-medium hover:underline"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  const orderNumber = item.order?.orderNumber;
  const orderHref = orderNumber
    ? storeLink(`/store/hesabim/siparisler/${encodeURIComponent(orderNumber)}`)
    : null;
  const tone = returnRequestStatusTone(item.status);

  return (
    <div className="space-y-4 text-sm">
      <Link to={storeLink('/store/hesabim/iade-taleplerim')} className="text-indigo-600 hover:underline">
        ← İade / İptal Taleplerim
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{item.requestNumber}</h2>
        <span
          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${RETURN_STATUS_TONE_CLASS[tone]}`}
        >
          {returnRequestStatusLabel(item.status)}
        </span>
      </div>

      <p className="font-medium text-slate-800">{returnRequestTypeLabel(item.type)}</p>

      <dl className="grid sm:grid-cols-2 gap-3">
        <div>
          <dt className="text-slate-500 text-xs">Sipariş</dt>
          <dd className="font-medium">#{orderNumber ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500 text-xs">Tarih</dt>
          <dd>{new Date(item.createdAt).toLocaleString('tr-TR')}</dd>
        </div>
        {item.order?.status && (
          <div>
            <dt className="text-slate-500 text-xs">Sipariş durumu</dt>
            <dd>{STORE_ORDER_STATUS_LABELS[item.order.status] ?? item.order.status}</dd>
          </div>
        )}
        {item.order?.totalAmount != null && (
          <div>
            <dt className="text-slate-500 text-xs">Sipariş tutarı</dt>
            <dd className="font-medium">{formatTry(item.order.totalAmount)}</dd>
          </div>
        )}
      </dl>

      {item.status === 'APPROVED' && item.type === 'CANCEL_REQUEST' && (
        <p className="text-emerald-800 font-medium">
          İptal talebiniz onaylandı. Siparişiniz iptal edildi.
        </p>
      )}
      {item.status === 'APPROVED' && item.type === 'RETURN_REQUEST' && (
        <p className="text-emerald-800 font-medium">İade talebiniz onaylandı.</p>
      )}
      {item.status === 'REJECTED' && (
        <p className="text-red-800">
          Talebiniz reddedildi. Detay için mağaza ile iletişime geçebilirsiniz.
        </p>
      )}
      {item.status === 'COMPLETED' && item.type === 'RETURN_REQUEST' && (
        <div className="text-emerald-800 space-y-1">
          <p className="font-medium">İade süreciniz tamamlandı.</p>
          {item.refunds && item.refunds.length > 0 ? (
            <div className="text-slate-700 space-y-1">
              <p className="font-medium text-emerald-800">
                Ödeme iadeniz mağaza tarafından işaretlendi.
              </p>
              {item.refunds.map((ref, idx) => (
                <p key={idx}>
                  {ref.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                  {ref.currency} — {new Date(ref.refundedAt).toLocaleDateString('tr-TR')}
                  {ref.methodLabel ? ` (${ref.methodLabel})` : ''}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-slate-600">
              Ödeme iadesi mağaza tarafından ayrıca işlenecektir.
            </p>
          )}
        </div>
      )}

      <div>
        <p className="text-slate-500 text-xs">Talep nedeni</p>
        <p className="font-medium">{item.reason}</p>
      </div>

      {item.customerNote && (
        <div>
          <p className="text-slate-500 text-xs">Açıklamanız</p>
          <p>{item.customerNote}</p>
        </div>
      )}

      {(item.items?.length ?? 0) > 0 && (
        <div>
          <p className="font-medium mb-2">Ürünler</p>
          <ul className="divide-y border border-slate-100 rounded-lg">
            {item.items.map(i => (
              <li key={i.id} className="px-3 py-2 flex justify-between gap-4">
                <span>
                  {i.productName}
                  {i.variantName ? ` — ${i.variantName}` : ''}
                  {i.reason ? (
                    <span className="block text-xs text-slate-500 mt-0.5">{i.reason}</span>
                  ) : null}
                </span>
                <span className="text-slate-600 shrink-0">× {i.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {orderHref && (
        <Link
          to={orderHref}
          className="inline-flex items-center px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-50"
        >
          Siparişi Görüntüle
        </Link>
      )}
    </div>
  );
}

export default function StoreReturnRequestsPage() {
  const { storeLink } = useStorefrontTenant();
  const { isAuthenticated, loading: authLoading } = useStorefrontAuth();
  const { id } = useParams<{ id?: string }>();

  if (authLoading) {
    return <p className="text-sm text-slate-500 py-8 text-center">Yükleniyor…</p>;
  }
  if (!isAuthenticated) {
    return <Navigate to={storeLink('/store/giris')} replace />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900 mb-4">
        {id ? 'Talep Detayı' : 'İade / İptal Taleplerim'}
      </h2>
      {id ? <ReturnDetail /> : <ReturnList />}
    </div>
  );
}
