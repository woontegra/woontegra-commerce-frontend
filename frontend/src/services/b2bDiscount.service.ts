import type { User, B2BDiscount } from '../types/b2b';

class B2BDiscountService {
  // Get applicable discounts for user
  getApplicableDiscounts(
    user: User,
    cartTotal: number,
    cartItems: Array<{ productId: string; categoryId?: string; quantity: number }>
  ): B2BDiscount[] {
    const allDiscounts = this.getAllDiscounts();

    return allDiscounts.filter(discount => {
      // Check if active
      if (!discount.isActive) return false;

      // Check date validity
      const now = new Date();
      const startDate = new Date(discount.startDate);
      const endDate = new Date(discount.endDate);
      if (now < startDate || now > endDate) return false;

      // Check user group
      if (discount.userGroup !== user.group) return false;

      // Check price group
      if (discount.priceGroup && user.b2bProfile?.priceGroup !== discount.priceGroup) {
        return false;
      }

      // Check minimum order amount
      if (discount.minOrderAmount && cartTotal < discount.minOrderAmount) {
        return false;
      }

      // Check minimum quantity
      if (discount.minQuantity) {
        const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQuantity < discount.minQuantity) return false;
      }

      // Check product IDs
      if (discount.productIds && discount.productIds.length > 0) {
        const hasProduct = cartItems.some(item => 
          discount.productIds!.includes(item.productId)
        );
        if (!hasProduct) return false;
      }

      // Check category IDs
      if (discount.categoryIds && discount.categoryIds.length > 0) {
        const hasCategory = cartItems.some(item => 
          item.categoryId && discount.categoryIds!.includes(item.categoryId)
        );
        if (!hasCategory) return false;
      }

      return true;
    });
  }

  // Calculate discount amount
  calculateDiscountAmount(discount: B2BDiscount, cartTotal: number): number {
    if (discount.type === 'percentage') {
      return (cartTotal * discount.value) / 100;
    }
    return discount.value;
  }

  // Get best discount
  getBestDiscount(
    user: User,
    cartTotal: number,
    cartItems: Array<{ productId: string; categoryId?: string; quantity: number }>
  ): B2BDiscount | null {
    const applicable = this.getApplicableDiscounts(user, cartTotal, cartItems);

    if (applicable.length === 0) return null;

    // Find discount with highest value
    return applicable.reduce((best, current) => {
      const bestAmount = this.calculateDiscountAmount(best, cartTotal);
      const currentAmount = this.calculateDiscountAmount(current, cartTotal);
      return currentAmount > bestAmount ? current : best;
    });
  }

  // Get all discounts (mock)
  private getAllDiscounts(): B2BDiscount[] {
    // In production: fetch from API
    // const response = await fetch('/api/b2b/discounts');
    // return response.json();

    return [
      {
        id: 'disc-1',
        name: 'Bayi Genel İndirim',
        userGroup: 'bayi',
        type: 'percentage',
        value: 10,
        minOrderAmount: 1000,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isActive: true,
      },
      {
        id: 'disc-2',
        name: 'VIP Bayi İndirimi',
        userGroup: 'bayi',
        priceGroup: 'A',
        type: 'percentage',
        value: 15,
        minOrderAmount: 5000,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isActive: true,
      },
      {
        id: 'disc-3',
        name: 'Toplu Alım İndirimi',
        userGroup: 'bayi',
        type: 'percentage',
        value: 20,
        minQuantity: 100,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isActive: true,
      },
      {
        id: 'disc-4',
        name: 'Kategori İndirimi',
        userGroup: 'bayi',
        type: 'fixed',
        value: 500,
        categoryIds: ['giyim', 'aksesuar'],
        minOrderAmount: 3000,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isActive: true,
      },
    ];
  }

  // Get discount summary
  getDiscountSummary(
    user: User,
    cartTotal: number,
    cartItems: Array<{ productId: string; categoryId?: string; quantity: number }>
  ): {
    applicable: B2BDiscount[];
    best: B2BDiscount | null;
    totalDiscount: number;
  } {
    const applicable = this.getApplicableDiscounts(user, cartTotal, cartItems);
    const best = this.getBestDiscount(user, cartTotal, cartItems);
    const totalDiscount = best ? this.calculateDiscountAmount(best, cartTotal) : 0;

    return {
      applicable,
      best,
      totalDiscount,
    };
  }
}

export const b2bDiscountService = new B2BDiscountService();
