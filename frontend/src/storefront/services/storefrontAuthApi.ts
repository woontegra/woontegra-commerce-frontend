import { storePublicClient, setStoreCustomerTokenGetter } from '../../services/storePublicApi';

export type StoreCustomer = {
  id:        string;
  email:     string;
  firstName: string;
  lastName:  string;
  phone:     string;
};

export type AuthResponse = {
  success: boolean;
  customer?: StoreCustomer;
  token?: string;
  error?: string;
};

export function bindStoreCustomerToken(getter: () => string | null) {
  setStoreCustomerTokenGetter(getter);
}

export async function registerCustomer(
  tenantSlug: string,
  body: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  },
): Promise<AuthResponse> {
  const r = await storePublicClient.post<AuthResponse>('/store/auth/register', body, {
    params: { tenant: tenantSlug },
  });
  return r.data;
}

export async function loginCustomer(
  tenantSlug: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const r = await storePublicClient.post<AuthResponse>(
    '/store/auth/login',
    { email, password },
    { params: { tenant: tenantSlug } },
  );
  return r.data;
}

export async function logoutCustomer(tenantSlug: string): Promise<void> {
  await storePublicClient.post('/store/auth/logout', {}, { params: { tenant: tenantSlug } });
}

export async function fetchCustomerMe(tenantSlug: string): Promise<StoreCustomer> {
  const r = await storePublicClient.get<{ success: boolean; customer?: StoreCustomer; error?: string }>(
    '/store/auth/me',
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success || !r.data.customer) {
    throw new Error(r.data.error || 'Oturum doğrulanamadı.');
  }
  return r.data.customer;
}

export async function requestPasswordReset(tenantSlug: string, email: string): Promise<string> {
  const r = await storePublicClient.post<{ success: boolean; message?: string; error?: string }>(
    '/store/auth/forgot-password',
    { email },
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success) {
    throw new Error(r.data.error || 'İşlem tamamlanamadı.');
  }
  return (
    r.data.message ||
    'Eğer bu e-posta ile kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi.'
  );
}

export async function resetPassword(
  tenantSlug: string,
  token: string,
  password: string,
): Promise<void> {
  const r = await storePublicClient.post<{ success: boolean; message?: string; error?: string }>(
    '/store/auth/reset-password',
    { token, password },
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success) {
    throw new Error(r.data.error || 'Şifre güncellenemedi.');
  }
}
