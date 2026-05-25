import { useState } from 'react';
import { abandonedCartService } from '../services/abandonedCart.service';

export default function Marketing() {
  const [activeTab, setActiveTab] = useState<'popups' | 'emails' | 'abandoned'>('popups');
  const recoveryStats = abandonedCartService.getRecoveryStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight leading-tight text-gray-900 dark:text-white">
          Marketing
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight mt-1">
          Dönüşüm artırma araçları
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('popups')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'popups'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Popup Kampanyaları
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'emails'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Email Toplama
          </button>
          <button
            onClick={() => setActiveTab('abandoned')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'abandoned'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Terk Edilen Sepetler
          </button>
        </nav>
      </div>

      {/* Popup Campaigns */}
      {activeTab === 'popups' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Hoş Geldin İndirimi</h3>
                <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs rounded-full">
                  Aktif
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                İlk ziyaret edenlere %10 indirim kodu
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Görüntülenme</span>
                <span className="font-medium">1,234</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-500">Dönüşüm</span>
                <span className="font-medium text-green-600">18.5%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Çıkış İndirimi</h3>
                <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs rounded-full">
                  Aktif
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Çıkış yaparken %15 indirim teklifi
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Görüntülenme</span>
                <span className="font-medium">856</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-500">Dönüşüm</span>
                <span className="font-medium text-green-600">22.3%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex items-center justify-center">
              <button className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Yeni Kampanya
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Collection */}
      {activeTab === 'emails' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Toplam Abone</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">2,458</div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-2">+12.5% bu ay</div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Aktif Abone</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">2,341</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">95.2% aktif</div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Bu Hafta</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">+156</div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-2">Yeni abone</div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Abonelikten Çıkma</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">1.8%</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Son 30 gün</div>
            </div>
          </div>
        </div>
      )}

      {/* Abandoned Carts */}
      {activeTab === 'abandoned' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Terk Edilen Sepet</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{recoveryStats.totalAbandoned}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Aktif sepet</div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Toplam Değer</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                ₺{recoveryStats.totalValue.toFixed(0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Potansiyel gelir</div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Kurtarma Oranı</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {recoveryStats.recoveryRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Başarı oranı</div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Kurtarılan Değer</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                ₺{recoveryStats.recoveredValue.toFixed(0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Kazanılan gelir</div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Otomatik Kurtarma Sistemi Aktif
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Terk edilen sepetler için 1 saat sonra otomatik kurtarma emaili gönderiliyor. 
                  %10 indirim kodu ile müşterilerinizi geri kazanın!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
