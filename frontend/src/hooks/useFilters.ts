import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { filterService } from '../services/filter.service';
import type { ProductFilters, FilterOptions } from '../types/filter';

export const useFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<ProductFilters>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Parse URL params on mount and when they change
  useEffect(() => {
    const parsedFilters = filterService.parseUrlParams(searchParams);
    setFilters(parsedFilters);
  }, [searchParams]);

  // Load filter options
  const loadFilterOptions = useCallback(async () => {
    try {
      setOptionsLoading(true);
      const response = await filterService.getFilterOptions(filters);
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setOptionsLoading(false);
    }
  }, [filters]);

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await filterService.getFilteredProducts(filters);
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load both on filter change
  useEffect(() => {
    loadProducts();
    loadFilterOptions();
  }, [loadProducts, loadFilterOptions]);

  // Update filters and URL
  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    const updated = { ...filters, ...newFilters };
    
    // Reset page when filters change (except when changing page itself)
    if (!newFilters.page) {
      updated.page = 1;
    }
    
    setFilters(updated);
    
    // Update URL
    const params = filterService.filtersToUrlParams(updated);
    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Toggle attribute filter
  const toggleAttribute = useCallback((attributeSlug: string, value: string) => {
    const currentValues = filters.attributes?.[attributeSlug] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];

    const newAttributes = { ...filters.attributes };
    
    if (newValues.length === 0) {
      delete newAttributes[attributeSlug];
    } else {
      newAttributes[attributeSlug] = newValues;
    }

    updateFilters({
      attributes: Object.keys(newAttributes).length > 0 ? newAttributes : undefined,
    });
  }, [filters, updateFilters]);

  // Set price range
  const setPriceRange = useCallback((min?: number, max?: number) => {
    updateFilters({ minPrice: min, maxPrice: max });
  }, [updateFilters]);

  // Set category
  const setCategory = useCallback((categorySlug?: string) => {
    updateFilters({ categorySlug });
  }, [updateFilters]);

  // Set brand
  const setBrand = useCallback((brand?: string) => {
    updateFilters({ brand });
  }, [updateFilters]);

  // Toggle stock filter
  const toggleInStock = useCallback(() => {
    updateFilters({ inStock: !filters.inStock });
  }, [filters, updateFilters]);

  // Set sort
  const setSort = useCallback((sortBy?: string) => {
    updateFilters({ sortBy: sortBy as any });
  }, [updateFilters]);

  // Set search
  const setSearch = useCallback((search?: string) => {
    updateFilters({ search });
  }, [updateFilters]);

  // Set page
  const setPage = useCallback((page: number) => {
    updateFilters({ page });
  }, [updateFilters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Clear specific filter
  const clearFilter = useCallback((filterKey: keyof ProductFilters) => {
    const updated = { ...filters };
    delete updated[filterKey];
    setFilters(updated);
    
    const params = filterService.filtersToUrlParams(updated);
    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Check if attribute value is selected
  const isAttributeSelected = useCallback((attributeSlug: string, value: string) => {
    return filters.attributes?.[attributeSlug]?.includes(value) || false;
  }, [filters]);

  // Get active filter count
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    
    if (filters.categorySlug) count++;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count++;
    if (filters.brand) count++;
    if (filters.inStock) count++;
    if (filters.attributes) {
      count += Object.keys(filters.attributes).length;
    }
    
    return count;
  }, [filters]);

  return {
    // State
    filters,
    filterOptions,
    products,
    pagination,
    loading,
    optionsLoading,
    
    // Actions
    updateFilters,
    toggleAttribute,
    setPriceRange,
    setCategory,
    setBrand,
    toggleInStock,
    setSort,
    setSearch,
    setPage,
    clearFilters,
    clearFilter,
    
    // Helpers
    isAttributeSelected,
    getActiveFilterCount,
    refresh: loadProducts,
  };
};
