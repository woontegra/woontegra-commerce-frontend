import { storePublicClient } from '../../services/storePublicApi';
import type { StoreShippingQuote } from '../../types/shippingSettings.types';

export type CalculateShippingPayload = {
  items: { productId: string; variantId?: string | null; quantity: number }[];
  paymentProvider?: 'PAYTR' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';
};

export async function calculateStoreShipping(
  tenantSlug: string,
  payload: CalculateShippingPayload,
): Promise<StoreShippingQuote> {
  const r = await storePublicClient.post<StoreShippingQuote>(
    '/store/shipping/calculate',
    payload,
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success) {
    throw new Error(r.data.error || 'Kargo hesaplanamadı.');
  }
  return r.data;
}
