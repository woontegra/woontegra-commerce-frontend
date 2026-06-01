import { GitCompare } from 'lucide-react';
import type { StorefrontProductSummary } from '../types/storefront.types';
import { useStorefrontCompareOptional } from '../hooks/StorefrontCompareProvider';

type Props = {
  product: StorefrontProductSummary;
  className?: string;
};

export function ProductCompareButton({ product, className = '' }: Props) {
  const compare = useStorefrontCompareOptional();
  if (!compare || !product.id) return null;

  const active = compare.isInCompare(product.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    compare.toggleCompare(product);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? 'Karşılaştırmadan kaldır' : 'Karşılaştırmaya ekle'}
      title={active ? 'Karşılaştırmadan kaldır' : 'Karşılaştırmaya ekle'}
      aria-pressed={active}
      className={`store-product-card-action-btn ${active ? 'is-active' : ''} ${className}`.trim()}
    >
      <GitCompare className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
