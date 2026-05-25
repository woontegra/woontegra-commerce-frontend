import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { StorefrontCartLine } from '../types/storefront.types';
import { useStorefrontTenant } from './useStorefrontTenant';

function cartStorageKey(tenantId: string) {
  return `woontegra_cart_${tenantId}`;
}

type Ctx = {
  lines: StorefrontCartLine[];
  addLine: (line: Omit<StorefrontCartLine, 'quantity'> & { quantity?: number }) => void;
  removeLine: (productId: string, variantId?: string) => void;
  setQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
};

const StorefrontCartContext = createContext<Ctx | null>(null);

function lineKey(productId: string, variantId?: string) {
  return variantId ? `${productId}:${variantId}` : productId;
}

export function StorefrontCartProvider({ children }: { children: ReactNode }) {
  const { tenant } = useStorefrontTenant();
  const tenantId   = tenant?.id ?? '';

  const [lines, setLines] = useState<StorefrontCartLine[]>([]);

  useEffect(() => {
    if (!tenantId) {
      setLines([]);
      return;
    }
    try {
      const raw = localStorage.getItem(cartStorageKey(tenantId));
      setLines(raw ? (JSON.parse(raw) as StorefrontCartLine[]) : []);
    } catch {
      setLines([]);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    localStorage.setItem(cartStorageKey(tenantId), JSON.stringify(lines));
  }, [lines, tenantId]);

  const addLine = useCallback(
    (input: Omit<StorefrontCartLine, 'quantity'> & { quantity?: number }) => {
      const qty = Math.max(1, input.quantity ?? 1);
      const key = lineKey(input.productId, input.variantId);
      setLines(prev => {
        const idx = prev.findIndex(l => lineKey(l.productId, l.variantId) === key);
        if (idx >= 0) {
          const next = [...prev];
          const max = next[idx].maxStock;
          const newQty = max != null ? Math.min(max, next[idx].quantity + qty) : next[idx].quantity + qty;
          next[idx] = { ...next[idx], quantity: newQty };
          return next;
        }
        const capped = input.maxStock != null ? Math.min(input.maxStock, qty) : qty;
        return [...prev, { ...input, quantity: capped }];
      });
    },
    [],
  );

  const removeLine = useCallback((productId: string, variantId?: string) => {
    const key = lineKey(productId, variantId);
    setLines(prev => prev.filter(l => lineKey(l.productId, l.variantId) !== key));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number, variantId?: string) => {
    const key = lineKey(productId, variantId);
    if (quantity <= 0) {
      setLines(prev => prev.filter(l => lineKey(l.productId, l.variantId) !== key));
      return;
    }
    setLines(prev =>
      prev.map(l => {
        if (lineKey(l.productId, l.variantId) !== key) return l;
        const capped = l.maxStock != null ? Math.min(l.maxStock, quantity) : quantity;
        return { ...l, quantity: capped };
      }),
    );
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [lines],
  );
  const itemCount = useMemo(
    () => lines.reduce((s, l) => s + l.quantity, 0),
    [lines],
  );

  const value = useMemo(
    () => ({
      lines,
      addLine,
      removeLine,
      setQuantity,
      clearCart,
      subtotal,
      itemCount,
    }),
    [lines, addLine, removeLine, setQuantity, clearCart, subtotal, itemCount],
  );

  return (
    <StorefrontCartContext.Provider value={value}>{children}</StorefrontCartContext.Provider>
  );
}

export function useStorefrontCart(): Ctx {
  const c = useContext(StorefrontCartContext);
  if (!c) throw new Error('useStorefrontCart: StorefrontCartProvider eksik');
  return c;
}
