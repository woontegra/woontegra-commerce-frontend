import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ProductFormData } from '../../types/productForm';

interface ProductFormStep1Props {
  register: UseFormRegister<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
  categories: Array<{ id: string; name: string }>;
}

export default function ProductFormStep1({ register, errors, categories }: ProductFormStep1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Temel Bilgiler
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ürününüzün temel bilgilerini girin
        </p>
      </div>

      {/* Product Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Ürün Adı <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name', { 
            required: 'Ürün adı zorunludur',
            minLength: { value: 3, message: 'En az 3 karakter olmalıdır' }
          })}
          type="text"
          className={`input-standard w-full ${errors.name ? 'border-red-500' : ''}`}
          placeholder="Örn: Premium Pamuklu T-Shirt"
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Açıklama <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('description', { 
            required: 'Ürün açıklaması zorunludur',
            minLength: { value: 10, message: 'En az 10 karakter olmalıdır' }
          })}
          rows={6}
          className={`input-standard w-full ${errors.description ? 'border-red-500' : ''}`}
          placeholder="Ürününüzün detaylı açıklamasını yazın..."
        />
        {errors.description && (
          <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Ürününüzün özelliklerini, malzemesini ve kullanım alanlarını detaylı şekilde açıklayın
        </p>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Kategori <span className="text-red-500">*</span>
        </label>
        <select
          {...register('categoryId', { required: 'Kategori seçimi zorunludur' })}
          className={`input-standard w-full ${errors.categoryId ? 'border-red-500' : ''}`}
        >
          <option value="">Kategori seçin</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="text-sm text-red-600 mt-1">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Price & Stock */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fiyat (₺) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('price', { 
              required: 'Fiyat zorunludur',
              min: { value: 0.01, message: 'Fiyat 0\'dan büyük olmalıdır' },
              valueAsNumber: true
            })}
            type="number"
            step="0.01"
            className={`input-standard w-full ${errors.price ? 'border-red-500' : ''}`}
            placeholder="149.90"
          />
          {errors.price && (
            <p className="text-sm text-red-600 mt-1">{errors.price.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stok <span className="text-red-500">*</span>
          </label>
          <input
            {...register('stock', { 
              required: 'Stok zorunludur',
              min: { value: 0, message: 'Stok 0 veya daha büyük olmalıdır' },
              valueAsNumber: true
            })}
            type="number"
            className={`input-standard w-full ${errors.stock ? 'border-red-500' : ''}`}
            placeholder="100"
          />
          {errors.stock && (
            <p className="text-sm text-red-600 mt-1">{errors.stock.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            SKU <span className="text-red-500">*</span>
          </label>
          <input
            {...register('sku', { 
              required: 'SKU zorunludur',
              pattern: { value: /^[A-Z0-9-]+$/i, message: 'Sadece harf, rakam ve tire kullanın' }
            })}
            type="text"
            className={`input-standard w-full ${errors.sku ? 'border-red-500' : ''}`}
            placeholder="TSHIRT-001"
          />
          {errors.sku && (
            <p className="text-sm text-red-600 mt-1">{errors.sku.message}</p>
          )}
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-2">
        <input
          {...register('isActive')}
          type="checkbox"
          id="isActive"
          className="rounded"
        />
        <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
          Ürünü aktif olarak yayınla
        </label>
      </div>
    </div>
  );
}
