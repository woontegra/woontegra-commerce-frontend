import { useState } from 'react';
import type { VariantGroup, VariantOption, VariantCombination } from '../../types/variant';
import { variantGeneratorService } from '../../services/variantGenerator.service';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface VariantMatrixBuilderProps {
  groups: VariantGroup[];
  selectedOptions: Record<string, VariantOption[]>;
  basePrice: number;
  baseSku: string;
  onVariantsGenerated: (variants: VariantCombination[]) => void;
}

export default function VariantMatrixBuilder({
  groups,
  selectedOptions,
  basePrice,
  baseSku,
  onVariantsGenerated,
}: VariantMatrixBuilderProps) {
  const [combinations, setCombinations] = useState<VariantCombination[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);

  const combinationCount = variantGeneratorService.calculateCombinationCount(selectedOptions);

  const handleGenerate = () => {
    // Validate
    const validation = variantGeneratorService.validateConfiguration(groups, selectedOptions);
    if (!validation.valid) {
      toast.error(validation.error || 'Geçersiz konfigürasyon');
      return;
    }

    // Generate combinations
    const generated = variantGeneratorService.generateCombinations(
      groups,
      selectedOptions,
      basePrice,
      baseSku
    );

    setCombinations(generated);
    setIsGenerated(true);
    toast.success(`${generated.length} varyant oluşturuldu!`);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...combinations];
    updated[index].price = price;
    setCombinations(updated);
  };

  const handleStockChange = (index: number, stock: number) => {
    const updated = [...combinations];
    updated[index].stock = stock;
    setCombinations(updated);
  };

  const handleSave = () => {
    onVariantsGenerated(combinations);
    toast.success('Varyantlar kaydedildi!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Varyant Matrisi
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {combinationCount > 0 ? `${combinationCount} kombinasyon oluşturulacak` : 'Varyant grupları ekleyin'}
          </p>
        </div>

        {!isGenerated && combinationCount > 0 && (
          <Button onClick={handleGenerate} className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Varyantları Oluştur
          </Button>
        )}
      </div>

      {/* Preview */}
      {!isGenerated && combinationCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Oluşturulacak Kombinasyonlar
              </h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {groups.map(group => {
                  const options = selectedOptions[group.id] || [];
                  return (
                    <div key={group.id}>
                      <strong>{group.name}:</strong> {options.map(o => o.value).join(', ')}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Combinations Table */}
      {isGenerated && combinations.length > 0 && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Varyant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Fiyat
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Stok
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {combinations.map((combo, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(combo.options).map(([key, value]) => (
                          <span
                            key={key}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {combo.sku}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={combo.price}
                        onChange={(e) => handlePriceChange(index, Number(e.target.value))}
                        className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={combo.stock}
                        onChange={(e) => handleStockChange(index, Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={() => setIsGenerated(false)} variant="secondary">
              Yeniden Oluştur
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Varyantları Kaydet
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isGenerated && combinationCount === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Varyant matrisi oluşturmak için önce varyant grupları ekleyin
          </p>
          <p className="text-sm text-gray-400">
            Örnek: Renk (Kırmızı, Mavi) + Beden (S, M, L) = 6 varyant
          </p>
        </div>
      )}
    </div>
  );
}
