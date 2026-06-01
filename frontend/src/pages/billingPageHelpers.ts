import { getPlanDisplayLabel, normalizePlanTier, type PlanTier } from '../utils/planDisplay';

export type BillingCycle = 'MONTHLY' | 'YEARLY';

export type SubscriptionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'PAST_DUE'
  | 'TRIAL';

const PLAN_RANK: Record<PlanTier, number> = {
  STARTER:    0,
  PRO:        1,
  ENTERPRISE: 2,
};

export const PLAN_LABELS: Record<PlanTier, string> = {
  STARTER:    'Starter',
  PRO:        'Professional',
  ENTERPRISE: 'Enterprise',
};

export const PLAN_COLORS: Record<PlanTier, string> = {
  STARTER:    'bg-blue-50 text-blue-800 ring-1 ring-blue-100',
  PRO:        'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100',
  ENTERPRISE: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
};

export const STATUS_CONFIG: Record<string, { label: string; hint?: string; className: string }> = {
  ACTIVE:   { label: 'Aktif',          className: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100' },
  PENDING:  { label: 'Bekliyor',       hint: 'Ödeme veya aktivasyon tamamlanmayı bekliyor.', className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100' },
  TRIAL:    { label: 'Deneme',         hint: 'Deneme süresi içindesiniz.', className: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100' },
  CANCELED: { label: 'İptal Edildi',   hint: 'Dönem sonuna kadar erişim devam edebilir.', className: 'bg-orange-50 text-orange-800 ring-1 ring-orange-100' },
  EXPIRED:  { label: 'Süresi Doldu',   className: 'bg-red-50 text-red-800 ring-1 ring-red-100' },
  PAST_DUE: { label: 'Ödeme Gecikmiş', className: 'bg-red-50 text-red-800 ring-1 ring-red-100' },
};

export const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  SUCCESS:  { label: 'Başarılı',    className: 'text-emerald-700' },
  FAILED:   { label: 'Başarısız',   className: 'text-red-600' },
  PENDING:  { label: 'Bekliyor',    className: 'text-amber-700' },
  REFUNDED: { label: 'İade Edildi', className: 'text-sky-700' },
};

export function normalizePlanKey(plan: string | null | undefined): PlanTier {
  return normalizePlanTier(plan);
}

export function displayPlanName(plan: string | null | undefined, tenantStatus?: string | null): string {
  return getPlanDisplayLabel(normalizePlanKey(plan), tenantStatus);
}

export function isDowngradePlan(current: string | null | undefined, target: string): boolean {
  if (!current) return false;
  return PLAN_RANK[normalizePlanKey(target)] < PLAN_RANK[normalizePlanKey(current)];
}

export function safeFormatDate(
  dateStr: string | null | undefined,
  fallback = 'Belirtilmemiş',
): string {
  if (!dateStr || !String(dateStr).trim()) return fallback;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return fallback;
  return new Intl.DateTimeFormat('tr-TR', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  }).format(d);
}

export function safeDaysRemaining(endDate: string | null | undefined): number | null {
  if (!endDate || !String(endDate).trim()) return null;
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function formatRemainingDays(days: number | null): string {
  if (days === null) return 'Süre bilgisi yok';
  return `${days.toLocaleString('tr-TR')} gün`;
}

export function formatCurrency(amount: number | null | undefined, currency = 'TRY'): string {
  if (amount == null || Number.isNaN(Number(amount))) return 'Tanımlı değil';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(amount));
}

export function billingCycleLabel(cycle: string | null | undefined): string {
  if (cycle === 'YEARLY') return 'Yıllık';
  if (cycle === 'MONTHLY') return 'Aylık';
  return 'Belirtilmemiş';
}

export function resolveSubscriptionPrice(
  planKey: string | null | undefined,
  cycle: string | null | undefined,
  plans: { key: string; prices: { MONTHLY: number; YEARLY: number } }[],
): string {
  if (!planKey) return 'Tanımlı değil';
  const tier = normalizePlanKey(planKey);
  const plan = plans.find(p => normalizePlanKey(p.key) === tier);
  if (!plan) return 'Tanımlı değil';
  const c = cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
  const price = plan.prices[c];
  if (price == null || Number.isNaN(price)) return 'Tanımlı değil';
  if (price === 0) return 'Ücretsiz';
  return `${formatCurrency(price)}/${c === 'MONTHLY' ? 'ay' : 'yıl'}`;
}
