import React, { useState, useEffect } from 'react';
import type { CustomerGroup } from '../../types/b2b';
import type { ProductVariant } from '../../types/product';
import { b2bService } from '../../services/b2b.service';

interface ProductWithVariants {
  id: string;
  name: string;
  variants: ProductVariant[];
}

const AdminProductPricing: React.FC = () => {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, { wholesalePrice: string; groupPrices: Record<string, string> }>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, productsData] = await Promise.all([
        b2bService.getCustomerGroups(),
        loadProducts()
      ]);
      
      setGroups(groupsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (): Promise<ProductWithVariants[]> => {
    // This would typically come from your products service
    // For now, using mock data structure
    const response = await fetch('/api/products?include=variants');
    const data = await response.json();
    
    return data.map((product: any) => ({
      id: product.id,
      name: product.name,
      variants: product.variants || []
    }));
  };

  const handleProductSelect = (product: ProductWithVariants) => {
    setSelectedProduct(product);
    
    // Initialize form data with current pricing
    const initialFormData: Record<string, { wholesalePrice: string; groupPrices: Record<string, string> }> = {};
    
    product.variants.forEach(variant => {
      initialFormData[variant.id] = {
        wholesalePrice: variant.wholesalePrice?.toString() || '',
        groupPrices: groups.reduce((acc, group) => {
          acc[group.id] = variant.groupPrices?.[group.id]?.toString() || '';
          return acc;
        }, {} as Record<string, string>)
      };
    });
    
    setFormData(initialFormData);
  };

  const handleVariantPriceChange = (variantId: string, field: 'wholesalePrice', value: string) => {
    setFormData(prev => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [field]: value
      }
    }));
  };

  const handleGroupPriceChange = (variantId: string, groupId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        groupPrices: {
          ...prev[variantId].groupPrices,
          [groupId]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedProduct) return;
    
    try {
      setSaving(true);
      
      // Save pricing for each variant
      const savePromises = selectedProduct.variants.map(async (variant) => {
        const data = formData[variant.id];
        
        const wholesalePrice = data.wholesalePrice ? parseFloat(data.wholesalePrice) : undefined;
        const groupPrices: Record<string, number> = {};
        
        Object.entries(data.groupPrices).forEach(([groupId, price]) => {
          if (price) {
            groupPrices[groupId] = parseFloat(price);
          }
        });
        
        return b2bService.updateProductGroupPricing(
          variant.id,
          wholesalePrice,
          Object.keys(groupPrices).length > 0 ? groupPrices : undefined
        );
      });
      
      await Promise.all(savePromises);
      
      // Reload data to show updated prices
      await loadData();
      
      alert('Fiyatlar başarıyla güncellendi!');
    } catch (error) {
      console.error('Error saving pricing:', error);
      alert('Fiyatlar güncellenirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price?: number) => {
    return price ? `₺${price.toFixed(2)}` : '-';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ürün Fiyatlandırma</h1>
        <p className="text-gray-600 mt-2">Ürünlerin müşteri gruplarına özel fiyatlarını belirleyin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Ürünler</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                  selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                <div className="text-sm text-gray-500">{product.variants.length} varyant</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Form */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          {selectedProduct ? (
            <>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">{selectedProduct.name}</h2>
                    <p className="text-sm text-gray-500">Varyant bazlı fiyatlandırma</p>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Group Headers */}
                <div className="grid grid-cols-1 gap-6 mb-6">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700">
                    <div>Varyant</div>
                    <div>Toptan Fiyat</div>
                    <div className="col-span-2">Grup Fiyatları</div>
                  </div>
                </div>

                {/* Variant Rows */}
                <div className="space-y-6">
                  {selectedProduct.variants.map((variant) => (
                    <div key={variant.id} className="border-b border-gray-200 pb-6 last:border-0">
                      <div className="grid grid-cols-1 gap-4">
                        {/* Variant Info */}
                        <div className="text-sm font-medium text-gray-900">
                          {Object.values(variant.combination).join(' / ') || variant.sku}
                          {variant.sku && <span className="text-gray-500 ml-2">({variant.sku})</span>}
                        </div>
                        <div className="text-sm text-gray-500">
                          Normal Fiyat: {formatPrice(variant.price)}
                        </div>

                        {/* Pricing Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Wholesale Price */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Toptan Fiyat
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData[variant.id]?.wholesalePrice || ''}
                              onChange={(e) => handleVariantPriceChange(variant.id, 'wholesalePrice', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Group Prices */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Grup Fiyatları
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {groups.map((group) => (
                                <div key={group.id} className="flex items-center space-x-2">
                                  <label className="text-xs text-gray-600 w-20">{group.name}:</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData[variant.id]?.groupPrices?.[group.id] || ''}
                                    onChange={(e) => handleGroupPriceChange(variant.id, group.id, e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Current Pricing Display */}
                        {(variant.wholesalePrice || variant.groupPrices) && (
                          <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
                            <div className="font-medium text-gray-700 mb-2">Mevcut Fiyatlar:</div>
                            <div className="space-y-1">
                              {variant.wholesalePrice && (
                                <div>Toptan: {formatPrice(variant.wholesalePrice)}</div>
                              )}
                              {variant.groupPrices && Object.entries(variant.groupPrices).map(([groupId, price]) => {
                                const group = groups.find(g => g.id === groupId);
                                return group ? (
                                  <div key={groupId}>{group.name}: {formatPrice(price)}</div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>Fiyatlandırma yapılacak bir ürün seçin</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProductPricing;
