import type { Cart, CartItem, Coupon, CartCalculationResult, ShippingInfo } from '../types/cart';
import type { Campaign } from '../types/advancedCampaign';
import { campaignEngineService } from './campaignEngine.service';

class CartCalculationService {
  // Main calculation function
  calculateCart(
    items: CartItem[],
    campaigns: Campaign[],
    coupon: Coupon | null,
    shippingMethod: 'standard' | 'express' | 'free' = 'standard'
  ): CartCalculationResult {
    // Step 1: Calculate base total
    const subtotal = this.calculateSubtotal(items);

    // Step 2: Apply campaigns
    const { campaignDiscount, appliedCampaigns } = this.applyCampaigns(items, campaigns);

    // Step 3: Apply coupon
    const { couponDiscount, appliedCoupon } = this.applyCoupon(subtotal, campaignDiscount, coupon);

    // Step 4: Calculate shipping
    const shipping = this.calculateShipping(subtotal, campaignDiscount, couponDiscount, shippingMethod);

    // Calculate totals
    const discountTotal = campaignDiscount + couponDiscount;
    const total = Math.max(0, subtotal - discountTotal + shipping.cost);

    return {
      subtotal,
      campaignDiscount,
      couponDiscount,
      discountTotal,
      shipping: shipping.cost,
      total,
      breakdown: {
        campaignDiscount,
        appliedCampaigns,
        couponDiscount,
        appliedCoupon,
        discountTotal,
      },
    };
  }

  // Step 1: Calculate base total
  private calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);
  }

  // Step 2: Apply campaigns
  private applyCampaigns(items: CartItem[], campaigns: Campaign[]) {
    // Convert CartItem[] to campaignEngine format
    const campaignCart = {
      items: items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        categoryId: item.categoryId,
        price: item.basePrice,
        quantity: item.quantity,
        originalPrice: item.basePrice,
      })),
      subtotal: 0,
      discount: 0,
      total: 0,
      appliedCampaigns: [],
    };

    // Apply campaigns using campaign engine
    const result = campaignEngineService.applyCampaigns(campaignCart, campaigns, 'all');

    // Update items with discounted prices
    const discountedItems = items.map(item => {
      const campaignItem = result.items.find(ci => ci.id === item.id);
      return {
        ...item,
        finalPrice: campaignItem ? campaignItem.price : item.basePrice,
      };
    });

    return {
      discountedItems,
      campaignDiscount: result.discount,
      appliedCampaigns: result.appliedCampaigns.map(ac => ({
        id: ac.campaignId,
        name: ac.campaignName,
        amount: ac.discountAmount,
      })),
    };
  }

  // Step 3: Apply coupon
  private applyCoupon(
    subtotal: number,
    campaignDiscount: number,
    coupon: Coupon | null
  ): { couponDiscount: number; appliedCoupon?: { code: string; amount: number } } {
    if (!coupon || !coupon.isActive) {
      return { couponDiscount: 0 };
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { couponDiscount: 0 };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.currentUsage >= coupon.usageLimit) {
      return { couponDiscount: 0 };
    }

    // Calculate cart amount after campaign discount
    const cartAfterCampaign = subtotal - campaignDiscount;

    // Check minimum cart amount
    if (coupon.minCartAmount && cartAfterCampaign < coupon.minCartAmount) {
      return { couponDiscount: 0 };
    }

    // Calculate coupon discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (cartAfterCampaign * coupon.value) / 100;
    } else {
      discount = coupon.value;
    }

    // Apply max discount limit
    if (coupon.maxDiscountAmount) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }

    // Don't exceed cart amount
    discount = Math.min(discount, cartAfterCampaign);

    return {
      couponDiscount: discount,
      appliedCoupon: {
        code: coupon.code,
        amount: discount,
      },
    };
  }

  // Step 4: Calculate shipping
  private calculateShipping(
    subtotal: number,
    campaignDiscount: number,
    couponDiscount: number,
    method: 'standard' | 'express' | 'free'
  ): ShippingInfo {
    const cartTotal = subtotal - campaignDiscount - couponDiscount;

    // Free shipping threshold
    const freeShippingThreshold = 500;

    if (method === 'free' || cartTotal >= freeShippingThreshold) {
      return {
        method: 'free',
        cost: 0,
        freeShippingThreshold,
        estimatedDays: 5,
      };
    }

    if (method === 'express') {
      return {
        method: 'express',
        cost: 50,
        freeShippingThreshold,
        estimatedDays: 1,
      };
    }

    return {
      method: 'standard',
      cost: 29.90,
      freeShippingThreshold,
      estimatedDays: 3,
    };
  }

  // Update item quantity
  updateItemQuantity(cart: Cart, itemId: string, quantity: number): Cart {
    const updatedItems = cart.items.map(item =>
      item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
    );

    return {
      ...cart,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
  }

  // Add item to cart
  addItem(cart: Cart, newItem: CartItem): Cart {
    const existingItemIndex = cart.items.findIndex(
      item =>
        item.productId === newItem.productId &&
        item.variantId === newItem.variantId
    );

    let updatedItems: CartItem[];

    if (existingItemIndex !== -1) {
      // Update quantity if item exists
      updatedItems = cart.items.map((item, index) =>
        index === existingItemIndex
          ? { ...item, quantity: item.quantity + newItem.quantity }
          : item
      );
    } else {
      // Add new item
      updatedItems = [...cart.items, newItem];
    }

    return {
      ...cart,
      items: updatedItems,
      itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
      updatedAt: new Date().toISOString(),
    };
  }

  // Remove item from cart
  removeItem(cart: Cart, itemId: string): Cart {
    const updatedItems = cart.items.filter(item => item.id !== itemId);

    return {
      ...cart,
      items: updatedItems,
      itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
      updatedAt: new Date().toISOString(),
    };
  }

  // Get cart summary
  getCartSummary(cart: Cart): string {
    const { subtotal, discountBreakdown, shipping, total } = cart;
    
    let summary = `Ara Toplam: ₺${subtotal.toFixed(2)}\n`;
    
    if (discountBreakdown.campaignDiscount > 0) {
      summary += `Kampanya İndirimi: -₺${discountBreakdown.campaignDiscount.toFixed(2)}\n`;
    }
    
    if (discountBreakdown.couponDiscount > 0) {
      summary += `Kupon İndirimi: -₺${discountBreakdown.couponDiscount.toFixed(2)}\n`;
    }
    
    if (shipping.cost > 0) {
      summary += `Kargo: ₺${shipping.cost.toFixed(2)}\n`;
    } else {
      summary += `Kargo: Ücretsiz\n`;
    }
    
    summary += `\nToplam: ₺${total.toFixed(2)}`;
    
    return summary;
  }
}

export const cartCalculationService = new CartCalculationService();
