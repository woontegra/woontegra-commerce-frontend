import api from './api';
import type {
  AdminPaymentSetting,
  PaymentProviderType,
  PaymentSettingUpsertResponse,
  PaymentSettingsListResponse,
} from '../types/paymentSettings.types';

export async function fetchPaymentSettings(): Promise<AdminPaymentSetting[]> {
  const r = await api.get<PaymentSettingsListResponse>('/payment-settings', {
    skipErrorToast: true,
  });
  if (!r.data.success || !Array.isArray(r.data.settings)) {
    throw new Error(r.data.error || 'Ödeme ayarları yüklenemedi.');
  }
  return r.data.settings;
}

export async function upsertPaymentSetting(
  provider: PaymentProviderType,
  body: Record<string, unknown>,
): Promise<AdminPaymentSetting> {
  const r = await api.put<PaymentSettingUpsertResponse>(
    `/payment-settings/${provider}`,
    body,
    { skipErrorToast: true },
  );
  if (!r.data.success || !r.data.setting) {
    throw new Error(r.data.error || 'Ödeme ayarı kaydedilemedi.');
  }
  return r.data.setting;
}
