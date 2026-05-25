import apiClient from './apiClient';
import type { ProductFilters, FilteredProductsResponse, FilterOptionsResponse } from '../types/filter';

export const filterService = {
  /**
   * Get filtered products
   */
  async getFilteredProducts(filters: ProductFilters): Promise<FilteredProductsResponse> {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get('/products/filter', { params });
    return response.data;
  },

  /**
   * Get available filter options
   */
  async getFilterOptions(currentFilters?: ProductFilters): Promise<FilterOptionsResponse> {
    const params = currentFilters ? this.buildQueryParams(currentFilters) : {};
    const response = await apiClient.get('/products/filter/options', { params });
    return response.data;
  },

  /**
   * Build query params from filters
   */
  buildQueryParams(filters: ProductFilters): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.categorySlug) {
      params.category = filters.categorySlug;
    }

    if (filters.minPrice !== undefined) {
      params.minPrice = filters.minPrice;
    }

    if (filters.maxPrice !== undefined) {
      params.maxPrice = filters.maxPrice;
    }

    if (filters.brand) {
      params.brand = filters.brand;
    }

    if (filters.inStock) {
      params.inStock = 'true';
    }

    if (filters.search) {
      params.search = filters.search;
    }

    if (filters.sortBy) {
      params.sort = filters.sortBy;
    }

    if (filters.page) {
      params.page = filters.page;
    }

    if (filters.limit) {
      params.limit = filters.limit;
    }

    // Add attribute filters
    if (filters.attributes) {
      Object.entries(filters.attributes).forEach(([key, values]) => {
        params[key] = values.join(',');
      });
    }

    return params;
  },

  /**
   * Parse URL search params to filters
   */
  parseUrlParams(searchParams: URLSearchParams): ProductFilters {
    const filters: ProductFilters = {};

    const category = searchParams.get('category');
    if (category) filters.categorySlug = category;

    const minPrice = searchParams.get('minPrice');
    if (minPrice) filters.minPrice = parseFloat(minPrice);

    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);

    const brand = searchParams.get('brand');
    if (brand) filters.brand = brand;

    const inStock = searchParams.get('inStock');
    if (inStock === 'true') filters.inStock = true;

    const search = searchParams.get('search') || searchParams.get('q');
    if (search) filters.search = search;

    const sort = searchParams.get('sort');
    if (sort) filters.sortBy = sort as any;

    const page = searchParams.get('page');
    if (page) filters.page = parseInt(page);

    const limit = searchParams.get('limit');
    if (limit) filters.limit = parseInt(limit);

    // Parse attribute filters
    const attributes: Record<string, string[]> = {};
    const knownParams = ['category', 'minPrice', 'maxPrice', 'brand', 'inStock', 'search', 'q', 'sort', 'page', 'limit'];
    
    searchParams.forEach((value, key) => {
      if (!knownParams.includes(key)) {
        attributes[key] = value.split(',').map(v => v.trim());
      }
    });

    if (Object.keys(attributes).length > 0) {
      filters.attributes = attributes;
    }

    return filters;
  },

  /**
   * Convert filters to URL search params
   */
  filtersToUrlParams(filters: ProductFilters): URLSearchParams {
    const params = new URLSearchParams();

    if (filters.categorySlug) {
      params.set('category', filters.categorySlug);
    }

    if (filters.minPrice !== undefined) {
      params.set('minPrice', filters.minPrice.toString());
    }

    if (filters.maxPrice !== undefined) {
      params.set('maxPrice', filters.maxPrice.toString());
    }

    if (filters.brand) {
      params.set('brand', filters.brand);
    }

    if (filters.inStock) {
      params.set('inStock', 'true');
    }

    if (filters.search) {
      params.set('search', filters.search);
    }

    if (filters.sortBy) {
      params.set('sort', filters.sortBy);
    }

    if (filters.page && filters.page > 1) {
      params.set('page', filters.page.toString());
    }

    if (filters.limit) {
      params.set('limit', filters.limit.toString());
    }

    // Add attribute filters
    if (filters.attributes) {
      Object.entries(filters.attributes).forEach(([key, values]) => {
        if (values.length > 0) {
          params.set(key, values.join(','));
        }
      });
    }

    return params;
  },
};
