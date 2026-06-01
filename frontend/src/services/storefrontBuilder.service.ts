import api, { extractErrorMessage } from './apiClient';
import type {
  StorefrontDraftLoadResult,
  StorefrontDraftMeta,
  StorefrontLayout,
} from '../types/storefrontBuilder.types';
import { normalizeLayout } from '../pages/storefrontBuilderHelpers';

type DraftPayload = {
  success?: boolean;
  data?: {
    layout?: unknown;
    isDefault?: boolean;
    status?: string;
    version?: number;
    publishedAt?: string | null;
    updatedAt?: string | null;
    hasPublished?: boolean;
  };
  message?: string;
};

function normalizeMeta(data: DraftPayload['data']): StorefrontDraftMeta {
  return {
    isDefault: Boolean(data?.isDefault),
    status: data?.status ?? 'DRAFT',
    version: data?.version ?? 1,
    publishedAt: data?.publishedAt ?? null,
    updatedAt: data?.updatedAt ?? null,
    hasPublished: Boolean(data?.hasPublished),
  };
}

export async function fetchHomeDraft(): Promise<StorefrontDraftLoadResult> {
  try {
    const r = await api.get('/storefront-builder/pages/home/draft', { skipErrorToast: true });
    const root = r.data as DraftPayload;
    const data = root.data ?? {};
    return {
      ok: true,
      layout: normalizeLayout(data.layout),
      meta: normalizeMeta(data),
    };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Vitrin builder verileri yüklenemedi.') };
  }
}

export async function saveHomeDraft(
  layout: StorefrontLayout,
): Promise<{ ok: true; meta: StorefrontDraftMeta } | { ok: false; message: string }> {
  try {
    const r = await api.put(
      '/storefront-builder/pages/home/draft',
      { layout },
      { skipErrorToast: true },
    );
    const root = r.data as DraftPayload;
    const data = root.data ?? {};
    return {
      ok: true,
      meta: normalizeMeta(data),
    };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Taslak kaydedilemedi.') };
  }
}

export async function publishHomeLayout(): Promise<
  { ok: true; meta: StorefrontDraftMeta } | { ok: false; message: string }
> {
  try {
    const r = await api.post('/storefront-builder/pages/home/publish', undefined, {
      skipErrorToast: true,
    });
    const root = r.data as DraftPayload;
    const data = root.data ?? {};
    return {
      ok: true,
      meta: {
        isDefault: false,
        status: data.status ?? 'PUBLISHED',
        version: data.version ?? 1,
        publishedAt: data.publishedAt ?? new Date().toISOString(),
        updatedAt: data.updatedAt ?? null,
        hasPublished: true,
      },
    };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Yayına alınamadı.') };
  }
}
