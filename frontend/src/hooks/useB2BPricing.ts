import { useState, useEffect } from 'react';
import type { Customer, CustomerGroup } from '../types/b2b';

interface B2BPricingResult {
  finalPrice: number;
  originalPrice: number;
  pricingType: 'regular' | 'wholesale' | 'group';
  customerGroup?: CustomerGroup;
  discountAmount: number;
  discountPercentage: number;
}

export const useB2BPricing = () => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  // Load customer data from auth context or local storage
  useEffect(() => {
    // This would typically come from your auth context
    const loadCustomer = async () => {
      try {
        setLoading(true);
        // Get current user/customer from auth
        const user = await getCurrentUser();
        if (user?.customerId) {
          const customerData = await getCustomer(user.customerId);
          setCustomer(customerData);
        }
      } catch (error) {
        console.error('Error loading customer:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, []);

  const calculatePrice = (
    basePrice: number,
    wholesalePrice?: number,
    groupPrices?: Record<string, number>
  ): B2BPricingResult => {
    // Default pricing for guest users
    if (!customer || !customer.groupId) {
      return {
        finalPrice: basePrice,
        originalPrice: basePrice,
        pricingType: 'regular',
        discountAmount: 0,
        discountPercentage: 0
      };
    }

    const customerGroup = customer.group;
    let finalPrice = basePrice;
    let pricingType: 'regular' | 'wholesale' | 'group' = 'regular';

    // Check for group-specific pricing first
    if (groupPrices && customerGroup && groupPrices[customerGroup.id]) {
      finalPrice = groupPrices[customerGroup.id];
      pricingType = 'group';
    }
    // Check for wholesale pricing (for Bayi and VIP groups)
    else if (wholesalePrice && customerGroup && 
             (customerGroup.name === 'Bayi' || customerGroup.name === 'VIP')) {
      finalPrice = wholesalePrice;
      pricingType = 'wholesale';
    }

    const discountAmount = basePrice - finalPrice;
    const discountPercentage = basePrice > 0 ? (discountAmount / basePrice) * 100 : 0;

    return {
      finalPrice,
      originalPrice: basePrice,
      pricingType,
      customerGroup,
      discountAmount,
      discountPercentage
    };
  };

  const getProductPricing = async (variantId: string): Promise<B2BPricingResult> => {
    try {
      // Call API to get pricing for this variant and customer
      const response = await fetch(`/api/b2b/products/${variantId}/pricing${customer?.id ? `?customerId=${customer.id}` : ''}`);
      const data = await response.json();

      return {
        finalPrice: data.finalPrice,
        originalPrice: data.basePrice,
        pricingType: data.pricingType,
        customerGroup: data.customerGroup,
        discountAmount: data.basePrice - data.finalPrice,
        discountPercentage: ((data.basePrice - data.finalPrice) / data.basePrice) * 100
      };
    } catch (error) {
      console.error('Error getting product pricing:', error);
      // Fallback to client-side calculation
      return calculatePrice(0);
    }
  };

  const formatPrice = (price: number, currency: string = '₺') => {
    return `${currency}${price.toFixed(2)}`;
  };

  const getPricingLabel = (pricingType: 'regular' | 'wholesale' | 'group') => {
    switch (pricingType) {
      case 'wholesale':
        return 'Toptan Fiyat';
      case 'group':
        return customer?.group?.name + ' Fiyatı';
      default:
        return 'Normal Fiyat';
    }
  };

  const getPricingColor = (pricingType: 'regular' | 'wholesale' | 'group') => {
    switch (pricingType) {
      case 'wholesale':
        return 'text-orange-600';
      case 'group':
        return 'text-blue-600';
      default:
        return 'text-gray-900';
    }
  };

  return {
    customer,
    loading,
    calculatePrice,
    getProductPricing,
    formatPrice,
    getPricingLabel,
    getPricingColor
  };
};

// Helper functions (these would be implemented based on your auth/customer service)
async function getCurrentUser() {
  // Get current authenticated user
  return JSON.parse(localStorage.getItem('user') || 'null');
}

async function getCustomer(customerId: string): Promise<Customer> {
  // Fetch customer data including group information
  const response = await fetch(`/api/customers/${customerId}`);
  return response.json();
}
