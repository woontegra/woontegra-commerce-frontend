import { useState } from 'react';
import { getAssetUrl } from '../config/cdn';

interface OptimizedImageProps {
  src: string;
  alt: string;
  size?: 'thumbnail' | 'medium' | 'large' | 'original';
  className?: string;
  width?: number;
  height?: number;
}

export function OptimizedImage({
  src,
  alt,
  size = 'medium',
  className = '',
  width,
  height,
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get size-specific URL
  const getSizedUrl = (url: string, size: string): string => {
    if (size === 'original') return getAssetUrl(url);
    
    const ext = url.substring(url.lastIndexOf('.'));
    const base = url.substring(0, url.lastIndexOf('.'));
    
    return getAssetUrl(`${base}-${size}${ext}`);
  };

  // Get WebP URL
  const getWebPUrl = (url: string): string => {
    const base = url.substring(0, url.lastIndexOf('.'));
    return getAssetUrl(`${base}.webp`);
  };

  const sizedUrl = getSizedUrl(src, size);
  const webpUrl = getWebPUrl(src);

  if (imageError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-400">Image not found</span>
      </div>
    );
  }

  return (
    <picture>
      {/* WebP source */}
      <source srcSet={webpUrl} type="image/webp" />
      
      {/* Fallback to original format */}
      <img
        src={sizedUrl}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setIsLoading(false)}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    </picture>
  );
}

// Responsive image with multiple sizes
interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ResponsiveImage({ src, alt, className = '' }: ResponsiveImageProps) {
  const [imageError, setImageError] = useState(false);

  const getSizedUrl = (url: string, size: string): string => {
    const ext = url.substring(url.lastIndexOf('.'));
    const base = url.substring(0, url.lastIndexOf('.'));
    return getAssetUrl(`${base}-${size}${ext}`);
  };

  const getWebPUrl = (url: string): string => {
    const base = url.substring(0, url.lastIndexOf('.'));
    return getAssetUrl(`${base}.webp`);
  };

  if (imageError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-400">Image not found</span>
      </div>
    );
  }

  return (
    <picture>
      {/* WebP sources for different screen sizes */}
      <source
        media="(max-width: 640px)"
        srcSet={getWebPUrl(getSizedUrl(src, 'thumbnail'))}
        type="image/webp"
      />
      <source
        media="(max-width: 1024px)"
        srcSet={getWebPUrl(getSizedUrl(src, 'medium'))}
        type="image/webp"
      />
      <source
        srcSet={getWebPUrl(getSizedUrl(src, 'large'))}
        type="image/webp"
      />

      {/* Fallback sources */}
      <source
        media="(max-width: 640px)"
        srcSet={getSizedUrl(src, 'thumbnail')}
      />
      <source
        media="(max-width: 1024px)"
        srcSet={getSizedUrl(src, 'medium')}
      />

      <img
        src={getSizedUrl(src, 'large')}
        alt={alt}
        className={className}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    </picture>
  );
}
