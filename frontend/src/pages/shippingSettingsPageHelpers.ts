import type { TenantShippingSettings } from '../types/shippingSettings.types';

export type ShippingFormState = TenantShippingSettings & {
  thresholdInput: string;
};

export type ShippingIntegrationSupport =
  | 'Aktif destek'
  | 'Sipariş detayında destekleniyor'
  | 'Pazaryeri entegrasyonu kapsamında'
  | 'Planlandı';

export interface SetupCheckItem {
  key: string;
  label: string;
  done: boolean;
}

export function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatTry(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseThresholdInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function isThresholdInputValid(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === '') return true;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0;
}

export function isShippingCostValid(cost: number): boolean {
  return Number.isFinite(cost) && cost >= 0;
}

export function summaryShippingFeeLabel(cost: number): string {
  if (!Number.isFinite(cost) || cost <= 0) return 'Ücretsiz';
  return formatTry(cost);
}

export function summaryThresholdLabel(thresholdInput: string): string {
  const parsed = parseThresholdInput(thresholdInput);
  if (parsed == null) return 'Limit yok';
  if (parsed === 0) return '₺0 üzeri (her zaman ücretsiz)';
  return `${formatTry(parsed)} üzeri`;
}

export function summaryDeliveryInfoLabel(description: string | null | undefined): string {
  return description?.trim() ? 'Tanımlı' : 'Eksik';
}

export function integrationBadgeClass(support: ShippingIntegrationSupport): string {
  switch (support) {
    case 'Aktif destek':
      return 'bg-emerald-100 text-emerald-700';
    case 'Sipariş detayında destekleniyor':
      return 'bg-sky-100 text-sky-700';
    case 'Pazaryeri entegrasyonu kapsamında':
      return 'bg-violet-100 text-violet-700';
    default:
      return 'bg-slate-200 text-slate-600';
  }
}

export function buildShippingSetupChecklist(state: ShippingFormState): SetupCheckItem[] {
  const cost = safeNumber(state.standardShippingCost);
  const displayName = state.displayName.trim();
  const description = state.description?.trim() ?? '';

  return [
    { key: 'active', label: 'Kargo aktif', done: state.isActive },
    { key: 'name', label: 'Görünen ad girildi', done: displayName.length > 0 },
    { key: 'fee', label: 'Kargo ücreti geçerli', done: isShippingCostValid(cost) },
    {
      key: 'threshold',
      label: 'Ücretsiz kargo limiti geçerli',
      done: isThresholdInputValid(state.thresholdInput),
    },
    { key: 'description', label: 'Teslimat açıklaması girildi', done: description.length > 0 },
  ];
}

export type ShippingPreview = {
  inactive: boolean;
  title: string;
  feeLabel: string;
  thresholdLabel: string;
  deliveryLabel: string;
};

export function buildShippingPreview(state: ShippingFormState): ShippingPreview {
  const displayName = state.displayName.trim() || 'Standart Kargo';
  const cost = safeNumber(state.standardShippingCost);
  const description = state.description?.trim();

  if (!state.isActive) {
    return {
      inactive: true,
      title: displayName,
      feeLabel: '',
      thresholdLabel: '',
      deliveryLabel: 'Standart kargo vitrinde pasif.',
    };
  }

  return {
    inactive: false,
    title: displayName,
    feeLabel: cost <= 0 ? 'Ücretsiz' : formatTry(cost),
    thresholdLabel: summaryThresholdLabel(state.thresholdInput),
    deliveryLabel: description || 'Açıklama girilmemiş',
  };
}

export const SHIPPING_INTEGRATIONS: Array<{ name: string; support: ShippingIntegrationSupport }> = [
  { name: 'Standart Kargo', support: 'Aktif destek' },
  { name: 'Manuel takip numarası', support: 'Sipariş detayında destekleniyor' },
  { name: 'Trendyol kargo etiketi', support: 'Pazaryeri entegrasyonu kapsamında' },
  { name: 'Kargo firması API entegrasyonları', support: 'Planlandı' },
  { name: 'Otomatik kargo fiyatı hesaplama', support: 'Planlandı' },
];

export const PLANNED_SHIPPING_FEATURES = [
  'Kargo firmaları',
  'Bölgesel kargo ücretleri',
  'Desi/ağırlık bazlı ücret',
  'Ücretsiz kargo kampanyaları',
] as const;
