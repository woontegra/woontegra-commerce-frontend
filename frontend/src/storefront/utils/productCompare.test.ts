import { describe, expect, it } from 'vitest';
import {
  MAX_COMPARE_ITEMS,
  parseCompareItems,
  toggleCompareItem,
  toCompareItem,
} from './productCompare';
import type { StorefrontProductSummary } from '../types/storefront.types';

const product = (id: string): StorefrontProductSummary => ({
  id,
  name: `Product ${id}`,
  slug: `product-${id}`,
  price: 100,
  image: null,
});

describe('productCompare', () => {
  it('parses valid compare items', () => {
    const item = toCompareItem(product('1'));
    expect(parseCompareItems(JSON.stringify([item]))).toEqual([item]);
  });

  it('does not add duplicate products', () => {
    const items = [toCompareItem(product('1'))];
    const result = toggleCompareItem(items, product('1'));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.added).toBe(false);
      expect(result.items).toHaveLength(0);
    }
  });

  it('enforces max compare limit', () => {
    let items = Array.from({ length: MAX_COMPARE_ITEMS }, (_, i) =>
      toCompareItem(product(String(i + 1))),
    );
    const result = toggleCompareItem(items, product('new'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('max_reached');
      expect(result.items).toHaveLength(MAX_COMPARE_ITEMS);
    }
  });
});
