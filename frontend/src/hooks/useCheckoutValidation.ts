import { useMemo } from 'react';
import type { CheckoutContext, CheckoutRule, PaymentMethod, ShippingMethod } from '../types/checkoutRules';
import { checkoutValidationService, defaultCheckoutRules } from '../services/checkoutValidation.service';

export function useCheckoutValidation(
  context: CheckoutContext,
  customRules?: CheckoutRule[]
) {
  const rules = customRules || defaultCheckoutRules;

  // Validate checkout
  const validation = useMemo(() => {
    return checkoutValidationService.validateCheckout(context, rules);
  }, [context, rules]);

  // Get applicable payment methods
  const applicablePaymentMethods = useMemo(() => {
    return checkoutValidationService.getApplicablePaymentMethods(context, rules);
  }, [context, rules]);

  // Get applicable shipping methods
  const applicableShippingMethods = useMemo(() => {
    return checkoutValidationService.getApplicableShippingMethods(context, rules);
  }, [context, rules]);

  // Check if payment method is allowed
  const isPaymentMethodAllowed = (method: PaymentMethod): boolean => {
    return applicablePaymentMethods.includes(method);
  };

  // Check if shipping method is allowed
  const isShippingMethodAllowed = (method: ShippingMethod): boolean => {
    return applicableShippingMethods.includes(method);
  };

  return {
    validation,
    isValid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    applicablePaymentMethods,
    applicableShippingMethods,
    isPaymentMethodAllowed,
    isShippingMethodAllowed,
  };
}
