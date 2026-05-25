import type { SearchFilters, SearchResult, SearchSuggestion, SearchFacets } from '../types/search';

class SearchService {
  private searchHistory: string[] = [];

  // Main search function
  async search(filters: SearchFilters): Promise<{
    results: SearchResult[];
    facets: SearchFacets;
    total: number;
  }> {
    // In production, this would call your backend API
    // For now, we'll simulate with mock data
    
    const query = new URLSearchParams();
    
    if (filters.query) query.append('q', filters.query);
    if (filters.categoryIds?.length) query.append('categories', filters.categoryIds.join(','));
    if (filters.minPrice) query.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) query.append('maxPrice', filters.maxPrice.toString());
    if (filters.inStock) query.append('inStock', 'true');
    if (filters.sortBy) query.append('sort', filters.sortBy);
    
    // Variant filters
    if (filters.variantOptions) {
      Object.entries(filters.variantOptions).forEach(([key, values]) => {
        query.append(`variant_${key}`, values.join(','));
      });
    }

    // Save to history
    if (filters.query) {
      this.addToHistory(filters.query);
    }

    // Mock response - replace with actual API call
    return {
      results: [],
      facets: {
        categories: [],
        priceRanges: [],
        variants: {},
      },
      total: 0,
    };
  }

  // Live search with suggestions
  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (!query || query.length < 2) return [];

    // In production, call backend API
    // Mock suggestions
    return [
      {
        type: 'product',
        id: '1',
        text: 'Premium T-Shirt',
        image: '/images/tshirt.jpg',
      },
      {
        type: 'category',
        id: 'cat-1',
        text: 'T-Shirts',
        count: 45,
      },
    ];
  }

  // Filter products by criteria
  filterProducts(
    products: SearchResult[],
    filters: SearchFilters
  ): SearchResult[] {
    let filtered = [...products];

    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.categoryIds?.length) {
      filtered = filtered.filter(p =>
        p.categoryId && filters.categoryIds!.includes(p.categoryId)
      );
    }

    // Price range filter
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= filters.maxPrice!);
    }

    // Stock filter
    if (filters.inStock) {
      filtered = filtered.filter(p => p.inStock);
    }

    // Variant filter
    if (filters.variantOptions) {
      filtered = filtered.filter(product => {
        if (!product.variants?.length) return false;

        return product.variants.some(variant => {
          return Object.entries(filters.variantOptions!).every(([key, values]) => {
            return values.includes(variant.options[key]);
          });
        });
      });
    }

    // Sort
    if (filters.sortBy) {
      filtered = this.sortProducts(filtered, filters.sortBy);
    }

    return filtered;
  }

  // Sort products
  private sortProducts(
    products: SearchResult[],
    sortBy: string
  ): SearchResult[] {
    const sorted = [...products];

    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);
      
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);
      
      case 'name_asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'name_desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      
      case 'relevance':
        return sorted.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      
      case 'newest':
        // Assuming products have a createdAt field
        return sorted;
      
      case 'popular':
        // Assuming products have a popularity score
        return sorted;
      
      default:
        return sorted;
    }
  }

  // Calculate facets (filter counts)
  calculateFacets(products: SearchResult[]): SearchFacets {
    const categories = new Map<string, { name: string; count: number }>();
    const variants = new Map<string, Map<string, number>>();

    products.forEach(product => {
      // Category facets
      if (product.categoryId && product.categoryName) {
        const existing = categories.get(product.categoryId);
        if (existing) {
          existing.count++;
        } else {
          categories.set(product.categoryId, {
            name: product.categoryName,
            count: 1,
          });
        }
      }

      // Variant facets
      product.variants?.forEach(variant => {
        Object.entries(variant.options).forEach(([key, value]) => {
          if (!variants.has(key)) {
            variants.set(key, new Map());
          }
          const valueMap = variants.get(key)!;
          valueMap.set(value, (valueMap.get(value) || 0) + 1);
        });
      });
    });

    // Price ranges
    const prices = products.map(p => p.price).sort((a, b) => a - b);
    const minPrice = prices[0] || 0;
    const maxPrice = prices[prices.length - 1] || 1000;
    const range = maxPrice - minPrice;
    const step = range / 4;

    const priceRanges = [
      { min: minPrice, max: minPrice + step, count: 0 },
      { min: minPrice + step, max: minPrice + step * 2, count: 0 },
      { min: minPrice + step * 2, max: minPrice + step * 3, count: 0 },
      { min: minPrice + step * 3, max: maxPrice, count: 0 },
    ];

    products.forEach(p => {
      const range = priceRanges.find(r => p.price >= r.min && p.price <= r.max);
      if (range) range.count++;
    });

    return {
      categories: Array.from(categories.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
      })),
      priceRanges: priceRanges.filter(r => r.count > 0),
      variants: Object.fromEntries(
        Array.from(variants.entries()).map(([key, valueMap]) => [
          key,
          Array.from(valueMap.entries()).map(([value, count]) => ({
            value,
            count,
          })),
        ])
      ),
    };
  }

  // Search history
  addToHistory(query: string) {
    if (!this.searchHistory.includes(query)) {
      this.searchHistory.unshift(query);
      this.searchHistory = this.searchHistory.slice(0, 10); // Keep last 10
      localStorage.setItem('search_history', JSON.stringify(this.searchHistory));
    }
  }

  getHistory(): string[] {
    const stored = localStorage.getItem('search_history');
    if (stored) {
      this.searchHistory = JSON.parse(stored);
    }
    return this.searchHistory;
  }

  clearHistory() {
    this.searchHistory = [];
    localStorage.removeItem('search_history');
  }
}

export const searchService = new SearchService();
