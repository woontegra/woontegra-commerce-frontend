import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStorefrontTenant } from '../../contexts/StorefrontTenantContext';
import { storePublicClient } from '../../services/storePublicApi';

type ProductCard = {
  id:    string;
  name:  string;
  slug:  string;
  price: number;
  image: string | null;
};

export default function HomePage() {
  const { tenant, categories, storeLink, loading: tenantLoading } = useStorefrontTenant();
  const [featured, setFeatured] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await storePublicClient.get('/store/products', {
          params: { tenant: tenant.slug, limit: 8, page: 1 },
        });
        const items = (r.data as { data?: { items?: ProductCard[] } })?.data?.items ?? [];
        if (!cancelled) setFeatured(items);
      } catch {
        if (!cancelled) setFeatured([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant?.slug]);

  if (tenantLoading || !tenant) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roots = categories.filter(c => c.parentId == null);

  return (
    <div>
      <section className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="mt-3 text-indigo-100 max-w-xl text-sm sm:text-base">
            Ürünlerimize göz atın; fiyatlar ve stok panelden güncellenir.
          </p>
          <Link
            to={storeLink('/store/products')}
            className="inline-flex mt-8 px-5 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-semibold shadow hover:bg-indigo-50"
          >
            Tüm ürünler
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Kategoriler</h2>
        {roots.length === 0 ? (
          <p className="text-slate-500 text-sm">Henüz kategori yok.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {roots.map(c => (
              <li key={c.id}>
                <Link
                  to={storeLink(`/store/products?category=${encodeURIComponent(c.id)}`)}
                  className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition"
                >
                  <span className="font-medium text-slate-800">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Öne çıkan ürünler</h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl bg-white border border-slate-200 h-52 animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="text-slate-500 text-sm">Gösterilecek ürün yok.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map(p => (
              <Link
                key={p.id}
                to={storeLink(`/p/${encodeURIComponent(p.slug)}`)}
                className="group rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition"
              >
                <div className="aspect-square bg-slate-100">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      Görsel yok
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-slate-900 text-sm line-clamp-2">{p.name}</p>
                  <p className="mt-1 text-indigo-600 font-semibold text-sm">
                    {p.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
