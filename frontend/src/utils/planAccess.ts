import type { PlanTier } from './planDisplay';
import { normalizePlanTier } from './planDisplay';

/** TRIAL < STARTER < PRO (Professional) < ENTERPRISE */
export const PLAN_RANK: Record<PlanTier, number> = {
  STARTER:    1,
  PRO:        2,
  ENTERPRISE: 3,
};

/**
 * Hiyerarşik plan erişimi — üst plan alt plan özelliklerini kapsar.
 * Trial kullanıcılar yalnızca STARTER seviyesine kadar hiyerarşiden yararlanır;
 * ücretli PRO/ENTERPRISE modülleri için backend flag'lerine bakılır.
 */
export function hasPlanAccess(
  currentPlan: unknown,
  requiredPlan: PlanTier,
  tenantStatus?: string | null,
): boolean {
  const current = normalizePlanTier(currentPlan);
  const required = normalizePlanTier(requiredPlan);

  if (String(tenantStatus ?? '').toUpperCase() === 'TRIAL') {
    return required === 'STARTER' && PLAN_RANK[current] >= PLAN_RANK.STARTER;
  }

  return PLAN_RANK[current] >= PLAN_RANK[required];
}
