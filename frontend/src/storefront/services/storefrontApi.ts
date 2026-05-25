import { storePublicClient } from '../../services/storePublicApi';
import type {
  StorefrontProductDetail,
  StorefrontProductSummary,
} from '../types/storefront.types';
import type { StorefrontCategory } from '../../contexts/StorefrontTenantContext';
import type { StorefrontTenantInfo } from '../../contexts/StorefrontTenantContext';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(
  /\/api\/?$/,
  '',
);

export function normalizeStoreImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}${trimmed}`;
    }
    return `https:${trimmed}`;
  }
  const base = API_ORIGIN.replace(/\/$/, '');
  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

function toNumber(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pickImage(raw: Record<string, unknown>): string | null {
  const images = Array.isArray(raw.images)
    ? raw.images.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];
  const candidate = raw.image ?? raw.mainImage ?? images[0] ?? null;
  return normalizeStoreImageUrl(typeof candidate === 'string' ? candidate : null);
}

export function mapStoreProductSummary(raw: unknown): StorefrontProductSummary {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const cat = o.category;
  let category: StorefrontProductSummary['category'] = null;
  if (cat && typeof cat === 'object') {
    const c = cat as Record<string, unknown>;
    category = {
      id:   String(c.id ?? ''),
      name: String(c.name ?? ''),
      slug: String(c.slug ?? c.id ?? ''),
    };
  }
  return {
    id:            String(o.id ?? ''),
    name:          String(o.name ?? o.title ?? ''),
    slug:          String(o.slug ?? ''),
    price:         toNumber(o.price ?? o.salePrice),
    discountPrice: o.discountPrice != null ? toNumber(o.discountPrice, NaN) || null : null,
    image:         pickImage(o),
    stock:         o.stock != null ? toNumber(o.stock) : undefined,
    category,
  };
}

function mapStoreProductDetail(raw: unknown): StorefrontProductDetail {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const images = Array.isArray(o.images)
    ? o.images
        .filter((x): x is string => typeof x === 'string')
        .map(u => normalizeStoreImageUrl(u))
        .filter((u): u is string => u != null)
    : [];
  const single = pickImage(o);
  const allImages = images.length > 0 ? images : single ? [single] : [];
  const cat = o.category;
  let category: StorefrontProductDetail['category'] = null;
  if (cat && typeof cat === 'object') {
    const c = cat as Record<string, unknown>;
    category = {
      id:   String(c.id ?? ''),
      name: String(c.name ?? ''),
      slug: String(c.slug ?? c.id ?? ''),
    };
  }
  return {
    id:            String(o.id ?? ''),
    name:          String(o.name ?? o.title ?? ''),
    slug:          String(o.slug ?? ''),
    description:   String(o.description ?? ''),
    price:         toNumber(o.price ?? o.salePrice),
    discountPrice: o.discountPrice != null ? toNumber(o.discountPrice, NaN) || null : null,
    images:        allImages,
    stock:         o.stock != null ? toNumber(o.stock) : undefined,
    category,
  };
}

type ListResponse = {
  status: string;
  tenant?: StorefrontTenantInfo;
  data?:
    | {
        items: unknown[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      }
    | unknown[];
  error?: string;
};

type DetailResponse = {
  status: string;
  data?: unknown;
  error?: string;
};

type CategoriesResponse = {
  status: string;
  tenant?: StorefrontTenantInfo;
  data?: StorefrontCategory[];
  error?: string;
};

function extractProductList(data: ListResponse['data']) {
  if (!data) {
    return { items: [] as StorefrontProductSummary[], page: 1, limit: 24, total: 0, totalPages: 1 };
  }
  if (Array.isArray(data)) {
    const items = data.map(mapStoreProductSummary);
    return { items, page: 1, limit: items.length, total: items.length, totalPages: 1 };
  }
  const rawItems = Array.isArray(data.items) ? data.items : [];
  return {
    items: rawItems.map(mapStoreProductSummary),
    page:       data.page ?? 1,
    limit:      data.limit ?? 24,
    total:      data.total ?? rawItems.length,
    totalPages: data.totalPages ?? 1,
  };
}

export async function fetchStorefrontCategories(tenantSlug: string) {
  const r = await storePublicClient.get<CategoriesResponse>('/store/categories', {
    params: { tenant: tenantSlug },
  });
  if (r.data.status === 'error') throw new Error(r.data.error || 'Mağaza bulunamadı');
  if (!r.data.tenant) throw new Error(r.data.error || 'Mağaza bulunamadı');
  return {
    tenant: r.data.tenant,
    categories: Array.isArray(r.data.data) ? r.data.data : [],
  };
}

export async function fetchStorefrontProducts(
  tenantSlug: string,
  opts: { page?: number; limit?: number; categoryId?: string; search?: string } = {},
) {
  const r = await storePublicClient.get<ListResponse>('/store/products', {
    params: {
      tenant: tenantSlug,
      page:   opts.page ?? 1,
      limit:  opts.limit ?? 24,
      ...(opts.categoryId ? { category: opts.categoryId } : {}),
      ...(opts.search ? { search: opts.search } : {}),
    },
  });
  if (r.data.status === 'error') throw new Error(r.data.error || 'Ürünler alınamadı');
  return extractProductList(r.data.data);
}

export async function fetchStorefrontProductBySlug(tenantSlug: string, slug: string) {
  const r = await storePublicClient.get<DetailResponse>(
    `/store/products/${encodeURIComponent(slug)}`,
    { params: { tenant: tenantSlug } },
  );
  if (r.data.status === 'error' || !r.data.data) {
    throw new Error(r.data.error || 'Ürün bulunamadı');
  }
  return mapStoreProductDetail(r.data.data);
}
