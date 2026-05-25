import { useState } from 'react';
import { useCheckoutValidation } from '../hooks/useCheckoutValidation';
import CheckoutValidation from '../components/checkout/CheckoutValidation';
import type { PaymentMethod, ShippingMethod } from '../types/checkoutRules';
import Button from '../components/ui/Button';

export default function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>();
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');

  // Mock cart data
  const mockCart = {
    items: [
      { 
        id: '1', 
        productId: 'prod-1', 
        categoryId: 'cat-1', 
        productName: 'Ürün 1',
        finalPrice: 150, 
        quantity: 2 
      },
    ],
    subtotal: 300,
    total: 300,
  };

  // Checkout validation
  const {
    validation,
    isValid,
    applicableShippingMethods,
    isPaymentMethodAllowed,
  } = useCheckoutValidation({
    cart: mockCart,
    paymentMethod,
    shippingMethod,
  });

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    if (isPaymentMethodAllowed(method)) {
      setPaymentMethod(method);
    }
  };

  const handleCheckout = () => {
    if (isValid) {
      alert('Sipariş tamamlandı!');
    }
  };

  const paymentMethods: Array<{ id: PaymentMethod; name: string; icon: string }> = [
    { id: 'credit_card', name: 'Kredi Kartı', icon: '💳' },
    { id: 'cash_on_delivery', name: 'Kapıda Ödeme', icon: '💵' },
    { id: 'bank_transfer', name: 'Havale/EFT', icon: '🏦' },
    { id: 'mobile_payment', name: 'Mobil Ödeme', icon: '📱' },
  ];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Ödeme
      </h1>

      {/* Cart Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sipariş Özeti
        </h2>
        <div className="space-y-2">
          {mockCart.items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {item.productName} x {item.quantity}
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                ₺{(item.finalPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
            <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
              <span>Toplam</span>
              <span>₺{mockCart.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Method */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Kargo Yöntemi
        </h2>
        <div className="space-y-2">
          {(['standard', 'express', 'free'] as ShippingMethod[]).map(method => {
            const isAllowed = applicableShippingMethods.includes(method);
            return (
              <label
                key={method}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  isAllowed
                    ? 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
                    : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                } ${shippingMethod === method ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <input
                  type="radio"
                  name="shipping"
                  value={method}
                  checked={shippingMethod === method}
                  onChange={(e) => setShippingMethod(e.target.value as ShippingMethod)}
                  disabled={!isAllowed}
                  className="text-blue-600"
                />
                <span className="flex-1 text-gray-900 dark:text-white">
                  {method === 'standard' && 'Standart Kargo (3-5 gün)'}
                  {method === 'express' && 'Hızlı Kargo (1 gün)'}
                  {method === 'free' && 'Ücretsiz Kargo (5-7 gün)'}
                </span>
                {!isAllowed && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    Uygun değil
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Ödeme Yöntemi
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {paymentMethods.map(method => {
            const isAllowed = isPaymentMethodAllowed(method.id);
            return (
              <button
                key={method.id}
                onClick={() => handlePaymentMethodChange(method.id)}
                disabled={!isAllowed}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  isAllowed
                    ? 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
                    : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                } ${paymentMethod === method.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <div className="text-3xl mb-2">{method.icon}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {method.name}
                </div>
                {!isAllowed && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Uygun değil
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Validation Messages */}
      <CheckoutValidation validation={validation} />

      {/* Checkout Button */}
      <Button
        onClick={handleCheckout}
        disabled={!isValid || !paymentMethod}
        className="w-full py-4 text-lg"
      >
        {!paymentMethod ? 'Ödeme Yöntemi Seçin' : isValid ? 'Siparişi Tamamla' : 'Sipariş Verilemez'}
      </Button>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Checkout Kuralları:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Minimum sipariş tutarı: ₺100.00</li>
              <li>Kapıda ödeme: Sadece ₺500.00 altı siparişler</li>
              <li>Ücretsiz kargo: ₺300.00 üzeri alışverişlerde</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
