import { describe, expect, it } from 'vitest';
import { getStoreOrderPaymentView } from './payment';

describe('getStoreOrderPaymentView', () => {
  it('maps PAYTR + PAID to storefront labels', () => {
    const view = getStoreOrderPaymentView({
      paymentProvider: 'PAYTR',
      paymentStatus: 'PAID',
      paymentApprovedAt: '2026-05-25T11:30:00.000Z',
    });
    expect(view.providerLabel).toBe('Kredi/Banka Kartı');
    expect(view.statusLabel).toBe('Ödeme alındı');
    expect(view.statusTone).toBe('success');
    expect(view.dateKind).toBe('approved');
    expect(view.dateText).toBeTruthy();
    expect(view.helperText).toBe('');
  });

  it('maps BANK_TRANSFER + WAITING_BANK_TRANSFER', () => {
    const view = getStoreOrderPaymentView({
      paymentProvider: 'BANK_TRANSFER',
      paymentStatus: 'WAITING_BANK_TRANSFER',
    });
    expect(view.providerLabel).toBe('Havale / EFT');
    expect(view.statusLabel).toBe('Havale/EFT bekleniyor');
    expect(view.statusTone).toBe('warning');
    expect(view.helperText).toContain('mağaza tarafından onaylandığında');
  });

  it('maps BANK_TRANSFER + APPROVED', () => {
    const view = getStoreOrderPaymentView({
      paymentProvider: 'BANK_TRANSFER',
      paymentStatus: 'APPROVED',
      paymentApprovedAt: '2026-05-25T11:30:00.000Z',
    });
    expect(view.statusLabel).toBe('Ödeme onaylandı');
    expect(view.statusTone).toBe('success');
    expect(view.dateKind).toBe('approved');
  });

  it('maps PAYTR + FAILED with helper and failed date', () => {
    const view = getStoreOrderPaymentView({
      paymentProvider: 'PAYTR',
      paymentStatus: 'FAILED',
      paymentFailedAt: '2026-05-25T12:00:00.000Z',
    });
    expect(view.statusLabel).toBe('Ödeme başarısız');
    expect(view.statusTone).toBe('danger');
    expect(view.helperText).toContain('tamamlanamadı');
    expect(view.dateKind).toBe('failed');
    expect(view.dateText).toBeTruthy();
  });

  it('maps CASH_ON_DELIVERY', () => {
    const view = getStoreOrderPaymentView({
      paymentProvider: 'CASH_ON_DELIVERY',
      paymentStatus: 'PENDING',
    });
    expect(view.providerLabel).toBe('Kapıda Ödeme');
    expect(view.helperText).toBe('Ödeme teslimatta alınacaktır.');
  });

  it('uses nested payment object on detail orders', () => {
    const view = getStoreOrderPaymentView({
      payment: {
        provider: 'PAYTR',
        status: 'PAID',
        approvedAt: '2026-05-25T11:30:00.000Z',
        failedAt: null,
      },
    });
    expect(view.providerLabel).toBe('Kredi/Banka Kartı');
    expect(view.statusLabel).toBe('Ödeme alındı');
  });

  it('falls back safely for null provider and status', () => {
    const view = getStoreOrderPaymentView({});
    expect(view.providerLabel).toBe('Ödeme yöntemi belirtilmedi');
    expect(view.statusLabel).toBe('Ödeme durumu bilinmiyor');
    expect(view.statusTone).toBe('neutral');
  });
});
