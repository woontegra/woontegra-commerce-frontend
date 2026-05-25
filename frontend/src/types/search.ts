// Search Filters
export interface SearchFilters {
  query?: string;              // Ürün adı
  categoryIds?: string[];      // Kategori
  minPrice?: number;           // Min fiyat
  maxPrice?: number;           // Max fiyat
  variantOptions?: Record<string, string[]>; // {"color": ["Red", "Blue"], "size": ["M", "L"]}
  inStock?: boolean;           // Stokta olanlar
  sortBy?: SortOption;         // Sıralama
}

export type SortOption = 
  | 'relevance'      // İlgililik
  | 'price_asc'      // Fiyat artan
  | 'price_desc'     // Fiyat azalan
  | 'name_asc'       // İsim A-Z
  | 'name_desc'      // İsim Z-A
  | 'newest'         // En yeni
  | 'popular';       // Popüler

// Search Result
export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  image?: string;
  categoryId?: string;
  categoryName?: string;
  variants?: ProductVariantInfo[];
  inStock: boolean;
  relevanceScore?: number;
}

export interface ProductVariantInfo {
  id: string;
  name: string;
  options: Record<string, string>; // {"color": "Red", "size": "M"}
  price: number;
  inStock: boolean;
}

// Search Suggestions
export interface SearchSuggestion {
  type: 'product' | 'category' | 'brand';
  id: string;
  text: string;
  image?: string;
  count?: number;
}

// Search History
export interface SearchHistory {
  query: string;
  timestamp: string;
  resultCount: number;
}

// Facets (for filter counts)
export interface SearchFacets {
  categories: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  priceRanges: Array<{
    min: number;
    max: number;
    count: number;
  }>;
  variants: Record<string, Array<{
    value: string;
    count: number;
  }>>;
}

// Live Search Types
export interface LiveSearchProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  category?: {
    name: string;
    slug: string;
  };
  stock?: {
    quantity: number;
  };
}

export interface LiveSearchCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  _count: {
    products: number;
  };
}

export interface LiveSearchResults {
  products: LiveSearchProduct[];
  categories: LiveSearchCategory[];
  total: number;
}

export interface LiveSearchResponse {
  success: boolean;
  data: LiveSearchResults;
}
