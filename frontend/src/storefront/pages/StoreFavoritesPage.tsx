import { Link, Navigate } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStorefrontAuth } from '../hooks/StorefrontAuthProvider';
import { useStorefrontFavorites } from '../hooks/StorefrontFavoritesProvider';
import { useStorefrontCart } from '../hooks/StorefrontCartProvider';
import { ProductCard } from '../components/ProductCard';
import { effectivePrice } from '../utils/format';

export default function StoreFavoritesPage() {
  const { storeLink } = useStorefrontTenant();
  const { isAuthenticated, loading: authLoading } = useStorefrontAuth();
  const { favorites, loading, toggleFavorite, refreshFavorites } = useStorefrontFavorites();
  const { addLine } = useStorefrontCart();

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
        Yükleniyor…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={storeLink('/store/giris')} replace />;
  }

  const handleRemove = async (productId: string) => {
    await toggleFavorite(productId);
    await refreshFavorites();
  };

  const handleAddToCart = (product: (typeof favorites)[0]['product']) => {
    const sale = effectivePrice(product.price, product.discountPrice);
    const inStock = product.stock == null || product.stock > 0;
    if (!inStock || !product.id) return;
    addLine({
      productId: product.id,
      unitPrice: sale,
      listPrice:
        product.discountPrice != null && product.discountPrice > 0 && product.discountPrice < product.price
          ? product.price
          : undefined,
      name:     product.name,
      slug:     product.slug,
      imageUrl: product.image,
      maxStock: product.stock,
      quantity: 1,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Favorilerim</h1>
      <p className="mt-1 text-sm text-slate-500">
        {favorites.length > 0
          ? `${favorites.length} ürün`
          : 'Beğendiğiniz ürünleri burada görürsünüz.'}
      </p>

      {loading && (
        <p className="mt-8 text-sm text-slate-500">Favoriler yükleniyor…</p>
      )}

      {!loading && favorites.length === 0 && (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-slate-600">Henüz favori ürününüz yok.</p>
          <Link
            to={storeLink('/store/urunler')}
            className="inline-block mt-4 text-indigo-600 font-medium hover:underline"
          >
            Ürünlere göz at →
          </Link>
        </div>
      )}

      {!loading && favorites.length > 0 && (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {favorites.map(fav => {
            const p = fav.product;
            const productUrl = storeLink(`/store/urun/${encodeURIComponent(p.slug)}`);
            const inStock = p.stock == null || p.stock > 0;
            return (
              <div key={fav.id} className="relative">
                <ProductCard product={p} productUrl={productUrl} hideAddToCart />
                <div className="mt-2 flex flex-col gap-2 px-1">
                  <button
                    type="button"
                    disabled={!inStock}
                    onClick={() => handleAddToCart(p)}
                    className="w-full py-2 rounded-lg text-sm font-semibold border border-indigo-600 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {inStock ? 'Sepete ekle' : 'Stokta yok'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(p.id)}
                    className="w-full py-1.5 text-xs text-red-600 hover:underline"
                  >
                    Favoriden kaldır
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
