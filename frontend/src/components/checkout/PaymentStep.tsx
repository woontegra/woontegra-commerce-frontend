import { useState } from 'react';
import type { CheckoutData, PaymentMethod } from '../../types/order';
import Button from '../ui/Button';

interface PaymentStepProps {
  data: CheckoutData;
  onNext: (data: Partial<CheckoutData>) => void;
  onBack: () => void;
}

export default function PaymentStep({ data, onNext, onBack }: PaymentStepProps) {
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [orderNote, setOrderNote] = useState(data.notes?.customerNote || '');
  const [isGift, setIsGift] = useState(data.giftOption?.isGift || false);
  const [giftMessage, setGiftMessage] = useState(data.giftOption?.giftMessage || '');
  const [giftWrap, setGiftWrap] = useState(data.giftOption?.giftWrap || false);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'credit_card',
      type: 'credit_card',
      name: 'Kredi Kartı',
      description: 'Visa, Mastercard, Amex',
      isActive: true,
    },
    {
      id: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Banka Havalesi',
      description: 'Havale/EFT ile ödeme',
      isActive: true,
    },
    {
      id: 'cash_on_delivery',
      type: 'cash_on_delivery',
      name: 'Kapıda Ödeme',
      description: 'Teslimat sırasında nakit ödeme',
      isActive: true,
    },
  ];

  const handleSubmit = () => {
    const selectedMethod = paymentMethods.find(m => m.id === selectedPayment);
    
    onNext({
      paymentMethod: selectedMethod,
      notes: {
        customerNote: orderNote,
      },
      giftOption: isGift ? {
        isGift: true,
        giftMessage,
        giftWrap,
        giftWrapPrice: giftWrap ? 10 : 0,
      } : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Ödeme Yöntemi
      </h2>

      {/* Payment Methods */}
      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <label
            key={method.id}
            className={`
              flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all
              ${selectedPayment === method.id
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }
            `}
          >
            <input
              type="radio"
              name="payment"
              value={method.id}
              checked={selectedPayment === method.id}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-5 h-5"
            />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white">{method.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{method.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Order Note */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Sipariş Notu (Opsiyonel)
        </label>
        <textarea
          value={orderNote}
          onChange={(e) => setOrderNote(e.target.value)}
          className="input-standard w-full"
          rows={3}
          placeholder="Siparişiniz hakkında not ekleyin..."
        />
      </div>

      {/* Gift Option */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="isGift"
            checked={isGift}
            onChange={(e) => setIsGift(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="isGift" className="text-sm font-medium text-gray-900 dark:text-white">
            Bu bir hediye
          </label>
        </div>

        {isGift && (
          <div className="space-y-4 pl-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Hediye Mesajı
              </label>
              <textarea
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                className="input-standard w-full"
                rows={2}
                placeholder="Hediye mesajınızı yazın..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="giftWrap"
                checked={giftWrap}
                onChange={(e) => setGiftWrap(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="giftWrap" className="text-sm text-gray-600 dark:text-gray-400">
                Hediye paketi (+₺10)
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onBack}>
          Geri
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!selectedPayment}
          className="flex-1"
        >
          Siparişi Tamamla
        </Button>
      </div>
    </div>
  );
}
