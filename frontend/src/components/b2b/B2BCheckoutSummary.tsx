import type { User } from '../../types/b2b';
import { b2bDiscountService } from '../../services/b2bDiscount.service';
import { b2bPaymentService } from '../../services/b2bPayment.service';

interface B2BCheckoutSummaryProps {
  user: User;
  cartTotal: number;
  cartItems: Array<{ productId: string; categoryId?: string; quantity: number }>;
  selectedPaymentMethod?: string;
}

export default function B2BCheckoutSummary({
  user,
  cartTotal,
  cartItems,
  selectedPaymentMethod,
}: B2BCheckoutSummaryProps) {
  const discountSummary = b2bDiscountService.getDiscountSummary(user, cartTotal, cartItems);
  
  const paymentMethods = b2bPaymentService.getAvailablePaymentMethods(user, cartTotal);
  const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);
  const paymentFee = selectedMethod 
    ? b2bPaymentService.calculatePaymentFee(selectedMethod, cartTotal)
    : 0;

  const finalTotal = cartTotal - discountSummary.totalDiscount + paymentFee;

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Sipariş Özeti
      </h3>

      {/* Subtotal */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Ara Toplam:</span>
        <span className="font-medium text-gray-900 dark:text-white">
          ₺{cartTotal.toFixed(2)}
        </span>
      </div>

      {/* B2B Discount */}
      {discountSummary.best && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-green-600 dark:text-green-400">
              B2B İndirim ({discountSummary.best.name}):
            </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              -₺{discountSummary.totalDiscount.toFixed(2)}
            </span>
          </div>
          
          {discountSummary.best.type === 'percentage' && (
            <p className="text-xs text-gray-500">
              %{discountSummary.best.value} indirim uygulandı
            </p>
          )}
        </div>
      )}

      {/* Payment Fee */}
      {paymentFee > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">İşlem Ücreti:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            +₺{paymentFee.toFixed(2)}
          </span>
        </div>
      )}

      {/* Total */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Toplam:
          </span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ₺{finalTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment Terms */}
      {selectedMethod?.type === 'on_credit' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Vadeli Ödeme:</strong> {selectedMethod.paymentTerms} gün
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {selectedMethod.paymentTerms != null && (
              <>Son ödeme tarihi: {b2bPaymentService.calculateDueDate(selectedMethod.paymentTerms).toLocaleDateString('tr-TR')}</>
            )}
          </p>
        </div>
      )}

      {/* Credit Info */}
      {user.group === 'bayi' && user.b2bProfile && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Kredi Limiti:</span>
            <span className="font-medium">₺{user.b2bProfile.creditLimit.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Mevcut Borç:</span>
            <span className="font-medium">₺{user.b2bProfile.currentDebt.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Kullanılabilir Kredi:</span>
            <span className="font-medium text-green-600">
              ₺{(user.b2bProfile.creditLimit - user.b2bProfile.currentDebt).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Available Discounts */}
      {discountSummary.applicable.length > 1 && (
        <div className="text-xs text-gray-500">
          {discountSummary.applicable.length} indirim seçeneği mevcut
        </div>
      )}
    </div>
  );
}
