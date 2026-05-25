import { storePublicClient } from '../../services/storePublicApi';

export type StartPaytrPaymentResponse = {
  success: boolean;
  provider?: 'PAYTR';
  token?: string;
  iframeUrl?: string;
  orderNumber?: string;
  error?: string;
};

export async function startPaytrPayment(
  tenantSlug: string,
  payload: { orderId?: string; orderNumber?: string },
): Promise<StartPaytrPaymentResponse> {
  const r = await storePublicClient.post<StartPaytrPaymentResponse>(
    '/store/payments/paytr/start',
    payload,
    { params: { tenant: tenantSlug } },
  );
  return r.data;
}
