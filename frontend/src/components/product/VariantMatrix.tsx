import { useState, useMemo } from 'react';
import type { VariantOption, ProductVariant } from '../../types/product';
import Button from '../ui/Button';

interface VariantMatrixProps {
  options: VariantOption[];
  onOptionsChange: (options: VariantOption[]) => void;
  onVariantsGenerated: (variants: ProductVariant[]) => void;
}

export default function VariantMatrix({ options, onOptionsChange, onVariantsGenerated }: VariantMatrixProps) {
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValues, setNewOptionValues] = useState('');

  // Generate all combinations
  const generateVariants = () => {
    if (options.length === 0) return [];

    const combinations: Record<string, string>[] = [];
    
    const generate = (index: number, current: Record<string, string>) => {
      if (index === options.length) {
        combinations.push({ ...current });
        return;
      }

      const option = options[index];
      option.values.forEach(value => {
        current[option.name] = value;
        generate(index + 1, current);
      });
    };

    generate(0, {});

    const variants: ProductVariant[] = combinations.map((combo, idx) => ({
      id: `variant-${idx}`,
      sku: Object.values(combo).join('-').toUpperCase(),
      combination: combo,
      price: 0,
      stock: 0,
      isActive: true,
    }));

    return variants;
  };

  const handleAddOption = () => {
    if (!newOptionName || !newOptionValues) return;

    const values = newOptionValues.split(',').map(v => v.trim()).filter(Boolean);
    if (values.length === 0) return;

    const newOption: VariantOption = {
      id: `option-${Date.now()}`,
      name: newOptionName,
      values,
    };

    onOptionsChange([...options, newOption]);
    setNewOptionName('');
    setNewOptionValues('');
  };

  const handleRemoveOption = (optionId: string) => {
    onOptionsChange(options.filter(o => o.id !== optionId));
  };

  const handleGenerateVariants = () => {
    const variants = generateVariants();
    onVariantsGenerated(variants);
  };

  const totalCombinations = useMemo(() => {
    return options.reduce((acc, opt) => acc * opt.values.length, 1);
  }, [options]);

  return (
    <div className="space-y-6">
      {/* Add Option */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Varyant Seçenekleri Ekle
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Seçenek Adı
            </label>
            <input
              type="text"
              value={newOptionName}
              onChange={(e) => setNewOptionName(e.target.value)}
              placeholder="Örn: Renk, Beden"
              className="input-standard w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Değerler (virgülle ayırın)
            </label>
            <input
              type="text"
              value={newOptionValues}
              onChange={(e) => setNewOptionValues(e.target.value)}
              placeholder="Örn: Kırmızı, Mavi, Yeşil"
              className="input-standard w-full"
            />
          </div>
          
          <div className="flex items-end">
            <Button onClick={handleAddOption} className="w-full">
              Seçenek Ekle
            </Button>
          </div>
        </div>
      </div>

      {/* Current Options */}
      {options.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Mevcut Seçenekler
          </h3>
          
          {options.map(option => (
            <div key={option.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {option.name}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {option.values.map((value, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveOption(option.id)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Generate Button */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Toplam {totalCombinations} varyant oluşturulacak
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Her kombinasyon için fiyat ve stok bilgisi girebileceksiniz
                </p>
              </div>
              <Button onClick={handleGenerateVariants}>
                Varyantları Oluştur
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
