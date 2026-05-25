import { useState, useEffect } from 'react';
import { Badge } from '../ui';
import type { ProductVariant } from '../../types';

interface VariantSelectorProps {
  variants: ProductVariant[];
  onSelect: (variant: ProductVariant) => void;
  selectedVariantId?: string;
}

export default function VariantSelector({
  variants,
  onSelect,
  selectedVariantId,
}: VariantSelectorProps) {
  const [selected, setSelected] = useState<ProductVariant | null>(null);

  useEffect(() => {
    if (variants.length > 0 && !selected) {
      const defaultVariant = selectedVariantId
        ? variants.find(v => v.id === selectedVariantId)
        : variants[0];
      if (defaultVariant) {
        setSelected(defaultVariant);
        onSelect(defaultVariant);
      }
    }
  }, [variants, selectedVariantId, selected, onSelect]);

  const handleSelect = (variant: ProductVariant) => {
    setSelected(variant);
    onSelect(variant);
  };

  if (variants.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Varyant Seçin
      </label>
      <div className="grid grid-cols-1 gap-2">
        {variants.map((variant) => {
          const isSelected = selected?.id === variant.id;
          const isOutOfStock = variant.stock === 0;

          return (
            <button
              key={variant.id}
              onClick={() => !isOutOfStock && handleSelect(variant)}
              disabled={isOutOfStock}
              className={`
                relative p-4 rounded-xl border-2 transition-all text-left
                ${isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
                ${isOutOfStock
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {variant.name}
                    </span>
                    {isOutOfStock ? (
                      <Badge variant="danger" size="sm">
                        Stokta Yok
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        {variant.stock} adet
                      </Badge>
                    )}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    ${variant.price}
                  </div>
                </div>
                {isSelected && (
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
