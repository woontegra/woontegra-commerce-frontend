import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import SEOHead from '../../components/SEO/SEOHead';
import { Loader2, Package, AlertCircle, Grid3X3 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  parentId?: string;
  children?: Category[];
}

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

interface CategoryResponse {
  success: boolean;
  data: {
    category: Category;
    structuredData: object;
  };
}

const CategoryPage: React.FC = () => {
  const { tenantSlug, categorySlug } = useParams<{ tenantSlug: string; categorySlug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategory = async () => {
      if (!tenantSlug || !categorySlug) return;

      try {
        setLoading(true);
        const response = await axios.get<CategoryResponse>(
          `${import.meta.env.VITE_API_URL}/api/seo/store/${tenantSlug}/category/${categorySlug}`
        );

        if (response.data.success) {
          setCategory(response.data.data.category);
          // Fetch products for this category
          const productsResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/products?categoryId=${response.data.data.category.id}`
          );
          setProducts(productsResponse.data.data || []);
        } else {
          setError('Category not found');
        }
      } catch (err) {
        setError('Failed to load category');
        console.error('Error fetching category:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [tenantSlug, categorySlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Category Not Found</h1>
          <p className="text-gray-600">{error || 'This category does not exist or has been removed.'}</p>
        </div>
      </div>
    );
  }

  // SEO Data
  const baseUrl = import.meta.env.VITE_FRONTEND_URL || 'https://localhost:3000';
  const categoryUrl = `${baseUrl}/store/${tenantSlug}/category/${categorySlug}`;
  const title = category.seoTitle || category.name;
  const description = category.seoDescription || category.description || `Browse ${category.name} products`;

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        url={categoryUrl}
        type="website"
        keywords={`${category.name}, products, ${tenantSlug}`}
        structuredData={category} // This would be the structuredData from API response
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <nav className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16 space-x-2 text-sm">
              <a href={`/store/${tenantSlug}`} className="text-gray-500 hover:text-gray-700">
                Home
              </a>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900">{category.name}</span>
            </div>
          </div>
        </nav>

        {/* Category Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{category.name}</h1>
              {category.description && (
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Subcategories */}
        {category.children && category.children.length > 0 && (
          <div className="bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Subcategories</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {category.children.map((child) => (
                  <a
                    key={child.id}
                    href={`/store/${tenantSlug}/category/${child.slug}`}
                    className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-medium text-gray-900">{child.name}</h3>
                    {child.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{child.description}</p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Products ({products.length})
            </h2>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
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
          ) : (
            <div className="text-center py-12">
              <Grid3X3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">There are no products in this category yet.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CategoryPage;
