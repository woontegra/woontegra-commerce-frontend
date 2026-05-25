export type ReturnRequestAvailabilityInput = {
  status: string;
  activeReturnRequest?: { id: string } | null;
};

export type ReturnRequestAvailability = {
  hasActiveRequest:   boolean;
  cancelAvailable:    boolean;
  returnAvailable:    boolean;
  unavailable:        boolean;
  shippedInfoMessage: string | null;
};

const CANCEL_STATUSES = new Set(['PENDING', 'PROCESSING', 'PAID']);

/** Müşteri sipariş detayı — iade/iptal talebi oluşturma uygunluğu. */
export function getReturnRequestAvailability(
  order: ReturnRequestAvailabilityInput,
): ReturnRequestAvailability {
  if (order.activeReturnRequest) {
    return {
      hasActiveRequest:   true,
      cancelAvailable:    false,
      returnAvailable:    false,
      unavailable:        false,
      shippedInfoMessage: null,
    };
  }

  const status = order.status;

  if (status === 'CANCELLED') {
    return {
      hasActiveRequest:   false,
      cancelAvailable:    false,
      returnAvailable:    false,
      unavailable:        true,
      shippedInfoMessage: null,
    };
  }

  if (CANCEL_STATUSES.has(status)) {
    return {
      hasActiveRequest:   false,
      cancelAvailable:    true,
      returnAvailable:    false,
      unavailable:        false,
      shippedInfoMessage: null,
    };
  }

  if (status === 'SHIPPED') {
    return {
      hasActiveRequest:   false,
      cancelAvailable:    false,
      returnAvailable:    false,
      unavailable:        false,
      shippedInfoMessage:
        'Siparişiniz kargoya verildiği için iptal talebi yerine teslimat sonrası iade talebi oluşturabilirsiniz.',
    };
  }

  if (status === 'DELIVERED') {
    return {
      hasActiveRequest:   false,
      cancelAvailable:    false,
      returnAvailable:    true,
      unavailable:        false,
      shippedInfoMessage: null,
    };
  }

  return {
    hasActiveRequest:   false,
    cancelAvailable:    false,
    returnAvailable:    false,
    unavailable:        true,
    shippedInfoMessage: null,
  };
}
