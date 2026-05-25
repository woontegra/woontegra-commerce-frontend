import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { UserRole } from '../types/auth';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'tr' | 'en';
export type Currency = 'TRY' | 'USD' | 'EUR';

interface AppState {
  // State
  user: User | null;
  tenant: Tenant | null;
  cart: CartItem[];
  theme: Theme;
  language: Language;
  currency: Currency;
  
  // Actions
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      tenant: null,
      cart: [],
      theme: 'light',
      language: 'tr',
      currency: 'TRY',

      // User Actions
      setUser: (user) => set({ user }),
      
      setTenant: (tenant) => set({ tenant }),

      // Cart Actions
      addToCart: (item) => set((state) => {
        const existingItem = state.cart.find(i => i.productId === item.productId);
        
        if (existingItem) {
          return {
            cart: state.cart.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          };
        }
        
        return { cart: [...state.cart, item] };
      }),

      removeFromCart: (productId) => set((state) => ({
        cart: state.cart.filter(item => item.productId !== productId)
      })),

      updateCartQuantity: (productId, quantity) => set((state) => ({
        cart: state.cart.map(item =>
          item.productId === productId
            ? { ...item, quantity }
            : item
        )
      })),

      clearCart: () => set({ cart: [] }),

      // Theme Actions
      setTheme: (theme) => {
        set({ theme });
        
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // System theme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      // Language Actions
      setLanguage: (language) => set({ language }),

      // Currency Actions
      setCurrency: (currency) => set({ currency }),

      // Logout Action
      logout: () => set({
        user: null,
        tenant: null,
        cart: [],
      }),
    }),
    {
      name: 'woontegra-app-storage',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        currency: state.currency,
        cart: state.cart,
      }),
    }
  )
);
