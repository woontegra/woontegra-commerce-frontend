import type { B2BPricing, User } from '../types/b2b';

class B2BPricingService {
  // Get price for user
  getPrice(productId: string, user: User, quantity: number = 1): number {
    const pricing = this.getPricing(productId);
    
    if (!pricing) {
      return 0;
    }

    // Get base price by user group
    let basePrice = this.getBasePriceByGroup(pricing, user);

    // Apply price group discount if exists
    if (user.b2bProfile?.priceGroup && pricing.priceGroups) {
      const priceGroupPrice = pricing.priceGroups[user.b2bProfile.priceGroup as keyof typeof pricing.priceGroups];
      if (priceGroupPrice) {
        basePrice = priceGroupPrice;
      }
    }

    // Apply quantity-based pricing
    if (pricing.quantityPricing) {
      const quantityPrice = this.getQuantityPrice(pricing.quantityPricing, quantity);
      if (quantityPrice) {
        basePrice = quantityPrice;
      }
    }

    return basePrice;
  }

  // Get base price by user group
  private getBasePriceByGroup(pricing: B2BPricing, user: User): number {
    return pricing.prices[user.group] || pricing.prices.normal;
  }

  // Get quantity-based price
  private getQuantityPrice(
    quantityPricing: B2BPricing['quantityPricing'],
    quantity: number
  ): number | null {
    if (!quantityPricing) return null;

    // Find applicable tier (highest minQuantity that's <= quantity)
    const applicableTier = quantityPricing
      .filter(tier => quantity >= tier.minQuantity)
      .sort((a, b) => b.minQuantity - a.minQuantity)[0];

    return applicableTier?.price || null;
  }

  // Get pricing data (mock)
  private getPricing(productId: string): B2BPricing | null {
    // In production: fetch from API
    // const response = await fetch(`/api/products/${productId}/b2b-pricing`);
    // return response.json();

    // Mock data
    return {
      productId,
      prices: {
        normal: 100,
        bayi: 75,  // 25% bayi indirimi
      },
      priceGroups: {
        A: 70,     // VIP bayiler: 30% indirim
        B: 75,     // Standart bayiler: 25% indirim
        C: 80,     // Yeni bayiler: 20% indirim
      },
      quantityPricing: [
        { minQuantity: 1, price: 100 },
        { minQuantity: 10, price: 95, discountRate: 5 },
        { minQuantity: 50, price: 90, discountRate: 10 },
        { minQuantity: 100, price: 85, discountRate: 15 },
      ],
    };
  }

  // Calculate discount amount
  calculateDiscount(
    originalPrice: number,
    discountedPrice: number,
    quantity: number = 1
  ): number {
    return (originalPrice - discountedPrice) * quantity;
  }

  // Get discount percentage
  getDiscountPercentage(originalPrice: number, discountedPrice: number): number {
    if (originalPrice === 0) return 0;
    return ((originalPrice - discountedPrice) / originalPrice) * 100;
  }

  // Check if user can see B2B prices
  canSeeBayiPrices(user: User): boolean {
    return user.group === 'bayi' && user.b2bProfile?.status === 'active';
  }

  // Get price display
  getPriceDisplay(productId: string, user: User): {
    price: number;
    originalPrice?: number;
    discountPercentage?: number;
    badge?: string;
  } {
    const pricing = this.getPricing(productId);
    
    if (!pricing) {
      return { price: 0 };
    }

    const normalPrice = pricing.prices.normal;
    const userPrice = this.getPrice(productId, user, 1);

    // Normal user
    if (user.group === 'normal') {
      return {
        price: normalPrice,
      };
    }

    // Bayi user
    const discountPercentage = this.getDiscountPercentage(normalPrice, userPrice);

    return {
      price: userPrice,
      originalPrice: normalPrice,
      discountPercentage,
      badge: user.b2bProfile?.priceGroup 
        ? `${user.b2bProfile.priceGroup} Grubu` 
        : 'Bayi',
    };
  }
}

export const b2bPricingService = new B2BPricingService();
