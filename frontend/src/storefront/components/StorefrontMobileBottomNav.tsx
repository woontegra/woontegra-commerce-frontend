import { NavLink, useLocation } from 'react-router-dom';
import { Heart, Home, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import { useStorefrontCartOptional } from '../hooks/StorefrontCartProvider';
import { useStorefrontAuthOptional } from '../hooks/StorefrontAuthProvider';
import { useStorefrontFavorites } from '../hooks/StorefrontFavoritesProvider';
import { mergeHeaderSettings, type HeaderSettings } from '../../utils/headerSettingsHelpers';

type Props = {
  storeLink: (path: string) => string;
  headerSettings?: HeaderSettings | Record<string, unknown>;
  preview?: boolean;
};

function navItemClass(isActive: boolean) {
  return `store-bottom-nav-item${isActive ? ' is-active' : ''}`;
}

export function StorefrontMobileBottomNav({ storeLink, headerSettings, preview = false }: Props) {
  const location = useLocation();
  const cart = useStorefrontCartOptional();
  const auth = useStorefrontAuthOptional();
  const { favorites } = useStorefrontFavorites();

  const settings = mergeHeaderSettings(headerSettings);
  const showFavorites = settings.showFavorites !== false;

  const home = storeLink('/store');
  const products = storeLink('/store/urunler');
  const favoritesUrl = storeLink('/store/favoriler');
  const cartUrl = storeLink('/store/sepet');
  const account = storeLink('/store/hesabim');
  const login = storeLink('/store/giris');

  const itemCount = preview ? 2 : (cart?.itemCount ?? 0);
  const favoriteCount = preview ? 0 : favorites.length;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const accountTo = isAuthenticated ? account : login;
  const accountLabel = isAuthenticated ? 'Hesabım' : 'Giriş';

  const isStorePath = (path: string, end?: boolean) => {
    if (preview) return false;
    const target = path.split('?')[0];
    const current = location.pathname;
    if (end) return current === target || current === `${target}/`;
    return current === target || current.startsWith(`${target}/`);
  };

  const items = [
    { key: 'home', to: home, end: true, label: 'Ana Sayfa', icon: Home, badge: 0, show: true },
    { key: 'products', to: products, label: 'Ürünler', icon: LayoutGrid, badge: 0, show: true },
    {
      key: 'favorites',
      to: favoritesUrl,
      label: 'Favoriler',
      icon: Heart,
      badge: favoriteCount,
      show: showFavorites,
    },
    {
      key: 'cart',
      to: cartUrl,
      label: 'Sepet',
      icon: ShoppingCart,
      badge: itemCount,
      show: settings.showCart !== false,
    },
    {
      key: 'account',
      to: accountTo,
      label: accountLabel,
      icon: User,
      badge: 0,
      show: settings.showAccount !== false,
    },
  ].filter(i => i.show);

  return (
    <nav className="store-bottom-nav lg:hidden" aria-label="Mobil mağaza menüsü">
      <div className="store-bottom-nav-inner">
        {items.map(item => {
          const Icon = item.icon;
          const active = isStorePath(item.to, item.end);

          if (preview) {
            return (
              <span
                key={item.key}
                className={navItemClass(active)}
                aria-current={active ? 'page' : undefined}
              >
                <span className="store-bottom-nav-icon-wrap">
                  <Icon className="store-bottom-nav-icon" strokeWidth={1.75} aria-hidden />
                  {item.badge > 0 && (
                    <span className="store-bottom-nav-badge">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="store-bottom-nav-label">{item.label}</span>
              </span>
            );
          }

          return (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navItemClass(isActive)}
            >
              <span className="store-bottom-nav-icon-wrap">
                <Icon className="store-bottom-nav-icon" strokeWidth={1.75} aria-hidden />
                {item.badge > 0 && (
                  <span className="store-bottom-nav-badge">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
              <span className="store-bottom-nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
