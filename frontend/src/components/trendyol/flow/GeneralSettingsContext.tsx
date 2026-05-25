import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { trendyolApi } from '../../../pages/TrendyolIntegration';
import type { PriceStrategyForm } from './trendyolPriceUtils';

const STORAGE_KEY = 'trendyol-general-settings-saved-v1';

type GeneralSettingsContextValue = {
  isConfigured: boolean;
  priceStrategy: PriceStrategyForm | null;
  requireConfigured: () => boolean;
  markConfigured: () => void;
};

const GeneralSettingsContext = createContext<GeneralSettingsContextValue | null>(null);

export function GeneralSettingsProvider({ children }: { children: ReactNode }) {
  const [isConfigured, setIsConfigured] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1',
  );

  const { data: priceStrategyRaw } = useQuery({
    queryKey: ['trendyol-price-strategy'],
    queryFn: trendyolApi.getPriceStrategy,
    staleTime: 30_000,
  });

  const [priceStrategy, setPriceStrategy] = useState<PriceStrategyForm | null>(null);

  useEffect(() => {
    if (priceStrategyRaw) {
      setPriceStrategy({
        mode: (priceStrategyRaw.mode ?? 'none') as PriceStrategyForm['mode'],
        value: Number(priceStrategyRaw.value ?? 0),
        vatRate: Number(priceStrategyRaw.vatRate ?? 20),
        vatIncluded: Boolean(priceStrategyRaw.vatIncluded ?? false),
        roundTo: Number(priceStrategyRaw.roundTo ?? 2),
      });
    }
  }, [priceStrategyRaw]);

  const markConfigured = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setIsConfigured(true);
  }, []);

  const requireConfigured = useCallback(() => {
    if (isConfigured) return true;
    toast.error('Gönderim için önce genel ayarları tamamlamalısınız');
    document.getElementById('trendyol-general-settings')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    return false;
  }, [isConfigured]);

  const value = useMemo(
    () => ({ isConfigured, priceStrategy, requireConfigured, markConfigured }),
    [isConfigured, priceStrategy, requireConfigured, markConfigured],
  );

  return (
    <GeneralSettingsContext.Provider value={value}>
      {children}
    </GeneralSettingsContext.Provider>
  );
}

export function useGeneralSettings() {
  const ctx = useContext(GeneralSettingsContext);
  if (!ctx) {
    throw new Error('useGeneralSettings must be used within GeneralSettingsProvider');
  }
  return ctx;
}

/** Legacy tab görünümünde provider yoksa kontrol atlanır */
export function useGeneralSettingsGate() {
  const ctx = useContext(GeneralSettingsContext);
  return {
    isConfigured: ctx?.isConfigured ?? true,
    priceStrategy: ctx?.priceStrategy ?? null,
    requireConfigured: (): boolean => {
      if (!ctx) return true;
      return ctx.requireConfigured();
    },
  };
}
