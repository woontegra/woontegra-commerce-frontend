import type { Coupon, CouponValidationResult } from '../types/coupon';
import type { Cart } from '../types/cart';

interface User {
  id: string;
  email: string;
}

class CouponValidationService {
  // Main validation function
  validateCoupon(
    coupon: Coupon,
    cart: Cart,
    user?: User
  ): CouponValidationResult {
    // 1. Check if active
    if (!coupon.active) {
      return {
        valid: false,
        error: 'Bu kupon aktif değil',
      };
    }

    // 2. Check date range
    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (now < startDate) {
      return {
        valid: false,
        error: 'Bu kupon henüz geçerli değil',
      };
    }

    if (now > endDate) {
      return {
        valid: false,
        error: 'Bu kuponun geçerlilik süresi dolmuş',
      };
    }

    // 3. Check usage limit
    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
      return {
        valid: false,
        error: 'Bu kuponun kullanım limiti dolmuş',
      };
    }

    // 4. Check user-specific targeting
    if (coupon.userIds && coupon.userIds.length > 0) {
      if (!user) {
        return {
          valid: false,
          error: 'Bu kupon sadece belirli kullanıcılar için geçerli',
        };
      }

      if (!coupon.userIds.includes(user.id)) {
        return {
          valid: false,
          error: 'Bu kupon sizin için geçerli değil',
        };
      }
    }

    // 5. Check minimum cart total
    if (coupon.minCartTotal) {
      const cartSubtotal = cart.subtotal - (cart.discountBreakdown.campaignDiscount || 0);
      
      if (cartSubtotal < coupon.minCartTotal) {
        return {
          valid: false,
          error: `Bu kupon için minimum sepet tutarı ₺${coupon.minCartTotal.toFixed(2)} olmalıdır`,
        };
      }
    }

    // 6. Check product/category targeting
    if ((coupon.productIds && coupon.productIds.length > 0) || 
        (coupon.categoryIds && coupon.categoryIds.length > 0)) {
      
      const hasTargetedItems = cart.items.some(item => {
        if (coupon.productIds && coupon.productIds.includes(item.productId)) {
          return true;
        }
        if (coupon.categoryIds && coupon.categoryIds.includes(item.categoryId)) {
          return true;
        }
        return false;
      });

      if (!hasTargetedItems) {
        return {
          valid: false,
          error: 'Sepetinizde bu kupon için uygun ürün bulunmuyor',
        };
      }
    }

    // 7. Check per-user usage limit
    if (coupon.maxUsagePerUser && user) {
      const userUsageCount = this.getUserCouponUsageCount(coupon.id, user.id);
      
      if (userUsageCount >= coupon.maxUsagePerUser) {
        return {
          valid: false,
          error: 'Bu kuponu kullanım limitinize ulaştınız',
        };
      }
    }

    // Calculate discount amount
    const discountAmount = this.calculateDiscount(coupon, cart);

    return {
      valid: true,
      discountAmount,
    };
  }

  // Calculate discount amount
  private calculateDiscount(coupon: Coupon, cart: Cart): number {
    // Get cart total after campaign discounts
    const cartAfterCampaign = cart.subtotal - (cart.discountBreakdown.campaignDiscount || 0);

    // Get targeted items total
    let targetTotal = cartAfterCampaign;

    if (coupon.productIds || coupon.categoryIds) {
      targetTotal = cart.items
        .filter(item => {
          if (coupon.productIds && coupon.productIds.includes(item.productId)) {
            return true;
          }
          if (coupon.categoryIds && coupon.categoryIds.includes(item.categoryId)) {
            return true;
          }
          return false;
        })
        .reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    }

    // Calculate discount
    let discount = 0;

    if (coupon.type === 'percentage') {
      discount = (targetTotal * coupon.value) / 100;
    } else {
      discount = coupon.value;
    }

    // Apply max discount limit
    if (coupon.maxDiscountAmount) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }

    // Don't exceed target total
    discount = Math.min(discount, targetTotal);

    return discount;
  }

  // Get user's coupon usage count (mock - should query from backend)
  private getUserCouponUsageCount(couponId: string, userId: string): number {
    const usageKey = `coupon_usage_${couponId}_${userId}`;
    const usage = localStorage.getItem(usageKey);
    return usage ? parseInt(usage) : 0;
  }

  // Record coupon usage (mock - should save to backend)
  recordCouponUsage(couponId: string, userId?: string): void {
    if (userId) {
      const usageKey = `coupon_usage_${couponId}_${userId}`;
      const currentUsage = this.getUserCouponUsageCount(couponId, userId);
      localStorage.setItem(usageKey, (currentUsage + 1).toString());
    }
  }

  // Check if code format is valid
  isValidCouponCode(code: string): boolean {
    // Must be uppercase alphanumeric, 4-20 characters
    const regex = /^[A-Z0-9]{4,20}$/;
    return regex.test(code);
  }

  // Generate random coupon code
  generateCouponCode(prefix: string = '', length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix.toUpperCase();
    
    const remainingLength = length - prefix.length;
    for (let i = 0; i < remainingLength; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }
}

export const couponValidationService = new CouponValidationService();
