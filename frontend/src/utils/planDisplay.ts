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

export function isSellerLoginSlug(raw: string): boolean {
  const slug = raw.trim();
  if (!slug) return false;
  return !['magaza-slug', 'magaza slug'].includes(slug.toLowerCase());
}

export const SELLER_LOGIN_ERROR_MESSAGE =
  'E-posta, şifre veya mağaza slug hatalı.';

export const SUPER_ADMIN_LOGIN_ERROR_MESSAGE =
  'E-posta veya şifre hatalı. Süper admin iseniz mağaza slug alanını boş bırakın.';
