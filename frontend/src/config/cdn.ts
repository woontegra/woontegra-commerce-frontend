/**
 * CDN Configuration
 */
export const cdnConfig = {
  enabled: import.meta.env.VITE_CDN_ENABLED === 'true',
  baseUrl: import.meta.env.VITE_CDN_BASE_URL || '',
};

/**
 * Get asset URL (CDN or local)
 */
export function getAssetUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;

  if (cdnConfig.enabled && cdnConfig.baseUrl) {
    // CDN URL
    return `${cdnConfig.baseUrl}/${cleanPath}`;
  }

  // Local URL (API server)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return `${apiUrl}/${cleanPath}`;
}

/**
 * Get upload URL
 */
export function getUploadUrl(filename: string, category: string = 'general'): string {
  const path = `uploads/${category}/${filename}`;
  return getAssetUrl(path);
}

/**
 * Get image URL with size variant
 */
export function getImageUrl(
  filename: string,
  size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium',
  category: string = 'general'
): string {
  if (size === 'original') {
    return getUploadUrl(filename, category);
  }

  const ext = filename.substring(filename.lastIndexOf('.'));
  const base = filename.substring(0, filename.lastIndexOf('.'));
  const sizedFilename = `${base}-${size}${ext}`;

  return getUploadUrl(sizedFilename, category);
}

/**
 * Get WebP URL
 */
export function getWebPUrl(
  filename: string,
  size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium',
  category: string = 'general'
): string {
  const base = filename.substring(0, filename.lastIndexOf('.'));
  const sizePrefix = size === 'original' ? '' : `-${size}`;
  const webpFilename = `${base}${sizePrefix}.webp`;

  return getUploadUrl(webpFilename, category);
}

/**
 * Check if CDN is enabled
 */
export function isCDNEnabled(): boolean {
  return cdnConfig.enabled;
}
