import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { GitCompare, Heart, ShoppingBag, ShoppingCart, X } from 'lucide-react';
import type {
  StorefrontProductDetail,
  StorefrontProductSummary,
  StorefrontProductVariant,
} from '../types/storefront.types';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { useStorefrontCartOptional } from '../hooks/StorefrontCartProvider';
import { useStorefrontFavorites } from '../hooks/StorefrontFavoritesProvider';
import { useStorefrontCompareOptional } from '../hooks/StorefrontCompareProvider';
import { fetchStorefrontProductBySlug } from '../services/storefrontApi';
import { effectivePrice, formatTry } from '../utils/format';
import { stripHtml } from '../utils/productQuickViewHelpers';

type Props = {
  product: StorefrontProductSummary;
  productUrl: string;
  onClose: () => void;
};

function resolveVariantStock(variant: StorefrontProductVariant | null, productStock?: number) {
  if (variant?.stock != null) return variant.stock;
  return productStock;
}

export function ProductQuickViewModal({ product, productUrl, onClose }: Props) {
  const { tenant } = useStorefrontTenant();
  const cart = useStorefrontCartOptional();
  const { isFavorite, toggleFavorite } = useStorefrontFavorites();
  const compare = useStorefrontCompareOptional();

  const [detail, setDetail] = useState<StorefrontProductDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [detailError, setDetailError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (!tenant?.slug || !product.slug) {
      setLoadingDetail(false);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setDetailError(false);
    setDetail(null);
    setQty(1);
    fetchStorefrontProductBySlug(tenant.slug, product.slug)
      .then(data => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetailError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenant?.slug, product.slug, product.id]);

  const variants = detail?.variants ?? [];
  const selectedVariant = useMemo(
    () => variants.find(v => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  );

  useEffect(() => {
    if (variants.length === 0) {
      setSelectedVariantId('');
      return;
    }
    setSelectedVariantId(prev => (prev && variants.some(v => v.id === prev) ? prev : variants[0].id));
  }, [variants]);

  const images = useMemo(() => {
    const fromDetail = detail?.images ?? [];
    if (fromDetail.length > 0) return fromDetail;
    return product.image ? [product.image] : [];
  }, [detail?.images, product.image]);

  useEffect(() => {
    setActiveImage(0);
  }, [images.length, product.id]);

  const basePrice = selectedVariant?.price ?? detail?.price ?? product.price;
  const baseDiscount =
    selectedVariant?.discountPrice ?? detail?.discountPrice ?? product.discountPrice ?? null;
  const sale = effectivePrice(basePrice, baseDiscount);
  const hasDiscount = baseDiscount != null && baseDiscount > 0 && baseDiscount < basePrice;
  const stock = resolveVariantStock(selectedVariant, detail?.stock ?? product.stock);
  const inStock = stock == null || stock > 0;
  const maxQty = stock != null && stock > 0 ? stock : 99;
  const favoriteActive = isFavorite(product.id);
  const compareActive = compare?.isInCompare(product.id) ?? false;
  const descriptionPlain = stripHtml(detail?.description ?? '');
  const displayName = detail?.name || product.name || 'Ürün';
  const categoryName = detail?.category?.name ?? product.category?.name;
  const mainImage = images[activeImage] ?? images[0] ?? product.image;

  const handleAddToCart = () => {
    if (!inStock || !product.id || !cart) return;
    if (variants.length > 0 && !selectedVariant) return;

    const variantLabel = selectedVariant ? ` — ${selectedVariant.name}` : '';
    const ok = cart.addLine({
      productId: product.id,
      variantId: selectedVariant?.id,
      unitPrice: sale,
      listPrice: hasDiscount ? basePrice : undefined,
      name: `${displayName}${variantLabel}`,
      slug: product.slug,
      imageUrl: selectedVariant?.image ?? mainImage ?? product.image,
      maxStock: stock,
      quantity: qty,
    });
    if (ok) onClose();
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    await toggleFavorite(product.id);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    compare?.toggleCompare(product);
  };

  const modal = (
    <div
      className="store-quick-view"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-quick-view-title"
    >
      <button type="button" className="store-quick-view-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="store-quick-view-panel">
        <div className="store-quick-view-header">
          <h2 id="store-quick-view-title" className="store-quick-view-title">
            Hızlı Görünüm
          </h2>
          <button type="button" className="store-quick-view-close" aria-label="Kapat" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="store-quick-view-body">
          <div className="store-quick-view-gallery">
            <div className="store-quick-view-main-image">
              {mainImage ? (
                <img src={mainImage} alt={displayName} />
              ) : (
                <div className="store-quick-view-image-empty">
                  <ShoppingBag className="h-10 w-10 opacity-30" strokeWidth={1.25} />
                  <span>Görsel yok</span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="store-quick-view-thumbs">
                {images.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    className={`store-quick-view-thumb ${index === activeImage ? 'is-active' : ''}`}
                    onClick={() => setActiveImage(index)}
                    aria-label={`Görsel ${index + 1}`}
                  >
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="store-quick-view-content">
            <div className="store-quick-view-content-scroll">
              {categoryName && <p className="store-quick-view-meta">{categoryName}</p>}
              <h3 className="store-quick-view-product-name">{displayName}</h3>

              <div className="store-quick-view-price-row">
                <span className="store-quick-view-price">{formatTry(sale)}</span>
                {hasDiscount && (
                  <span className="store-quick-view-price-old">{formatTry(basePrice)}</span>
                )}
              </div>

              <p className={`store-quick-view-stock ${inStock ? 'is-in-stock' : 'is-out-of-stock'}`}>
                {inStock ? 'Stokta' : 'Stokta yok'}
                {stock != null && inStock ? ` (${stock} adet)` : ''}
              </p>

              {loadingDetail ? (
                <p className="store-quick-view-muted">Ürün bilgileri yükleniyor…</p>
              ) : descriptionPlain ? (
                <div className="store-quick-view-description-box">
                  <p className="store-quick-view-description">{descriptionPlain}</p>
                </div>
              ) : detailError ? (
                <p className="store-quick-view-muted">Açıklama yüklenemedi.</p>
              ) : (
                <p className="store-quick-view-muted">Bu ürün için kısa açıklama bulunmuyor.</p>
              )}

              {variants.length > 0 && (
                <div className="store-quick-view-field">
                  <label htmlFor="quick-view-variant">Varyant</label>
                  <select
                    id="quick-view-variant"
                    value={selectedVariantId}
                    onChange={e => setSelectedVariantId(e.target.value)}
                    disabled={!inStock}
                  >
                    {variants.map(variant => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="store-quick-view-field store-quick-view-qty-row">
                <label htmlFor="quick-view-qty">Adet</label>
                <input
                  id="quick-view-qty"
                  type="number"
                  min={1}
                  max={maxQty}
                  value={qty}
                  onChange={e => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
                  disabled={!inStock}
                />
              </div>
            </div>

            <div className="store-quick-view-actions">
              <div className="store-quick-view-primary-actions">
                <button
                  type="button"
                  className="store-quick-view-add-to-cart"
                  disabled={!inStock || !cart || (variants.length > 0 && !selectedVariant)}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-4 w-4" strokeWidth={2} />
                  {inStock ? 'Sepete ekle' : 'Stokta yok'}
                </button>
                <Link to={productUrl} className="store-quick-view-detail-link" onClick={onClose}>
                  Ürün detayına git
                </Link>
              </div>

              <div className="store-quick-view-secondary-actions">
                <button
                  type="button"
                  className={`store-quick-view-secondary-btn ${favoriteActive ? 'is-active' : ''}`}
                  onClick={handleFavorite}
                >
                  <Heart className={`h-4 w-4 ${favoriteActive ? 'fill-red-500 text-red-500' : ''}`} />
                  {favoriteActive ? 'Favorilerden kaldır' : 'Favorilere ekle'}
                </button>
                {compare && (
                  <button
                    type="button"
                    className={`store-quick-view-secondary-btn ${compareActive ? 'is-active' : ''}`}
                    onClick={handleCompare}
                  >
                    <GitCompare className="h-4 w-4" />
                    {compareActive ? 'Karşılaştırmadan kaldır' : 'Karşılaştırmaya ekle'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
