import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { AUTH_LOGIN_EVENT, AUTH_LOGOUT_EVENT } from '../services/authEvents';
import { normalizePlanTier } from '../utils/planDisplay';

// ── Plan type ─────────────────────────────────────────────────────────────────
export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

// ── Plan display config ───────────────────────────────────────────────────────
export const PLAN_META: Record<PlanTier, { label: string; color: string; upgradeTo: PlanTier | null }> = {
  STARTER:    { label: 'Starter',       color: 'gray',   upgradeTo: 'PRO'        },
  PRO:        { label: 'Professional',  color: 'indigo', upgradeTo: 'ENTERPRISE' },
  ENTERPRISE: { label: 'Enterprise',    color: 'amber',  upgradeTo: null         },
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
  flags:         Record<string, boolean>;
  plan:          PlanTier;
  tenantStatus:  string | null;
  loading:       boolean;
  isEnabled:     (key: FeatureKey) => boolean;
  refresh:       () => void;
}

const FeatureContext = createContext<FeatureContextValue>({
  flags:        {},
  plan:         'STARTER',
  tenantStatus: null,
  loading:      true,
  isEnabled:    () => false,
  refresh:      () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────
export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags]               = useState<Record<string, boolean>>({});
  const [plan, setPlan]                 = useState<PlanTier>('STARTER');
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);

  const resetFeatures = useCallback(() => {
    setFlags({});
    setPlan('STARTER');
    setTenantStatus(null);
    setLoading(false);
  }, []);

  const fetchFlags = useCallback(async () => {
    const user = (() => {
      try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    })();

    if (!localStorage.getItem('token')) {
      resetFeatures();
      return;
    }

    if (user?.role === 'SUPER_ADMIN') {
      setFlags({});
      setPlan('ENTERPRISE');
      setTenantStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res: any = await api.get('/features');
      const data = res?.data?.data || res?.data || {};

      if (data && typeof data === 'object' && 'flags' in data) {
        setFlags(typeof data.flags === 'object' ? data.flags : {});
        setPlan(normalizePlanTier(data.plan));
        setTenantStatus(
          typeof data.tenantStatus === 'string'
            ? data.tenantStatus
            : typeof data.status === 'string'
              ? data.status
              : null,
        );
      } else {
        setFlags(typeof data === 'object' ? data : {});
        setPlan('STARTER');
        setTenantStatus(null);
      }
    } catch {
      setFlags({});
      setPlan('STARTER');
      setTenantStatus(null);
    } finally {
      setLoading(false);
    }
  }, [resetFeatures]);

  useEffect(() => { void fetchFlags(); }, [fetchFlags]);

  useEffect(() => {
    const onLogin = () => { void fetchFlags(); };
    const onLogout = () => resetFeatures();

    window.addEventListener(AUTH_LOGIN_EVENT, onLogin);
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);
    return () => {
      window.removeEventListener(AUTH_LOGIN_EVENT, onLogin);
      window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
    };
  }, [fetchFlags, resetFeatures]);

  const isEnabled = useCallback(
    (key: FeatureKey): boolean => flags[key] ?? false,
    [flags],
  );

  return (
    <FeatureContext.Provider value={{ flags, plan, tenantStatus, loading, isEnabled, refresh: fetchFlags }}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatureContext = () => useContext(FeatureContext);
