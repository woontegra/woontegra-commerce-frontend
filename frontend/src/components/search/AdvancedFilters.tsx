import { useState } from 'react';
import type { SearchFilters, SearchFacets } from '../../types/search';

interface AdvancedFiltersProps {
  filters: SearchFilters;
  facets?: SearchFacets;
  onFiltersChange: (filters: SearchFilters) => void;
}

export default function AdvancedFilters({ filters, facets, onFiltersChange }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {};
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const toggleCategory = (categoryId: string) => {
    const current = localFilters.categoryIds || [];
    const updated = current.includes(categoryId)
      ? current.filter(id => id !== categoryId)
      : [...current, categoryId];
    
    setLocalFilters({ ...localFilters, categoryIds: updated });
  };

  const toggleVariant = (optionName: string, value: string) => {
    const current = localFilters.variantOptions || {};
    const currentValues = current[optionName] || [];
    
    const updated = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    setLocalFilters({
      ...localFilters,
      variantOptions: {
        ...current,
        [optionName]: updated,
      },
    });
  };

  const activeFilterCount = 
    (localFilters.categoryIds?.length || 0) +
    (localFilters.minPrice !== undefined ? 1 : 0) +
    (localFilters.maxPrice !== undefined ? 1 : 0) +
    Object.values(localFilters.variantOptions || {}).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="font-medium">Filtrele</span>
        {activeFilterCount > 0 && (
          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-[600px] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Filtreler</h3>
                <button
                  onClick={handleReset}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Temizle
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Categories */}
              {facets?.categories && facets.categories.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Kategoriler</h4>
                  <div className="space-y-2">
                    {facets.categories.map((category) => (
                      <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localFilters.categoryIds?.includes(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                          {category.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({category.count})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Fiyat Aralığı</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Min
                    </label>
                    <input
                      type="number"
                      value={localFilters.minPrice || ''}
                      onChange={(e) => setLocalFilters({
                        ...localFilters,
                        minPrice: e.target.value ? Number(e.target.value) : undefined,
                      })}
                      placeholder="₺0"
                      className="input-standard w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Max
                    </label>
                    <input
                      type="number"
                      value={localFilters.maxPrice || ''}
                      onChange={(e) => setLocalFilters({
                        ...localFilters,
                        maxPrice: e.target.value ? Number(e.target.value) : undefined,
                      })}
                      placeholder="₺10000"
                      className="input-standard w-full"
                    />
                  </div>
                </div>

                {/* Price Range Suggestions */}
                {facets?.priceRanges && facets.priceRanges.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {facets.priceRanges.map((range, index) => (
                      <button
                        key={index}
                        onClick={() => setLocalFilters({
                          ...localFilters,
                          minPrice: range.min,
                          maxPrice: range.max,
                        })}
                        className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        ₺{range.min.toFixed(0)} - ₺{range.max.toFixed(0)}
                        <span className="text-xs text-gray-400 ml-2">
                          ({range.count})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Variants */}
              {facets?.variants && Object.keys(facets.variants).length > 0 && (
                <>
                  {Object.entries(facets.variants).map(([optionName, values]) => (
                    <div key={optionName}>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 capitalize">
                        {optionName}
                      </h4>
                      <div className="space-y-2">
                        {values.map((item) => (
                          <label key={item.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localFilters.variantOptions?.[optionName]?.includes(item.value)}
                              onChange={() => toggleVariant(optionName, item.value)}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                              {item.value}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({item.count})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Stock Filter */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.inStock || false}
                    onChange={(e) => setLocalFilters({
                      ...localFilters,
                      inStock: e.target.checked,
                    })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Sadece stokta olanlar
                  </span>
                </label>
              </div>
            </div>

            {/* Apply Button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleApply}
                className="w-full btn-primary"
              >
                Uygula
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
