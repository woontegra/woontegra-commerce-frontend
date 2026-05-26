import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import SEOHead from '../../components/SEO/SEOHead';
import { Loader2, Package, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  basePrice?: number;
  images: string[];
  seoTitle?: string;
  seoDescription?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
}

interface ProductResponse {
  success: boolean;
  data: {
    product: Product;
    structuredData: object;
  };
}

const ProductPage: React.FC = () => {
  const { tenantSlug, productSlug } = useParams<{ tenantSlug: string; productSlug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!tenantSlug || !productSlug) return;

      try {
        setLoading(true);
        const response = await axios.get<ProductResponse>(
          `${import.meta.env.VITE_API_URL}/seo/store/${tenantSlug}/product/${productSlug}`
        );

        if (response.data.success) {
          setProduct(response.data.data.product);
          // Store data would be included in the response or fetched separately
          setStore({
            id: response.data.data.product.id, // This would come from tenant data
            name: 'Store Name', // This would come from tenant data
            slug: tenantSlug,
          });
        } else {
          setError('Product not found');
        }
      } catch (err) {
        setError('Failed to load product');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [tenantSlug, productSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
          <p className="text-gray-600">{error || 'This product does not exist or has been removed.'}</p>
        </div>
      </div>
    );
  }

  // SEO Data
  const baseUrl = import.meta.env.VITE_FRONTEND_URL || 'https://localhost:3000';
  const productUrl = `${baseUrl}/store/${tenantSlug}/product/${productSlug}`;
  const title = product.seoTitle || product.name;
  const description = product.seoDescription || product.description;
  const image = product.images.length > 0 ? product.images[0] : undefined;

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        url={productUrl}
        image={image}
        type="product"
        keywords={`${product.name}, ${product.category?.name}, ${store?.name}`}
        structuredData={product} // This would be the structuredData from API response
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
              {product.category && (
                <>
                  <a 
                    href={`/store/${tenantSlug}/category/${product.category.slug}`}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {product.category.name}
                  </a>
                  <span className="text-gray-400">/</span>
                </>
              )}
              <span className="text-gray-900">{product.name}</span>
            </div>
          </div>
        </nav>

        {/* Product Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Images */}
            <div className="space-y-4">
              {product.images.length > 0 ? (
                <div className="aspect-square rounded-lg overflow-hidden bg-white">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square rounded-lg bg-gray-200 flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                {product.category && (
                  <p className="text-sm text-gray-500">
                    Category: <a href={`/store/${tenantSlug}/category/${product.category.slug}`} className="hover:underline">
                      {product.category.name}
                    </a>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold text-gray-900">
                    ₺{product.price.toLocaleString()}
                  </span>
                  {product.basePrice && product.basePrice > product.price && (
                    <span className="text-lg text-gray-500 line-through">
                      ₺{product.basePrice.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="prose max-w-none">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                <div 
                  className="text-gray-600 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>

              {/* Additional product info */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">Product ID:</span>
                    <p className="text-gray-600">{product.id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Status:</span>
                    <p className="text-gray-600">
                      {product.isActive ? (
                        <span className="text-green-600">In Stock</span>
                      ) : (
                        <span className="text-red-600">Out of Stock</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductPage;
