export interface ProductFilters {
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  attributes?: Record<string, string[]>; // { color: ['red', 'blue'], size: ['M', 'L'] }
  search?: string;
  brand?: string;
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface AttributeFilter {
  id: string;
  name: string;
  slug: string;
  type: string;
  values: FilterOption[];
}

export interface CategoryFilter {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface BrandFilter {
  name: string;
  count: number;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface FilterOptions {
  categories: CategoryFilter[];
  priceRange: PriceRange;
  attributes: AttributeFilter[];
  brands: BrandFilter[];
}

export interface FilteredProductsResponse {
  success: boolean;
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface FilterOptionsResponse {
  success: boolean;
  data: FilterOptions;
}

export type SortOption = {
  value: string;
  label: string;
};

export const SORT_OPTIONS: SortOption[] = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'popular', label: 'En Popüler' },
  { value: 'price_asc', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'name_asc', label: 'İsim: A-Z' },
  { value: 'name_desc', label: 'İsim: Z-A' },
];
