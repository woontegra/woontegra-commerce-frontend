import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { fetchStorefrontProducts } from '../services/storefrontApi';
import { ProductCard } from '../components/ProductCard';
import { CategoryCard } from '../components/CategoryCard';
import { getDefaultThemeSettings } from '../config/defaultThemeSettings';
import type { StorefrontProductSummary } from '../types/storefront.types';

export default function StoreHomePage() {
  const { tenant, categories, storeLink } = useStorefrontTenant();
  if (!tenant) return null;
  const settings = getDefaultThemeSettings({ logoUrl: tenant.logoUrl });
  const [featured, setFeatured] = useState<StorefrontProductSummary[]>([]);
  const [latest, setLatest]     = useState<StorefrontProductSummary[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [f, l] = await Promise.all([
          fetchStorefrontProducts(tenant.slug, { limit: 8, page: 1 }),
          fetchStorefrontProducts(tenant.slug, { limit: 8, page: 1 }),
        ]);
        if (!cancelled) {
          setFeatured(f.items);
          setLatest(l.items);
        }
      } catch {
        if (!cancelled) {
          setFeatured([]);
          setLatest([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant.slug]);

  const roots = categories.filter(c => c.parentId == null);
  const bannerTitle = settings.bannerTitle ?? tenant.name;
  const bannerSub   = settings.bannerSubtitle ?? 'Güvenle alışveriş yapın — ürünler panelden anlık güncellenir.';

  return (
    <div>
      <section className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-2">Kampanya alanı</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{bannerTitle}</h1>
          <p className="mt-3 text-indigo-100 max-w-xl text-sm sm:text-base">{bannerSub}</p>
          <Link
            to={storeLink('/store/urunler')}
            className="inline-flex mt-8 px-5 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-semibold shadow hover:bg-indigo-50"
          >
            Alışverişe başla
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Öne çıkan kategoriler</h2>
        {roots.length === 0 ? (
          <p className="text-slate-500 text-sm">Henüz kategori yok.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {roots.slice(0, 8).map(c => (
              <li key={c.id}>
                <CategoryCard category={c} url={storeLink(`/store/kategori/${encodeURIComponent(c.slug)}`)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProductSection
        title="Öne çıkan ürünler"
        loading={loading}
        products={featured}
        storeLink={storeLink}
      />
      <ProductSection
        title="Yeni ürünler"
        loading={loading}
        products={latest}
        storeLink={storeLink}
      />
    </div>
  );
}

function ProductSection({
  title,
  loading,
  products,
  storeLink,
}: {
  title: string;
  loading: boolean;
  products: StorefrontProductSummary[];
  storeLink: (path: string) => string;
}) {
  return (
    <section className="max-w-6xl mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <Link to={storeLink('/store/urunler')} className="text-sm font-medium text-indigo-600 hover:underline">
          Tümünü gör
        </Link>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl bg-white border border-slate-200 h-52 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-slate-500 text-sm">Gösterilecek ürün yok.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              productUrl={storeLink(`/store/urun/${encodeURIComponent(p.slug)}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
