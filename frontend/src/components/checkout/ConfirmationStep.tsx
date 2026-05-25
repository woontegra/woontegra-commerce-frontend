import type { CheckoutData } from '../../types/order';
import Button from '../ui/Button';

interface ConfirmationStepProps {
  data: CheckoutData;
}

export default function ConfirmationStep({ data }: ConfirmationStepProps) {
  const orderNumber = `ORD-${Date.now()}`;

  return (
    <div className="text-center space-y-6 py-8">
      {/* Success Icon */}
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Message */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Siparişiniz Alındı!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sipariş numaranız: <span className="font-medium text-gray-900 dark:text-white">{orderNumber}</span>
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 text-left max-w-md mx-auto">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sipariş Özeti</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Ürünler ({data.cart.items.length})</span>
            <span className="font-medium">₺{data.cart.subtotal.toFixed(2)}</span>
          </div>
          
          {data.giftOption?.giftWrap && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Hediye Paketi</span>
              <span className="font-medium">₺{data.giftOption.giftWrapPrice?.toFixed(2)}</span>
            </div>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
            <div className="flex justify-between text-lg font-semibold">
              <span>Toplam</span>
              <span>₺{(data.cart.subtotal + (data.giftOption?.giftWrapPrice || 0)).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        {data.shippingAddress && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Teslimat Adresi</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data.shippingAddress.fullName}<br />
              {data.shippingAddress.addressLine1}<br />
              {data.shippingAddress.city}, {data.shippingAddress.zipCode}
            </p>
          </div>
        )}

        {/* Payment Method */}
        {data.paymentMethod && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Ödeme Yöntemi</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data.paymentMethod.name}
            </p>
          </div>
        )}
      </div>

      {/* Email Notification */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Sipariş detayları {data.shippingAddress?.email} adresine gönderildi
      </p>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={() => window.location.href = '/dashboard/orders'}>
          Siparişlerim
        </Button>
        <Button onClick={() => window.location.href = '/'}>
          Alışverişe Devam Et
        </Button>
      </div>
    </div>
  );
}
