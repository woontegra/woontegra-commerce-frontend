import type { AdminPaymentSetting, PaymentProviderType } from '../types/paymentSettings.types';
import { PROVIDER_LABELS } from './paymentSettings.constants';

export function findSetting(
  settings: AdminPaymentSetting[],
  provider: PaymentProviderType,
): AdminPaymentSetting | undefined {
  return settings.find(s => s.provider === provider);
}

export function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

export function countActiveMethods(settings: AdminPaymentSetting[]): number {
  return settings.filter(s =>
    s.isActive && ['PAYTR', 'BANK_TRANSFER', 'CASH_ON_DELIVERY'].includes(s.provider),
  ).length;
}

export function countTestModeProviders(settings: AdminPaymentSetting[]): number {
  return settings.filter(s =>
    s.isActive && s.isTestMode && s.provider === 'PAYTR',
  ).length;
}

export function countPendingSetup(settings: AdminPaymentSetting[]): number {
  let n = 2; // iyzico + bank POS planned
  const paytr = findSetting(settings, 'PAYTR');
  if (paytr?.isActive && !paytr.hasCredentials) n += 1;
  const bank = findSetting(settings, 'BANK_TRANSFER');
  if (bank?.isActive && !str(bank.credentials?.iban).trim()) n += 1;
  return n;
}

export function resolveDefaultPaymentLabel(settings: AdminPaymentSetting[]): string {
  const order: PaymentProviderType[] = ['PAYTR', 'BANK_TRANSFER', 'CASH_ON_DELIVERY'];
  for (const p of order) {
    const s = findSetting(settings, p);
    if (s?.isActive) return PROVIDER_LABELS[p];
  }
  return 'Tanımlı değil';
}

export type ProviderDisplayStatus =
  | 'Aktif'
  | 'Pasif'
  | 'Test Modu'
  | 'Yakında'
  | 'Eksik Kurulum';

export function providerDisplayStatus(
  setting: AdminPaymentSetting | undefined,
  planned = false,
): ProviderDisplayStatus {
  if (planned) return 'Yakında';
  if (!setting?.isActive) return 'Pasif';
  if (setting.provider === 'PAYTR' && setting.isTestMode) return 'Test Modu';
  if (setting.provider === 'PAYTR' && !setting.hasCredentials) return 'Eksik Kurulum';
  if (setting.provider === 'BANK_TRANSFER' && !str(setting.credentials?.iban).trim()) {
    return 'Eksik Kurulum';
  }
  return 'Aktif';
}

export function statusBadgeClass(status: ProviderDisplayStatus): string {
  switch (status) {
    case 'Aktif':           return 'bg-emerald-100 text-emerald-800';
    case 'Test Modu':       return 'bg-amber-100 text-amber-800';
    case 'Eksik Kurulum':   return 'bg-orange-100 text-orange-800';
    case 'Yakında':         return 'bg-slate-200 text-slate-600';
    default:                return 'bg-slate-100 text-slate-600';
  }
}

export interface SetupCheckItem {
  key:  string;
  label: string;
  done: boolean;
}

export function buildSetupChecklist(settings: AdminPaymentSetting[]): SetupCheckItem[] {
  const paytr = findSetting(settings, 'PAYTR');
  const bank  = findSetting(settings, 'BANK_TRANSFER');
  const cod   = findSetting(settings, 'CASH_ON_DELIVERY');
  const activeCount = countActiveMethods(settings);
  const codFee = Number(cod?.credentials?.extraFee ?? 0);

  return [
    {
      key:   'any-active',
      label: 'En az bir ödeme yöntemi aktif',
      done:  activeCount > 0,
    },
    {
      key:   'online',
      label: 'Online ödeme sağlayıcısı tanımlı',
      done:  Boolean(paytr?.isActive && paytr.hasCredentials),
    },
    {
      key:   'iban',
      label: 'Havale IBAN girildi',
      done:  !bank?.isActive || Boolean(str(bank.credentials?.iban).trim()),
    },
    {
      key:   'cod-fee',
      label: 'Kapıda ödeme ek ücreti geçerli',
      done:  !cod?.isActive || (Number.isFinite(codFee) && codFee >= 0),
    },
    {
      key:   'test-reviewed',
      label: 'Test modu kontrol edildi',
      done:  !paytr?.isActive || !paytr.isTestMode,
    },
    {
      key:   'live-ready',
      label: 'Canlı moda geçmeden önce bilgiler doğrulandı',
      done:  activeCount > 0 && (!paytr?.isActive || (paytr.hasCredentials && !paytr.isTestMode)),
    },
  ];
}

export function validateTurkishIban(raw: string): string | null {
  const cleaned = raw.replace(/\s/g, '').toUpperCase();
  if (!cleaned) return null;
  if (!cleaned.startsWith('TR')) return 'IBAN TR ile başlamalıdır.';
  if (cleaned.length !== 26) return 'TR IBAN 26 karakter olmalıdır.';
  if (!/^TR\d{24}$/.test(cleaned)) return 'Geçersiz IBAN formatı.';
  return null;
}

export function isMaskedIban(value: string): boolean {
  return value.includes('****');
}

export const SUPPORTED_PROVIDERS = [
  { name: 'PayTR',            support: 'Aktif destek' as const },
  { name: 'Havale/EFT',       support: 'Aktif destek' as const },
  { name: 'Kapıda Ödeme',     support: 'Aktif destek' as const },
  { name: 'iyzico',           support: 'Planlandı' as const },
  { name: 'Banka Sanal POS',  support: 'Planlandı' as const },
  { name: 'Stripe',           support: 'Değerlendirilecek' as const },
  { name: 'PayPal',           support: 'Değerlendirilecek' as const },
] as const;
