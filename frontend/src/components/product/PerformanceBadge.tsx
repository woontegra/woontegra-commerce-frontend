import type { ProductStats } from '../../types/productStats';

interface PerformanceBadgeProps {
  stats: ProductStats;
  showDetails?: boolean;
}

export default function PerformanceBadge({ stats, showDetails = false }: PerformanceBadgeProps) {
  type PerformanceColor = 'green' | 'blue' | 'yellow' | 'gray';

  const colorClasses: Record<PerformanceColor, string> = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
  };

  const getPerformanceLevel = (): { label: string; color: PerformanceColor } => {
    if (stats.sales > 100) {
      return { label: 'Çok Satıyor', color: 'green' };
    }
    if (stats.sales > 50) {
      return { label: 'İyi Satıyor', color: 'blue' };
    }
    if (stats.sales > 10) {
      return { label: 'Orta', color: 'yellow' };
    }
    return { label: 'Düşük', color: 'gray' };
  };

  const { label, color } = getPerformanceLevel();

  if (!showDetails) {
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colorClasses[color]}`}>
        {label}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colorClasses[color]}`}>
        {label}
      </span>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Görüntülenme</p>
          <p className="font-semibold text-gray-900 dark:text-white">{stats.views}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Sepete Ekleme</p>
          <p className="font-semibold text-gray-900 dark:text-white">{stats.addToCart}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Satış</p>
          <p className="font-semibold text-gray-900 dark:text-white">{stats.sales}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Sepet Oranı</p>
          <p className="font-semibold text-blue-600 dark:text-blue-400">{stats.cartRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Dönüşüm</p>
          <p className="font-semibold text-green-600 dark:text-green-400">{stats.conversionRate.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
