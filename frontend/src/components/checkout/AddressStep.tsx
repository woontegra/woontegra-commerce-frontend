import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CheckoutData, Address } from '../../types/order';
import Button from '../ui/Button';

interface AddressStepProps {
  data: CheckoutData;
  onNext: (data: Partial<CheckoutData>) => void;
  onBack: () => void;
}

export default function AddressStep({ data, onNext, onBack }: AddressStepProps) {
  const [useSameAddress, setUseSameAddress] = useState(data.useSameAddress);
  
  const { register, handleSubmit, formState: { errors } } = useForm<{
    shipping: Address;
    billing: Address;
  }>({
    defaultValues: {
      shipping: data.shippingAddress,
      billing: data.billingAddress,
    },
  });

  const onSubmit = (formData: { shipping: Address; billing: Address }) => {
    onNext({
      shippingAddress: formData.shipping,
      billingAddress: useSameAddress ? formData.shipping : formData.billing,
      useSameAddress,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Teslimat Adresi
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Ad Soyad *
          </label>
          <input
            {...register('shipping.fullName', { required: 'Ad soyad gerekli' })}
            className="input-standard w-full"
            placeholder="John Doe"
          />
          {errors.shipping?.fullName && (
            <p className="text-sm text-red-600 mt-1">{errors.shipping.fullName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Telefon *
          </label>
          <input
            {...register('shipping.phone', { required: 'Telefon gerekli' })}
            className="input-standard w-full"
            placeholder="+90 555 123 4567"
          />
          {errors.shipping?.phone && (
            <p className="text-sm text-red-600 mt-1">{errors.shipping.phone.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Adres *
          </label>
          <input
            {...register('shipping.addressLine1', { required: 'Adres gerekli' })}
            className="input-standard w-full"
            placeholder="Sokak, Mahalle, No"
          />
          {errors.shipping?.addressLine1 && (
            <p className="text-sm text-red-600 mt-1">{errors.shipping.addressLine1.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Şehir *
          </label>
          <input
            {...register('shipping.city', { required: 'Şehir gerekli' })}
            className="input-standard w-full"
            placeholder="İstanbul"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Posta Kodu *
          </label>
          <input
            {...register('shipping.zipCode', { required: 'Posta kodu gerekli' })}
            className="input-standard w-full"
            placeholder="34000"
          />
        </div>
      </div>

      {/* Billing Address */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="sameAddress"
            checked={useSameAddress}
            onChange={(e) => setUseSameAddress(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="sameAddress" className="text-sm text-gray-600 dark:text-gray-400">
            Fatura adresi teslimat adresi ile aynı
          </label>
        </div>

        {!useSameAddress && (
          <>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Fatura Adresi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Ad Soyad *
                </label>
                <input
                  {...register('billing.fullName', { required: !useSameAddress })}
                  className="input-standard w-full"
                />
              </div>
              {/* Diğer fatura adresi alanları... */}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onBack}>
          Geri
        </Button>
        <Button type="submit" className="flex-1">
          Devam Et
        </Button>
      </div>
    </form>
  );
}
