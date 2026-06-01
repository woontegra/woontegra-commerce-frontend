import apiClient from './apiClient';

/** Admin panel list item — backend hazır olduğunda aynı şekil beklenir. */
export type AbandonedCartListItem = {
  id:              string;
  sessionId?:      string;
  customerName?:   string | null;
  email?:          string | null;
  phone?:          string | null;
  itemCount?:      number;
  totalAmount?:    number;
  cartData?: {
    items: Array<{ quantity?: number }>;
    total: number;
  };
  status:          'active' | 'recovered' | 'expired' | string;
  reminderSent?:   boolean;
  reminderSentAt?: string | null;
  recoveredAt?:    string | null;
  createdAt:       string;
  updatedAt:       string;
  expiresAt?:      string;
};

export type AbandonedCartListStats = {
  abandoned:         number;
  recovered:         number;
  potentialRevenue:  number;
  recoveryRate:      number;
  last7Days:         number;
};

export type AbandonedCartListResponse = {
  items: AbandonedCartListItem[];
  stats: AbandonedCartListStats | null;
};

const EMPTY_STATS: AbandonedCartListStats = {
  abandoned:        0,
  recovered:        0,
  potentialRevenue: 0,
  recoveryRate:     0,
  last7Days:        0,
};

function normalizeItem(raw: Record<string, unknown>): AbandonedCartListItem | null {
  const id = String(raw.id ?? raw.cartId ?? '');
  if (!id) return null;

  const cartData = raw.cartData as AbandonedCartListItem['cartData'] | undefined;
  const items = cartData?.items ?? [];

  return {
    id,
    sessionId:      raw.sessionId as string | undefined,
    customerName:   (raw.customerName as string | null) ?? null,
    email:          (raw.email as string | null) ?? null,
    phone:          (raw.phone as string | null) ?? null,
    itemCount:      typeof raw.itemCount === 'number'
      ? raw.itemCount
      : items.reduce((s, i) => s + (i.quantity ?? 1), 0),
    totalAmount:    typeof raw.totalAmount === 'number'
      ? raw.totalAmount
      : cartData?.total,
    cartData,
    status:         String(raw.status ?? 'active'),
    reminderSent:   Boolean(raw.reminderSent),
    reminderSentAt: (raw.reminderSentAt as string | null) ?? null,
    recoveredAt:    (raw.recoveredAt as string | null) ?? null,
    createdAt:      String(raw.createdAt ?? raw.abandonedAt ?? new Date().toISOString()),
    updatedAt:      String(raw.updatedAt ?? raw.createdAt ?? new Date().toISOString()),
    expiresAt:      raw.expiresAt as string | undefined,
  };
}

function normalizeStats(raw: Record<string, unknown> | undefined): AbandonedCartListStats | null {
  if (!raw) return null;
  return {
    abandoned:        Number(raw.abandoned ?? raw.active ?? raw.total ?? 0),
    recovered:        Number(raw.recovered ?? 0),
    potentialRevenue: Number(raw.potentialRevenue ?? raw.potential ?? 0),
    recoveryRate:     Number(raw.recoveryRate ?? 0),
    last7Days:        Number(raw.last7Days ?? raw.last7days ?? 0),
  };
}

/** Backend list endpoint'i — yoksa veya hata olursa boş liste döner (mock üretilmez). */
export async function fetchAbandonedCarts(): Promise<AbandonedCartListResponse> {
  try {
    const r = await apiClient.get<{
      success?:   boolean;
      items?:     Record<string, unknown>[];
      carts?:     Record<string, unknown>[];
      stats?:     Record<string, unknown>;
      error?:     string;
    }>('/abandoned-carts');

    if (r.data.success === false) {
      return { items: [], stats: null };
    }

    const rawItems = r.data.items ?? r.data.carts ?? [];
    const items = rawItems
      .map(row => normalizeItem(row))
      .filter((row): row is AbandonedCartListItem => row != null);

    return {
      items,
      stats: normalizeStats(r.data.stats),
    };
  } catch {
    return { items: [], stats: null };
  }
}

export function computeAbandonedCartStats(items: AbandonedCartListItem[]): AbandonedCartListStats {
  if (items.length === 0) return { ...EMPTY_STATS };

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const abandoned = items.filter(c => c.status === 'active');
  const recovered = items.filter(c => c.status === 'recovered');

  const potentialRevenue = abandoned.reduce(
    (sum, c) => sum + (c.totalAmount ?? c.cartData?.total ?? 0),
    0,
  );

  const recoveryRate = items.length > 0
    ? Math.round((recovered.length / items.length) * 100)
    : 0;

  const last7Days = items.filter(c => new Date(c.updatedAt).getTime() >= sevenDaysAgo).length;

  return {
    abandoned:        abandoned.length,
    recovered:        recovered.length,
    potentialRevenue,
    recoveryRate,
    last7Days,
  };
}

export { EMPTY_STATS };
