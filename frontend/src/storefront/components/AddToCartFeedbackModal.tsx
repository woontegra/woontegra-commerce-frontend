import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, X } from 'lucide-react';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { formatTry } from '../utils/format';
import type { AddToCartFeedback } from '../hooks/StorefrontCartProvider';

type Props = {
  feedback: AddToCartFeedback;
  itemCount: number;
  subtotal: number;
  onDismiss: () => void;
};

export function AddToCartFeedbackModal({ feedback, itemCount, subtotal, onDismiss }: Props) {
  const { storeLink } = useStorefrontTenant();
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onDismiss]);

  const goToCart = () => {
    onDismiss();
    navigate(storeLink('/store/sepet'));
  };

  return (
    <div className="store-add-to-cart-feedback" role="dialog" aria-modal="true" aria-labelledby="add-to-cart-title">
      <button
        type="button"
        className="store-add-to-cart-feedback-backdrop"
        aria-label="Kapat"
        onClick={onDismiss}
      />
      <div className="store-add-to-cart-feedback-panel">
        <div className="store-add-to-cart-feedback-header">
          <h2 id="add-to-cart-title" className="store-add-to-cart-feedback-title">
            Ürün sepete eklendi
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            className="store-add-to-cart-feedback-close"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="store-add-to-cart-feedback-product">
          <div className="store-add-to-cart-feedback-image">
            {feedback.imageUrl ? (
              <img src={feedback.imageUrl} alt="" />
            ) : (
              <ShoppingBag className="h-7 w-7 opacity-30" strokeWidth={1.25} />
            )}
          </div>
          <div className="store-add-to-cart-feedback-details">
            <p className="store-add-to-cart-feedback-name">{feedback.name}</p>
            <div className="store-add-to-cart-feedback-meta">
              <span>{formatTry(feedback.unitPrice)}</span>
              <span aria-hidden="true">·</span>
              <span>{feedback.quantity} adet</span>
            </div>
            {feedback.listPrice != null && feedback.listPrice > feedback.unitPrice && (
              <p className="store-add-to-cart-feedback-list-price">{formatTry(feedback.listPrice)}</p>
            )}
          </div>
        </div>

        <div className="store-add-to-cart-feedback-summary">
          <span>Sepet ({itemCount} ürün)</span>
          <strong>{formatTry(subtotal)}</strong>
        </div>

        <div className="store-add-to-cart-feedback-actions">
          <button type="button" onClick={goToCart} className="store-add-to-cart-feedback-primary">
            Sepete Git
          </button>
          <button type="button" onClick={onDismiss} className="store-add-to-cart-feedback-secondary">
            Alışverişe Devam Et
          </button>
        </div>
      </div>
    </div>
  );
}
