import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { StorefrontProductSummary } from '../types/storefront.types';
import { ProductQuickViewModal } from '../components/ProductQuickViewModal';

type QuickViewTarget = {
  product: StorefrontProductSummary;
  productUrl: string;
};

type Ctx = {
  openQuickView: (product: StorefrontProductSummary, productUrl: string) => void;
  closeQuickView: () => void;
};

const StorefrontQuickViewContext = createContext<Ctx | null>(null);

export function StorefrontQuickViewProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<QuickViewTarget | null>(null);

  const openQuickView = useCallback((product: StorefrontProductSummary, productUrl: string) => {
    setTarget({ product, productUrl });
  }, []);

  const closeQuickView = useCallback(() => setTarget(null), []);

  const value = useMemo(
    () => ({ openQuickView, closeQuickView }),
    [openQuickView, closeQuickView],
  );

  return (
    <StorefrontQuickViewContext.Provider value={value}>
      {children}
      {target && (
        <ProductQuickViewModal
          product={target.product}
          productUrl={target.productUrl}
          onClose={closeQuickView}
        />
      )}
    </StorefrontQuickViewContext.Provider>
  );
}

export function useStorefrontQuickViewOptional(): Ctx | null {
  return useContext(StorefrontQuickViewContext);
}

export function useStorefrontQuickView(): Ctx {
  const ctx = useStorefrontQuickViewOptional();
  if (!ctx) throw new Error('useStorefrontQuickView: StorefrontQuickViewProvider eksik');
  return ctx;
}
