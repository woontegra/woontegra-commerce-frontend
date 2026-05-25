import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../hooks/useWishlist';

interface WishlistButtonProps {
  productId: string;
  variantId?: string;
  className?: string;
  showText?: boolean;
}

const WishlistButton: React.FC<WishlistButtonProps> = ({
  productId,
  variantId,
  className = '',
  showText = false,
}) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isLoading, setIsLoading] = useState(false);
  const inWishlist = isInWishlist(productId, variantId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    await toggleWishlist(productId, variantId);
    setIsLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        flex items-center justify-center gap-2 transition-all
        ${inWishlist 
          ? 'text-red-600 hover:text-red-700' 
          : 'text-gray-400 hover:text-red-600'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      title={inWishlist ? 'Favorilerden Kaldır' : 'Favorilere Ekle'}
    >
      <Heart
        className={`w-6 h-6 transition-all ${
          inWishlist ? 'fill-red-600' : 'fill-none'
        }`}
      />
      {showText && (
        <span className="text-sm font-medium">
          {inWishlist ? 'Favorilerde' : 'Favorilere Ekle'}
        </span>
      )}
    </button>
  );
};

export default WishlistButton;
