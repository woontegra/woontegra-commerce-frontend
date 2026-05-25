import { Heart } from 'lucide-react';
import { useStorefrontFavorites } from '../hooks/StorefrontFavoritesProvider';

type Props = {
  productId: string;
  className?: string;
  size?: 'sm' | 'md';
};

export function ProductFavoriteButton({ productId, className = '', size = 'sm' }: Props) {
  const { isFavorite, toggleFavorite } = useStorefrontFavorites();
  const active = isFavorite(productId);
  const iconSize = size === 'md' ? 'h-6 w-6' : 'h-5 w-5';
  const pad = size === 'md' ? 'p-2.5' : 'p-2';

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleFavorite(productId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? 'Favorilerden kaldır' : 'Favorilere ekle'}
      title={active ? 'Favorilerden kaldır' : 'Favorilere ekle'}
      className={`${pad} rounded-full bg-white/90 shadow border border-slate-200 hover:bg-white transition-colors ${className}`}
    >
      <Heart
        className={`${iconSize} ${active ? 'fill-red-500 text-red-500' : 'text-slate-500'}`}
      />
    </button>
  );
}
