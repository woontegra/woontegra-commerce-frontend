import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorefrontAuth } from './StorefrontAuthProvider';
import { useStorefrontTenant } from './useStorefrontTenant';
import {
  addFavorite,
  listFavorites,
  removeFavorite,
  type FavoriteItem,
} from '../services/storefrontFavoritesApi';

type Ctx = {
  favoriteIds: Set<string>;
  favorites: FavoriteItem[];
  loading: boolean;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
};

const StorefrontFavoritesContext = createContext<Ctx | null>(null);

export function StorefrontFavoritesProvider({ children }: { children: ReactNode }) {
  const { tenant, storeLink } = useStorefrontTenant();
  const { isAuthenticated } = useStorefrontAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshFavorites = useCallback(async () => {
    if (!tenant?.slug || !isAuthenticated) {
      setFavorites([]);
      return;
    }
    setLoading(true);
    try {
      const list = await listFavorites(tenant.slug);
      setFavorites(list);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [tenant?.slug, isAuthenticated]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map(f => f.productId)),
    [favorites],
  );

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.has(productId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (!tenant?.slug) return false;
      if (!isAuthenticated) {
        navigate(storeLink('/store/giris'));
        return false;
      }
      try {
        if (favoriteIds.has(productId)) {
          await removeFavorite(tenant.slug, productId);
          setFavorites(prev => prev.filter(f => f.productId !== productId));
        } else {
          const item = await addFavorite(tenant.slug, productId);
          setFavorites(prev => {
            if (prev.some(f => f.productId === productId)) return prev;
            return [item, ...prev];
          });
        }
        return true;
      } catch {
        return false;
      }
    },
    [tenant?.slug, isAuthenticated, favoriteIds, navigate, storeLink],
  );

  const value = useMemo(
    () => ({
      favoriteIds,
      favorites,
      loading,
      isFavorite,
      toggleFavorite,
      refreshFavorites,
    }),
    [favoriteIds, favorites, loading, isFavorite, toggleFavorite, refreshFavorites],
  );

  return (
    <StorefrontFavoritesContext.Provider value={value}>{children}</StorefrontFavoritesContext.Provider>
  );
}

export function useStorefrontFavorites(): Ctx {
  const c = useContext(StorefrontFavoritesContext);
  if (!c) throw new Error('useStorefrontFavorites: StorefrontFavoritesProvider eksik');
  return c;
}
