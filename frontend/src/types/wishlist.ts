export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId: string;
  variantId?: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[];
    isActive: boolean;
    stock: any;
  };
  variant?: {
    id: string;
    name: string;
    price: number;
    images: string[];
    stockQuantity: number;
    isActive: boolean;
  };
}

export interface Wishlist {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  items: WishlistItem[];
}
