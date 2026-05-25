import type { CheckoutData } from '../../types/order';
import Button from '../ui/Button';

interface CartStepProps {
  data: CheckoutData;
  onNext: (data: Partial<CheckoutData>) => void;
}

export default function CartStep({ data, onNext }: CartStepProps) {
  const handleContinue = () => {
    onNext({});
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Sepetim
      </h2>

      {/* Cart Items */}
      <div className="space-y-4">
        {data.cart.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            {item.image && (
              <img src={item.image} alt={item.productName} className="w-20 h-20 object-cover rounded-lg" />
            )}
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white">{item.productName}</h3>
              {item.variantName && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.variantName}</p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {item.quantity} x ₺{item.price.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900 dark:text-white">
                ₺{item.total.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between text-lg font-semibold">
          <span>Ara Toplam</span>
          <span>₺{data.cart.subtotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <Button onClick={handleContinue} className="w-full">
        Devam Et
      </Button>
    </div>
  );
}
