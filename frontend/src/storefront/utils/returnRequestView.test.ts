import { describe, expect, it } from 'vitest';
import {
  formatReturnItemsSummary,
  returnRequestStatusLabel,
  returnRequestTypeLabel,
} from './returnRequestView';

describe('returnRequestView', () => {
  it('maps CANCEL_REQUEST type label', () => {
    expect(returnRequestTypeLabel('CANCEL_REQUEST')).toBe('İptal Talebi');
  });

  it('maps RETURN_REQUEST type label', () => {
    expect(returnRequestTypeLabel('RETURN_REQUEST')).toBe('İade Talebi');
  });

  it('maps status labels', () => {
    expect(returnRequestStatusLabel('PENDING')).toBe('Beklemede');
    expect(returnRequestStatusLabel('APPROVED')).toBe('Onaylandı');
    expect(returnRequestStatusLabel('REJECTED')).toBe('Reddedildi');
    expect(returnRequestStatusLabel('COMPLETED')).toBe('Tamamlandı');
  });

  it('falls back for unknown values', () => {
    expect(returnRequestTypeLabel('UNKNOWN')).toBe('Talep');
    expect(returnRequestStatusLabel(null)).toBe('Durum bilinmiyor');
  });

  it('formats item summary', () => {
    expect(
      formatReturnItemsSummary([
        { id: '1', orderItemId: 'oi1', quantity: 2, reason: null, productName: 'Gömlek' },
      ]),
    ).toBe('Gömlek × 2');

    expect(
      formatReturnItemsSummary([
        { id: '1', orderItemId: 'oi1', quantity: 1, reason: null, productName: 'A' },
        { id: '2', orderItemId: 'oi2', quantity: 3, reason: null, productName: 'B' },
      ]),
    ).toBe('A × 1 (+1 ürün)');
  });
});
