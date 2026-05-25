import { useEffect } from 'react';
import { abandonedCartTrackingService } from '../services/abandonedCartTracking.service';
import type { AbandonedCart } from '../types/abandonedCart';

// Hook to track cart abandonment
export function useAbandonedCartTracking(
  cartItems: any[],
  cartTotal: number,
  userEmail?: string,
  userId?: string
) {
  useEffect(() => {
    // Only track if cart has items
    if (cartItems.length === 0) {
      return;
    }

    // Track after 5 seconds (to avoid tracking while user is actively shopping)
    const timer = setTimeout(() => {
      const cartData = {
        items: cartItems.map(item => ({
          productId: item.productId,
          productName: item.productName || item.name,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
        subtotal: cartTotal,
        total: cartTotal,
      };

      abandonedCartTrackingService.trackAbandonedCart(
        cartData,
        userId,
        userEmail
      );
    }, 5000);

    return () => clearTimeout(timer);
  }, [cartItems, cartTotal, userEmail, userId]);
}

// Hook to recover abandoned cart
export function useAbandonedCartRecovery() {
  const recoverCart = (cart: AbandonedCart) => {
    // Restore cart items to local storage or state
    console.log('Recovering cart:', cart);
    
    // In production: Update cart state with recovered items
    // setCartItems(cart.cartData.items);
    
    return cart.cartData.items;
  };

  return { recoverCart };
}
