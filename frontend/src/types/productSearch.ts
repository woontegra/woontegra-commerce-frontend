// Advanced Product Search and Filter System

export interface SearchFilters {
  // Search query
  query?: string;
  
  // Price range
  minPrice?: number;
  maxPrice?: number;
  
  // Category
  categoryIds?: string[];
  
  // Variants
  colors?: string[];
  sizes?: string[];
  
  // Stock status
  inStock?: boolean;
  
  // Other filters
  tags?: string[];
}

export type SortOption = 
  | 'price_asc'       // Fiyat: Düşükten Yükseğe
  | 'price_desc'      // Fiyat: Yüksekten Düşüğe
  | 'sales_desc'      // En Çok Satan
  | 'newest'          // En Yeni
  | 'name_asc'        // İsim: A-Z
  | 'name_desc';      // İsim: Z-A

export interface SearchOptions {
  filters: SearchFilters;
  sort: SortOption;
  page: number;
  limit: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface PriceRange {
  min: number;
  max: number;
}
