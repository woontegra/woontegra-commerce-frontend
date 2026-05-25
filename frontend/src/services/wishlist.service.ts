import apiClient from './apiClient';
import type { Wishlist, WishlistItem } from '../types/wishlist';

export const wishlistService = {
  async getWishlist(): Promise<Wishlist> {
    const response = await apiClient.get('/wishlist');
    return response.data;
  },

  async addToWishlist(productId: string, variantId?: string): Promise<WishlistItem> {
    const response = await apiClient.post('/wishlist/add', { productId, variantId });
    return response.data;
  },

  async removeFromWishlist(productId: string, variantId?: string): Promise<void> {
    await apiClient.delete('/wishlist/remove', { data: { productId, variantId } });
  },

  async clearWishlist(): Promise<void> {
    await apiClient.delete('/wishlist/clear');
  },

  async checkInWishlist(productId: string, variantId?: string): Promise<boolean> {
    const params = variantId ? { productId, variantId } : { productId };
    const response = await apiClient.get('/wishlist/check', { params });
    return response.data.inWishlist;
  }
};
