import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import CurrencySwitcher from '../components/CurrencySwitcher';

export default function StoreLayout() {
  const { itemCount } = useCart();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link to="/" className="flex items-center">
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Woontegra
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium transition">
                {t('common.home')}
              </Link>
              <Link to="/products" className="text-gray-700 hover:text-blue-600 transition">
                {t('common.products')}
              </Link>
              <Link to="/blog" className="text-gray-700 hover:text-blue-600 transition">
                {t('common.blog')}
              </Link>
              <Link to="/cart" className="relative group">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-100 transition">
                  <svg className="w-6 h-6 text-gray-700 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {itemCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </div>
              </Link>
            </nav>

            {/* Language & Currency Switchers */}
            <div className="hidden md:flex items-center gap-3">
              <CurrencySwitcher />
              <LanguageSwitcher />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700 hover:text-blue-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <Link
              to="/login"
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b">
          <nav className="px-4 py-4 space-y-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl hover:bg-gray-100 font-medium"
            >
              Ana Sayfa
            </Link>
            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl hover:bg-gray-100 font-medium"
            >
              Ürünler
            </Link>
            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl hover:bg-gray-100 font-medium flex items-center justify-between"
            >
              <span>Sepet</span>
              {itemCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Woontegra
              </h3>
              <p className="text-gray-400 text-sm">
                Modern e-ticaret çözümleriniz için güvenilir platform
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 text-gray-300">Alışveriş</h4>
              <ul className="space-y-2">
                <li><Link to="/products" className="text-gray-400 hover:text-white text-sm transition">Tüm Ürünler</Link></li>
                <li><Link to="/" className="text-gray-400 hover:text-white text-sm transition">Kategoriler</Link></li>
                <li><Link to="/cart" className="text-gray-400 hover:text-white text-sm transition">Sepetim</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 text-gray-300">Destek</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white text-sm transition">İletişim</Link></li>
                <li><Link to="/" className="text-gray-400 hover:text-white text-sm transition">SSS</Link></li>
                <li><Link to="/" className="text-gray-400 hover:text-white text-sm transition">Kargo Takibi</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4 text-gray-300">Yasal</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white text-sm transition">Gizlilik Politikası</Link></li>
                <li><Link to="/" className="text-gray-400 hover:text-white text-sm transition">Kullanım Şartları</Link></li>
                <li><Link to="/" className="text-gray-400 hover:text-white text-sm transition">İade Koşulları</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">&copy; 2024 Woontegra. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
