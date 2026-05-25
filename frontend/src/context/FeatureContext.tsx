import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';

// ── Plan type ─────────────────────────────────────────────────────────────────
export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

// ── Plan display config ───────────────────────────────────────────────────────
export const PLAN_META: Record<PlanTier, { label: string; color: string; upgradeTo: PlanTier | null }> = {
  STARTER:    { label: 'Starter',    color: 'gray',   upgradeTo: 'PRO'        },
  PRO:        { label: 'Pro',        color: 'indigo',  upgradeTo: 'ENTERPRISE' },
  ENTERPRISE: { label: 'Enterprise', color: 'amber',   upgradeTo: null         },
};

// ── Feature key type (mirrors backend constants) ──────────────────────────────
export type FeatureKey =
  // Starter
  | 'campaigns' | 'coupons' | 'bulk_import' | 'seo_tools' | 'blog' | 'export_reports'
  // Pro
  | 'order' | 'customer' | 'stock_management' | 'campaign_advanced'
  | 'discount_rules' | 'abandoned_cart' | 'advanced_analytics' | 'multi_currency' | 'trendyol'
  // Enterprise
  | 'marketplace' | 'api_access' | 'webhooks' | 'b2b' | 'pages_builder';

// ── Plan → included features (mirrors backend PLAN_FEATURES) ─────────────────
export const PLAN_FEATURES: Record<PlanTier, FeatureKey[]> = {
  STARTER: [
    'campaigns', 'coupons', 'bulk_import', 'seo_tools', 'blog', 'export_reports',
  ],
  PRO: [
    'campaigns', 'coupons', 'bulk_import', 'seo_tools', 'blog', 'export_reports',
    'order', 'customer', 'stock_management', 'campaign_advanced',
    'discount_rules', 'abandoned_cart', 'advanced_analytics', 'multi_currency', 'trendyol',
  ],
  ENTERPRISE: [
    'campaigns', 'coupons', 'bulk_import', 'seo_tools', 'blog', 'export_reports',
    'order', 'customer', 'stock_management', 'campaign_advanced',
    'discount_rules', 'abandoned_cart', 'advanced_analytics', 'multi_currency', 'trendyol',
    'marketplace', 'api_access', 'webhooks', 'b2b', 'pages_builder',
  ],
};

export function getMinPlanForFeature(key: FeatureKey): PlanTier {
  if (PLAN_FEATURES.STARTER.includes(key))    return 'STARTER';
  if (PLAN_FEATURES.PRO.includes(key))        return 'PRO';
  return 'ENTERPRISE';
}

// ── Context value ─────────────────────────────────────────────────────────────
interface FeatureContextValue {
  flags:     Record<string, boolean>;
  plan:      PlanTier;
  loading:   boolean;
  isEnabled: (key: FeatureKey) => boolean;
  refresh:   () => void;
}

const FeatureContext = createContext<FeatureContextValue>({
  flags:     {},
  plan:      'STARTER',
  loading:   true,
  isEnabled: () => false,
  refresh:   () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────
export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags]   = useState<Record<string, boolean>>({});
  const [plan,  setPlan]    = useState<PlanTier>('STARTER');
  const [loading, setLoading] = useState(true);
  const fetchedRef            = useRef(false);

  const fetchFlags = useCallback(async () => {
    const user = (() => {
      try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    })();

    if (!localStorage.getItem('token') || user?.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN has everything enabled
      setFlags({});
      setPlan('ENTERPRISE');
      setLoading(false);
      return;
    }

    try {
      const res: any = await api.get('/features');
      const data = res?.data?.data || res?.data || {};

      if (data && typeof data === 'object' && 'flags' in data) {
        // New shape: { flags, plan, planFeatureKeys }
        setFlags(typeof data.flags === 'object' ? data.flags : {});
        setPlan((data.plan as PlanTier) ?? 'STARTER');
      } else {
        // Legacy shape: flat flags object
        setFlags(typeof data === 'object' ? data : {});
      }
    } catch {
      setFlags({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchFlags();
  }, [fetchFlags]);

  const isEnabled = useCallback(
    (key: FeatureKey): boolean => flags[key] ?? false,
    [flags],
  );

  return (
    <FeatureContext.Provider value={{ flags, plan, loading, isEnabled, refresh: fetchFlags }}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatureContext = () => useContext(FeatureContext);
