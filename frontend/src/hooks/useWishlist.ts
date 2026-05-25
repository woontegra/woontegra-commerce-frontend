import { useState, useEffect, useCallback } from 'react';
import { wishlistService } from '../services/wishlist.service';
import type { Wishlist } from '../types/wishlist';

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await wishlistService.getWishlist();
      setWishlist(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load wishlist');
      console.error('Error loading wishlist:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const addToWishlist = useCallback(async (productId: string, variantId?: string) => {
    try {
      setError(null);
      await wishlistService.addToWishlist(productId, variantId);
      await loadWishlist();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to add to wishlist');
      console.error('Error adding to wishlist:', err);
      return false;
    }
  }, [loadWishlist]);

  const removeFromWishlist = useCallback(async (productId: string, variantId?: string) => {
    try {
      setError(null);
      await wishlistService.removeFromWishlist(productId, variantId);
      await loadWishlist();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to remove from wishlist');
      console.error('Error removing from wishlist:', err);
      return false;
    }
  }, [loadWishlist]);

  const toggleWishlist = useCallback(async (productId: string, variantId?: string) => {
    const isInWishlist = wishlist?.items.some(
      item => item.productId === productId && item.variantId === variantId
    );

    if (isInWishlist) {
      return removeFromWishlist(productId, variantId);
    } else {
      return addToWishlist(productId, variantId);
    }
  }, [wishlist, addToWishlist, removeFromWishlist]);

  const isInWishlist = useCallback((productId: string, variantId?: string) => {
    return wishlist?.items.some(
      item => item.productId === productId && item.variantId === variantId
    ) || false;
  }, [wishlist]);

  const clearWishlist = useCallback(async () => {
    try {
      setError(null);
      await wishlistService.clearWishlist();
      await loadWishlist();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to clear wishlist');
      console.error('Error clearing wishlist:', err);
      return false;
    }
  }, [loadWishlist]);

  return {
    wishlist,
    loading,
    error,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    clearWishlist,
    refresh: loadWishlist,
    itemCount: wishlist?.items.length || 0,
  };
};
