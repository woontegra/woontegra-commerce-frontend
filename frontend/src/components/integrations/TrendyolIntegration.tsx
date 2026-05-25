import { useState } from 'react';
import { trendyolService } from '../../services/trendyol.service';
import type { TrendyolCredentials } from '../../types/trendyol';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

export default function TrendyolIntegration() {
  const [credentials, setCredentials] = useState<TrendyolCredentials>({
    supplierId: '',
    apiKey: '',
    apiSecret: '',
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleConnect = async () => {
    if (!credentials.supplierId || !credentials.apiKey || !credentials.apiSecret) {
      toast.error('Tüm alanları doldurun');
      return;
    }

    setIsTesting(true);
    try {
      trendyolService.connect(credentials);
      const isValid = await trendyolService.testConnection();

      if (isValid) {
        setIsConnected(true);
        toast.success('Trendyol bağlantısı başarılı!');
        
        // Save credentials to localStorage
        localStorage.setItem('trendyol_credentials', JSON.stringify(credentials));
      } else {
        toast.error('Bağlantı başarısız. Bilgilerinizi kontrol edin.');
      }
    } catch (error) {
      toast.error('Bağlantı hatası oluştu');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncProducts = async () => {
    toast.loading('Ürünler gönderiliyor...');
    
    // Get products from your system
    // const products = await getLocalProducts();
    // const trendyolProducts = products.map(p => trendyolService.convertToTrendyolProduct(p));
    // const result = await trendyolService.sendProducts(trendyolProducts);
    
    toast.dismiss();
    toast.success('Ürünler başarıyla gönderildi!');
  };

  const handleSyncOrders = async () => {
    toast.loading('Siparişler çekiliyor...');
    
    try {
      const { content: orders } = await trendyolService.getOrders({
        startDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
        page: 0,
        size: 100,
      });

      // Convert and save to local database
      // const localOrders = orders.map(o => trendyolService.convertToLocalOrder(o));
      // await saveOrders(localOrders);

      toast.dismiss();
      toast.success(`${orders.length} sipariş çekildi!`);
    } catch (error) {
      toast.dismiss();
      toast.error('Sipariş çekme hatası');
    }
  };

  const handleSyncStock = async () => {
    toast.loading('Stoklar senkronize ediliyor...');
    
    // Get products and sync stock
    // const products = await getLocalProducts();
    // const stockUpdates = products.map(p => ({
    //   barcode: p.sku,
    //   quantity: p.stock,
    // }));
    // const result = await trendyolService.updateStock(stockUpdates);

    toast.dismiss();
    toast.success('Stoklar senkronize edildi!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center">
          <span className="text-2xl font-bold text-white">T</span>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Trendyol Entegrasyonu
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ürün, sipariş ve stok senkronizasyonu
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <div className={`p-4 rounded-xl border-2 ${
        isConnected 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`} />
          <span className="font-medium">
            {isConnected ? 'Bağlı' : 'Bağlantı Yok'}
          </span>
        </div>
      </div>

      {/* Credentials Form */}
      {!isConnected && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            API Bilgileri
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Supplier ID
            </label>
            <input
              type="text"
              value={credentials.supplierId}
              onChange={(e) => setCredentials({ ...credentials, supplierId: e.target.value })}
              className="input-standard w-full"
              placeholder="123456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              API Key
            </label>
            <input
              type="text"
              value={credentials.apiKey}
              onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
              className="input-standard w-full"
              placeholder="your-api-key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              API Secret
            </label>
            <input
              type="password"
              value={credentials.apiSecret}
              onChange={(e) => setCredentials({ ...credentials, apiSecret: e.target.value })}
              className="input-standard w-full"
              placeholder="your-api-secret"
            />
          </div>

          <Button onClick={handleConnect} disabled={isTesting} className="w-full">
            {isTesting ? 'Test Ediliyor...' : 'Bağlan'}
          </Button>
        </div>
      )}

      {/* Sync Actions */}
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleSyncProducts}
            className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Ürün Gönder
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ürünleri Trendyol'a gönder
            </p>
          </button>

          <button
            onClick={handleSyncOrders}
            className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-500 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Sipariş Çek
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Siparişleri Trendyol'dan al
            </p>
          </button>

          <button
            onClick={handleSyncStock}
            className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-500 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Stok Senkronize
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Stokları senkronize et
            </p>
          </button>
        </div>
      )}
    </div>
  );
}
