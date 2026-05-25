import type { Stock } from '../../types/stock';
import { stockManagementService } from '../../services/stockManagement.service';

interface StockBadgeProps {
  stock: Stock;
  showQuantity?: boolean;
}

export default function StockBadge({ stock, showQuantity = false }: StockBadgeProps) {
  const status = stock.status;
  const label = stockManagementService.getStatusLabel(status);

  const colorClasses: Record<'green' | 'yellow' | 'red', string> = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  };

  const statusColor = stockManagementService.getStatusColor(status);
  const badgeColor: keyof typeof colorClasses =
    statusColor === 'green' || statusColor === 'yellow' || statusColor === 'red'
      ? statusColor
      : 'green';

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colorClasses[badgeColor]}`}>
        {label}
      </span>
      {showQuantity && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {stock.availableQuantity} adet
        </span>
      )}
    </div>
  );
}
