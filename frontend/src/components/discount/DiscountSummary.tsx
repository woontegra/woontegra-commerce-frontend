import type { DiscountEngineResult } from '../../types/discountEngine';

interface DiscountSummaryProps {
  result: DiscountEngineResult;
  cartTotal: number;
}

export default function DiscountSummary({ result, cartTotal }: DiscountSummaryProps) {
  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded">Kampanya</span>;
      case 2:
        return <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded">Kupon</span>;
      case 3:
        return <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded">Özel</span>;
      default:
        return null;
    }
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        İndirim Detayları
      </h3>

      {/* Applied Discounts */}
      {result.appliedDiscounts.length > 0 && (
        <div className="space-y-3">
          {result.appliedDiscounts.map((discount) => (
            <div
              key={discount.ruleId}
              className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getPriorityBadge(discount.priority)}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {discount.ruleName}
                  </span>
                </div>
                <span className="text-green-600 dark:text-green-400 font-bold">
                  -₺{discount.amount.toFixed(2)}
                </span>
              </div>
              
              {discount.appliedTo.length > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {discount.appliedTo.length} ürüne uygulandı
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skipped Discounts */}
      {result.skippedDiscounts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Uygulanamayan İndirimler:
          </p>
          {result.skippedDiscounts.map((skipped) => (
            <div
              key={skipped.ruleId}
              className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400"
            >
              {skipped.reason}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Ara Toplam:</span>
          <span className="font-medium">₺{cartTotal.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-green-600 dark:text-green-400">Toplam İndirim:</span>
          <span className="font-bold text-green-600 dark:text-green-400">
            -₺{result.totalDiscount.toFixed(2)}
          </span>
        </div>
        
        <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Ödenecek Tutar:
          </span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ₺{result.finalTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Savings */}
      {result.totalDiscount > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            🎉 Bu siparişte <strong>₺{result.totalDiscount.toFixed(2)}</strong> tasarruf ediyorsunuz!
          </p>
        </div>
      )}
    </div>
  );
}
