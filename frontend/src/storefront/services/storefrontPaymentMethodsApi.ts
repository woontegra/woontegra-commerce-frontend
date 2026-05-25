import { storePublicClient } from '../../services/storePublicApi';

export type StorePaymentMethodPaytr = {
  provider: 'PAYTR';
  displayName: string;
  isActive: true;
  isTestMode: boolean;
};

export type StorePaymentMethodBankTransfer = {
  provider: 'BANK_TRANSFER';
  displayName: string;
  isActive: true;
  bankAccounts: {
    bankName: string;
    accountHolder: string;
    ibanMasked: string;
    description?: string;
  }[];
};

export type StorePaymentMethodCod = {
  provider: 'CASH_ON_DELIVERY';
  displayName: string;
  isActive: true;
  extraFee?: number;
  description?: string;
};

export type StorePaymentMethod =
  | StorePaymentMethodPaytr
  | StorePaymentMethodBankTransfer
  | StorePaymentMethodCod;

export type StorePaymentMethodsResponse = {
  success: boolean;
  methods?: StorePaymentMethod[];
  error?: string;
};

export async function fetchStorePaymentMethods(
  tenantSlug: string,
): Promise<StorePaymentMethodsResponse> {
  const r = await storePublicClient.get<StorePaymentMethodsResponse>('/store/payments/methods', {
    params: { tenant: tenantSlug },
  });
  return r.data;
}
