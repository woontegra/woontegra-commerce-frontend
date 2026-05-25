import React, { useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';

const FilterPanel: React.FC = () => {
  const {
    filters,
    filterOptions,
    optionsLoading,
    toggleAttribute,
    setPriceRange,
    setCategory,
    setBrand,
    toggleInStock,
    clearFilters,
    clearFilter,
    isAttributeSelected,
    getActiveFilterCount,
  } = useFilters();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    price: true,
    attributes: true,
    brand: true,
  });

  const [priceMin, setPriceMin] = useState(filters.minPrice?.toString() || '');
  const [priceMax, setPriceMax] = useState(filters.maxPrice?.toString() || '');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePriceSubmit = () => {
    const min = priceMin ? parseFloat(priceMin) : undefined;
    const max = priceMax ? parseFloat(priceMax) : undefined;
    setPriceRange(min, max);
  };

  const activeFilterCount = getActiveFilterCount();

  if (optionsLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filtreler</h2>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Temizle
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-200">
        {/* Categories */}
        {filterOptions?.categories && filterOptions.categories.length > 0 && (
          <div className="p-4">
            <button
              onClick={() => toggleSection('category')}
              className="w-full flex items-center justify-between mb-3"
            >
              <h3 className="font-medium text-gray-900">Kategori</h3>
              {expandedSections.category ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {expandedSections.category && (
              <div className="space-y-2">
                {filterOptions.categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="category"
                        checked={filters.categorySlug === category.slug}
                        onChange={() => setCategory(category.slug)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">({category.count})</span>
                  </label>
                ))}
                {filters.categorySlug && (
                  <button
                    onClick={() => clearFilter('categorySlug')}
                    className="text-xs text-blue-600 hover:text-blue-700 ml-6"
                  >
                    Kategori filtresini kaldır
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Price Range */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('price')}
            className="w-full flex items-center justify-between mb-3"
          >
            <h3 className="font-medium text-gray-900">Fiyat Aralığı</h3>
            {expandedSections.price ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.price && (
            <div className="space-y-3">
              {filterOptions?.priceRange && (
                <div className="text-xs text-gray-500 mb-2">
                  {filterOptions.priceRange.min.toLocaleString('tr-TR')} ₺ - {filterOptions.priceRange.max.toLocaleString('tr-TR')} ₺
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={handlePriceSubmit}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Uygula
              </button>
              
              {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
                <button
                  onClick={() => {
                    setPriceMin('');
                    setPriceMax('');
                    setPriceRange(undefined, undefined);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Fiyat filtresini kaldır
                </button>
              )}
            </div>
          )}
        </div>

        {/* Attributes (Color, Size, etc.) */}
        {filterOptions?.attributes && filterOptions.attributes.map((attribute) => (
          <div key={attribute.id} className="p-4">
            <button
              onClick={() => toggleSection(`attr-${attribute.slug}`)}
              className="w-full flex items-center justify-between mb-3"
            >
              <h3 className="font-medium text-gray-900">{attribute.name}</h3>
              {expandedSections[`attr-${attribute.slug}`] !== false ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {expandedSections[`attr-${attribute.slug}`] !== false && (
              <div className="space-y-2">
                {attribute.values.map((value) => (
                  <label
                    key={value.value}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isAttributeSelected(attribute.slug, value.value)}
                        onChange={() => toggleAttribute(attribute.slug, value.value)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <span className="text-sm text-gray-700">{value.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">({value.count})</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Brands */}
        {filterOptions?.brands && filterOptions.brands.length > 0 && (
          <div className="p-4">
            <button
              onClick={() => toggleSection('brand')}
              className="w-full flex items-center justify-between mb-3"
            >
              <h3 className="font-medium text-gray-900">Marka</h3>
              {expandedSections.brand ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {expandedSections.brand && (
              <div className="space-y-2">
                {filterOptions.brands.map((brand) => (
                  <label
                    key={brand.name}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="brand"
                        checked={filters.brand === brand.name}
                        onChange={() => setBrand(brand.name)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{brand.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">({brand.count})</span>
                  </label>
                ))}
                {filters.brand && (
                  <button
                    onClick={() => clearFilter('brand')}
                    className="text-xs text-blue-600 hover:text-blue-700 ml-6"
                  >
                    Marka filtresini kaldır
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stock Filter */}
        <div className="p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.inStock || false}
              onChange={toggleInStock}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
            />
            <span className="text-sm text-gray-700">Sadece stokta olanlar</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
