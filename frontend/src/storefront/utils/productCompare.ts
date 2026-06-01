import type { StorefrontProductSummary } from '../types/storefront.types';

export const MAX_COMPARE_ITEMS = 4;

export type CompareItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number | null;
  image: string | null;
};

export function compareStorageKey(tenantSlug: string) {
  return `store_compare_items_${tenantSlug}`;
}

export function parseCompareItems(raw: string | null): CompareItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CompareItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item?.id && item?.name && item?.slug);
  } catch {
    return [];
  }
}

export function toCompareItem(product: StorefrontProductSummary): CompareItem {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    discountPrice: product.discountPrice,
    image: product.image,
  };
}

export type ToggleCompareResult =
  | { ok: true; items: CompareItem[]; added: boolean }
  | { ok: false; reason: 'max_reached'; items: CompareItem[] }
  | { ok: false; reason: 'invalid'; items: CompareItem[] };

export function toggleCompareItem(
  items: CompareItem[],
  product: StorefrontProductSummary,
): ToggleCompareResult {
  if (!product.id) return { ok: false, reason: 'invalid', items };

  const existingIdx = items.findIndex(item => item.id === product.id);
  if (existingIdx >= 0) {
    const next = items.filter((_, idx) => idx !== existingIdx);
    return { ok: true, items: next, added: false };
  }

  if (items.length >= MAX_COMPARE_ITEMS) {
    return { ok: false, reason: 'max_reached', items };
  }

  return { ok: true, items: [...items, toCompareItem(product)], added: true };
}
