/** Varsayılan vitrin teması — ileride admin panelden bağlanacak ayarlar */
export type StorefrontThemeSettings = {
  primaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  bannerTitle: string | null;
  bannerSubtitle: string | null;
  footerText: string | null;
  socialLinks: { label: string; url: string }[];
};

export type StorefrontProductSummary = {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number | null;
  image: string | null;
  stock?: number;
  category?: { id: string; name: string; slug: string } | null;
};

export type StorefrontProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number | null;
  images: string[];
  stock?: number;
  category: { id: string; name: string; slug: string } | null;
};

export type StorefrontCartLine = {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  listPrice?: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  maxStock?: number;
};

export type StorefrontCheckoutForm = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  shippingAddress: string;
  shippingDistrict: string;
  shippingCity: string;
  shippingZip: string;
  billingSameAsShipping: boolean;
  billingAddress: string;
  billingDistrict: string;
  billingCity: string;
  billingZip: string;
  shippingMethodId: string;
  paymentMethodId: string;
  couponCode: string;
};

export type CreateStoreOrderPayload = {
  items: { productId: string; variantId?: string | null; quantity: number }[];
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    city: string;
    district: string;
    addressLine: string;
    postalCode: string;
  };
  billingAddress: {
    sameAsShipping: boolean;
    type?: 'individual' | 'corporate';
    fullName?: string;
    phone?: string;
    city?: string;
    district?: string;
    addressLine?: string;
    postalCode?: string;
    taxOffice?: string;
    taxNumber?: string;
    companyName?: string;
  };
  notes: string;
  paymentProvider?: 'PAYTR' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';
};

export type CreateStoreOrderResponse = {
  success: boolean;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    currency: string;
  };
  summary?: {
    subtotal: number;
    shippingTotal: number;
    cashOnDeliveryFee?: number;
    discountTotal: number;
    grandTotal: number;
    currency: string;
  };
  paymentProvider?: string | null;
  error?: string;
};
