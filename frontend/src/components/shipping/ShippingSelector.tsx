import { useState, useEffect } from 'react';
import type { ShippingAddress, ShippingCart, ShippingCalculationResult } from '../../types/shipping';
import { shippingCalculationService, defaultShippingMethods } from '../../services/shippingCalculation.service';

interface ShippingSelectorProps {
  cart: ShippingCart;
  address: ShippingAddress;
  onSelect: (result: ShippingCalculationResult) => void;
  selectedMethodId?: string;
}

export default function ShippingSelector({ cart, address, onSelect, selectedMethodId }: ShippingSelectorProps) {
  const [shippingOptions, setShippingOptions] = useState<ShippingCalculationResult[]>([]);

  useEffect(() => {
    // Calculate shipping options
    const options = shippingCalculationService.calculateShipping(
      cart,
      address,
      defaultShippingMethods
    );
    setShippingOptions(options);

    // Auto-select cheapest if none selected
    if (!selectedMethodId && options.length > 0) {
      onSelect(options[0]);
    }
  }, [cart, address]);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
        Kargo Yöntemi Seçin
      </h3>

      {shippingOptions.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400">
            Bu adres için kargo seçeneği bulunamadı
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {shippingOptions.map((option) => (
            <label
              key={option.methodId}
              className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                selectedMethodId === option.methodId
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="radio"
                  name="shipping"
                  value={option.methodId}
                  checked={selectedMethodId === option.methodId}
                  onChange={() => onSelect(option)}
                  className="text-blue-600"
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {option.methodName}
                    </span>
                    {option.isFree && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full">
                        Ücretsiz
                      </span>
                    )}
                    {option.region && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({option.region})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tahmini teslimat: {option.estimatedDays} gün
                  </p>
                </div>
              </div>

              <div className="text-right">
                {option.isFree ? (
                  <div>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      Ücretsiz
                    </p>
                    {option.originalPrice && (
                      <p className="text-xs text-gray-500 line-through">
                        ₺{option.originalPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ₺{option.price.toFixed(2)}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Free Shipping Progress */}
      {cart.total < 500 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                ₺{(500 - cart.total).toFixed(2)} daha alışveriş yapın, ücretsiz kargo kazanın!
              </p>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((cart.total / 500) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
