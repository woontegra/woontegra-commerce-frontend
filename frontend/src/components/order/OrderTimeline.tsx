import type { OrderStatusHistory, OrderStatus } from '../../types/orderLifecycle';
import { ORDER_STATUS_LABELS, ORDER_STATUS_ICONS } from '../../types/orderLifecycle';

interface OrderTimelineProps {
  statusHistory: OrderStatusHistory[];
  currentStatus: OrderStatus;
}

export default function OrderTimeline({ statusHistory, currentStatus }: OrderTimelineProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white">
        Sipariş Durumu
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Timeline items */}
        <div className="space-y-6">
          {statusHistory.map((entry, index) => {
            const isLast = index === statusHistory.length - 1;
            const isCurrent = entry.status === currentStatus;
            
            return (
              <div key={index} className="relative pl-10">
                {/* Dot */}
                <div
                  className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCurrent
                      ? 'bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/20'
                      : 'bg-gray-400 dark:bg-gray-600'
                  }`}
                >
                  <span className="text-white text-sm">
                    {ORDER_STATUS_ICONS[entry.status]}
                  </span>
                </div>

                {/* Content */}
                <div className={`${isLast ? '' : 'pb-6'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {ORDER_STATUS_LABELS[entry.status]}
                    </h4>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                        Güncel
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {new Date(entry.timestamp).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>

                  {entry.note && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      {entry.note}
                    </p>
                  )}

                  {entry.updatedBy && entry.updatedBy !== 'system' && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Güncelleyen: {entry.updatedBy}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
