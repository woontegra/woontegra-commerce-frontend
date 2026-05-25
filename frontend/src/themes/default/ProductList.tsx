import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStorefrontTenant } from '../../contexts/StorefrontTenantContext';
import { storePublicClient } from '../../services/storePublicApi';

type Row = {
  id:    string;
  name:  string;
  slug:  string;
  price: number;
  image: string | null;
};

export default function ProductList() {
  const { tenant, storeLink, loading: tenantLoading } = useStorefrontTenant();
  const [params, setParams]   = useSearchParams();
  const categoryId            = params.get('category') || undefined;
  const page                  = Math.max(1, Number(params.get('page')) || 1);

  const [items, setItems]     = useState<Row[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const r = await storePublicClient.get('/store/products', {
        params: {
          tenant:   tenant.slug,
          page,
          limit:    12,
          ...(categoryId ? { category: categoryId } : {}),
        },
      });
      const body = r.data as {
        data?: { items?: Row[]; totalPages?: number };
      };
      setItems(body.data?.items ?? []);
      setTotalPages(Math.max(1, body.data?.totalPages ?? 1));
    } catch {
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [tenant?.slug, page, categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setPage = (p: number) => {
    if (!tenant) return;
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    if (tenant.slug) next.set('tenant', tenant.slug);
    setParams(next, { replace: true });
  };

  if (tenantLoading || !tenant) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Ürünler</h1>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 h-64 bg-white animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-slate-500">Bu kriterlere uygun ürün yok.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(p => (
              <Link
                key={p.id}
                to={storeLink(`/p/${encodeURIComponent(p.slug)}`)}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition"
              >
                <div className="aspect-square bg-slate-100">
                  {p.image ? (
                    <img src={p.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      —
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

          {totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-2 flex-wrap">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pn => (
                <button
                  key={pn}
                  type="button"
                  onClick={() => setPage(pn)}
                  className={`min-w-[2.25rem] h-9 rounded-lg text-sm font-medium ${
                    pn === page
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pn}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
