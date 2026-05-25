import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductHit {
  id:           string;
  name:         string;
  slug:         string;
  price:        number;
  basePrice:    number | null;
  images:       string[];
  categoryName: string | null;
  isActive:     boolean;
  stockTotal:   number;
  unitType:     string;
  _formatted?:  { name?: string; description?: string };
}

interface SearchResult {
  hits:       ProductHit[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  facets:     Record<string, Record<string, number>>;
  processingMs: number;
}

interface Facets {
  categoryName?: Record<string, number>;
  unitType?:     Record<string, number>;
}

type SortOption = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name_asc';

const SORT_LABELS: Record<SortOption, string> = {
  newest:     'En Yeni',
  oldest:     'En Eski',
  price_asc:  'Fiyat: Düşük → Yüksek',
  price_desc: 'Fiyat: Yüksek → Düşük',
  name_asc:   'İsim A → Z',
};

// ─── Component ────────────────────────────────────────────────────────────────

const ProductSearch: React.FC = () => {
  const navigate = useNavigate();

  // ── State ────────────────────────────────────────────────────────────────
  const [query, setQuery]           = useState('');
  const [debouncedQuery, setDebounced] = useState('');
  const [result, setResult]         = useState<SearchResult | null>(null);
  const [facets, setFacets]         = useState<Facets>({});
  const [loading, setLoading]       = useState(false);

  // Filters
  const [categoryFilter, setCategory] = useState('');
  const [minPrice, setMinPrice]       = useState('');
  const [maxPrice, setMaxPrice]       = useState('');
  const [inStock, setInStock]         = useState(false);
  const [activeOnly, setActiveOnly]   = useState(true);
  const [sort, setSort]               = useState<SortOption>('newest');
  const [page, setPage]               = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Debounce query ────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ── Fetch facets once ────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/search/products/facets')
      .then(r => setFacets((r.data as any).facets ?? {}))
      .catch(() => {});
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q:     debouncedQuery,
        page:  String(page),
        limit: '24',
        sort,
        ...(categoryFilter && { categoryId: categoryFilter }),
        ...(minPrice       && { minPrice }),
        ...(maxPrice       && { maxPrice }),
        ...(inStock        && { inStock: 'true' }),
        isActive: activeOnly ? 'true' : undefined,
      } as any);

      const res = await api.get<SearchResult>(`/search/products?${params}`);
      setResult(res.data as any);

      // Merge live facets
      if ((res.data as any).facets) {
        setFacets(f => ({ ...f, ...(res.data as any).facets }));
      }
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page, sort, categoryFilter, minPrice, maxPrice, inStock, activeOnly]);

  useEffect(() => { doSearch(); }, [doSearch]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [categoryFilter, minPrice, maxPrice, inStock, activeOnly, sort]);

  const clearFilters = () => {
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setActiveOnly(true);
    setSort('newest');
    setQuery('');
    setPage(1);
  };

  const hasFilters = categoryFilter || minPrice || maxPrice || inStock || !activeOnly || query;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Search bar + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ürün adı, SKU veya açıklama..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortOption)}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(SORT_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        {/* ── Filter panel ─────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-56 flex-shrink-0 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtreler</h3>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Temizle
              </button>
            )}
          </div>

          {/* Category */}
          {facets.categoryName && Object.keys(facets.categoryName).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Kategori</p>
              <div className="space-y-1">
                <button
                  onClick={() => setCategory('')}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition ${
                    !categoryFilter
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Tümü
                </button>
                {Object.entries(facets.categoryName).map(([name, count]) => (
                  <button
                    key={name}
                    onClick={() => setCategory(name === categoryFilter ? '' : name)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition flex items-center justify-between ${
                      categoryFilter === name
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    <span className="text-xs text-gray-400 ml-1 flex-shrink-0">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price range */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Fiyat Aralığı</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                placeholder="Min"
                className="w-full text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-gray-400 flex-shrink-0">—</span>
              <input
                type="number"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="w-full text-sm px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={e => setInStock(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Sadece stokta olanlar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={e => setActiveOnly(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Sadece aktif ürünler</span>
            </label>
          </div>
        </aside>

        {/* ── Results ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Result count + processing time */}
          {result && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">
                  {result.total.toLocaleString('tr-TR')}
                </span> ürün bulundu
                {result.processingMs > 0 && (
                  <span className="ml-2 text-xs text-gray-400">({result.processingMs}ms)</span>
                )}
              </p>
              {debouncedQuery && (
                <p className="text-sm text-gray-400">
                  "<span className="text-gray-700 dark:text-gray-300">{debouncedQuery}</span>" için
                </p>
              )}
            </div>
          )}

          {loading && !result ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
                  <div className="h-40 bg-gray-200 dark:bg-gray-700" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : result?.hits.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Ürün bulunamadı.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Filtrelerinizi değiştirmeyi deneyin.</p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  Filtreleri temizle
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {result?.hits.map(hit => (
                  <button
                    key={hit.id}
                    onClick={() => navigate(`/dashboard/products/${hit.id}`)}
                    className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition text-left"
                  >
                    {/* Image */}
                    <div className="relative h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      {hit.images?.[0] ? (
                        <img
                          src={hit.images[0]}
                          alt={hit.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {/* Out-of-stock overlay */}
                      {hit.stockTotal === 0 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded">Stok Yok</span>
                        </div>
                      )}
                      {/* Inactive badge */}
                      {!hit.isActive && (
                        <span className="absolute top-2 left-2 bg-gray-600 text-white text-xs px-1.5 py-0.5 rounded">Pasif</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      {hit.categoryName && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1 truncate">{hit.categoryName}</p>
                      )}
                      <p
                        className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-snug"
                        dangerouslySetInnerHTML={{
                          __html: hit._formatted?.name ?? hit.name,
                        }}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                          {hit.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </span>
                        {hit.basePrice && hit.basePrice > hit.price && (
                          <span className="text-xs text-gray-400 line-through">
                            {hit.basePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                          </span>
                        )}
                      </div>
                      {hit.stockTotal > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">Stok: {hit.stockTotal}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {result && result.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    ← Önceki
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400 px-2">
                    {page} / {result.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(result.totalPages, p + 1))}
                    disabled={page === result.totalPages}
                    className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Sonraki →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSearch;
