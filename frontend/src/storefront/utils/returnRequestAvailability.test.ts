import { describe, expect, it } from 'vitest';
import { getReturnRequestAvailability } from './returnRequestAvailability';

describe('getReturnRequestAvailability', () => {
  it('allows cancel for PENDING', () => {
    const a = getReturnRequestAvailability({ status: 'PENDING' });
    expect(a.cancelAvailable).toBe(true);
    expect(a.returnAvailable).toBe(false);
  });

  it('allows cancel for PROCESSING', () => {
    const a = getReturnRequestAvailability({ status: 'PROCESSING' });
    expect(a.cancelAvailable).toBe(true);
    expect(a.returnAvailable).toBe(false);
  });

  it('allows cancel for PAID', () => {
    const a = getReturnRequestAvailability({ status: 'PAID' });
    expect(a.cancelAvailable).toBe(true);
  });

  it('shows shipped info without return button', () => {
    const a = getReturnRequestAvailability({ status: 'SHIPPED' });
    expect(a.cancelAvailable).toBe(false);
    expect(a.returnAvailable).toBe(false);
    expect(a.shippedInfoMessage).toContain('teslimat sonrası');
  });

  it('allows return only for DELIVERED', () => {
    const a = getReturnRequestAvailability({ status: 'DELIVERED' });
    expect(a.returnAvailable).toBe(true);
    expect(a.cancelAvailable).toBe(false);
  });

  it('blocks when cancelled', () => {
    const a = getReturnRequestAvailability({ status: 'CANCELLED' });
    expect(a.unavailable).toBe(true);
    expect(a.cancelAvailable).toBe(false);
    expect(a.returnAvailable).toBe(false);
  });

  it('blocks new request when active request exists', () => {
    const a = getReturnRequestAvailability({
      status: 'DELIVERED',
      activeReturnRequest: { id: 'req-1' },
    });
    expect(a.hasActiveRequest).toBe(true);
    expect(a.returnAvailable).toBe(false);
    expect(a.cancelAvailable).toBe(false);
  });
});
