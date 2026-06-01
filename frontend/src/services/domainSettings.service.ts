import api from './api';
import type { TenantDomainSettings } from '../types/domainSettings.types';

type SettingsPayload = Record<string, unknown>;

function mapSettingsToDomain(data: SettingsPayload): TenantDomainSettings {
  const slug = typeof data.slug === 'string' ? data.slug.trim() || null : null;
  const subdomain = typeof data.subdomain === 'string' ? data.subdomain.trim() || null : null;
  const storefrontSlugRaw = typeof data.storefrontSlug === 'string' ? data.storefrontSlug.trim() : '';
  const storefrontSlug = storefrontSlugRaw || slug || subdomain || null;

  return {
    slug,
    subdomain,
    storefrontSlug,
    customDomain: typeof data.customDomain === 'string' ? data.customDomain.trim() || null : null,
    domainVerified: Boolean(data.domainVerified),
  };
}

export async function fetchDomainSettings(): Promise<TenantDomainSettings> {
  const r = await api.get<{ data?: SettingsPayload }>('/settings', { skipErrorToast: true });
  const data = r.data?.data ?? {};
  return mapSettingsToDomain(data);
}

export async function saveCustomDomain(domain: string | null): Promise<TenantDomainSettings> {
  await api.put('/settings/domain', { domain }, { skipErrorToast: true });
  return fetchDomainSettings();
}
