import { storePublicClient } from '../../services/storePublicApi';
import type { StorefrontProductSummary } from '../types/storefront.types';

export type FavoriteItem = {
  id:        string;
  productId: string;
  createdAt: string;
  product:   StorefrontProductSummary;
};

export async function listFavorites(tenantSlug: string): Promise<FavoriteItem[]> {
  const r = await storePublicClient.get<{ success: boolean; favorites?: FavoriteItem[]; error?: string }>(
    '/store/account/favorites',
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success) throw new Error(r.data.error || 'Favoriler alınamadı.');
  return r.data.favorites ?? [];
}

export async function addFavorite(tenantSlug: string, productId: string): Promise<FavoriteItem> {
  const r = await storePublicClient.post<{
    success: boolean;
    favorite?: FavoriteItem;
    error?: string;
  }>('/store/account/favorites', { productId }, { params: { tenant: tenantSlug } });
  if (!r.data.success || !r.data.favorite) throw new Error(r.data.error || 'Favori eklenemedi.');
  return r.data.favorite;
}

export async function removeFavorite(tenantSlug: string, productId: string): Promise<void> {
  const r = await storePublicClient.delete<{ success: boolean; error?: string }>(
    `/store/account/favorites/${encodeURIComponent(productId)}`,
    { params: { tenant: tenantSlug } },
  );
  if (!r.data.success) throw new Error(r.data.error || 'Favori kaldırılamadı.');
}
