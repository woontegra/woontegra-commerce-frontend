import { useState } from 'react';
import type { SearchFilters, SortOption } from '../../types/productSearch';
import { productSearchService } from '../../services/productSearch.service';

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  filterOptions: {
    categories: Array<{ id: string; name: string; count: number }>;
    colors: Array<{ value: string; count: number }>;
    sizes: Array<{ value: string; count: number }>;
    priceRange: { min: number; max: number };
  };
}

export default function FilterPanel({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  filterOptions,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePriceChange = (min?: number, max?: number) => {
    onFiltersChange({
      ...filters,
      minPrice: min,
      maxPrice: max,
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const current = filters.categoryIds || [];
    const updated = current.includes(categoryId)
      ? current.filter(id => id !== categoryId)
      : [...current, categoryId];
    
    onFiltersChange({
      ...filters,
      categoryIds: updated.length > 0 ? updated : undefined,
    });
  };

  const handleColorToggle = (color: string) => {
    const current = filters.colors || [];
    const updated = current.includes(color)
      ? current.filter(c => c !== color)
      : [...current, color];
    
    onFiltersChange({
      ...filters,
      colors: updated.length > 0 ? updated : undefined,
    });
  };

  const handleSizeToggle = (size: string) => {
    const current = filters.sizes || [];
    const updated = current.includes(size)
      ? current.filter(s => s !== size)
      : [...current, size];
    
    onFiltersChange({
      ...filters,
      sizes: updated.length > 0 ? updated : undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = 
    (filters.categoryIds?.length || 0) +
    (filters.colors?.length || 0) +
    (filters.sizes?.length || 0) +
    (filters.minPrice !== undefined ? 1 : 0) +
    (filters.maxPrice !== undefined ? 1 : 0);

  const sortOptions: SortOption[] = [
    'newest',
    'price_asc',
    'price_desc',
    'sales_desc',
    'name_asc',
    'name_desc',
  ];

  return (
    <div className="space-y-4">
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
        >
          <span className="font-medium">Filtrele & Sırala</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      <div className={`${isOpen ? 'block' : 'hidden'} lg:block space-y-6`}>
        {/* Sort */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Sıralama</h3>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full input-standard"
          >
            {sortOptions.map(option => (
              <option key={option} value={option}>
                {productSearchService.getSortLabel(option)}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Fiyat Aralığı</h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice || ''}
              onChange={(e) => handlePriceChange(
                e.target.value ? parseFloat(e.target.value) : undefined,
                filters.maxPrice
              )}
              className="input-standard"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice || ''}
              onChange={(e) => handlePriceChange(
                filters.minPrice,
                e.target.value ? parseFloat(e.target.value) : undefined
              )}
              className="input-standard"
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            ₺{filterOptions.priceRange.min} - ₺{filterOptions.priceRange.max}
          </div>
        </div>

        {/* Categories */}
        {filterOptions.categories.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Kategoriler</h3>
            <div className="space-y-2">
              {filterOptions.categories.map(category => (
                <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.categoryIds?.includes(category.id) || false}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {category.name} ({category.count})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Colors */}
        {filterOptions.colors.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Renk</h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.colors.map(color => (
                <button
                  key={color.value}
                  onClick={() => handleColorToggle(color.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                    filters.colors?.includes(color.value)
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {color.value} ({color.count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sizes */}
        {filterOptions.sizes.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Beden</h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.sizes.map(size => (
                <button
                  key={size.value}
                  onClick={() => handleSizeToggle(size.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                    filters.sizes?.includes(size.value)
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {size.value} ({size.count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="w-full py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
          >
            Filtreleri Temizle ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );
}
