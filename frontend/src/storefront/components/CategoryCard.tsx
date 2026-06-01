import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import type { StorefrontCategory } from '../../contexts/StorefrontTenantContext';
import { normalizeImageUrl } from '../../utils/imageUtils';

type Props = {
  category: StorefrontCategory;
  url: string;
};

export function CategoryCard({ category, url }: Props) {
  const imageSrc = normalizeImageUrl(category.imageUrl);

  return (
    <Link to={url} className="store-category-card group">
      {imageSrc ? (
        <div className="store-category-card-media">
          <img src={imageSrc} alt={category.name} loading="lazy" />
          <div className="store-category-card-overlay">
            <span className="store-category-card-label">{category.name}</span>
            <span className="store-category-card-cta">Keşfet →</span>
          </div>
        </div>
      ) : (
        <div className="store-category-card-placeholder">
          <div className="store-category-card-placeholder-icon">
            <Sparkles className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <span className="store-category-card-placeholder-name">{category.name}</span>
          <span className="store-category-card-placeholder-cta">Keşfet</span>
        </div>
      )}
    </Link>
  );
}
