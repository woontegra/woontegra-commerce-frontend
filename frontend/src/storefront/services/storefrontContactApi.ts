import { storePublicClient } from '../../services/storePublicApi';

export type StoreContactPayload = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

export async function submitStoreContactMessage(
  payload: StoreContactPayload,
  tenantSlug?: string,
): Promise<string> {
  const res = await storePublicClient.post('/store/contact', payload, {
    params: tenantSlug?.trim() ? { tenant: tenantSlug.trim() } : undefined,
  });
  const body = res.data as { message?: string };
  return body.message ?? 'Mesajınız alındı.';
}
