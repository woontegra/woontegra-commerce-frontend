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
import type { StorefrontCartLine } from '../types/storefront.types';
import { useStorefrontTenant } from './useStorefrontTenant';
import { AddToCartFeedbackModal } from '../components/AddToCartFeedbackModal';

function cartStorageKey(tenantId: string) {
  return `woontegra_cart_${tenantId}`;
}

export type AddToCartFeedback = {
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  listPrice?: number;
  quantity: number;
};

type AddLineInput = Omit<StorefrontCartLine, 'quantity'> & { quantity?: number };
type AddLineOptions = { showFeedback?: boolean };

type Ctx = {
  lines: StorefrontCartLine[];
  addLine: (line: AddLineInput, options?: AddLineOptions) => boolean;
  removeLine: (productId: string, variantId?: string) => void;
  setQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  cartFeedback: AddToCartFeedback | null;
  dismissCartFeedback: () => void;
};

const StorefrontCartContext = createContext<Ctx | null>(null);

function lineKey(productId: string, variantId?: string) {
  return variantId ? `${productId}:${variantId}` : productId;
}

export function StorefrontCartProvider({ children }: { children: ReactNode }) {
  const { tenant } = useStorefrontTenant();
  const tenantId = tenant?.id ?? '';

  const [lines, setLines] = useState<StorefrontCartLine[]>([]);
  const [cartFeedback, setCartFeedback] = useState<AddToCartFeedback | null>(null);

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

  const dismissCartFeedback = useCallback(() => setCartFeedback(null), []);

  const addLine = useCallback((input: AddLineInput, options?: AddLineOptions) => {
    const qty = Math.max(1, input.quantity ?? 1);
    const key = lineKey(input.productId, input.variantId);
    let addedQty = 0;

    setLines(prev => {
      const idx = prev.findIndex(l => lineKey(l.productId, l.variantId) === key);
      if (idx >= 0) {
        const next = [...prev];
        const max = next[idx].maxStock;
        const oldQty = next[idx].quantity;
        const newQty = max != null ? Math.min(max, oldQty + qty) : oldQty + qty;
        addedQty = newQty - oldQty;
        if (addedQty <= 0) return prev;
        next[idx] = { ...next[idx], quantity: newQty };
        return next;
      }
      const capped = input.maxStock != null ? Math.min(input.maxStock, qty) : qty;
      if (capped <= 0) return prev;
      addedQty = capped;
      return [...prev, { ...input, quantity: capped }];
    });

    if (addedQty > 0) {
      if (options?.showFeedback !== false) {
        setCartFeedback({
          productId: input.productId,
          name: input.name,
          imageUrl: input.imageUrl,
          unitPrice: input.unitPrice,
          listPrice: input.listPrice,
          quantity: addedQty,
        });
      }
      return true;
    }

    toast.error('Ürün sepete eklenemedi.');
    return false;
  }, []);

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
      cartFeedback,
      dismissCartFeedback,
    }),
    [
      lines,
      addLine,
      removeLine,
      setQuantity,
      clearCart,
      subtotal,
      itemCount,
      cartFeedback,
      dismissCartFeedback,
    ],
  );

  return (
    <StorefrontCartContext.Provider value={value}>
      {children}
      {cartFeedback && (
        <AddToCartFeedbackModal
          feedback={cartFeedback}
          itemCount={itemCount}
          subtotal={subtotal}
          onDismiss={dismissCartFeedback}
        />
      )}
    </StorefrontCartContext.Provider>
  );
}

export function useStorefrontCartOptional(): Ctx | null {
  return useContext(StorefrontCartContext);
}

export function useStorefrontCart(): Ctx {
  const c = useStorefrontCartOptional();
  if (!c) throw new Error('useStorefrontCart: StorefrontCartProvider eksik');
  return c;
}
