import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import type { StorefrontProductSummary } from '../types/storefront.types';
import {
  compareStorageKey,
  parseCompareItems,
  toggleCompareItem,
  type CompareItem,
} from '../utils/productCompare';
import { useStorefrontTenant } from './useStorefrontTenant';

type Ctx = {
  items: CompareItem[];
  count: number;
  isInCompare: (productId: string) => boolean;
  toggleCompare: (product: StorefrontProductSummary) => boolean;
};

const StorefrontCompareContext = createContext<Ctx | null>(null);

export function StorefrontCompareProvider({ children }: { children: ReactNode }) {
  const { tenant } = useStorefrontTenant();
  const tenantSlug = tenant?.slug ?? '';
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    if (!tenantSlug) {
      setItems([]);
      return;
    }
    try {
      const raw = localStorage.getItem(compareStorageKey(tenantSlug));
      setItems(parseCompareItems(raw));
    } catch {
      setItems([]);
    }
  }, [tenantSlug]);

  useEffect(() => {
    if (!tenantSlug) return;
    localStorage.setItem(compareStorageKey(tenantSlug), JSON.stringify(items));
  }, [items, tenantSlug]);

  const isInCompare = useCallback(
    (productId: string) => items.some(item => item.id === productId),
    [items],
  );

  const toggleCompare = useCallback((product: StorefrontProductSummary) => {
    let changed = false;
    let maxReached = false;

    setItems(prev => {
      const result = toggleCompareItem(prev, product);
      if (!result.ok) {
        if (result.reason === 'max_reached') maxReached = true;
        return prev;
      }
      changed = true;
      return result.items;
    });

    if (maxReached) {
      toast.error('En fazla 4 ürün karşılaştırabilirsiniz.');
      return false;
    }
    return changed;
  }, []);

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      isInCompare,
      toggleCompare,
    }),
    [items, isInCompare, toggleCompare],
  );

  return (
    <StorefrontCompareContext.Provider value={value}>{children}</StorefrontCompareContext.Provider>
  );
}

export function useStorefrontCompareOptional(): Ctx | null {
  return useContext(StorefrontCompareContext);
}

export function useStorefrontCompare(): Ctx {
  const ctx = useStorefrontCompareOptional();
  if (!ctx) throw new Error('useStorefrontCompare: StorefrontCompareProvider eksik');
  return ctx;
}
