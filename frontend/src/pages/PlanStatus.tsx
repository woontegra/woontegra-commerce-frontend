import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, TrendingUp, Users, Package, Zap, Shield } from 'lucide-react';

interface UsageStats {
  plan: {
    name: string;
    slug: string;
  };
  limits: {
    products: number | 'unlimited';
    variants: number | 'unlimited';
    storage: number;
    users: number;
    api: boolean;
    analytics: boolean;
    integrations: boolean;
  };
  usage: {
    products: number;
    variants: number;
    orders: number;
    customers: number;
  };
  percentages: {
    products: number;
    variants: number;
  };
}

const PlanStatus: React.FC = () => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/subscription/usage');
      const data = await response.json();
      
      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    // Redirect to plan selection
    window.location.href = '/plans';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Plan bilgileri yüklenemedi</p>
        </div>
      </div>
    );
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 75) return 'text-orange-600 bg-orange-50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getProgressBarWidth = (percentage: number) => {
    return Math.min(percentage, 100);
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'starter':
        return <Package className="w-8 h-8 text-blue-500" />;
      case 'pro':
        return <Zap className="w-8 h-8 text-purple-500" />;
      case 'advanced':
        return <Shield className="w-8 h-8 text-yellow-500" />;
      default:
        return <Users className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getPlanIcon(stats.plan.slug)}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {stats.plan.name} Plan
                </h1>
                <p className="text-gray-600">
                  Mevcut planınızın durumu ve kullanım istatistikleri
                </p>
              </div>
            </div>
            
            <button
              onClick={handleUpgradeClick}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Plan Yükselt
            </button>
          </div>
        </div>

        {/* Usage Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ürünler</h3>
              <div className="text-2xl font-bold text-blue-600">
                {stats.usage.products}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Limit:</span>
                <span className="font-medium">
                  {stats.limits.products === 'unlimited' ? 'Sınırsız' : stats.limits.products}
                </span>
              </div>
              {stats.limits.products !== 'unlimited' && (
                <div className="w-full">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Kullanım:</span>
                    <span>{stats.percentages.products.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(stats.percentages.products)}`}
                      style={{ width: `${getProgressBarWidth(stats.percentages.products)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Varyantlar</h3>
              <div className="text-2xl font-bold text-purple-600">
                {stats.usage.variants}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Limit:</span>
                <span className="font-medium">
                  {stats.limits.variants === 'unlimited' ? 'Sınırsız' : stats.limits.variants}
                </span>
              </div>
              {stats.limits.variants !== 'unlimited' && (
                <div className="w-full">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Kullanım:</span>
                    <span>{stats.percentages.variants.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(stats.percentages.variants)}`}
                      style={{ width: `${getProgressBarWidth(stats.percentages.variants)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Siparişler</h3>
              <div className="text-2xl font-bold text-green-600">
                {stats.usage.orders}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Toplam sipariş sayısı
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Müşteriler</h3>
              <div className="text-2xl font-bold text-orange-600">
                {stats.usage.customers}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Toplam müşteri sayısı
            </div>
          </div>
        </div>

        {/* Features Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Plan Özellikleri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                stats.limits.api ? 'bg-green-100' : 'bg-gray-200'
              }`}>
                <Check className={`w-4 h-4 ${stats.limits.api ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium text-gray-900">API Erişimi</p>
                <p className="text-sm text-gray-600">
                  {stats.limits.api ? 'Etkin' : 'Pro plan gerektir'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                stats.limits.analytics ? 'bg-green-100' : 'bg-gray-200'
              }`}>
                <Check className={`w-4 h-4 ${stats.limits.analytics ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Gelişmiş Analitik</p>
                <p className="text-sm text-gray-600">
                  {stats.limits.analytics ? 'Etkin' : 'Pro plan gerektir'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                stats.limits.integrations ? 'bg-green-100' : 'bg-gray-200'
              }`}>
                <Check className={`w-4 h-4 ${stats.limits.integrations ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Entegrasyonlar</p>
                <p className="text-sm text-gray-600">
                  {stats.limits.integrations ? 'Etkin' : 'Pro plan gerektir'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-green-100`}>
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Temel Özellikler</p>
                <p className="text-sm text-gray-600">Tüm planlarda mevcut</p>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Depolama Alanı</h3>
            <div className="text-2xl font-bold text-indigo-600">
              {stats.limits.storage} GB
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-indigo-600 h-4 rounded-full" style={{ width: '75%' }}></div>
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">
            15 GB kullanıldı, 85 GB boş alan kaldı
          </p>
        </div>

        {/* Alert for high usage */}
        {(stats.percentages.products >= 90 || stats.percentages.variants >= 90) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-900">Plan Limiti Yaklaşıyor!</h4>
                <p className="text-red-700 text-sm mt-1">
                  Plan limitlerinize yaklaşıyorsunuz. Veri kaybını önlemek için planınızı yükseltin.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanStatus;
