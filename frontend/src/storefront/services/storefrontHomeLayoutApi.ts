import { storePublicClient } from '../../services/storePublicApi';
import { normalizeLayout } from '../../pages/storefrontBuilderHelpers';
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

export async function getStorefrontHomeLayout(
  tenantSlug: string,
): Promise<StorefrontHomeLayoutResult> {
  const slug = tenantSlug.trim();
  if (!slug) {
    return { layout: null, tenant: null };
  }

  try {
    const r = await storePublicClient.get<HomeLayoutResponse>('/store/home-layout', {
      params: { tenant: slug },
    });
    const body = r.data ?? {};
    if (body.status === 'error' || body.layout == null) {
      return { layout: null, tenant: body.tenant ?? null };
    }
    const layout = body.layout;
    if (!layout || !Array.isArray(layout.sections)) {
      return { layout: null, tenant: body.tenant ?? null };
    }
    return { layout: normalizeLayout(layout), tenant: body.tenant ?? null };
  } catch {
    return { layout: null, tenant: null };
  }
}
