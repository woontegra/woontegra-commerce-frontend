import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ProductFormData, ProductFormStep } from '../../types/productForm';
import { defaultProductFormData } from '../../types/productForm';
import ProductFormStep1 from './ProductFormStep1';
import ProductFormStep2 from './ProductFormStep2';
import ProductFormStep3 from './ProductFormStep3';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
}

export default function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [currentStep, setCurrentStep] = useState<ProductFormStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<ProductFormData>({
    defaultValues: { ...defaultProductFormData, ...initialData },
  });

  const steps = [
    { number: 1, title: 'Temel Bilgiler', icon: '📝' },
    { number: 2, title: 'Varyantlar', icon: '🎨' },
    { number: 3, title: 'Görseller', icon: '📸' },
  ];

  const mockCategories = [
    { id: 'cat-1', name: 'Giyim' },
    { id: 'cat-2', name: 'Elektronik' },
    { id: 'cat-3', name: 'Ev & Yaşam' },
  ];

  const handleNext = async () => {
    let fieldsToValidate: (keyof ProductFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['name', 'description', 'categoryId', 'price', 'stock', 'sku'];
    }

    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep((prev) => Math.min(3, prev + 1) as ProductFormStep);
    } else {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1) as ProductFormStep);
  };

  const handleFormSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);

    try {
      await onSubmit(data);
      toast.success('Ürün başarıyla kaydedildi!');
    } catch (error) {
      toast.error('Ürün kaydedilemedi. Lütfen tekrar deneyin.');
      console.error('Product save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-200
                    ${currentStep >= step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }
                  `}
                >
                  {currentStep > step.number ? '✓' : step.icon}
                </div>
                <span
                  className={`
                    text-sm font-medium mt-2
                    ${currentStep >= step.number
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400'
                    }
                  `}
                >
                  {step.title}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-4 transition-all duration-200
                    ${currentStep > step.number
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                    }
                  `}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          {currentStep === 1 && (
            <ProductFormStep1
              register={register}
              errors={errors}
              categories={mockCategories}
            />
          )}

          {currentStep === 2 && (
            <ProductFormStep2
              watch={watch}
              setValue={setValue}
            />
          )}

          {currentStep === 3 && (
            <ProductFormStep3
              watch={watch}
              setValue={setValue}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            İptal
          </Button>

          {currentStep > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
            >
              Geri
            </Button>
          )}

          <div className="flex-1" />

          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
            >
              Devam Et
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[150px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Kaydediliyor...</span>
                </div>
              ) : (
                'Ürünü Kaydet'
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
