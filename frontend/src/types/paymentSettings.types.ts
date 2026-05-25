export type PaymentProviderType =
  | 'PAYTR'
  | 'IYZICO'
  | 'BANK_POS'
  | 'BANK_TRANSFER'
  | 'CASH_ON_DELIVERY';

export type AdminPaymentSetting = {
  provider: PaymentProviderType;
  isActive: boolean;
  isTestMode: boolean;
  displayName: string | null;
  publicConfig: Record<string, unknown> | null;
  credentials: Record<string, string | boolean | number | null>;
  hasCredentials: boolean;
};

export type PaymentSettingsListResponse = {
  success: boolean;
  settings?: AdminPaymentSetting[];
  error?: string;
};

export type PaymentSettingUpsertResponse = {
  success: boolean;
  setting?: AdminPaymentSetting;
  error?: string;
};

/** Backend gizli alanları korurken gönderilen placeholder */
export const PAYMENT_SECRET_PLACEHOLDER = '***';
