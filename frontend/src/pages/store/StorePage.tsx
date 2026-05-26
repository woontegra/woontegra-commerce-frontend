import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import SEOHead from '../../components/SEO/SEOHead';
import { Loader2, Package, AlertCircle, Grid3X3, Tag } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  basePrice?: number;
  images: string[];
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  isActive: boolean;
}

interface StoreResponse {
  success: boolean;
  data: {
    store: Store;
    products: Product[];
    categories: Category[];
    structuredData: object;
  };
}

const StorePage: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStore = async () => {
      if (!tenantSlug) return;

      try {
        setLoading(true);
        const response = await axios.get<StoreResponse>(
          `${import.meta.env.VITE_API_URL}/seo/store/${tenantSlug}`
        );

        if (response.data.success) {
          setStore(response.data.data.store);
          setProducts(response.data.data.products || []);
          setCategories(response.data.data.categories || []);
        } else {
          setError('Store not found');
        }
      } catch (err) {
        setError('Failed to load store');
        console.error('Error fetching store:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Not Found</h1>
          <p className="text-gray-600">{error || 'This store does not exist or has been removed.'}</p>
        </div>
      </div>
    );
  }

  // SEO Data
  const baseUrl = import.meta.env.VITE_FRONTEND_URL || 'https://localhost:3000';
  const storeUrl = `${baseUrl}/store/${tenantSlug}`;
  const title = store.name;
  const description = store.description || `Welcome to ${store.name} - Your trusted online store`;
  const image = store.logo;

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        url={storeUrl}
        image={image}
        type="website"
        keywords={`${store.name}, online store, e-commerce, ${categories.map(c => c.name).join(', ')}`}
        structuredData={store} // This would be the structuredData from API response
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Store Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              {store.logo && (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-24 h-24 mx-auto mb-6 rounded-lg"
                />
              )}
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{store.name}</h1>
              {store.description && (
                <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                  {store.description}
                </p>
              )}
              
              {/* Store Contact Info */}
              <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
                {store.email && (
                  <div className="flex items-center space-x-2">
                    <span>📧</span>
                    <a href={`mailto:${store.email}`} className="hover:underline">
                      {store.email}
                    </a>
                  </div>
                )}
                {store.phone && (
                  <div className="flex items-center space-x-2">
                    <span>📞</span>
                    <a href={`tel:${store.phone}`} className="hover:underline">
                      {store.phone}
                    </a>
                  </div>
                )}
                {store.website && (
                  <div className="flex items-center space-x-2">
                    <span>🌐</span>
                    <a 
                      href={store.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
              
              {store.address && (
                <div className="mt-4 text-sm text-gray-600">
                  <span>📍</span> {store.address}, {store.city}, {store.country}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {categories.map((category) => (
                  <a
                    key={category.id}
                    href={`/store/${tenantSlug}/category/${category.slug}`}
                    className="block p-6 border rounded-lg hover:shadow-md transition-shadow text-center"
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Tag className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Featured Products */}
        {products.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
              <a 
                href={`/store/${tenantSlug}/products`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Products →
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.slice(0, 8).map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <a href={`/store/${tenantSlug}/product/${product.slug}`}>
                    <div className="aspect-square rounded-t-lg overflow-hidden bg-gray-100">
                      {product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                      {product.category && (
                        <p className="text-sm text-gray-500 mb-2">{product.category.name}</p>
                      )}
                      <div className="flex items-baseline space-x-2">
                        <span className="text-lg font-bold text-gray-900">
                          ₺{product.price.toLocaleString()}
                        </span>
                        {product.basePrice && product.basePrice > product.price && (
                          <span className="text-sm text-gray-500 line-through">
                            ₺{product.basePrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        {product.isActive ? (
                          <span className="text-xs text-green-600 font-medium">In Stock</span>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">Out of Stock</span>
                        )}
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {categories.length === 0 && products.length === 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <Grid3X3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Store is empty</h3>
              <p className="text-gray-600">This store hasn't added any products or categories yet.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default StorePage;
