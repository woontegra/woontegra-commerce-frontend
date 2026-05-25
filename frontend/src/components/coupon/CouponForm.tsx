import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Coupon, CouponType } from '../../types/coupon';
import { couponValidationService } from '../../services/couponValidation.service';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface CouponFormData {
  code: string;
  type: CouponType;
  value: number;
  minCartTotal: number;
  maxDiscountAmount: number;
  maxUsage: number;
  maxUsagePerUser: number;
  productIds: string;
  categoryIds: string;
  userIds: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface CouponFormProps {
  initialData?: Partial<Coupon>;
  onSubmit: (data: Coupon) => Promise<void>;
  onCancel: () => void;
}

export default function CouponForm({ initialData, onSubmit, onCancel }: CouponFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CouponFormData>({
    defaultValues: {
      code: initialData?.code || '',
      type: initialData?.type || 'percentage',
      value: initialData?.value || 0,
      minCartTotal: initialData?.minCartTotal || 0,
      maxDiscountAmount: initialData?.maxDiscountAmount || 0,
      maxUsage: initialData?.maxUsage || 0,
      maxUsagePerUser: initialData?.maxUsagePerUser || 0,
      productIds: initialData?.productIds?.join(',') || '',
      categoryIds: initialData?.categoryIds?.join(',') || '',
      userIds: initialData?.userIds?.join(',') || '',
      startDate: initialData?.startDate?.split('T')[0] || '',
      endDate: initialData?.endDate?.split('T')[0] || '',
      description: initialData?.description || '',
    },
  });

  const couponType = watch('type');

  const generateCode = () => {
    const code = couponValidationService.generateCouponCode('', 8);
    setValue('code', code);
  };

  const handleFormSubmit = async (data: CouponFormData) => {
    setIsSubmitting(true);

    try {
      const coupon: Coupon = {
        id: initialData?.id || `coupon-${Date.now()}`,
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        minCartTotal: data.minCartTotal > 0 ? data.minCartTotal : undefined,
        maxDiscountAmount: data.maxDiscountAmount > 0 ? data.maxDiscountAmount : undefined,
        maxUsage: data.maxUsage > 0 ? data.maxUsage : undefined,
        usedCount: initialData?.usedCount || 0,
        maxUsagePerUser: data.maxUsagePerUser > 0 ? data.maxUsagePerUser : undefined,
        productIds: data.productIds ? data.productIds.split(',').map(id => id.trim()) : undefined,
        categoryIds: data.categoryIds ? data.categoryIds.split(',').map(id => id.trim()) : undefined,
        userIds: data.userIds ? data.userIds.split(',').map(id => id.trim()) : undefined,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        active: true,
        description: data.description,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSubmit(coupon);
      toast.success('Kupon başarıyla kaydedildi!');
    } catch (error) {
      toast.error('Kupon kaydedilemedi');
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
            Kupon Kodu <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              {...register('code', { 
                required: 'Kupon kodu zorunludur',
                pattern: { value: /^[A-Z0-9]{4,20}$/, message: 'Sadece büyük harf ve rakam, 4-20 karakter' }
              })}
              type="text"
              className="flex-1 input-standard uppercase"
              placeholder="WELCOME10"
              maxLength={20}
            />
            <Button type="button" onClick={generateCode} variant="secondary">
              Oluştur
            </Button>
          </div>
          {errors.code && <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Açıklama
          </label>
          <textarea
            {...register('description')}
            rows={2}
            className="input-standard w-full"
            placeholder="Kupon açıklaması..."
          />
        </div>
      </div>

      {/* Discount Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          İndirim Ayarları
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            İndirim Tipi <span className="text-red-500">*</span>
          </label>
          <select {...register('type')} className="input-standard w-full">
            <option value="percentage">Yüzde İndirim (%)</option>
            <option value="fixed">Sabit İndirim (₺)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {couponType === 'percentage' ? 'İndirim Yüzdesi' : 'İndirim Tutarı (₺)'} <span className="text-red-500">*</span>
          </label>
          <input
            {...register('value', { 
              required: 'Değer zorunludur',
              min: { value: 0.01, message: '0\'dan büyük olmalıdır' },
              valueAsNumber: true
            })}
            type="number"
            step="0.01"
            className="input-standard w-full"
            placeholder={couponType === 'percentage' ? '10' : '50'}
          />
          {errors.value && <p className="text-sm text-red-600 mt-1">{errors.value.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Min. Sepet Tutarı (₺)
            </label>
            <input
              {...register('minCartTotal', { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="input-standard w-full"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max. İndirim Limiti (₺)
            </label>
            <input
              {...register('maxDiscountAmount', { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="input-standard w-full"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Usage Limits */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Kullanım Limitleri
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Toplam Kullanım Limiti
            </label>
            <input
              {...register('maxUsage', { valueAsNumber: true })}
              type="number"
              className="input-standard w-full"
              placeholder="0 (Sınırsız)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kullanıcı Başına Limit
            </label>
            <input
              {...register('maxUsagePerUser', { valueAsNumber: true })}
              type="number"
              className="input-standard w-full"
              placeholder="0 (Sınırsız)"
            />
          </div>
        </div>
      </div>

      {/* Targeting */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Hedefleme (Opsiyonel)
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ürün ID'leri (virgülle ayırın)
          </label>
          <input
            {...register('productIds')}
            type="text"
            className="input-standard w-full"
            placeholder="prod-1, prod-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Kategori ID'leri (virgülle ayırın)
          </label>
          <input
            {...register('categoryIds')}
            type="text"
            className="input-standard w-full"
            placeholder="cat-1, cat-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Kullanıcı ID'leri (virgülle ayırın)
          </label>
          <input
            {...register('userIds')}
            type="text"
            className="input-standard w-full"
            placeholder="user-1, user-2"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Geçerlilik Tarihleri
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Başlangıç Tarihi <span className="text-red-500">*</span>
            </label>
            <input
              {...register('startDate', { required: 'Başlangıç tarihi zorunludur' })}
              type="date"
              className="input-standard w-full"
            />
            {errors.startDate && <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bitiş Tarihi <span className="text-red-500">*</span>
            </label>
            <input
              {...register('endDate', { required: 'Bitiş tarihi zorunludur' })}
              type="date"
              className="input-standard w-full"
            />
            {errors.endDate && <p className="text-sm text-red-600 mt-1">{errors.endDate.message}</p>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Kaydediliyor...' : 'Kuponu Kaydet'}
        </Button>
      </div>
    </form>
  );
}
