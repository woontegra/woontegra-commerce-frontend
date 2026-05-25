import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart, X } from 'lucide-react';
import { useWishlist } from '../hooks/useWishlist';

const Wishlist: React.FC = () => {
  const { wishlist, loading, removeFromWishlist, clearWishlist, itemCount } = useWishlist();

  const handleRemove = async (productId: string, variantId?: string) => {
    await removeFromWishlist(productId, variantId);
  };

  const handleClear = async () => {
    if (confirm('Tüm favorileri temizlemek istediğinizden emin misiniz?')) {
      await clearWishlist();
    }
  };

  const getProductImage = (item: any) => {
    if (item.variant?.images && item.variant.images.length > 0) {
      return item.variant.images[0];
    }
    if (item.product?.images && item.product.images.length > 0) {
      return item.product.images[0];
    }
    return '/placeholder-product.jpg';
  };

  const getProductPrice = (item: any) => {
    if (item.variant?.price) {
      return item.variant.price;
    }
    return item.product?.price || 0;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            Favorilerim
          </h1>
          <p className="text-gray-600 mt-2">{itemCount} ürün</p>
        </div>
        {itemCount > 0 && (
          <button
            onClick={handleClear}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Tümünü Temizle
          </button>
        )}
      </div>

      {/* Empty State */}
      {itemCount === 0 && (
        <div className="text-center py-16">
          <Heart className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Favori listeniz boş
          </h2>
          <p className="text-gray-600 mb-6">
            Beğendiğiniz ürünleri favorilere ekleyerek daha sonra kolayca bulabilirsiniz
          </p>
          <Link
            to="/products"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ürünleri Keşfet
          </Link>
        </div>
      )}

      {/* Wishlist Items */}
      {itemCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist?.items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative group"
            >
              {/* Remove Button */}
              <button
                onClick={() => handleRemove(item.productId, item.variantId)}
                className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                title="Favorilerden Kaldır"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>

              {/* Product Image */}
              <Link to={`/products/${item.product.slug}`}>
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={getProductImage(item)}
                    alt={item.product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>

              {/* Product Info */}
              <div className="p-4">
                <Link to={`/products/${item.product.slug}`}>
                  <h3 className="font-semibold text-gray-900 mb-1 hover:text-blue-600 transition-colors line-clamp-2">
                    {item.product.name}
                  </h3>
                </Link>

                {item.variant && (
                  <p className="text-sm text-gray-600 mb-2">{item.variant.name}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xl font-bold text-gray-900">
                    ₺{getProductPrice(item).toLocaleString('tr-TR')}
                  </span>

                  <button
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Sepete Ekle"
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>

                {/* Stock Status */}
                {item.variant ? (
                  item.variant.stockQuantity > 0 ? (
                    <p className="text-xs text-green-600 mt-2">Stokta var</p>
                  ) : (
                    <p className="text-xs text-red-600 mt-2">Stokta yok</p>
                  )
                ) : item.product.stock ? (
                  <p className="text-xs text-green-600 mt-2">Stokta var</p>
                ) : (
                  <p className="text-xs text-red-600 mt-2">Stokta yok</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
