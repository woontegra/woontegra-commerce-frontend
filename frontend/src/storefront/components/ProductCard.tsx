import { Link } from 'react-router-dom';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import type { StorefrontProductSummary } from '../types/storefront.types';
import { useStorefrontCartOptional } from '../hooks/StorefrontCartProvider';
import { useStorefrontQuickViewOptional } from '../hooks/StorefrontQuickViewProvider';
import { effectivePrice, formatTry } from '../utils/format';
import { ProductFavoriteButton } from './ProductFavoriteButton';
import { ProductCompareButton } from './ProductCompareButton';
import { ProductQuickViewButton } from './ProductQuickViewButton';

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
  const quickView = useStorefrontQuickViewOptional();
  const sale = effectivePrice(product.price, product.discountPrice);
  const hasDiscount =
    product.discountPrice != null && product.discountPrice > 0 && product.discountPrice < product.price;
  const inStock = product.stock == null || product.stock > 0;
  const discountPct = hasDiscount
    ? Math.round(((product.price - sale) / product.price) * 100)
    : 0;
  const categoryName = product.category?.name?.trim();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || !product.id || !cart) return;

    cart.addLine({
      productId: product.id,
      unitPrice: sale,
      listPrice: hasDiscount ? product.price : undefined,
      name: product.name,
      slug: product.slug,
      imageUrl: product.image,
      maxStock: product.stock,
      quantity: 1,
    });
  };

  const cardCls =
    variant === 'plain'
      ? 'store-product-card group flex flex-col overflow-hidden border border-transparent shadow-none hover:shadow-none hover:transform-none'
      : 'store-product-card group flex flex-col overflow-hidden h-full';

  return (
    <article className={cardCls}>
      <Link to={productUrl} className="block">
        <div className="store-product-card-media store-product-card-image relative">
          {product.id && !preview && (
            <div className="store-product-card-actions">
              <ProductFavoriteButton productId={product.id} />
              <ProductCompareButton product={product} className="store-product-card-action-btn--compare" />
              <ProductQuickViewButton
                className="store-product-card-action-btn--quickview"
                onClick={() => quickView?.openQuickView(product, productUrl)}
              />
            </div>
          )}
          {hasDiscount && inStock && (
            <span className="store-product-discount-badge absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full">
              -{discountPct}%
            </span>
          )}
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center store-text-muted gap-2">
              <ShoppingBag className="w-8 h-8 opacity-30" strokeWidth={1.25} />
              <span className="text-xs">Görsel yok</span>
            </div>
          )}
          {!inStock && (
            <div className="store-product-out-of-stock">
              <span>Tükendi</span>
            </div>
          )}
        </div>
      </Link>
      <div className="store-product-card-body">
        {categoryName && <p className="store-product-card-meta truncate">{categoryName}</p>}
        <Link
          to={productUrl}
          className="store-product-card-title store-text-body hover:opacity-75 transition-opacity"
        >
          {product.name || 'Ürün'}
        </Link>
        {!hidePrice && (
          <div className="store-product-card-price-row">
            <span className="store-product-card-price">{formatTry(sale)}</span>
            {hasDiscount && (
              <span className="store-product-card-price-old">{formatTry(product.price)}</span>
            )}
          </div>
        )}
        {!hideAddToCart && (
          <button
            type="button"
            disabled={!inStock}
            onClick={handleAddToCart}
            className="store-btn-add-to-cart"
          >
            <ShoppingCart className="w-4 h-4" strokeWidth={2} />
            {inStock ? 'Sepete ekle' : 'Stokta yok'}
          </button>
        )}
      </div>
    </article>
  );
}
