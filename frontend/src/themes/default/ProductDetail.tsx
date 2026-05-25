import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStorefrontTenant } from '../../contexts/StorefrontTenantContext';
import { storePublicClient } from '../../services/storePublicApi';

type Detail = {
  id:          string;
  name:        string;
  slug:        string;
  description: string;
  price:       number;
  discountPrice: number | null;
  images:      string[];
};

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { tenant, storeLink, loading: tenantLoading } = useStorefrontTenant();
  const [product, setProduct] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !tenant) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await storePublicClient.get(`/store/products/${encodeURIComponent(slug)}`, {
          params: { tenant: tenant.slug },
        });
        const d = (r.data as { data?: Detail })?.data ?? null;
        if (!cancelled) {
          setProduct(d);
          if (d) {
            document.title = `${d.name} · ${tenant.name}`;
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setProduct(null);
          setErr(
            (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
              'Ürün yüklenemedi',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, tenant?.slug, tenant?.name]);

  useEffect(() => {
    if (!tenant) return;
    return () => {
      document.title = tenant.name;
    };
  }, [tenant?.name]);

  if (tenantLoading || !tenant) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (err || !product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-600">{err || 'Ürün bulunamadı.'}</p>
        <Link to={storeLink('/store/products')} className="inline-block mt-4 text-indigo-600 font-medium">
          Ürünlere dön
        </Link>
      </div>
    );
  }

  const displayPrice =
    product.discountPrice != null && product.discountPrice < product.price
      ? product.discountPrice
      : product.price;
  const mainImage = product.images[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden aspect-square">
          {mainImage ? (
            <img src={mainImage} alt="" className="w-full h-full object-contain bg-slate-50" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">Görsel yok</div>
          )}
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{product.name}</h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-semibold text-indigo-600">
              {displayPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </span>
            {product.discountPrice != null && product.discountPrice < product.price && (
              <span className="text-slate-400 line-through text-lg">
                {product.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </span>
            )}
          </div>
          {product.description ? (
            <div className="mt-8 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
              {product.description}
            </div>
          ) : null}
          <button
            type="button"
            className="mt-10 w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 opacity-80 cursor-not-allowed"
            disabled
            title="Sepet entegrasyonu yakında"
          >
            Sepete ekle (yakında)
          </button>
          <p className="mt-4 text-sm text-slate-500">
            <Link to={storeLink('/store/products')} className="text-indigo-600 font-medium">
              ← Ürünlere dön
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
