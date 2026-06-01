import { fetchStorefrontProducts } from '../storefront/services/storefrontApi';
import type { StorefrontProductSummary } from '../storefront/types/storefront.types';

export type FeaturedSourceType = 'featured' | 'category' | 'latest' | 'discounted';

export type FeaturedProductsEmptyReason =
  | 'none'
  | 'no_category'
  | 'no_products'
  | 'load_error';

function str(settings: Record<string, unknown>, key: string, fallback = ''): string {
  const v = settings[key];
  if (v == null) return fallback;
  return String(v);
}

function num(settings: Record<string, unknown>, key: string, fallback: number): number {
  const v = settings[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function resolveFeaturedSourceType(settings: Record<string, unknown>): FeaturedSourceType {
  const raw = str(settings, 'sourceType') || str(settings, 'source', 'featured');
  if (raw === 'category' || raw === 'latest' || raw === 'discounted' || raw === 'featured') {
    return raw;
  }
  return 'featured';
}

export function mergeFeaturedProductsSettings(
  raw: Record<string, unknown>,
  merged: Record<string, unknown>,
): Record<string, unknown> {
  if (!raw.sourceType && merged.source) {
    merged.sourceType = merged.source;
  }
  if (raw.columnsDesktop === undefined && merged.columns) {
    merged.columnsDesktop = merged.columns;
  }
  if (raw.columnsTablet === undefined) {
    merged.columnsTablet = 2;
  }
  if (raw.columnsMobile === undefined) {
    merged.columnsMobile = 2;
  }
  if (raw.showTitle === undefined) merged.showTitle = true;
  if (raw.showViewAllLink === undefined && merged.showViewAll !== undefined) {
    merged.showViewAllLink = merged.showViewAll;
  }
  if (raw.showViewAll === undefined && merged.showViewAllLink !== undefined) {
    merged.showViewAll = merged.showViewAllLink;
  }
  if (raw.showViewAllLink === undefined) merged.showViewAllLink = true;
  if (raw.viewAllLabel === undefined) merged.viewAllLabel = 'Tümünü gör';
  return merged;
}

export function resolveShowViewAll(settings: Record<string, unknown>): boolean {
  if (settings.showViewAllLink !== undefined) return Boolean(settings.showViewAllLink);
  if (settings.showViewAll !== undefined) return Boolean(settings.showViewAll);
  return true;
}

export function featuredViewAllHref(
  settings: Record<string, unknown>,
  storeLink: (path: string) => string,
): string {
  const sourceType = resolveFeaturedSourceType(settings);
  const categorySlug = str(settings, 'categorySlug');
  if (sourceType === 'category' && categorySlug) {
    return storeLink(`/store/kategori/${encodeURIComponent(categorySlug)}`);
  }
  return storeLink('/store/urunler');
}

export function productGridResponsiveClass(
  colsMobile: number,
  colsTablet: number,
  colsDesktop: number,
): string {
  const mobile = colsMobile === 1 ? 'grid-cols-1' : 'grid-cols-2';
  const tablet =
    colsTablet === 3 ? 'md:grid-cols-3' : colsTablet === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2';
  const desktop =
    colsDesktop === 5
      ? 'lg:grid-cols-5'
      : colsDesktop === 4
        ? 'lg:grid-cols-4'
        : colsDesktop === 3
          ? 'lg:grid-cols-3'
          : 'lg:grid-cols-2';
  return `grid ${mobile} ${tablet} ${desktop} gap-4`;
}

export async function loadFeaturedBlockProducts(
  tenantSlug: string,
  settings: Record<string, unknown>,
): Promise<{
  products: StorefrontProductSummary[];
  emptyReason: FeaturedProductsEmptyReason;
}> {
  const sourceType = resolveFeaturedSourceType(settings);
  const limit = num(settings, 'limit', 8);
  const categoryId = str(settings, 'categoryId');

  if (sourceType === 'category' && !categoryId) {
    return { products: [], emptyReason: 'no_category' };
  }

  try {
    const result = await fetchStorefrontProducts(tenantSlug, {
      limit: Math.max(limit, 16),
      page: 1,
      ...(sourceType === 'category' && categoryId ? { categoryId } : {}),
    });

    let items = result.items;

    if (sourceType === 'discounted') {
      items = items.filter(
        p => p.discountPrice != null && p.discountPrice > 0 && p.discountPrice < p.price,
      );
    }

    const sliced = items.slice(0, limit);
    if (sliced.length === 0) {
      return { products: [], emptyReason: 'no_products' };
    }
    return { products: sliced, emptyReason: 'none' };
  } catch {
    return { products: [], emptyReason: 'load_error' };
  }
}

export function featuredEmptyMessage(reason: FeaturedProductsEmptyReason, sourceType: FeaturedSourceType): string {
  if (reason === 'no_category') return 'Ürün göstermek için bir kategori seçin.';
  if (reason === 'load_error') return 'Ürünler şu anda yüklenemedi.';
  if (reason === 'no_products') {
    if (sourceType === 'category') return 'Bu kategoride henüz ürün bulunmuyor.';
    return 'Gösterilecek ürün bulunmuyor.';
  }
  return '';
}

export function mapProductCardVariant(cardStyle: string): 'card' | 'plain' {
  if (cardStyle === 'plain' || cardStyle === 'compact') return 'plain';
  return 'card';
}
