import { Link } from 'react-router-dom';
import type { StorefrontProductSummary } from '../types/storefront.types';
import { useStorefrontCartOptional } from '../hooks/StorefrontCartProvider';
import { effectivePrice, formatTry } from '../utils/format';
import { ProductFavoriteButton } from './ProductFavoriteButton';

type Props = {
  product: StorefrontProductSummary;
  productUrl: string;
  hideAddToCart?: boolean;
  hidePrice?: boolean;
  variant?: 'card' | 'plain';
  /** Builder önizlemesi — sepet/favori provider gerektirmez */
  preview?: boolean;
};

export function ProductCard({
  product,
  productUrl,
  hideAddToCart,
  hidePrice,
  variant = 'card',
  preview = false,
}: Props) {
  const cart = useStorefrontCartOptional();
  const sale = effectivePrice(product.price, product.discountPrice);
  const hasDiscount =
    product.discountPrice != null && product.discountPrice > 0 && product.discountPrice < product.price;
  const inStock = product.stock == null || product.stock > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || !product.id || !cart) return;
    cart.addLine({
      productId: product.id,
      unitPrice: sale,
      listPrice: hasDiscount ? product.price : undefined,
      name:      product.name,
      slug:      product.slug,
      imageUrl:  product.image,
      maxStock:  product.stock,
      quantity:  1,
    });
  };

  return (
    <article
      className={`store-product-card group flex flex-col bg-white overflow-hidden transition-shadow ${
        variant === 'plain' ? 'border border-transparent' : 'border border-slate-200 hover:shadow-md'
      }`}
    >
      <Link to={productUrl} className="block">
        <div className="aspect-square bg-slate-100 relative">
          {product.id && !preview && (
            <div className="absolute top-2 right-2 z-10">
              <ProductFavoriteButton productId={product.id} />
            </div>
          )}
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
              Görsel yok
            </div>
          )}
          {!inStock && (
            <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-slate-800/80 text-white px-2 py-0.5 rounded">
              Stokta yok
            </span>
          )}
        </div>
      </Link>
      <div className="p-3 flex flex-col flex-1 gap-2">
        <Link
          to={productUrl}
          className="font-medium store-text-body text-sm line-clamp-2 hover:opacity-80"
        >
          {product.name || 'Ürün'}
        </Link>
        {!hidePrice && (
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="store-text-primary font-semibold text-sm">{formatTry(sale)}</span>
            {hasDiscount && (
              <span className="text-slate-400 text-xs line-through">{formatTry(product.price)}</span>
            )}
          </div>
        )}
        {!hideAddToCart && (
          <button
            type="button"
            disabled={!inStock}
            onClick={handleAddToCart}
            className="store-btn-primary mt-auto w-full py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inStock ? 'Sepete ekle' : 'Stokta yok'}
          </button>
        )}
      </div>
    </article>
  );
}
