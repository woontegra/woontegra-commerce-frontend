import { describe, expect, it } from 'vitest';
import {
  buildStoreOrdersSearchParams,
  getTabSummaryCount,
  parseStoreOrdersListState,
  tabToApiParams,
} from './storeOrderListQuery';

describe('storeOrderListQuery', () => {
  it('omits page=1 from URL', () => {
    const p = buildStoreOrdersSearchParams('ALL', 'demo');
    expect(p.get('tenant')).toBe('demo');
    expect(p.get('page')).toBeNull();
  });

  it('includes page>1 in URL', () => {
    const p = buildStoreOrdersSearchParams('SHIPPED', 'demo', { page: 2 });
    expect(p.get('status')).toBe('SHIPPED');
    expect(p.get('page')).toBe('2');
  });

  it('resets invalid page and strips page=1', () => {
    const sp = new URLSearchParams('tenant=demo&page=abc&status=SHIPPED');
    const r = parseStoreOrdersListState(sp);
    expect(r.tab).toBe('SHIPPED');
    expect(r.page).toBe(1);
    expect(r.needsReplace).toBe(true);
  });

  it('filter change params omit page (page 1)', () => {
    const p = buildStoreOrdersSearchParams('WAITING_PAYMENT', 'demo');
    expect(p.get('filter')).toBe('WAITING_PAYMENT');
    expect(p.get('page')).toBeNull();
  });

  it('builds account shortcut URL for waiting payment filter', () => {
    const p = buildStoreOrdersSearchParams('WAITING_PAYMENT', 'demo');
    expect(p.toString()).toBe('tenant=demo&filter=WAITING_PAYMENT');
  });

  it('tabToApiParams includes page for API', () => {
    expect(tabToApiParams('SHIPPED', 3)).toEqual({
      status: 'SHIPPED',
      page: 3,
      limit: 10,
    });
  });

  it('maps filter tabs to summary counts', () => {
    const summary = {
      total: 12,
      waitingPayment: 2,
      processing: 3,
      shipped: 1,
      delivered: 5,
      cancelled: 1,
    };
    expect(getTabSummaryCount('ALL', summary)).toBe(12);
    expect(getTabSummaryCount('WAITING_PAYMENT', summary)).toBe(2);
    expect(getTabSummaryCount('PROCESSING', summary)).toBe(3);
    expect(getTabSummaryCount('SHIPPED', summary)).toBe(1);
    expect(getTabSummaryCount('DELIVERED', summary)).toBe(5);
    expect(getTabSummaryCount('CANCELLED', summary)).toBe(1);
    expect(getTabSummaryCount('SHIPPED', null)).toBeNull();
  });
});
