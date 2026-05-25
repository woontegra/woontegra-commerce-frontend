import type { UseFormWatch, UseFormSetValue } from 'react-hook-form';
import type { ProductFormData } from '../../types/productForm';
import type { VariantGroup, VariantOption, VariantCombination } from '../../types/variant';
import VariantGroupManager from './VariantGroupManager';
import VariantMatrixBuilder from './VariantMatrixBuilder';

interface ProductFormStep2Props {
  watch: UseFormWatch<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
}

export default function ProductFormStep2({ watch, setValue }: ProductFormStep2Props) {
  const hasVariants = watch('hasVariants');
  const variantGroups = watch('variantGroups') || [];
  const variantOptions = watch('variantOptions') || {};
  const basePrice = watch('price') || 0;
  const baseSku = watch('sku') || 'PROD';

  const handleGroupsChange = (groups: VariantGroup[]) => {
    setValue('variantGroups', groups);
  };

  const handleOptionsChange = (groupId: string, options: VariantOption[]) => {
    setValue('variantOptions', {
      ...variantOptions,
      [groupId]: options,
    });
  };

  const handleVariantsGenerated = (variants: VariantCombination[]) => {
    setValue('variants', variants);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Varyant Yönetimi
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ürününüz için varyantlar oluşturun (renk, beden, vb.)
        </p>
      </div>

      {/* Has Variants Toggle */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hasVariants"
            checked={hasVariants}
            onChange={(e) => setValue('hasVariants', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="hasVariants" className="flex-1">
            <span className="font-medium text-gray-900 dark:text-white">
              Bu ürünün varyantları var
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Farklı renk, beden veya özelliklerde satılacaksa işaretleyin
            </p>
          </label>
        </div>
      </div>

      {/* Variant System */}
      {hasVariants ? (
        <div className="space-y-6">
          {/* Variant Groups */}
          <VariantGroupManager
            groups={variantGroups}
            selectedOptions={variantOptions}
            onGroupsChange={handleGroupsChange}
            onOptionsChange={handleOptionsChange}
          />

          {/* Variant Matrix */}
          {variantGroups.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <VariantMatrixBuilder
                groups={variantGroups}
                selectedOptions={variantOptions}
                basePrice={basePrice}
                baseSku={baseSku}
                onVariantsGenerated={handleVariantsGenerated}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Varyant sistemi kapalı
          </p>
          <p className="text-sm text-gray-400">
            Ürününüzün varyantları varsa yukarıdaki seçeneği işaretleyin
          </p>
        </div>
      )}
    </div>
  );
}
