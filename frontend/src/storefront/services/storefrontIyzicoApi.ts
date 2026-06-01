import { storePublicClient } from '../../services/storePublicApi';

const CHECKOUT_SESSION_PREFIX = 'woontegra:iyzico-checkout:';

export type StartIyzicoPaymentResponse = {
  success: boolean;
  provider?: 'IYZICO';
  token?: string;
  checkoutFormContent?: string;
  orderNumber?: string;
  conversationId?: string;
  error?: string;
};

export async function startIyzicoPayment(
  tenantSlug: string,
  payload: { orderId?: string; orderNumber?: string },
): Promise<StartIyzicoPaymentResponse> {
  const r = await storePublicClient.post<StartIyzicoPaymentResponse>(
    '/store/payments/iyzico/start',
    payload,
    { params: { tenant: tenantSlug } },
  );
  return r.data;
}

export function saveIyzicoCheckoutSession(orderNumber: string, checkoutFormContent: string): void {
  try {
    sessionStorage.setItem(`${CHECKOUT_SESSION_PREFIX}${orderNumber}`, checkoutFormContent);
  } catch {
    /* quota / private mode */
  }
}

export function readIyzicoCheckoutSession(orderNumber: string): string | null {
  try {
    return sessionStorage.getItem(`${CHECKOUT_SESSION_PREFIX}${orderNumber}`);
  } catch {
    return null;
  }
}

export function clearIyzicoCheckoutSession(orderNumber: string): void {
  try {
    sessionStorage.removeItem(`${CHECKOUT_SESSION_PREFIX}${orderNumber}`);
  } catch {
    /* ignore */
  }
}
