import { describe, expect, it } from 'vitest';
import {
  formatDateTimeTr,
  getOrderShippingCardView,
  getOrderShippingSummaryView,
  isSafeTrackingUrl,
} from './shipping';

describe('storefront shipping utils', () => {
  it('isSafeTrackingUrl accepts https only', () => {
    expect(isSafeTrackingUrl('https://kargo.test/1')).toBe(true);
    expect(isSafeTrackingUrl('http://kargo.test/1')).toBe(true);
    expect(isSafeTrackingUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeTrackingUrl('')).toBe(false);
  });

  it('formatDateTimeTr formats Turkish locale', () => {
    const s = formatDateTimeTr('2026-05-25T11:30:00.000Z');
    expect(s).toBeTruthy();
    expect(s).toMatch(/2026/);
  });
});

describe('getOrderShippingCardView', () => {
  const shippedFields = {
    shippingCarrier:        'Aras Kargo',
    shippingTrackingNumber: 'TRK-99',
    shippingTrackingUrl:    'https://kargo.test/t/TRK-99',
    shippedAt:              '2026-05-25T11:30:00.000Z',
  };

  it('shows pending message for PROCESSING', () => {
    expect(getOrderShippingCardView('PROCESSING', {})).toEqual({ kind: 'pending' });
  });

  it('shows pending message for PENDING', () => {
    expect(getOrderShippingCardView('PENDING', shippedFields)).toEqual({ kind: 'pending' });
  });

  it('shows shipped card with tracking fields', () => {
    const view = getOrderShippingCardView('SHIPPED', shippedFields);
    expect(view.kind).toBe('shipped_with_tracking');
    if (view.kind !== 'shipped_with_tracking') return;
    expect(view.carrier).toBe('Aras Kargo');
    expect(view.trackingNumber).toBe('TRK-99');
    expect(view.trackingUrl).toBe('https://kargo.test/t/TRK-99');
    expect(view.shippedAtLabel).toBeTruthy();
  });

  it('shows fallback when SHIPPED without tracking info', () => {
    expect(getOrderShippingCardView('SHIPPED', {})).toEqual({ kind: 'shipped_no_tracking' });
    expect(getOrderShippingCardView('DELIVERED', { shippingCarrier: '  ' })).toEqual({
      kind: 'shipped_no_tracking',
    });
  });

  it('omits invalid tracking URL from shipped card', () => {
    const view = getOrderShippingCardView('SHIPPED', {
      shippingTrackingNumber: 'X1',
      shippingTrackingUrl:    'javascript:evil()',
    });
    expect(view).toEqual({
      kind:           'shipped_with_tracking',
      carrier:        null,
      trackingNumber: 'X1',
      shippedAtLabel: null,
      trackingUrl:    null,
    });
  });

  it('includes safe http tracking link', () => {
    const view = getOrderShippingCardView('DELIVERED', {
      shippingTrackingUrl: 'http://track.example/1',
    });
    if (view.kind !== 'shipped_with_tracking') throw new Error('expected shipped_with_tracking');
    expect(view.trackingUrl).toBe('http://track.example/1');
  });
});

describe('getOrderShippingSummaryView', () => {
  const fields = {
    shippingCarrier:        'Yurtiçi Kargo',
    shippingTrackingNumber: '123456789',
    shippingTrackingUrl:    'https://kargo.test/t/123',
    shippedAt:              '2026-05-25T11:30:00.000Z',
  };

  it('hides summary for PROCESSING', () => {
    expect(getOrderShippingSummaryView('PROCESSING', fields).shouldShow).toBe(false);
  });

  it('hides summary for PENDING', () => {
    expect(getOrderShippingSummaryView('PENDING', fields).shouldShow).toBe(false);
  });

  it('shows carrier and tracking for SHIPPED', () => {
    const view = getOrderShippingSummaryView('SHIPPED', fields);
    expect(view.shouldShow).toBe(true);
    expect(view.carrierText).toBe('Yurtiçi Kargo');
    expect(view.trackingNumberText).toBe('123456789');
    expect(view.trackingButtonVisible).toBe(true);
    expect(view.trackingUrl).toBe('https://kargo.test/t/123');
    expect(view.fallbackText).toBeNull();
  });

  it('shows safe tracking link only for http/https', () => {
    const safe = getOrderShippingSummaryView('SHIPPED', {
      shippingTrackingUrl: 'https://kargo.test/1',
    });
    expect(safe.trackingButtonVisible).toBe(true);

    const unsafe = getOrderShippingSummaryView('SHIPPED', {
      shippingTrackingNumber: 'X',
      shippingTrackingUrl:    'javascript:evil()',
    });
    expect(unsafe.trackingButtonVisible).toBe(false);
    expect(unsafe.trackingUrl).toBeNull();
    expect(unsafe.trackingNumberText).toBe('X');
  });

  it('shows fallback for SHIPPED without tracking info', () => {
    const view = getOrderShippingSummaryView('SHIPPED', {});
    expect(view.shouldShow).toBe(true);
    expect(view.fallbackText).toBe('Takip bilgisi hazırlanıyor.');
    expect(view.trackingButtonVisible).toBe(false);
  });

  it('hides summary for DELIVERED without tracking info', () => {
    expect(getOrderShippingSummaryView('DELIVERED', {}).shouldShow).toBe(false);
  });

  it('shows summary for DELIVERED with tracking number', () => {
    const view = getOrderShippingSummaryView('DELIVERED', {
      shippingTrackingNumber: 'DEL-1',
    });
    expect(view.shouldShow).toBe(true);
    expect(view.trackingNumberText).toBe('DEL-1');
  });
});
