export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'USER';
  tenantId: string;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
  isActive: boolean;
  productId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  basePrice?: number;
  stock: number;
  sku?: string;
  images: string[];
  isActive: boolean;
  categoryId?: string;
  variants?: ProductVariant[];
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  shippingPrice: number;
  discountAmount: number;
  shippingMethodId?: string;
  shippingMethod?: ShippingMethod;
  couponId?: string;
  coupon?: Coupon;
  notes?: string;
  customerId: string;
  customer?: Customer;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  productId: string;
  product?: Product;
}

export interface Settings {
  id: string;
  siteName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor?: string;
  currency: string;
  language: string;
}

export interface AuthResponse {
  status: string;
  data: {
    user: User;
    token: string;
  };
}
