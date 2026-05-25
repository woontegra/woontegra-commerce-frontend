import { useForm } from 'react-hook-form';
import { useCreateProduct } from '../../hooks/useProducts';
import type { CreateProductDto } from '../../services/product.service';

interface ProductFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ProductForm({ onSuccess, onCancel }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateProductDto>();

  const createProduct = useCreateProduct();

  const onSubmit = async (data: CreateProductDto) => {
    try {
      await createProduct.mutateAsync(data);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Product Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-600 dark:text-gray-400 leading-tight mb-2">
          Ürün Adı *
        </label>
        <input
          id="name"
          type="text"
          {...register('name', {
            required: 'Ürün adı zorunludur',
            minLength: {
              value: 3,
              message: 'Ürün adı en az 3 karakter olmalıdır',
            },
          })}
          className={`input-standard w-full ${
            errors.name ? 'border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder="Örn: Premium T-Shirt"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-600 dark:text-gray-400 leading-tight mb-2">
          Açıklama *
        </label>
        <textarea
          id="description"
          rows={4}
          {...register('description', {
            required: 'Açıklama zorunludur',
            minLength: {
              value: 10,
              message: 'Açıklama en az 10 karakter olmalıdır',
            },
          })}
          className={`input-standard w-full resize-none ${
            errors.description ? 'border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder="Ürün açıklamasını girin..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Price and Stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-600 dark:text-gray-400 leading-tight mb-2">
            Fiyat (₺) *
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            {...register('price', {
              required: 'Fiyat zorunludur',
              min: {
                value: 0.01,
                message: 'Fiyat 0\'dan büyük olmalıdır',
              },
              valueAsNumber: true,
            })}
            className={`input-standard w-full ${
              errors.price ? 'border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="0.00"
          />
          {errors.price && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.price.message}
            </p>
          )}
        </div>

        {/* Stock */}
        <div>
          <label htmlFor="stock" className="block text-sm font-medium text-gray-600 dark:text-gray-400 leading-tight mb-2">
            Stok *
          </label>
          <input
            id="stock"
            type="number"
            {...register('stock', {
              required: 'Stok zorunludur',
              min: {
                value: 0,
                message: 'Stok 0 veya daha büyük olmalıdır',
              },
              valueAsNumber: true,
            })}
            className={`input-standard w-full ${
              errors.stock ? 'border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="0"
          />
          {errors.stock && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.stock.message}
            </p>
          )}
        </div>
      </div>

      {/* Category ID (Optional) */}
      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium text-gray-600 dark:text-gray-400 leading-tight mb-2">
          Kategori ID (Opsiyonel)
        </label>
        <input
          id="categoryId"
          type="text"
          {...register('categoryId')}
          className="input-standard w-full"
          placeholder="Kategori ID girin..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={createProduct.isPending}
          >
            İptal
          </button>
        )}
        <button
          type="submit"
          className="btn-primary inline-flex items-center gap-2"
          disabled={createProduct.isPending}
        >
          {createProduct.isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <span>Ürün Ekle</span>
          )}
        </button>
      </div>

    </form>
  );
}
