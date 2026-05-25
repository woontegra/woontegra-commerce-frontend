import { useNavigate } from 'react-router-dom';

export default function EmptyDashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="text-center max-w-md px-6">
        {/* Illustration */}
        <div className="mb-8">
          <div className="w-32 h-32 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-16 h-16 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight leading-tight text-gray-900 dark:text-white mb-3">
            Henüz satış yok
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight mb-2">
            Mağazanız hazır, şimdi ürün ekleme zamanı!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">
            İlk ürününüzü ekleyerek satışa başlayın.
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/products')}
          className="btn-primary inline-flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>İlk Ürününü Ekle</span>
        </button>

        {/* Quick Links */}
        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight mb-4">
            Veya şunları yapabilirsiniz:
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => navigate('/settings')}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-2 py-1"
            >
              ⚙️ Ayarları Düzenle
            </button>
            <button
              onClick={() => navigate('/customers')}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-2 py-1"
            >
              👥 Müşterileri Gör
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-2 py-1"
            >
              📊 Raporları İncele
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
