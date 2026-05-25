export type TenantShippingSettings = {
  isActive: boolean;
  displayName: string;
  standardShippingCost: number;
  freeShippingThreshold: number | null;
  description: string | null;
};

export type StoreShippingQuote = {
  success: boolean;
  subtotal?: number;
  shipping?: {
    method: 'STANDARD';
    displayName: string;
    shippingTotal: number;
    freeShippingApplied: boolean;
    freeShippingThreshold: number | null;
  };
  fees?: {
    cashOnDeliveryFee: number;
  };
  grandTotal?: number;
  error?: string;
};
