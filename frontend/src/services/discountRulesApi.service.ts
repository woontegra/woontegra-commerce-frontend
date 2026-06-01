import apiClient from './apiClient';

export type DiscountRuleStatus = 'active' | 'scheduled' | 'inactive' | 'expired';
export type DiscountRuleKind = 'product' | 'category' | 'cart' | 'shipping' | 'other';

export type DiscountRuleListItem = {
  id:             string;
  name:           string;
  ruleKind:       DiscountRuleKind;
  discountLabel:  string;
  targetLabel:    string;
  status:         DiscountRuleStatus;
  startDate:      string | null;
  endDate:        string | null;
  usageCount:     number;
  totalSavings:   number;
  minCartTotal:   number | null;
  isActive:       boolean;
};

export type DiscountRuleListStats = {
  active:       number;
  scheduled:    number;
  expired:      number;
  totalSavings: number;
  usageCount:   number;
};

const RULE_KIND_LABELS: Record<DiscountRuleKind, string> = {
  product:  'Ürün indirimi',
  category: 'Kategori indirimi',
  cart:     'Sepet indirimi',
  shipping: 'Kargo indirimi',
  other:    'Diğer',
};

const STATUS_LABELS: Record<DiscountRuleStatus, string> = {
  active:    'Aktif',
  scheduled: 'Planlanmış',
  inactive:  'Pasif',
  expired:   'Süresi doldu',
};

export { RULE_KIND_LABELS, STATUS_LABELS };

function inferRuleKind(raw: Record<string, unknown>): DiscountRuleKind {
  const explicit = String(raw.ruleType ?? raw.ruleKind ?? raw.type ?? '').toLowerCase();
  if (explicit.includes('product') || explicit.includes('ürün')) return 'product';
  if (explicit.includes('category') || explicit.includes('kategori')) return 'category';
  if (explicit.includes('cart') || explicit.includes('sepet')) return 'cart';
  if (explicit.includes('shipping') || explicit.includes('kargo')) return 'shipping';

  const conditions = raw.conditions as Record<string, unknown> | undefined;
  if (conditions?.productIds) return 'product';
  if (conditions?.categoryIds) return 'category';
  if (conditions?.minCartTotal != null && !conditions?.productIds && !conditions?.categoryIds) return 'cart';

  return 'other';
}

function formatDiscountLabel(raw: Record<string, unknown>): string {
  const discount = raw.discount as Record<string, unknown> | undefined;
  const discountType = String(discount?.type ?? raw.discountType ?? '').toLowerCase();
  const value = Number(discount?.value ?? raw.discountValue ?? 0);

  if (discountType.includes('shipping') || discountType === 'free_shipping') {
    return 'Ücretsiz kargo';
  }
  if (discountType.includes('buy') || discountType === 'buy_x_get_y') {
    const buy = discount?.buyQuantity ?? raw.buyQuantity;
    const get = discount?.getQuantity ?? raw.getQuantity;
    if (buy && get) return `${buy} Al ${get} Öde`;
    return 'Al-X-Öde-Y';
  }
  if (discountType.includes('percent') || discountType === 'percentage') {
    return `%${value}`;
  }
  if (discountType.includes('fixed') || discountType === 'fixed_amount') {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
    }).format(value);
  }
  if (value > 0) return String(value);
  return '—';
}

function formatTargetLabel(raw: Record<string, unknown>, ruleKind: DiscountRuleKind): string {
  const target = raw.targetLabel ?? raw.target;
  if (typeof target === 'string' && target.trim()) return target;

  const conditions = raw.conditions as Record<string, unknown> | undefined;
  if (ruleKind === 'product') {
    const ids = conditions?.productIds as unknown[] | undefined;
    if (ids?.length === 1) return 'Belirli ürün';
    if (ids && ids.length > 1) return `${ids.length} ürün`;
  }
  if (ruleKind === 'category') {
    const ids = conditions?.categoryIds as unknown[] | undefined;
    if (ids?.length === 1) return 'Belirli kategori';
    if (ids && ids.length > 1) return `${ids.length} kategori`;
  }
  if (ruleKind === 'cart') return 'Sepet koşulu';
  if (ruleKind === 'shipping') return 'Kargo';
  return 'Tüm ürünler';
}

function resolveStatus(raw: Record<string, unknown>): DiscountRuleStatus {
  const explicit = String(raw.status ?? '').toLowerCase();
  if (explicit === 'active' || explicit === 'aktif') return 'active';
  if (explicit === 'scheduled' || explicit === 'planlanmış' || explicit === 'planned') return 'scheduled';
  if (explicit === 'inactive' || explicit === 'pasif' || explicit === 'disabled') return 'inactive';
  if (explicit === 'expired' || explicit === 'süresi doldu') return 'expired';

  const isActive = raw.isActive !== false && raw.active !== false;
  const conditions = raw.conditions as Record<string, unknown> | undefined;
  const startDate = (conditions?.startDate ?? raw.startDate) as string | undefined;
  const endDate = (conditions?.endDate ?? raw.endDate) as string | undefined;
  const now = Date.now();

  if (endDate && new Date(endDate).getTime() < now) return 'expired';
  if (!isActive) return 'inactive';
  if (startDate && new Date(startDate).getTime() > now) return 'scheduled';
  return 'active';
}

function normalizeItem(raw: Record<string, unknown>): DiscountRuleListItem | null {
  const id = String(raw.id ?? '');
  const name = String(raw.name ?? raw.title ?? '');
  if (!id || !name) return null;

  const conditions = raw.conditions as Record<string, unknown> | undefined;
  const ruleKind = inferRuleKind(raw);

  return {
    id,
    name,
    ruleKind,
    discountLabel: formatDiscountLabel(raw),
    targetLabel:   formatTargetLabel(raw, ruleKind),
    status:        resolveStatus(raw),
    startDate:     (conditions?.startDate ?? raw.startDate ?? null) as string | null,
    endDate:       (conditions?.endDate ?? raw.endDate ?? null) as string | null,
    usageCount:    Number(raw.usageCount ?? raw.currentUsage ?? 0),
    totalSavings:  Number(raw.totalSavings ?? raw.totalDiscount ?? 0),
    minCartTotal:  conditions?.minCartTotal != null
      ? Number(conditions.minCartTotal)
      : raw.minCartTotal != null
        ? Number(raw.minCartTotal)
        : null,
    isActive:      raw.isActive !== false && raw.active !== false,
  };
}

/** Backend list endpoint — yoksa boş liste (mock üretilmez). */
export async function fetchDiscountRules(): Promise<{
  items: DiscountRuleListItem[];
  stats: DiscountRuleListStats | null;
}> {
  try {
    const r = await apiClient.get<{
      success?: boolean;
      items?:   Record<string, unknown>[];
      rules?:   Record<string, unknown>[];
      stats?:   Record<string, unknown>;
      error?:   string;
    }>('/discount-rules');

    if (r.data.success === false) {
      return { items: [], stats: null };
    }

    const rawItems = r.data.items ?? r.data.rules ?? [];
    const items = rawItems
      .map(row => normalizeItem(row))
      .filter((row): row is DiscountRuleListItem => row != null);

    const statsRaw = r.data.stats;
    const stats = statsRaw
      ? {
          active:       Number(statsRaw.active ?? 0),
          scheduled:    Number(statsRaw.scheduled ?? 0),
          expired:      Number(statsRaw.expired ?? 0),
          totalSavings: Number(statsRaw.totalSavings ?? statsRaw.totalDiscount ?? 0),
          usageCount:   Number(statsRaw.usageCount ?? statsRaw.totalUsage ?? 0),
        }
      : null;

    return { items, stats };
  } catch {
    return { items: [], stats: null };
  }
}

export function computeDiscountRuleStats(items: DiscountRuleListItem[]): DiscountRuleListStats {
  if (items.length === 0) {
    return { active: 0, scheduled: 0, expired: 0, totalSavings: 0, usageCount: 0 };
  }

  return {
    active:       items.filter(i => i.status === 'active').length,
    scheduled:    items.filter(i => i.status === 'scheduled').length,
    expired:      items.filter(i => i.status === 'expired').length,
    totalSavings: items.reduce((s, i) => s + i.totalSavings, 0),
    usageCount:   items.reduce((s, i) => s + i.usageCount, 0),
  };
}
