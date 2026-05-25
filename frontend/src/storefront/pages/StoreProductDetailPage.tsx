import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStorefrontCart } from '../hooks/StorefrontCartProvider';
import { fetchStorefrontProductBySlug } from '../services/storefrontApi';
import { effectivePrice, formatTry } from '../utils/format';
import type { StorefrontProductDetail } from '../types/storefront.types';
import { ProductFavoriteButton } from '../components/ProductFavoriteButton';

export default function StoreProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { tenant, storeLink } = useStorefrontTenant();
  const { addLine } = useStorefrontCart();
  if (!tenant) return null;
  const [product, setProduct] = useState<StorefrontProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState<string | null>(null);
  const [qty, setQty]         = useState(1);
  const [added, setAdded]     = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const d = await fetchStorefrontProductBySlug(tenant.slug, slug);
        if (!cancelled) {
          setProduct(d);
          document.title = `${d.name} · ${tenant.name}`;
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
    return () => { cancelled = true; };
  }, [slug, tenant.slug, tenant.name]);

  useEffect(() => () => { document.title = tenant.name; }, [tenant.name]);

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
        <Link to={storeLink('/store/urunler')} className="inline-block mt-4 text-indigo-600 font-medium">
          Ürünlere dön
        </Link>
      </div>
    );
  }

  const sale = effectivePrice(product.price, product.discountPrice);
  const hasDiscount = product.discountPrice != null && product.discountPrice < product.price;
  const inStock = product.stock == null || product.stock > 0;
  const maxQty  = product.stock != null && product.stock > 0 ? product.stock : 99;

  const handleAdd = () => {
    if (!inStock) return;
    addLine({
      productId: product.id,
      unitPrice: sale,
      listPrice: hasDiscount ? product.price : undefined,
      name: product.name,
      slug: product.slug,
      imageUrl: product.images[0] ?? null,
      maxStock: product.stock,
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <nav className="text-sm text-slate-500 mb-6">
        <Link to={storeLink('/store')} className="hover:text-indigo-600">Ana sayfa</Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link
              to={storeLink(`/store/kategori/${encodeURIComponent(product.category.slug)}`)}
              className="hover:text-indigo-600"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-slate-800">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {product.images[0] ? (
            <img src={product.images[0]} alt="" className="w-full aspect-square object-contain bg-slate-50" />
          ) : (
            <div className="aspect-square flex items-center justify-center text-slate-400">Görsel yok</div>
          )}
          {product.images.length > 1 && (
            <div className="flex gap-2 p-3 border-t overflow-x-auto">
              {product.images.map((url, i) => (
                <img key={i} src={url} alt="" className="h-16 w-16 object-cover rounded-lg border" />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex-1">{product.name}</h1>
            <ProductFavoriteButton productId={product.id} size="md" className="shrink-0 shadow-md" />
          </div>
          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">{formatTry(sale)}</span>
            {hasDiscount && (
              <span className="text-lg text-slate-400 line-through">{formatTry(product.price)}</span>
            )}
          </div>
          <p className={`mt-2 text-sm font-medium ${inStock ? 'text-emerald-600' : 'text-red-600'}`}>
            {inStock ? 'Stokta' : 'Stokta yok'}
            {product.stock != null && inStock ? ` (${product.stock} adet)` : ''}
          </p>

          {/* TODO: Varyant API public endpoint eklendiğinde VariantSelector bağlanacak */}
          <div className="mt-6 flex items-center gap-3">
            <label className="text-sm text-slate-600">Adet</label>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={e => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
              className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
              disabled={!inStock}
            />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!inStock}
            className="mt-6 w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {added ? 'Sepete eklendi ✓' : 'Sepete ekle'}
          </button>
          <Link
            to={storeLink('/store/sepet')}
            className="inline-block mt-4 text-sm text-indigo-600 font-medium hover:underline"
          >
            Sepete git →
          </Link>

          {product.description && (
            <div
              className="mt-10 prose prose-sm max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
