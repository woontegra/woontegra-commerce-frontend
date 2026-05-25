import type { 
  ShippingMethod, 
  ShippingAddress, 
  ShippingCart,
  ShippingCalculationResult 
} from '../types/shipping';

class ShippingCalculationService {
  // Calculate shipping for all available methods
  calculateShipping(
    cart: ShippingCart,
    address: ShippingAddress,
    methods: ShippingMethod[]
  ): ShippingCalculationResult[] {
    return methods
      .filter(method => method.active)
      .filter(method => this.isMethodApplicable(method, cart))
      .map(method => this.calculateMethodPrice(method, cart, address))
      .sort((a, b) => a.price - b.price); // Sort by price
  }

  // Calculate price for a single method
  private calculateMethodPrice(
    method: ShippingMethod,
    cart: ShippingCart,
    address: ShippingAddress
  ): ShippingCalculationResult {
    let price = 0;
    let originalPrice: number | undefined;
    let isFree = false;
    let region: string | undefined;

    // 1. Check if free shipping applies
    if (method.freeShippingThreshold && cart.total >= method.freeShippingThreshold) {
      originalPrice = this.getBasePrice(method, cart, address);
      price = 0;
      isFree = true;
    } else {
      // 2. Calculate based on price type
      switch (method.priceType) {
        case 'fixed':
          price = method.basePrice;
          break;
        
        case 'dynamic':
          const result = this.calculateDynamicPrice(method, cart, address);
          price = result.price;
          region = result.region;
          break;
        
        case 'free':
          price = 0;
          isFree = true;
          break;
      }
    }

    return {
      methodId: method.id,
      methodName: method.name,
      price,
      originalPrice,
      estimatedDays: method.maxDeliveryDays,
      isFree,
      region,
    };
  }

  // Calculate dynamic price (region-based or weight-based)
  private calculateDynamicPrice(
    method: ShippingMethod,
    cart: ShippingCart,
    address: ShippingAddress
  ): { price: number; region?: string } {
    // 1. Try region-based pricing
    if (method.regions && method.regions.length > 0) {
      const region = method.regions.find(r => 
        r.cities.some(city => 
          city.toLowerCase() === address.city.toLowerCase()
        )
      );

      if (region) {
        return { price: region.price, region: region.name };
      }
    }

    // 2. Try weight-based pricing
    if (method.weightRanges && method.weightRanges.length > 0) {
      const totalWeight = cart.items.reduce(
        (sum, item) => sum + ((item.weight || 0) * item.quantity), 
        0
      );

      const weightRange = method.weightRanges.find(
        range => totalWeight >= range.minWeight && totalWeight <= range.maxWeight
      );

      if (weightRange) {
        return { price: weightRange.price };
      }
    }

    // 3. Fallback to base price
    return { price: method.basePrice };
  }

  // Get base price without free shipping
  private getBasePrice(
    method: ShippingMethod,
    cart: ShippingCart,
    address: ShippingAddress
  ): number {
    if (method.priceType === 'fixed') {
      return method.basePrice;
    }

    if (method.priceType === 'dynamic') {
      return this.calculateDynamicPrice(method, cart, address).price;
    }

    return 0;
  }

  // Check if method is applicable
  private isMethodApplicable(
    method: ShippingMethod,
    cart: ShippingCart
  ): boolean {
    // Check min cart total
    if (method.minCartTotal && cart.total < method.minCartTotal) {
      return false;
    }

    // Check max cart total
    if (method.maxCartTotal && cart.total > method.maxCartTotal) {
      return false;
    }

    return true;
  }

  // Get cheapest shipping method
  getCheapestMethod(
    cart: ShippingCart,
    address: ShippingAddress,
    methods: ShippingMethod[]
  ): ShippingCalculationResult | null {
    const results = this.calculateShipping(cart, address, methods);
    return results.length > 0 ? results[0] : null;
  }

  // Get fastest shipping method
  getFastestMethod(
    cart: ShippingCart,
    address: ShippingAddress,
    methods: ShippingMethod[]
  ): ShippingCalculationResult | null {
    const results = this.calculateShipping(cart, address, methods);
    return results.sort((a, b) => a.estimatedDays - b.estimatedDays)[0] || null;
  }
}

export const shippingCalculationService = new ShippingCalculationService();

// Predefined Shipping Methods
export const defaultShippingMethods: ShippingMethod[] = [
  // 1. Standart Kargo - Region Based
  {
    id: 'standard',
    name: 'Standart Kargo',
    description: 'Türkiye geneli standart kargo',
    priceType: 'dynamic',
    basePrice: 70,
    regions: [
      {
        id: 'istanbul',
        name: 'İstanbul',
        cities: ['İstanbul'],
        price: 50,
        estimatedDays: 2,
      },
      {
        id: 'marmara',
        name: 'Marmara Bölgesi',
        cities: ['Ankara', 'İzmir', 'Bursa', 'Kocaeli', 'Antalya'],
        price: 60,
        estimatedDays: 3,
      },
      {
        id: 'other',
        name: 'Diğer Şehirler',
        cities: [], // Default for unlisted cities
        price: 70,
        estimatedDays: 5,
      },
    ],
    freeShippingThreshold: 500,
    minDeliveryDays: 2,
    maxDeliveryDays: 5,
    active: true,
    displayOrder: 1,
    icon: '📦',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 2. Hızlı Kargo - Fixed Price
  {
    id: 'express',
    name: 'Hızlı Kargo',
    description: 'Ertesi gün teslimat',
    priceType: 'fixed',
    basePrice: 100,
    minDeliveryDays: 1,
    maxDeliveryDays: 1,
    maxCartTotal: 2000, // 2000 TL üzeri siparişlerde kullanılamaz
    active: true,
    displayOrder: 2,
    icon: '⚡',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 3. Ücretsiz Kargo - Free
  {
    id: 'free',
    name: 'Ücretsiz Kargo',
    description: '500 TL ve üzeri alışverişlerde ücretsiz',
    priceType: 'free',
    basePrice: 0,
    minCartTotal: 500,
    minDeliveryDays: 3,
    maxDeliveryDays: 7,
    active: true,
    displayOrder: 3,
    icon: '🎁',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
