import type {
  DiscountRule,
  DiscountCalculation,
  DiscountEngineResult,
  DiscountContext,
  CartItem,
} from '../types/discountEngine';

class DiscountEngineService {
  // Calculate all applicable discounts
  calculateDiscount(context: DiscountContext): DiscountEngineResult {
    const allRules = this.getAllRules();
    
    // 1. Filter applicable rules
    const applicableRules = allRules.filter(rule => 
      this.isRuleApplicable(rule, context)
    );

    // 2. Sort by priority (campaign > coupon > special)
    const sortedRules = applicableRules.sort((a, b) => a.priority - b.priority);

    // 3. Apply discounts with stacking logic
    const appliedDiscounts: DiscountCalculation[] = [];
    const skippedDiscounts: Array<{ ruleId: string; reason: string }> = [];
    const appliedRuleIds = new Set<string>();

    for (const rule of sortedRules) {
      // Check if can be applied with already applied rules
      if (!this.canStackWith(rule, appliedRuleIds)) {
        skippedDiscounts.push({
          ruleId: rule.id,
          reason: 'Cannot stack with already applied discounts',
        });
        continue;
      }

      // Calculate discount for this rule
      const calculation = this.calculateRuleDiscount(rule, context);

      if (calculation.amount > 0) {
        appliedDiscounts.push(calculation);
        appliedRuleIds.add(rule.id);
      }
    }

    // 4. Calculate totals
    const totalDiscount = appliedDiscounts.reduce((sum, d) => sum + d.amount, 0);
    const finalTotal = Math.max(0, context.cartTotal - totalDiscount);

    return {
      totalDiscount,
      appliedDiscounts,
      skippedDiscounts,
      finalTotal,
    };
  }

  // Check if rule is applicable
  private isRuleApplicable(rule: DiscountRule, context: DiscountContext): boolean {
    if (!rule.isActive) return false;

    const { conditions } = rule;

    // Check usage limits
    if (rule.usageLimit && rule.currentUsage >= rule.usageLimit) {
      return false;
    }

    // User conditions
    if (conditions.userIds && context.userId) {
      if (!conditions.userIds.includes(context.userId)) return false;
    }

    if (conditions.userGroups && context.userGroup) {
      if (!conditions.userGroups.includes(context.userGroup)) return false;
    }

    if (conditions.userTags && context.userTags) {
      const hasTag = conditions.userTags.some(tag => context.userTags!.includes(tag));
      if (!hasTag) return false;
    }

    // Cart conditions
    if (conditions.minCartTotal && context.cartTotal < conditions.minCartTotal) {
      return false;
    }

    if (conditions.maxCartTotal && context.cartTotal > conditions.maxCartTotal) {
      return false;
    }

    const totalQuantity = context.cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (conditions.minQuantity && totalQuantity < conditions.minQuantity) {
      return false;
    }

    if (conditions.maxQuantity && totalQuantity > conditions.maxQuantity) {
      return false;
    }

    // Product/Category conditions
    if (conditions.productIds || conditions.categoryIds || conditions.productTags) {
      const hasMatchingProduct = context.cartItems.some(item => {
        if (conditions.productIds && conditions.productIds.includes(item.productId)) {
          return true;
        }
        if (conditions.categoryIds && item.categoryId && conditions.categoryIds.includes(item.categoryId)) {
          return true;
        }
        if (conditions.productTags && item.productTags) {
          return item.productTags.some(tag => conditions.productTags!.includes(tag));
        }
        return false;
      });

      if (!hasMatchingProduct) return false;
    }

    // Date conditions
    if (conditions.startDate && new Date(conditions.startDate) > context.timestamp) {
      return false;
    }

    if (conditions.endDate && new Date(conditions.endDate) < context.timestamp) {
      return false;
    }

    // Day of week
    if (conditions.daysOfWeek) {
      const dayOfWeek = context.timestamp.getDay();
      if (!conditions.daysOfWeek.includes(dayOfWeek)) return false;
    }

    // Time range
    if (conditions.timeRange) {
      const currentTime = context.timestamp.toTimeString().slice(0, 5);
      if (currentTime < conditions.timeRange.start || currentTime > conditions.timeRange.end) {
        return false;
      }
    }

    return true;
  }

  // Calculate discount for a specific rule
  private calculateRuleDiscount(
    rule: DiscountRule,
    context: DiscountContext
  ): DiscountCalculation {
    const calculation: DiscountCalculation = {
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      priority: rule.priority,
      amount: 0,
      appliedTo: [],
    };

    // Get applicable items
    const applicableItems = this.getApplicableItems(rule, context.cartItems);

    if (applicableItems.length === 0) {
      return calculation;
    }

    // Calculate based on discount type
    switch (rule.discount.type) {
      case 'percentage':
        calculation.amount = this.calculatePercentageDiscount(
          rule,
          applicableItems
        );
        break;

      case 'fixed':
        calculation.amount = Math.min(
          rule.discount.value,
          this.calculateItemsTotal(applicableItems)
        );
        break;

      case 'buy_x_get_y':
        calculation.amount = this.calculateBuyXGetYDiscount(rule, applicableItems);
        break;
    }

    // Apply max discount limit
    if (rule.discount.maxDiscount) {
      calculation.amount = Math.min(calculation.amount, rule.discount.maxDiscount);
    }

    // Record applied items
    calculation.appliedTo = applicableItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      discount: (calculation.amount / applicableItems.length), // Distribute evenly
    }));

    return calculation;
  }

  // Get items that match rule conditions
  private getApplicableItems(rule: DiscountRule, items: CartItem[]): CartItem[] {
    const { conditions } = rule;

    return items.filter(item => {
      if (conditions.productIds && conditions.productIds.includes(item.productId)) {
        return true;
      }
      if (conditions.categoryIds && item.categoryId && conditions.categoryIds.includes(item.categoryId)) {
        return true;
      }
      if (conditions.productTags && item.productTags) {
        return item.productTags.some(tag => conditions.productTags!.includes(tag));
      }
      // If no specific product conditions, apply to all
      if (!conditions.productIds && !conditions.categoryIds && !conditions.productTags) {
        return true;
      }
      return false;
    });
  }

  // Calculate percentage discount
  private calculatePercentageDiscount(rule: DiscountRule, items: CartItem[]): number {
    const total = this.calculateItemsTotal(items);
    return (total * rule.discount.value) / 100;
  }

  // Calculate Buy X Get Y discount
  private calculateBuyXGetYDiscount(rule: DiscountRule, items: CartItem[]): number {
    const { buyQuantity = 1, getQuantity = 1, getFree = true } = rule.discount;
    
    let totalDiscount = 0;

    for (const item of items) {
      const sets = Math.floor(item.quantity / (buyQuantity + getQuantity));
      
      if (sets > 0) {
        if (getFree) {
          // Get Y items free
          totalDiscount += sets * getQuantity * item.price;
        } else {
          // Get Y items at discount
          const discountPerItem = (item.price * rule.discount.value) / 100;
          totalDiscount += sets * getQuantity * discountPerItem;
        }
      }
    }

    return totalDiscount;
  }

  // Calculate total of items
  private calculateItemsTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // Check if rule can stack with already applied rules
  private canStackWith(rule: DiscountRule, appliedRuleIds: Set<string>): boolean {
    if (!rule.stackable) {
      return appliedRuleIds.size === 0;
    }

    if (rule.excludesWith) {
      for (const excludedId of rule.excludesWith) {
        if (appliedRuleIds.has(excludedId)) {
          return false;
        }
      }
    }

    return true;
  }

  // Get all rules (mock)
  private getAllRules(): DiscountRule[] {
    // In production: fetch from API
    return this.getMockRules();
  }

  // Mock rules for demo
  private getMockRules(): DiscountRule[] {
    return [
      // Campaign (Priority 1)
      {
        id: 'camp-1',
        name: 'Yaz Kampanyası',
        type: 'campaign',
        priority: 1,
        conditions: {
          minCartTotal: 500,
          categoryIds: ['giyim', 'aksesuar'],
        },
        discount: {
          type: 'percentage',
          value: 20,
          maxDiscount: 500,
        },
        usageLimit: 1000,
        currentUsage: 450,
        stackable: false,
        isActive: true,
      },
      {
        id: 'camp-2',
        name: '3 Al 2 Öde',
        type: 'campaign',
        priority: 1,
        conditions: {
          productIds: ['prod-1', 'prod-2'],
        },
        discount: {
          type: 'buy_x_get_y',
          value: 0,
          buyQuantity: 2,
          getQuantity: 1,
          getFree: true,
        },
        currentUsage: 120,
        stackable: false,
        isActive: true,
      },

      // Coupon (Priority 2)
      {
        id: 'coupon-1',
        name: 'SUMMER25',
        type: 'coupon',
        priority: 2,
        conditions: {
          minCartTotal: 200,
        },
        discount: {
          type: 'percentage',
          value: 25,
        },
        usageLimit: 500,
        usagePerUser: 1,
        currentUsage: 234,
        stackable: true,
        isActive: true,
      },

      // Special (Priority 3)
      {
        id: 'special-1',
        name: 'VIP Müşteri İndirimi',
        type: 'special',
        priority: 3,
        conditions: {
          userTags: ['vip'],
          minCartTotal: 1000,
        },
        discount: {
          type: 'fixed',
          value: 100,
        },
        currentUsage: 45,
        stackable: true,
        excludesWith: ['camp-1'],
        isActive: true,
      },
    ];
  }
}

export const discountEngineService = new DiscountEngineService();
