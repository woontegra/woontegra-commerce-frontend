import type { ProductStats, ProductPerformance, PerformanceEvent } from '../types/productStats';

class ProductPerformanceService {
  private readonly STORAGE_KEY = 'product_stats';

  // Track product view
  async trackView(productId: string, userId?: string): Promise<void> {
    const stats = this.getStats(productId);
    
    stats.views += 1;
    stats.lastViewedAt = new Date().toISOString();
    stats.updatedAt = new Date().toISOString();
    
    this.saveStats(productId, stats);
    
    // Log event
    this.logEvent({
      id: `event-${Date.now()}`,
      productId,
      type: 'view',
      userId,
      sessionId: this.getSessionId(),
      createdAt: new Date().toISOString(),
    });
    
    console.log('👁️ View tracked:', productId);
  }

  // Track add to cart
  async trackAddToCart(productId: string, userId?: string): Promise<void> {
    const stats = this.getStats(productId);
    
    stats.addToCart += 1;
    stats.lastAddedToCartAt = new Date().toISOString();
    stats.updatedAt = new Date().toISOString();
    
    // Update cart rate
    stats.cartRate = stats.views > 0 ? (stats.addToCart / stats.views) * 100 : 0;
    
    this.saveStats(productId, stats);
    
    // Log event
    this.logEvent({
      id: `event-${Date.now()}`,
      productId,
      type: 'add_to_cart',
      userId,
      sessionId: this.getSessionId(),
      createdAt: new Date().toISOString(),
    });
    
    console.log('🛒 Add to cart tracked:', productId);
  }

  // Track sale
  async trackSale(
    productId: string,
    quantity: number,
    revenue: number,
    orderId: string,
    userId?: string
  ): Promise<void> {
    const stats = this.getStats(productId);
    
    stats.sales += quantity;
    stats.totalRevenue += revenue;
    stats.lastSoldAt = new Date().toISOString();
    stats.updatedAt = new Date().toISOString();
    
    // Update conversion rate
    stats.conversionRate = stats.views > 0 ? (stats.sales / stats.views) * 100 : 0;
    
    this.saveStats(productId, stats);
    
    // Log event
    this.logEvent({
      id: `event-${Date.now()}`,
      productId,
      type: 'sale',
      userId,
      sessionId: this.getSessionId(),
      metadata: { quantity, revenue, orderId },
      createdAt: new Date().toISOString(),
    });
    
    console.log('💰 Sale tracked:', productId, quantity, revenue);
  }

  // Get product stats
  getStats(productId: string): ProductStats {
    const allStats = this.getAllStats();
    
    if (allStats[productId]) {
      return allStats[productId];
    }
    
    // Initialize new stats
    return {
      id: `stats-${productId}`,
      productId,
      views: 0,
      addToCart: 0,
      sales: 0,
      conversionRate: 0,
      cartRate: 0,
      totalRevenue: 0,
      period: 'all_time',
      updatedAt: new Date().toISOString(),
    };
  }

  // Get all stats
  getAllStats(): Record<string, ProductStats> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  // Save stats
  private saveStats(productId: string, stats: ProductStats): void {
    const allStats = this.getAllStats();
    allStats[productId] = stats;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allStats));
  }

  // Get product performance
  getPerformance(productId: string, productName: string, sku: string): ProductPerformance {
    const stats = this.getStats(productId);
    
    return {
      productId,
      productName,
      sku,
      stats,
      trending: this.isTrending(stats),
      topSeller: this.isTopSeller(stats),
    };
  }

  // Get top products by metric
  getTopProducts(
    products: Array<{ id: string; name: string; sku: string }>,
    metric: 'views' | 'sales' | 'revenue',
    limit: number = 10
  ): ProductPerformance[] {
    const performances = products.map(p => 
      this.getPerformance(p.id, p.name, p.sku)
    );
    
    // Sort by metric
    const sorted = performances.sort((a, b) => {
      if (metric === 'views') return b.stats.views - a.stats.views;
      if (metric === 'sales') return b.stats.sales - a.stats.sales;
      if (metric === 'revenue') return b.stats.totalRevenue - a.stats.totalRevenue;
      return 0;
    });
    
    return sorted.slice(0, limit);
  }

  // Check if trending (high recent activity)
  private isTrending(stats: ProductStats): boolean {
    // Simple logic: views > 100 and cart rate > 10%
    return stats.views > 100 && stats.cartRate > 10;
  }

  // Check if top seller
  private isTopSeller(stats: ProductStats): boolean {
    // Simple logic: sales > 50
    return stats.sales > 50;
  }

  // Get session ID
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    
    return sessionId;
  }

  // Log event (for analytics)
  private logEvent(event: PerformanceEvent): void {
    // In production: Send to analytics service
    console.log('📊 Performance event:', event);
  }

  // Get performance summary
  getSummary(productId: string): {
    views: number;
    addToCart: number;
    sales: number;
    conversionRate: string;
    cartRate: string;
    revenue: string;
  } {
    const stats = this.getStats(productId);
    
    return {
      views: stats.views,
      addToCart: stats.addToCart,
      sales: stats.sales,
      conversionRate: stats.conversionRate.toFixed(2) + '%',
      cartRate: stats.cartRate.toFixed(2) + '%',
      revenue: '₺' + stats.totalRevenue.toFixed(2),
    };
  }

  // Reset stats (for testing)
  resetStats(productId: string): void {
    const allStats = this.getAllStats();
    delete allStats[productId];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allStats));
  }

  // Clear all stats
  clearAllStats(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const productPerformanceService = new ProductPerformanceService();
