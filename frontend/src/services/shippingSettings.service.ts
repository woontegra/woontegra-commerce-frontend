import api from './api';
import type { TenantShippingSettings } from '../types/shippingSettings.types';

type GetResponse = {
  success: boolean;
  settings?: TenantShippingSettings;
  error?: string;
};

export async function fetchShippingSettings(): Promise<TenantShippingSettings> {
  const r = await api.get<GetResponse>('/shipping-settings', { skipErrorToast: true });
  if (!r.data.success || !r.data.settings) {
    throw new Error(r.data.error || 'Kargo ayarları yüklenemedi.');
  }
  return r.data.settings;
}

export async function saveShippingSettings(
  body: Partial<TenantShippingSettings>,
): Promise<TenantShippingSettings> {
  const r = await api.put<GetResponse>('/shipping-settings', body, { skipErrorToast: true });
  if (!r.data.success || !r.data.settings) {
    throw new Error(r.data.error || 'Kargo ayarları kaydedilemedi.');
  }
  return r.data.settings;
}
