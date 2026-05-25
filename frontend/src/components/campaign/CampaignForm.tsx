import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Campaign, CampaignType, UserGroup } from '../../types/advancedCampaign';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface CampaignFormData {
  name: string;
  description: string;
  type: CampaignType;
  value: number;
  bxgyBuy: number;
  bxgyPay: number;
  startDate: string;
  endDate: string;
  productIds: string;
  categoryIds: string;
  userGroup: UserGroup;
  minCartAmount: number;
  maxDiscountAmount: number;
}

interface CampaignFormProps {
  initialData?: Partial<Campaign>;
  onSubmit: (data: Campaign) => Promise<void>;
  onCancel: () => void;
}

export default function CampaignForm({ initialData, onSubmit, onCancel }: CampaignFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CampaignFormData>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      type: initialData?.type || 'percentage',
      value: initialData?.value || 0,
      bxgyBuy: initialData?.bxgyConfig?.buy || 3,
      bxgyPay: initialData?.bxgyConfig?.pay || 2,
      startDate: initialData?.startDate?.split('T')[0] || '',
      endDate: initialData?.endDate?.split('T')[0] || '',
      productIds: initialData?.target?.productIds?.join(',') || '',
      categoryIds: initialData?.target?.categoryIds?.join(',') || '',
      userGroup: initialData?.target?.userGroup || 'all',
      minCartAmount: initialData?.target?.minCartAmount || 0,
      maxDiscountAmount: initialData?.target?.maxDiscountAmount || 0,
    },
  });

  const campaignType = watch('type');

  const handleFormSubmit = async (data: CampaignFormData) => {
    setIsSubmitting(true);

    try {
      const campaign: Campaign = {
        id: initialData?.id || `campaign-${Date.now()}`,
        name: data.name,
        description: data.description,
        type: data.type,
        value: data.value,
        bxgyConfig: data.type === 'bxgy' ? {
          buy: data.bxgyBuy,
          pay: data.bxgyPay,
        } : undefined,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        active: true,
        target: {
          productIds: data.productIds ? data.productIds.split(',').map(id => id.trim()) : undefined,
          categoryIds: data.categoryIds ? data.categoryIds.split(',').map(id => id.trim()) : undefined,
          userGroup: data.userGroup,
          minCartAmount: data.minCartAmount > 0 ? data.minCartAmount : undefined,
          maxDiscountAmount: data.maxDiscountAmount > 0 ? data.maxDiscountAmount : undefined,
        },
        usageCount: initialData?.usageCount || 0,
        totalDiscount: initialData?.totalDiscount || 0,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSubmit(campaign);
      toast.success('Kampanya başarıyla kaydedildi!');
    } catch (error) {
      toast.error('Kampanya kaydedilemedi');
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
            Kampanya Adı <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name', { required: 'Kampanya adı zorunludur' })}
            type="text"
            className="input-standard w-full"
            placeholder="Örn: Yaz İndirimi %20"
          />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Açıklama
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="input-standard w-full"
            placeholder="Kampanya açıklaması..."
          />
        </div>
      </div>

      {/* Campaign Type & Value */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Kampanya Tipi
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tip <span className="text-red-500">*</span>
          </label>
          <select
            {...register('type', { required: true })}
            className="input-standard w-full"
          >
            <option value="percentage">Yüzde İndirim (%)</option>
            <option value="fixed">Sabit İndirim (₺)</option>
            <option value="bxgy">Al Öde (BXGY)</option>
          </select>
        </div>

        {/* Percentage or Fixed Value */}
        {(campaignType === 'percentage' || campaignType === 'fixed') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {campaignType === 'percentage' ? 'İndirim Yüzdesi' : 'İndirim Tutarı (₺)'} <span className="text-red-500">*</span>
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
              placeholder={campaignType === 'percentage' ? '10' : '50'}
            />
            {errors.value && <p className="text-sm text-red-600 mt-1">{errors.value.message}</p>}
          </div>
        )}

        {/* BXGY Config */}
        {campaignType === 'bxgy' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Al (Buy) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('bxgyBuy', { 
                  required: true,
                  min: 2,
                  valueAsNumber: true
                })}
                type="number"
                className="input-standard w-full"
                placeholder="3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Öde (Pay) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('bxgyPay', { 
                  required: true,
                  min: 1,
                  valueAsNumber: true
                })}
                type="number"
                className="input-standard w-full"
                placeholder="2"
              />
            </div>
          </div>
        )}
      </div>

      {/* Targeting */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Hedefleme
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ürün ID'leri (virgülle ayırın)
          </label>
          <input
            {...register('productIds')}
            type="text"
            className="input-standard w-full"
            placeholder="prod-1, prod-2, prod-3"
          />
          <p className="text-xs text-gray-500 mt-1">Boş bırakırsanız tüm ürünlere uygulanır</p>
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
            Kullanıcı Grubu
          </label>
          <select {...register('userGroup')} className="input-standard w-full">
            <option value="all">Tüm Kullanıcılar</option>
            <option value="new">Yeni Kullanıcılar</option>
            <option value="returning">Geri Dönen Kullanıcılar</option>
            <option value="vip">VIP Kullanıcılar</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Min. Sepet Tutarı (₺)
            </label>
            <input
              {...register('minCartAmount', { valueAsNumber: true })}
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

      {/* Dates */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tarih Aralığı
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
          {isSubmitting ? 'Kaydediliyor...' : 'Kampanyayı Kaydet'}
        </Button>
      </div>
    </form>
  );
}
