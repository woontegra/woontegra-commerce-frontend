import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { fetchStorefrontProducts } from '../services/storefrontApi';
import { ProductCard } from '../components/ProductCard';
import type { StorefrontProductSummary } from '../types/storefront.types';

export default function StoreCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant, categories, storeLink } = useStorefrontTenant();
  if (!tenant) return null;

  const searchTerm = searchParams.get('search') ?? '';
  const page       = Math.max(1, Number(searchParams.get('page')) || 1);

  const category = slug
    ? categories.find(c => c.slug === slug)
    : null;

  const [items, setItems]       = useState<StorefrontProductSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchStorefrontProducts(tenant.slug, {
          page,
          limit: 24,
          categoryId: category?.id,
          search: searchTerm || undefined,
        });
        if (!cancelled) {
          setItems(r.items);
          setTotalPages(r.totalPages);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant.slug, category?.id, searchTerm, page]);

  const title = searchTerm
    ? `"${searchTerm}" arama sonuçları`
    : category?.name ?? 'Tüm ürünler';

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <nav className="text-sm text-slate-500 mb-6">
        <Link to={storeLink('/store')} className="hover:text-indigo-600">Ana sayfa</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">{title}</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">{title}</h1>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-white border animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-slate-500">Bu listede ürün bulunamadı.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              productUrl={storeLink(`/store/urun/${encodeURIComponent(p.slug)}`)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => {
              const sp = new URLSearchParams(searchParams);
              sp.set('page', String(page - 1));
              setSearchParams(sp);
            }}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40"
          >
            Önceki
          </button>
          <span className="px-3 py-1.5 text-sm text-slate-600">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => {
              const sp = new URLSearchParams(searchParams);
              sp.set('page', String(page + 1));
              setSearchParams(sp);
            }}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40"
          >
            Sonraki
          </button>
        </div>
      )}
    </div>
  );
}
