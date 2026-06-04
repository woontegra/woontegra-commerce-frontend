import { storePublicClient } from '../../services/storePublicApi';

export type StoreCouponValidation = {
  valid: boolean;
  coupon: { code: string; discountType: string; value: number } | null;
  discountAmount: number;
  finalAmount: number;
  error?: string;
};

export async function validateStoreCoupon(
  tenantSlug: string,
  payload: {
    code: string;
    items: { productId: string; variantId?: string | null; quantity: number }[];
  },
): Promise<StoreCouponValidation> {
  const r = await storePublicClient.post<{ success: boolean; data: StoreCouponValidation; error?: string }>(
    '/store/coupons/validate',
    payload,
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success || !r.data.data) {
    throw new Error(r.data.error ?? 'Kupon doğrulanamadı.');
  }
  return r.data.data;
}
