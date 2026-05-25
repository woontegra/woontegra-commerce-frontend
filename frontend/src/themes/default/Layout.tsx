import { Link, NavLink } from 'react-router-dom';
import type { ThemeLayoutProps } from '../types';
import { useCart } from '../../context/CartContext';

export default function Layout({ children, tenant, storeLink }: ThemeLayoutProps) {
  const { itemCount } = useCart();

  const home    = storeLink('/store');
  const products = storeLink('/store/products');
  const cart    = storeLink('/store/cart');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to={home} className="flex items-center gap-2 font-semibold text-lg truncate">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <span className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm">
                {tenant.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate">{tenant.name}</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
            <NavLink
              to={home}
              className={({ isActive }) => (isActive ? 'text-indigo-600' : 'hover:text-indigo-600')}
              end
            >
              Ana sayfa
            </NavLink>
            <NavLink
              to={products}
              className={({ isActive }) => (isActive ? 'text-indigo-600' : 'hover:text-indigo-600')}
            >
              Ürünler
            </NavLink>
          </nav>
          <Link
            to={cart}
            className="relative text-sm font-medium text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            Sepet
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-slate-500 flex flex-col sm:flex-row justify-between gap-4">
          <p>© {new Date().getFullYear()} {tenant.name}</p>
          <p className="text-slate-400">Woontegra mağaza vitrini</p>
        </div>
      </footer>
    </div>
  );
}
