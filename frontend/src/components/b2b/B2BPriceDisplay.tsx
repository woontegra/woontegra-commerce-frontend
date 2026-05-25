import { useB2BPricing } from '../../hooks/useB2BPricing';
import type { ProductVariant } from '../../types/product';

interface B2BPriceDisplayProps {
  variant: ProductVariant;
  quantity?: number;
  className?: string;
}

export default function B2BPriceDisplay({ variant, quantity = 1, className = '' }: B2BPriceDisplayProps) {
  const { calculatePrice, formatPrice, getPricingLabel, getPricingColor } = useB2BPricing();
  
  const pricing = calculatePrice(
    variant.price || 0,
    variant.wholesalePrice,
    variant.groupPrices
  );

  const totalPrice = pricing.finalPrice * quantity;
  const originalTotalPrice = pricing.originalPrice * quantity;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Pricing Badge */}
      {pricing.pricingType !== 'regular' && (
        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
          {getPricingLabel(pricing.pricingType)}
        </span>
      )}

      {/* Price Display */}
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${getPricingColor(pricing.pricingType)}`}>
          {formatPrice(totalPrice)}
        </span>
        
        {pricing.discountAmount > 0 && (
          <>
            <span className="text-lg text-gray-500 line-through">
              {formatPrice(originalTotalPrice)}
            </span>
            
            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-sm font-medium rounded">
              %{pricing.discountPercentage.toFixed(0)} İndirim
            </span>
          </>
        )}
      </div>

      {/* Quantity Info */}
      {quantity > 1 && (
        <p className="text-sm text-gray-600">
          {quantity} adet × {formatPrice(pricing.finalPrice)}
        </p>
      )}

      {/* Customer Group Info */}
      {pricing.customerGroup && (
        <p className="text-xs text-blue-600">
          {pricing.customerGroup.name} fiyatı görüyorsunuz
        </p>
      )}

      {/* Pricing Details */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Normal Fiyat: {formatPrice(pricing.originalPrice)}</div>
        {variant.wholesalePrice && (
          <div>Toptan Fiyat: {formatPrice(variant.wholesalePrice)}</div>
        )}
        {variant.groupPrices && Object.entries(variant.groupPrices).map(([groupId, price]) => {
          // This would need group name lookup in a real implementation
          return <div key={groupId}>Grup Fiyatı: {formatPrice(price)}</div>;
        })}
      </div>
    </div>
  );
}
