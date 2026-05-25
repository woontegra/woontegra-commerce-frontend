import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ShippingMethod, ShippingPriceType, ShippingRegion } from '../../types/shipping';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface ShippingMethodFormData {
  name: string;
  description: string;
  priceType: ShippingPriceType;
  basePrice: number;
  freeShippingThreshold: number;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  minCartTotal: number;
  maxCartTotal: number;
}

interface ShippingMethodFormProps {
  initialData?: Partial<ShippingMethod>;
  onSubmit: (data: ShippingMethod) => Promise<void>;
  onCancel: () => void;
}

export default function ShippingMethodForm({ initialData, onSubmit, onCancel }: ShippingMethodFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regions, setRegions] = useState<ShippingRegion[]>(initialData?.regions || []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ShippingMethodFormData>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      priceType: initialData?.priceType || 'fixed',
      basePrice: initialData?.basePrice || 0,
      freeShippingThreshold: initialData?.freeShippingThreshold || 0,
      minDeliveryDays: initialData?.minDeliveryDays || 1,
      maxDeliveryDays: initialData?.maxDeliveryDays || 5,
      minCartTotal: initialData?.minCartTotal || 0,
      maxCartTotal: initialData?.maxCartTotal || 0,
    },
  });

  const priceType = watch('priceType');

  const addRegion = () => {
    const newRegion: ShippingRegion = {
      id: `region-${Date.now()}`,
      name: '',
      cities: [],
      price: 0,
      estimatedDays: 3,
    };
    setRegions([...regions, newRegion]);
  };

  const updateRegion = (index: number, field: keyof ShippingRegion, value: any) => {
    const updated = [...regions];
    updated[index] = { ...updated[index], [field]: value };
    setRegions(updated);
  };

  const removeRegion = (index: number) => {
    setRegions(regions.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (data: ShippingMethodFormData) => {
    setIsSubmitting(true);

    try {
      const method: ShippingMethod = {
        id: initialData?.id || `shipping-${Date.now()}`,
        name: data.name,
        description: data.description,
        priceType: data.priceType,
        basePrice: data.basePrice,
        regions: priceType === 'dynamic' ? regions : undefined,
        freeShippingThreshold: data.freeShippingThreshold > 0 ? data.freeShippingThreshold : undefined,
        minDeliveryDays: data.minDeliveryDays,
        maxDeliveryDays: data.maxDeliveryDays,
        minCartTotal: data.minCartTotal > 0 ? data.minCartTotal : undefined,
        maxCartTotal: data.maxCartTotal > 0 ? data.maxCartTotal : undefined,
        active: true,
        displayOrder: initialData?.displayOrder || 0,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSubmit(method);
      toast.success('Kargo yöntemi kaydedildi!');
    } catch (error) {
      toast.error('Kargo yöntemi kaydedilemedi');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Temel Bilgiler
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Kargo Adı <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name', { required: 'Kargo adı zorunludur' })}
            type="text"
            className="input-standard w-full"
            placeholder="Standart Kargo"
          />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Açıklama
          </label>
          <textarea
            {...register('description')}
            rows={2}
            className="input-standard w-full"
            placeholder="Kargo açıklaması..."
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Fiyatlandırma
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fiyat Tipi <span className="text-red-500">*</span>
          </label>
          <select {...register('priceType')} className="input-standard w-full">
            <option value="fixed">Sabit Fiyat</option>
            <option value="dynamic">Bölge Bazlı</option>
            <option value="free">Ücretsiz</option>
          </select>
        </div>

        {priceType !== 'free' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Temel Fiyat (₺) <span className="text-red-500">*</span>
            </label>
            <input
              {...register('basePrice', { 
                required: 'Temel fiyat zorunludur',
                valueAsNumber: true 
              })}
              type="number"
              step="0.01"
              className="input-standard w-full"
              placeholder="50.00"
            />
            {errors.basePrice && <p className="text-sm text-red-600 mt-1">{errors.basePrice.message}</p>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ücretsiz Kargo Eşiği (₺)
          </label>
          <input
            {...register('freeShippingThreshold', { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="input-standard w-full"
            placeholder="500.00"
          />
          <p className="text-xs text-gray-500 mt-1">Bu tutarın üzerinde ücretsiz kargo</p>
        </div>
      </div>

      {/* Regions (for dynamic pricing) */}
      {priceType === 'dynamic' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bölgeler
            </h3>
            <Button type="button" onClick={addRegion} size="sm">
              Bölge Ekle
            </Button>
          </div>

          {regions.map((region, index) => (
            <div key={region.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">Bölge {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeRegion(index)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Kaldır
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Bölge Adı
                  </label>
                  <input
                    type="text"
                    value={region.name}
                    onChange={(e) => updateRegion(index, 'name', e.target.value)}
                    className="input-standard w-full text-sm"
                    placeholder="İstanbul"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Fiyat (₺)
                  </label>
                  <input
                    type="number"
                    value={region.price}
                    onChange={(e) => updateRegion(index, 'price', parseFloat(e.target.value))}
                    className="input-standard w-full text-sm"
                    placeholder="50.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Şehirler (virgülle ayırın)
                </label>
                <input
                  type="text"
                  value={region.cities.join(', ')}
                  onChange={(e) => updateRegion(index, 'cities', e.target.value.split(',').map(c => c.trim()))}
                  className="input-standard w-full text-sm"
                  placeholder="İstanbul, Ankara, İzmir"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delivery Time */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Teslimat Süresi
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Min. Gün
            </label>
            <input
              {...register('minDeliveryDays', { valueAsNumber: true })}
              type="number"
              className="input-standard w-full"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max. Gün
            </label>
            <input
              {...register('maxDeliveryDays', { valueAsNumber: true })}
              type="number"
              className="input-standard w-full"
              placeholder="5"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Kaydediliyor...' : 'Kargo Yöntemini Kaydet'}
        </Button>
      </div>
    </form>
  );
}
