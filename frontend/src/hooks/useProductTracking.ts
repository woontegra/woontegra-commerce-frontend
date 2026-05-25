import { useEffect } from 'react';
import { productPerformanceService } from '../services/productPerformance.service';

// Hook to track product view
export function useProductView(productId: string, userId?: string) {
  useEffect(() => {
    if (productId) {
      // Track view after 2 seconds (to avoid accidental views)
      const timer = setTimeout(() => {
        productPerformanceService.trackView(productId, userId);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [productId, userId]);
}

// Hook to track add to cart
export function useAddToCartTracking() {
  const trackAddToCart = (productId: string, userId?: string) => {
    productPerformanceService.trackAddToCart(productId, userId);
  };

  return { trackAddToCart };
}

// Hook to track sale
export function useSaleTracking() {
  const trackSale = (
    productId: string,
    quantity: number,
    revenue: number,
    orderId: string,
    userId?: string
  ) => {
    productPerformanceService.trackSale(productId, quantity, revenue, orderId, userId);
  };

  return { trackSale };
}
