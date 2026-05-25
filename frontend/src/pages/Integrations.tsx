import TrendyolIntegration from '../components/integrations/TrendyolIntegration';

export default function Integrations() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight leading-tight text-gray-900 dark:text-white">
          Entegrasyonlar
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight mt-1">
          Satış kanalları ve pazaryeri entegrasyonları
        </p>
      </div>

      {/* Integrations List */}
      <div className="grid grid-cols-1 gap-6">
        {/* Trendyol */}
        <TrendyolIntegration />

        {/* Future Integrations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-center opacity-50">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-red-600">H</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Hepsiburada
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Yakında...
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-center opacity-50">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-yellow-600">N11</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              n11
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Yakında...
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-center opacity-50">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">Ç</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Çiçeksepeti
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Yakında...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
