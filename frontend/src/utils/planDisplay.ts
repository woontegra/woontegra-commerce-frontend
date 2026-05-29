export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

const PLAN_DISPLAY_LABELS: Record<PlanTier, string> = {
  STARTER:    'Starter',
  PRO:        'Professional',
  ENTERPRISE: 'Enterprise',
};

/** Backend / admin panel plan kodlarını sidebar tier'a çevirir. */
export function normalizePlanTier(value: unknown): PlanTier {
  const raw = String(value ?? '').toUpperCase().trim();
  if (raw === 'PRO' || raw === 'PROFESSIONAL') return 'PRO';
  if (raw === 'ENTERPRISE') return 'ENTERPRISE';
  if (raw === 'STARTER') return 'STARTER';
  return 'STARTER';
}

/** Satıcı panelinde gösterilecek plan adı. */
export function getPlanDisplayLabel(plan: PlanTier, tenantStatus?: string | null): string {
  if (String(tenantStatus ?? '').toUpperCase() === 'TRIAL') {
    return 'Trial / Demo';
  }
  return PLAN_DISPLAY_LABELS[plan] ?? 'Starter';
}
