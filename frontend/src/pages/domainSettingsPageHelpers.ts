import type { PlanTier } from '../context/FeatureContext';
import type { TenantDomainSettings } from '../types/domainSettings.types';
import { buildAbsoluteStorefrontListUrl, buildStorefrontListUrl } from '../utils/storefrontUrl';

export type DomainVerificationStatus = 'verified' | 'pending' | 'none';

export interface SetupCheckItem {
  key: string;
  label: string;
  done: boolean;
}

const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

export function resolveSubdomainSuffix(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return '.localhost';
    }
  }
  const env = import.meta.env.VITE_STOREFRONT_BASE_DOMAIN as string | undefined;
  if (env?.trim()) {
    return `.${env.trim().replace(/^\./, '')}`;
  }
  return '.woontegra.com';
}

export function validateSubdomain(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return 'Subdomain boş olamaz';
  if (v.length < 3) return 'En az 3 karakter olmalıdır';
  if (/[ığüşöçİĞÜŞÖÇ]/.test(value)) return 'Türkçe karakter kullanılamaz';
  if (/\s/.test(v)) return 'Boşluk kullanılamaz';
  if (!SUBDOMAIN_PATTERN.test(v)) {
    return 'Sadece küçük harf, rakam ve tire kullanılabilir';
  }
  return null;
}

export function validateCustomDomain(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return 'Domain boş olamaz';
  if (/\s/.test(v)) return 'Boşluk kullanılamaz';
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(v)) {
    return 'Geçerli bir domain girin (örn. shop.firmaniz.com)';
  }
  return null;
}

export function isEnterprisePlan(plan: PlanTier): boolean {
  return plan === 'ENTERPRISE';
}

export function planLabel(plan: PlanTier): string {
  switch (plan) {
    case 'ENTERPRISE': return 'Enterprise';
    case 'PRO':        return 'Professional';
    default:           return 'Starter';
  }
}

export function customDomainSupportLabel(
  plan: PlanTier,
  settings: TenantDomainSettings,
): string {
  if (settings.customDomain && settings.domainVerified) return 'Doğrulandı';
  if (settings.customDomain) return 'Doğrulama bekliyor';
  if (isEnterprisePlan(plan)) return 'Eklenebilir';
  return 'Planlandı';
}

export function subdomainStatusLabel(settings: TenantDomainSettings): string {
  if (settings.subdomain) return 'Tanımlı';
  if (settings.slug) return 'Slug ile aktif';
  return 'Eksik';
}

export function activeDomainLabel(settings: TenantDomainSettings): string {
  if (settings.customDomain && settings.domainVerified) {
    return settings.customDomain;
  }
  if (settings.storefrontSlug) {
    return `${settings.storefrontSlug}${resolveSubdomainSuffix()}`;
  }
  return 'Henüz tanımlı değil';
}

export function resolveVerificationStatus(settings: TenantDomainSettings): DomainVerificationStatus {
  if (!settings.customDomain) return 'none';
  return settings.domainVerified ? 'verified' : 'pending';
}

export function verificationStatusLabel(status: DomainVerificationStatus): string {
  switch (status) {
    case 'verified': return 'Doğrulandı';
    case 'pending':  return 'Bekliyor';
    default:         return 'Tanımlı değil';
  }
}

export function verificationBadgeClass(status: DomainVerificationStatus): string {
  switch (status) {
    case 'verified': return 'bg-emerald-100 text-emerald-700';
    case 'pending':  return 'bg-amber-100 text-amber-800';
    default:         return 'bg-slate-100 text-slate-600';
  }
}

export function buildSubdomainPreview(subdomain: string): string {
  const clean = subdomain.trim().toLowerCase();
  if (!clean) return 'Henüz tanımlı değil';
  return `${clean}${resolveSubdomainSuffix()}`;
}

export function buildDomainPreview(settings: TenantDomainSettings): {
  primaryLabel: string;
  primaryHref: string | null;
  secondaryLabel: string;
  secondaryHref: string | null;
  inactiveNote: string | null;
} {
  const slug = settings.storefrontSlug?.trim() || null;

  if (settings.customDomain && settings.domainVerified) {
    const href = `https://${settings.customDomain}`;
    return {
      primaryLabel: settings.customDomain,
      primaryHref: href,
      secondaryLabel: slug ? buildAbsoluteStorefrontListUrl(slug) : 'Vitrin linki yok',
      secondaryHref: slug ? buildStorefrontListUrl(slug) : null,
      inactiveNote: null,
    };
  }

  if (slug) {
    return {
      primaryLabel: buildAbsoluteStorefrontListUrl(slug),
      primaryHref: buildStorefrontListUrl(slug),
      secondaryLabel: settings.subdomain
        ? buildSubdomainPreview(settings.subdomain)
        : 'Subdomain tanımlı değil',
      secondaryHref: null,
      inactiveNote: settings.customDomain && !settings.domainVerified
        ? `${settings.customDomain} doğrulama bekliyor; vitrin slug linki kullanılır.`
        : null,
    };
  }

  return {
    primaryLabel: 'Henüz tanımlı değil',
    primaryHref: null,
    secondaryLabel: 'Mağaza slug veya subdomain tanımlandığında görünür',
    secondaryHref: null,
    inactiveNote: null,
  };
}

export function buildDomainSetupChecklist(
  settings: TenantDomainSettings,
  plan: PlanTier,
): SetupCheckItem[] {
  const hasIdentifier = Boolean(settings.storefrontSlug?.trim());
  const hasSubdomain = Boolean(settings.subdomain?.trim());
  const hasCustom = Boolean(settings.customDomain?.trim());

  return [
    { key: 'identifier', label: 'Vitrin tanımlayıcısı (slug/subdomain)', done: hasIdentifier },
    { key: 'subdomain', label: 'Subdomain kaydı mevcut', done: hasSubdomain || hasIdentifier },
    {
      key: 'storefront',
      label: 'Vitrin URL’si oluşturuldu',
      done: hasIdentifier,
    },
    {
      key: 'custom',
      label: 'Özel domain tanımlandı',
      done: hasCustom,
    },
    {
      key: 'verified',
      label: 'Özel domain doğrulandı',
      done: hasCustom && settings.domainVerified,
    },
    {
      key: 'enterprise',
      label: 'Enterprise plan — özel domain yetkisi',
      done: isEnterprisePlan(plan),
    },
  ];
}

export const DNS_GUIDE_ITEMS = [
  'Özel domain için genellikle CNAME veya A kaydı gerekir.',
  'DNS değişikliklerinin yayılması 5 dakika ile 24 saat arasında sürebilir.',
  'Doğrulama tamamlanana kadar vitrin slug linki kullanılmaya devam eder.',
] as const;
