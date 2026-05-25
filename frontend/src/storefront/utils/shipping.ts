/** Backend’den gelen takip linki — yalnızca http/https. */
export function isSafeTrackingUrl(url: string | null | undefined): boolean {
  const t = url?.trim() ?? '';
  return /^https?:\/\//i.test(t);
}

export function formatDateTimeTr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('tr-TR', {
    day:    'numeric',
    month:  'long',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

export type OrderShippingFields = {
  shippingCarrier?:        string | null;
  shippingTrackingNumber?: string | null;
  shippingTrackingUrl?:    string | null;
  shippedAt?:              string | null;
};

export type OrderShippingCardView =
  | { kind: 'pending' }
  | { kind: 'shipped_no_tracking' }
  | {
      kind:            'shipped_with_tracking';
      carrier:         string | null;
      trackingNumber:  string | null;
      shippedAtLabel:  string | null;
      trackingUrl:     string | null;
    };

/** Sipariş detay kargo kartı — gösterim modu ve güvenli alanlar. */
export function getOrderShippingCardView(
  status: string,
  fields: OrderShippingFields,
): OrderShippingCardView {
  const isShippedOrDelivered = status === 'SHIPPED' || status === 'DELIVERED';
  if (!isShippedOrDelivered) {
    return { kind: 'pending' };
  }

  const carrier = fields.shippingCarrier?.trim() || null;
  const trackingNumber = fields.shippingTrackingNumber?.trim() || null;
  const trackingUrl = isSafeTrackingUrl(fields.shippingTrackingUrl)
    ? fields.shippingTrackingUrl!.trim()
    : null;
  const shippedAtLabel = formatDateTimeTr(fields.shippedAt);
  const hasTrackingInfo = Boolean(carrier || trackingNumber || trackingUrl);

  if (!hasTrackingInfo) {
    return { kind: 'shipped_no_tracking' };
  }

  return {
    kind: 'shipped_with_tracking',
    carrier,
    trackingNumber,
    shippedAtLabel,
    trackingUrl,
  };
}

export type OrderShippingSummaryView = {
  shouldShow:             boolean;
  carrierText:            string | null;
  trackingNumberText:     string | null;
  shippedAtText:          string | null;
  trackingUrl:            string | null;
  trackingButtonVisible:  boolean;
  fallbackText:           string | null;
};

const emptyShippingSummary = (): OrderShippingSummaryView => ({
  shouldShow:            false,
  carrierText:           null,
  trackingNumberText:    null,
  shippedAtText:         null,
  trackingUrl:           null,
  trackingButtonVisible: false,
  fallbackText:          null,
});

/** Sipariş listesi — SHIPPED / DELIVERED için kısa kargo özeti. */
export function getOrderShippingSummaryView(
  status: string,
  fields: OrderShippingFields,
): OrderShippingSummaryView {
  const isShippedOrDelivered = status === 'SHIPPED' || status === 'DELIVERED';
  if (!isShippedOrDelivered) {
    return emptyShippingSummary();
  }

  const carrierText = fields.shippingCarrier?.trim() || null;
  const trackingNumberText = fields.shippingTrackingNumber?.trim() || null;
  const trackingUrl = isSafeTrackingUrl(fields.shippingTrackingUrl)
    ? fields.shippingTrackingUrl!.trim()
    : null;
  const shippedAtText = formatDateTimeTr(fields.shippedAt);
  const hasTrackingInfo = Boolean(carrierText || trackingNumberText || trackingUrl);

  if (!hasTrackingInfo) {
    if (status === 'SHIPPED') {
      return {
        shouldShow:            true,
        carrierText:           null,
        trackingNumberText:    null,
        shippedAtText:         null,
        trackingUrl:           null,
        trackingButtonVisible: false,
        fallbackText:          'Takip bilgisi hazırlanıyor.',
      };
    }
    return emptyShippingSummary();
  }

  return {
    shouldShow:            true,
    carrierText,
    trackingNumberText,
    shippedAtText,
    trackingUrl,
    trackingButtonVisible: Boolean(trackingUrl),
    fallbackText:          null,
  };
}
