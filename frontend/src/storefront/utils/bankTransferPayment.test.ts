import { describe, expect, it } from 'vitest';
import {
  isBankTransferPaymentSettled,
  isBankTransferPaymentWaiting,
  shouldPollPaymentPendingStatus,
  shouldShowBankTransferOnPendingPage,
  shouldStopPollingPaymentPending,
} from './bankTransferPayment';

describe('bankTransferPayment helpers', () => {
  it('shows bank section when waiting', () => {
    const order = {
      status: 'PENDING',
      paymentProvider: 'BANK_TRANSFER',
      paymentStatus: 'WAITING_BANK_TRANSFER',
    };
    expect(shouldShowBankTransferOnPendingPage(order)).toBe(true);
    expect(isBankTransferPaymentWaiting(order)).toBe(true);
    expect(isBankTransferPaymentSettled(order)).toBe(false);
  });

  it('hides bank section when approved', () => {
    const order = {
      status: 'PROCESSING',
      paymentProvider: 'BANK_TRANSFER',
      paymentStatus: 'APPROVED',
    };
    expect(shouldShowBankTransferOnPendingPage(order)).toBe(false);
    expect(isBankTransferPaymentSettled(order)).toBe(true);
    expect(shouldStopPollingPaymentPending(order)).toBe(true);
    expect(shouldPollPaymentPendingStatus(order)).toBe(false);
  });

  it('polls only while bank transfer waiting', () => {
    const waiting = {
      status: 'PENDING',
      paymentProvider: 'BANK_TRANSFER',
      paymentStatus: 'WAITING_BANK_TRANSFER',
    };
    expect(shouldPollPaymentPendingStatus(waiting)).toBe(true);
    expect(shouldStopPollingPaymentPending(waiting)).toBe(false);

    expect(shouldStopPollingPaymentPending({
      status: 'PENDING',
      paymentProvider: 'PAYTR',
      paymentStatus: 'PENDING',
    })).toBe(true);
  });
});
