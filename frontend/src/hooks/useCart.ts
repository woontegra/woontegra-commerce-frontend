import { useState, useEffect, useMemo } from 'react';
import type { Cart, CartItem, Coupon } from '../types/cart';
import type { Campaign } from '../types/advancedCampaign';
import { cartCalculationService } from '../services/cartCalculation.service';

const CART_STORAGE_KEY = 'shopping_cart';

export function useCart(campaigns: Campaign[] = []) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'free'>('standard');

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setItems(parsed.items || []);
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items }));
  }, [items]);

  // Real-time calculation
  const calculatedCart = useMemo(() => {
    const result = cartCalculationService.calculateCart(
      items,
      campaigns,
      coupon,
      shippingMethod
    );

    const cart: Cart = {
      items: items.map(item => ({
        ...item,
        finalPrice: item.basePrice, // Will be updated by campaigns
      })),
      subtotal: result.subtotal,
      discountBreakdown: result.breakdown,
      shipping: {
        method: shippingMethod,
        cost: result.shipping,
        freeShippingThreshold: 500,
        estimatedDays: shippingMethod === 'express' ? 1 : shippingMethod === 'free' ? 5 : 3,
      },
      total: result.total,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      updatedAt: new Date().toISOString(),
    };

    return cart;
  }, [items, campaigns, coupon, shippingMethod]);

  // Add item to cart
  const addItem = (item: CartItem) => {
    const existingItemIndex = items.findIndex(
      i => i.productId === item.productId && i.variantId === item.variantId
    );

    if (existingItemIndex !== -1) {
      // Update quantity
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += item.quantity;
      setItems(updatedItems);
    } else {
      // Add new item
      setItems([...items, item]);
    }
  };

  // Update item quantity
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems(items.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Clear cart
  const clearCart = () => {
    setItems([]);
    setCoupon(null);
  };

  // Apply coupon
  const applyCoupon = (newCoupon: Coupon) => {
    setCoupon(newCoupon);
  };

  // Remove coupon
  const removeCoupon = () => {
    setCoupon(null);
  };

  // Update shipping method
  const updateShippingMethod = (method: 'standard' | 'express' | 'free') => {
    setShippingMethod(method);
  };

  return {
    cart: calculatedCart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    updateShippingMethod,
  };
}
