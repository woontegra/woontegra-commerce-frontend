import type { SearchFilters, SortOption, SearchResult } from '../types/productSearch';
import { productPerformanceService } from './productPerformance.service';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId?: string;
  stock: number;
  images?: string[];
  variants?: Array<{
    color?: string;
    size?: string;
  }>;
  tags?: string[];
  createdAt: string;
}

class ProductSearchService {
  // Live search with debounce
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Search products
  search(
    products: Product[],
    filters: SearchFilters,
    sort: SortOption = 'newest',
    page: number = 1,
    limit: number = 12
  ): SearchResult<Product> {
    // 1. Filter products
    let filtered = this.applyFilters(products, filters);

    // 2. Sort products
    filtered = this.applySorting(filtered, sort);

    // 3. Paginate
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = filtered.slice(start, end);

    return {
      items,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  // Apply filters
  private applyFilters(products: Product[], filters: SearchFilters): Product[] {
    let filtered = [...products];

    // Search query (name, description, category)
    if (filters.query && filters.query.trim()) {
      const query = filters.query.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.categoryId?.toLowerCase().includes(query)
      );
    }

    // Price range
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= filters.maxPrice!);
    }

    // Category
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      filtered = filtered.filter(p => 
        p.categoryId && filters.categoryIds!.includes(p.categoryId)
      );
    }

    // Colors
    if (filters.colors && filters.colors.length > 0) {
      filtered = filtered.filter(p =>
        p.variants?.some(v => 
          v.color && filters.colors!.includes(v.color)
        )
      );
    }

    // Sizes
    if (filters.sizes && filters.sizes.length > 0) {
      filtered = filtered.filter(p =>
        p.variants?.some(v => 
          v.size && filters.sizes!.includes(v.size)
        )
      );
    }

    // Stock status
    if (filters.inStock) {
      filtered = filtered.filter(p => p.stock > 0);
    }

    // Tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(p =>
        p.tags?.some(tag => filters.tags!.includes(tag))
      );
    }

    return filtered;
  }

  // Apply sorting
  private applySorting(products: Product[], sort: SortOption): Product[] {
    const sorted = [...products];

    switch (sort) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);
      
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);
      
      case 'sales_desc':
        return sorted.sort((a, b) => {
          const aSales = productPerformanceService.getStats(a.id).sales;
          const bSales = productPerformanceService.getStats(b.id).sales;
          return bSales - aSales;
        });
      
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      
      case 'name_asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      
      case 'name_desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name, 'tr'));
      
      default:
        return sorted;
    }
  }

  // Live search with debounce
  liveSearch(
    query: string,
    products: Product[],
    callback: (results: Product[]) => void,
    delay: number = 300
  ): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      const results = this.applyFilters(products, { query });
      callback(results);
    }, delay);
  }

  // Get available filter options from products
  getFilterOptions(products: Product[]): {
    categories: Array<{ id: string; name: string; count: number }>;
    colors: Array<{ value: string; count: number }>;
    sizes: Array<{ value: string; count: number }>;
    priceRange: { min: number; max: number };
  } {
    const categories = new Map<string, number>();
    const colors = new Map<string, number>();
    const sizes = new Map<string, number>();
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    products.forEach(product => {
      // Categories
      if (product.categoryId) {
        categories.set(
          product.categoryId,
          (categories.get(product.categoryId) || 0) + 1
        );
      }

      // Price range
      if (product.price < minPrice) minPrice = product.price;
      if (product.price > maxPrice) maxPrice = product.price;

      // Variants
      product.variants?.forEach(variant => {
        if (variant.color) {
          colors.set(variant.color, (colors.get(variant.color) || 0) + 1);
        }
        if (variant.size) {
          sizes.set(variant.size, (sizes.get(variant.size) || 0) + 1);
        }
      });
    });

    return {
      categories: Array.from(categories.entries()).map(([id, count]) => ({
        id,
        name: id, // In production: fetch category name
        count,
      })),
      colors: Array.from(colors.entries()).map(([value, count]) => ({
        value,
        count,
      })),
      sizes: Array.from(sizes.entries()).map(([value, count]) => ({
        value,
        count,
      })),
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === -Infinity ? 1000 : maxPrice,
      },
    };
  }

  // Get sort label
  getSortLabel(sort: SortOption): string {
    const labels: Record<SortOption, string> = {
      price_asc: 'Fiyat: Düşükten Yükseğe',
      price_desc: 'Fiyat: Yüksekten Düşüğe',
      sales_desc: 'En Çok Satan',
      newest: 'En Yeni',
      name_asc: 'İsim: A-Z',
      name_desc: 'İsim: Z-A',
    };
    return labels[sort];
  }
}

export const productSearchService = new ProductSearchService();
