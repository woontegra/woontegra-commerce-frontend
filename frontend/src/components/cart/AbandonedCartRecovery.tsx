import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { abandonedCartTrackingService } from '../../services/abandonedCartTracking.service';
import type { AbandonedCart } from '../../types/abandonedCart';

interface AbandonedCartRecoveryProps {
  onRecover: (cart: AbandonedCart) => void;
}

export default function AbandonedCartRecovery({ onRecover }: AbandonedCartRecoveryProps) {
  const [searchParams] = useSearchParams();
  const [recoveredCart, setRecoveredCart] = useState<AbandonedCart | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const recoverId = searchParams.get('recover');
    
    if (recoverId) {
      const cart = abandonedCartTrackingService.getById(recoverId);
      
      if (cart && cart.status === 'active') {
        setRecoveredCart(cart);
        setShowBanner(true);
        
        // Auto-recover after 2 seconds
        setTimeout(() => {
          handleRecover(cart);
        }, 2000);
      }
    }
  }, [searchParams]);

  const handleRecover = async (cart: AbandonedCart) => {
    await abandonedCartTrackingService.recoverCart(cart.id);
    onRecover(cart);
    setShowBanner(false);
  };

  if (!showBanner || !recoveredCart) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg mb-6 animate-slide-up">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">
            Sepetiniz Sizi Bekliyor! 🎉
          </h3>
          <p className="text-sm opacity-90 mb-3">
            {recoveredCart.cartData.items.length} ürün sepetinizde kaldı. Alışverişinizi tamamlamak ister misiniz?
          </p>
          
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="opacity-75">Toplam:</span>
              <span className="font-bold ml-2">₺{recoveredCart.cartData.total.toFixed(2)}</span>
            </div>
            
            <button
              onClick={() => handleRecover(recoveredCart)}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Sepeti Geri Yükle
            </button>
            
            <button
              onClick={() => setShowBanner(false)}
              className="text-white/80 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
