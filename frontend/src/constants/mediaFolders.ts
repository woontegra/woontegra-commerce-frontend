export const MEDIA_FOLDERS = [
  { slug: 'all', label: 'Tüm Görseller' },
  { slug: 'general', label: 'Genel' },
  { slug: 'builder', label: 'Vitrin Builder' },
  { slug: 'banners', label: 'Bannerlar' },
  { slug: 'products', label: 'Ürünler' },
  { slug: 'categories', label: 'Kategoriler' },
  { slug: 'brand', label: 'Logo & Marka' },
] as const;

export type MediaFolderSlug = Exclude<(typeof MEDIA_FOLDERS)[number]['slug'], 'all'>;

export const DEFAULT_MEDIA_FOLDER: MediaFolderSlug = 'general';

export const MEDIA_SORT_OPTIONS = [
  { value: 'newest', label: 'En yeni' },
  { value: 'oldest', label: 'En eski' },
  { value: 'name', label: 'Dosya adı' },
  { value: 'size', label: 'Boyut' },
] as const;

export type MediaSortValue = (typeof MEDIA_SORT_OPTIONS)[number]['value'];

export function mediaFolderLabel(slug: string): string {
  const found = MEDIA_FOLDERS.find(f => f.slug === slug);
  return found?.label ?? 'Genel';
}

export function isMediaFolderSlug(value: string): value is MediaFolderSlug {
  return MEDIA_FOLDERS.some(f => f.slug === value && f.slug !== 'all');
}
