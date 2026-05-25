import { useFeatureContext, PLAN_META, getMinPlanForFeature } from '../context/FeatureContext';
import type { FeatureKey, PlanTier } from '../context/FeatureContext';

/**
 * Returns whether a feature flag is enabled for the current tenant.
 *
 * Usage:
 *   const enabled = useFeature('order');
 */
export function useFeature(key: FeatureKey): boolean {
  const { isEnabled } = useFeatureContext();
  return isEnabled(key);
}

/**
 * Returns the full flags map, current plan, and a loading indicator.
 */
export function useFeatureFlags() {
  const { flags, plan, loading, refresh } = useFeatureContext();
  return { flags, plan, loading, refresh };
}

/**
 * Returns current plan info with display helpers.
 *
 * Usage:
 *   const { plan, isPro, isEnterprise, upgradeRequired } = usePlan();
 */
export function usePlan() {
  const { plan, loading } = useFeatureContext();
  const meta = PLAN_META[plan];

  return {
    plan,
    label:             meta.label,
    isStarter:         plan === 'STARTER',
    isPro:             plan === 'PRO' || plan === 'ENTERPRISE',
    isEnterprise:      plan === 'ENTERPRISE',
    upgradeTo:         meta.upgradeTo as PlanTier | null,
    loading,
    /**
     * Returns the minimum plan required to access a feature.
     * Useful for showing the right upgrade CTA.
     */
    minPlanFor:        getMinPlanForFeature,
    /**
     * Returns true if the current plan doesn't include the feature.
     */
    upgradeRequired:   (key: FeatureKey) => !PLAN_META[plan] || getMinPlanForFeature(key) !== plan
                         && plan === 'STARTER' && getMinPlanForFeature(key) !== 'STARTER'
                         || plan === 'PRO'     && getMinPlanForFeature(key) === 'ENTERPRISE',
  };
}
