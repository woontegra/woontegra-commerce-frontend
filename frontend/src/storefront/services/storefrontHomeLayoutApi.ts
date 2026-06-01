import type { StorefrontLayout } from '../../types/storefrontBuilder.types';

type HomeLayoutResponse = {
  status?: string;
  tenant?: { id: string; slug: string; name: string };
  layout?: StorefrontLayout | null;
  error?: string;
};

export type StorefrontHomeLayoutResult = {
  layout: StorefrontLayout | null;
  tenant: HomeLayoutResponse['tenant'] | null;
};

function homeLayoutApiBase(): string {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return String(raw).replace(/\/$/, '');
}

export async function getStorefrontHomeLayout(
  tenantSlug: string,
): Promise<StorefrontHomeLayoutResult> {
  const slug = tenantSlug.trim();
  if (!slug) {
    return { layout: null, tenant: null };
  }

  try {
    const url = `${homeLayoutApiBase()}/store/home-layout?tenant=${encodeURIComponent(slug)}&_=${Date.now()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { layout: null, tenant: null };
    }
    const body = (await res.json()) as HomeLayoutResponse;
    if (body.status === 'error' || body.layout == null) {
      return { layout: null, tenant: body.tenant ?? null };
    }
    const layout = body.layout;
    if (!layout || !Array.isArray(layout.sections)) {
      return { layout: null, tenant: body.tenant ?? null };
    }
    return { layout: layout as StorefrontLayout, tenant: body.tenant ?? null };
  } catch {
    return { layout: null, tenant: null };
  }
}
