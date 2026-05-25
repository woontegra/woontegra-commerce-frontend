import React from 'react';
import { X } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';

const ActiveFilters: React.FC = () => {
  const {
    filters,
    filterOptions,
    clearFilter,
    clearFilters,
    getActiveFilterCount,
    toggleAttribute,
  } = useFilters();

  const activeFilterCount = getActiveFilterCount();

  if (activeFilterCount === 0) {
    return null;
  }

  const getCategoryName = (slug: string) => {
    return filterOptions?.categories.find(c => c.slug === slug)?.name || slug;
  };

  const getAttributeLabel = (attrSlug: string, value: string) => {
    const attr = filterOptions?.attributes.find(a => a.slug === attrSlug);
    const valueObj = attr?.values.find(v => v.value === value);
    return valueObj?.label || value;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">
          Aktif Filtreler ({activeFilterCount})
        </h3>
        <button
          onClick={clearFilters}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Tümünü Temizle
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Category */}
        {filters.categorySlug && (
          <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm">
            <span>Kategori: {getCategoryName(filters.categorySlug)}</span>
            <button
              onClick={() => clearFilter('categorySlug')}
              className="hover:bg-blue-200 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Price Range */}
        {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
          <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm">
            <span>
              Fiyat: {filters.minPrice || 0} ₺ - {filters.maxPrice || '∞'} ₺
            </span>
            <button
              onClick={() => {
                clearFilter('minPrice');
                clearFilter('maxPrice');
              }}
              className="hover:bg-green-200 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Brand */}
        {filters.brand && (
          <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm">
            <span>Marka: {filters.brand}</span>
            <button
              onClick={() => clearFilter('brand')}
              className="hover:bg-purple-200 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Stock */}
        {filters.inStock && (
          <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm">
            <span>Stokta Var</span>
            <button
              onClick={() => clearFilter('inStock')}
              className="hover:bg-amber-200 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Attributes */}
        {filters.attributes && Object.entries(filters.attributes).map(([attrSlug, values]) => (
          values.map(value => (
            <div
              key={`${attrSlug}-${value}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-800 rounded-full text-sm"
            >
              <span>{getAttributeLabel(attrSlug, value)}</span>
              <button
                onClick={() => toggleAttribute(attrSlug, value)}
                className="hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        ))}
      </div>
    </div>
  );
};

export default ActiveFilters;
