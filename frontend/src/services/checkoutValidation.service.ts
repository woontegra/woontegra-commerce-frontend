import type { 
  CheckoutRule, 
  CheckoutValidationResult, 
  CheckoutContext,
  PaymentMethod,
  ShippingMethod
} from '../types/checkoutRules';

class CheckoutValidationService {
  // Main validation function
  validateCheckout(
    context: CheckoutContext,
    rules: CheckoutRule[]
  ): CheckoutValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Filter active rules
    const activeRules = rules.filter(rule => rule.active);

    for (const rule of activeRules) {
      const ruleResult = this.validateRule(rule, context);
      
      if (!ruleResult.valid) {
        errors.push(ruleResult.error || rule.errorMessage);
      }

      if (ruleResult.warning) {
        warnings.push(ruleResult.warning);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // Validate single rule
  private validateRule(
    rule: CheckoutRule,
    context: CheckoutContext
  ): { valid: boolean; error?: string; warning?: string } {
    switch (rule.type) {
      case 'min_total':
        return this.validateMinTotal(rule, context);
      
      case 'max_total':
        return this.validateMaxTotal(rule, context);
      
      case 'payment_limit':
        return this.validatePaymentLimit(rule, context);
      
      case 'shipping_limit':
        return this.validateShippingLimit(rule, context);
      
      case 'product_limit':
        return this.validateProductLimit(rule, context);
      
      case 'category_limit':
        return this.validateCategoryLimit(rule, context);
      
      default:
        return { valid: true };
    }
  }

  // MIN_TOTAL: Minimum sipariş tutarı
  private validateMinTotal(
    rule: CheckoutRule,
    context: CheckoutContext
  ): { valid: boolean; error?: string } {
    if (context.cart.total < rule.value) {
      return {
        valid: false,
        error: rule.errorMessage || `Minimum sipariş tutarı ₺${rule.value.toFixed(2)} olmalıdır`,
      };
    }

    return { valid: true };
  }

  // MAX_TOTAL: Maximum sipariş tutarı
  private validateMaxTotal(
    rule: CheckoutRule,
    context: CheckoutContext
  ): { valid: boolean; error?: string } {
    if (context.cart.total > rule.value) {
      return {
        valid: false,
        error: rule.errorMessage || `Maximum sipariş tutarı ₺${rule.value.toFixed(2)} olabilir`,
      };
    }

    return { valid: true };
  }

  // PAYMENT_LIMIT: Ödeme yöntemi limiti
  private validatePaymentLimit(
    rule: CheckoutRule,
    context: CheckoutContext
  ): { valid: boolean; error?: string } {
    if (!context.paymentMethod) {
      return { valid: true }; // Payment method not selected yet
    }

    // Check if rule applies to this payment method
    if (rule.paymentMethods && !rule.paymentMethods.includes(context.paymentMethod)) {
      return { valid: true }; // Rule doesn't apply
    }

    // Check condition
    if (rule.condition === 'max' && context.cart.total > rule.value) {
      return {
        valid: false,
        error: rule.errorMessage || `Bu ödeme yöntemi için maximum tutar ₺${rule.value.toFixed(2)} olabilir`,
      };
    }

    if (rule.condition === 'min' && context.cart.total < rule.value) {
      return {
        valid: false,
        error: rule.errorMessage || `Bu ödeme yöntemi için minimum tutar ₺${rule.value.toFixed(2)} olmalıdır`,
      };
    }

    return { valid: true };
  }

  // SHIPPING_LIMIT: Kargo yöntemi limiti
  private validateShippingLimit(
    rule: CheckoutRule,
    context: CheckoutContext
  ): { valid: boolean; error?: string } {
    if (!context.shippingMethod) {
      return { valid: true }; // Shipping method not selected yet
    }

    // Check if rule applies to this shipping method
    if (rule.shippingMethods && !rule.shippingMethods.includes(context.shippingMethod)) {
      return { valid: true }; // Rule doesn't apply
    }

    // Check condition
    if (rule.condition === 'max' && context.cart.total > rule.value) {
      return {
        valid: false,
        error: rule.errorMessage || `Bu kargo yöntemi için maximum tutar ₺${rule.value.toFixed(2)} olabilir`,
      };
    }

    if (rule.condition === 'min' && context.cart.total < rule.value) {
      return {
        valid: false,
        error: rule.errorMessage || `Bu kargo yöntemi için minimum tutar ₺${rule.value.toFixed(2)} olmalıdır`,
      };
    }

    return { valid: true };
  }

  // PRODUCT_LIMIT: Ürün bazlı limit
  private validateProductLimit(
    rule: CheckoutRule,
    context: CheckoutContext
  ): { valid: boolean; error?: string } {
    if (!rule.productIds || rule.productIds.length === 0) {
      return { valid: true };
    }

    // Check if cart contains restricted products
    const hasRestrictedProducts = context.cart.items.some(item =>
      rule.productIds!.includes(item.productId)
    );

    if (!hasRestrictedProducts) {
      return { valid: true };
    }

    // Calculate total of restricted products
    const restrictedTotal = context.cart.items
      .filter(item => rule.productIds!.includes(item.productId))
      .reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);

    // Check condition
    if (rule.condition === 'max' && restrictedTotal > rule.value) {
      return {
        valid: false,
        error: rule.errorMessage || `Bu ürünler için maximum tutar ₺${rule.value.toFixed(2)} olabilir`,
      };
    }

    if (rule.condition === 'min' && restrictedTotal < rule.value) {
      return {
        valid: false,
        error: rule.errorMessage || `Bu ürünler için minimum tutar ₺${rule.value.toFixed(2)} olmalıdır`,
      };
    }

    return { valid: true };
  }

  // CATEGORY_LIMIT: Kategori bazlı limit
  private validateCategoryLimit(
    rule: CheckoutRule,
    context: CheckoutContext
  ): { valid: boolean; error?: string } {
    if (!rule.categoryIds || rule.categoryIds.length === 0) {
      return { valid: true };
    }

    // Check if cart contains products from restricted categories
    const hasRestrictedCategories = context.cart.items.some(item =>
      rule.categoryIds!.includes(item.categoryId)
    );

    if (!hasRestrictedCategories) {
      return { valid: true };
    }

    // Calculate total of restricted categories
    const restrictedTotal = context.cart.items
      .filter(item => rule.categoryIds!.includes(item.categoryId))
      .reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);

    // Check condition
    if (rule.condition === 'max' && restrictedTotal > rule.value) {
      return {
        valid: false,
        error: rule.errorMessage || `Bu kategorideki ürünler için maximum tutar ₺${rule.value.toFixed(2)} olabilir`,
      };
    }

    if (rule.condition === 'min' && restrictedTotal < rule.value) {
      return {
        valid: false,
        error: rule.errorMessage || `Bu kategorideki ürünler için minimum tutar ₺${rule.value.toFixed(2)} olmalıdır`,
      };
    }

    return { valid: true };
  }

  // Get applicable payment methods
  getApplicablePaymentMethods(
    context: CheckoutContext,
    rules: CheckoutRule[]
  ): PaymentMethod[] {
    const allMethods: PaymentMethod[] = [
      'credit_card',
      'cash_on_delivery',
      'bank_transfer',
      'mobile_payment',
    ];

    return allMethods.filter(method => {
      const testContext = { ...context, paymentMethod: method };
      const result = this.validateCheckout(testContext, rules);
      return result.valid;
    });
  }

  // Get applicable shipping methods
  getApplicableShippingMethods(
    context: CheckoutContext,
    rules: CheckoutRule[]
  ): ShippingMethod[] {
    const allMethods: ShippingMethod[] = ['standard', 'express', 'free'];

    return allMethods.filter(method => {
      const testContext = { ...context, shippingMethod: method };
      const result = this.validateCheckout(testContext, rules);
      return result.valid;
    });
  }
}

export const checkoutValidationService = new CheckoutValidationService();

// Predefined Rules
export const defaultCheckoutRules: CheckoutRule[] = [
  // Minimum sipariş tutarı: 100 TL
  {
    id: 'rule-min-order',
    name: 'Minimum Sipariş Tutarı',
    description: '100 TL altı sipariş kabul edilmez',
    type: 'min_total',
    value: 100,
    condition: 'min',
    active: true,
    errorMessage: 'Minimum sipariş tutarı ₺100.00 olmalıdır',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Kapıda ödeme: Sadece 500 TL altı
  {
    id: 'rule-cod-limit',
    name: 'Kapıda Ödeme Limiti',
    description: 'Kapıda ödeme sadece 500 TL altı siparişlerde geçerlidir',
    type: 'payment_limit',
    value: 500,
    condition: 'max',
    paymentMethods: ['cash_on_delivery'],
    active: true,
    errorMessage: 'Kapıda ödeme sadece ₺500.00 altı siparişlerde kullanılabilir',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Ücretsiz kargo: Minimum 300 TL
  {
    id: 'rule-free-shipping',
    name: 'Ücretsiz Kargo Minimum',
    description: 'Ücretsiz kargo için minimum 300 TL alışveriş gereklidir',
    type: 'shipping_limit',
    value: 300,
    condition: 'min',
    shippingMethods: ['free'],
    active: true,
    errorMessage: 'Ücretsiz kargo için minimum ₺300.00 alışveriş yapmalısınız',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
