import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Package, FolderOpen, Loader2, X } from 'lucide-react';
import { useLiveSearch } from '../../hooks/useLiveSearch';

interface LiveSearchDropdownProps {
  placeholder?: string;
  className?: string;
}

const LiveSearchDropdown: React.FC<LiveSearchDropdownProps> = ({
  placeholder = 'Ürün veya kategori ara...',
  className = '',
}) => {
  const {
    query,
    setQuery,
    results,
    loading,
    isOpen,
    clearSearch,
    closeDropdown,
    openDropdown,
    hasResults,
  } = useLiveSearch(300); // 300ms debounce

  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDropdown();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
      closeDropdown();
    }
  };

  const getProductImage = (product: any) => {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    return '/placeholder-product.jpg';
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={openDropdown}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />

          {/* Loading Spinner */}
          {loading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
          )}

          {/* Clear Button */}
          {query && !loading && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown Results */}
      {isOpen && hasResults && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Categories Section */}
          {results?.categories && results.categories.length > 0 && (
            <div className="p-2 border-b border-gray-100">
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Kategoriler
                </h3>
              </div>
              {results.categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.slug}`}
                  onClick={closeDropdown}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    {category.icon ? (
                      <span className="text-lg">{category.icon}</span>
                    ) : (
                      <FolderOpen className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {category.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {category._count.products} ürün
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Products Section */}
          {results?.products && results.products.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Ürünler
                </h3>
              </div>
              {results.products.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.slug}`}
                  onClick={closeDropdown}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm font-semibold text-blue-600">
                        ₺{product.price.toLocaleString('tr-TR')}
                      </p>
                      {product.category && (
                        <span className="text-xs text-gray-500">
                          · {product.category.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Status */}
                  {product.stock && (
                    <div className="flex-shrink-0">
                      {product.stock.quantity > 0 ? (
                        <span className="text-xs text-green-600 font-medium">
                          Stokta
                        </span>
                      ) : (
                        <span className="text-xs text-red-600 font-medium">
                          Tükendi
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* View All Results */}
          {query && (
            <div className="p-2 border-t border-gray-100">
              <Link
                to={`/products?search=${encodeURIComponent(query)}`}
                onClick={closeDropdown}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                Tüm sonuçları gör "{query}"
              </Link>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && !loading && !hasResults && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-8 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-1">
            "{query}" için sonuç bulunamadı
          </p>
          <p className="text-xs text-gray-500">
            Farklı anahtar kelimeler deneyin
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveSearchDropdown;
