import { api, extractErrorMessage } from './apiClient';
import { mediaAssetUrl, uploadMediaAsset } from './media.service';
import type { MediaFolderSlug } from '../constants/mediaFolders';

const LOGO_MAX_BYTES    = 2 * 1024 * 1024;
const FAVICON_MAX_BYTES = 1024 * 1024;
export const BUILDER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const LOGO_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

const FAVICON_MIME = new Set([
  'image/png',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const BUILDER_IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg']);
const BUILDER_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function isBuilderImageUploadAvailable(): boolean {
  return true;
}

export function validateBuilderImageFile(file: File, maxSizeMb = 5): string | null {
  const ext = extOf(file.name);
  const okExt = BUILDER_IMAGE_EXT.has(ext);
  const okMime = BUILDER_IMAGE_MIME.has(file.type) || (file.type === '' && okExt);
  if (!okMime) return 'Bu görsel formatı desteklenmiyor.';
  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) return 'Görsel dosyası en fazla 5 MB olabilir.';
  return null;
}

export async function uploadBuilderImage(
  file: File,
  folder: MediaFolderSlug = 'builder',
): Promise<string> {
  const err = validateBuilderImageFile(file);
  if (err) throw new Error(err);
  if (!isBuilderImageUploadAvailable()) {
    throw new Error('Bilgisayardan yükleme için medya altyapısı gerekli.');
  }
  try {
    const asset = await uploadMediaAsset(file, folder);
    return mediaAssetUrl(asset);
  } catch (e: unknown) {
    throw new Error(extractErrorMessage(e, 'Görsel yüklenemedi.'));
  }
}

export function validateLogoFile(file: File): string | null {
  const ext = extOf(file.name);
  const okExt = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext);
  const okMime = LOGO_MIME.has(file.type) || (file.type === '' && okExt);
  if (!okMime) return 'Bu dosya formatı desteklenmiyor. PNG, JPG, WEBP veya SVG yükleyin.';
  if (file.size > LOGO_MAX_BYTES) return 'Logo dosyası çok büyük. Maksimum 2 MB.';
  return null;
}

export function validateFaviconFile(file: File): string | null {
  const ext = extOf(file.name);
  const okExt = ['ico', 'png', 'svg'].includes(ext);
  const okMime = FAVICON_MIME.has(file.type) || (file.type === '' && okExt);
  if (!okMime) return 'Favicon için PNG, ICO veya SVG yükleyin.';
  if (file.size > FAVICON_MAX_BYTES) return 'Favicon dosyası çok büyük. Maksimum 1 MB.';
  return null;
}

async function postSettingsFile(endpoint: '/settings/logo' | '/settings/favicon', file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post(endpoint, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    skipErrorToast: true,
  });
  const url = (res.data as { url?: string; data?: { url?: string } }).url
    ?? (res.data as { data?: { url?: string } }).data?.url;
  if (!url || typeof url !== 'string') {
    throw new Error('Sunucu geçerli bir URL döndürmedi.');
  }
  return url;
}

export async function uploadStoreLogo(file: File): Promise<string> {
  const err = validateLogoFile(file);
  if (err) throw new Error(err);
  try {
    return await postSettingsFile('/settings/logo', file);
  } catch (e: unknown) {
    throw new Error(extractErrorMessage(e, 'Logo yüklenemedi.'));
  }
}

export async function uploadStoreFavicon(file: File): Promise<string> {
  const err = validateFaviconFile(file);
  if (err) throw new Error(err);
  try {
    return await postSettingsFile('/settings/favicon', file);
  } catch (e: unknown) {
    throw new Error(extractErrorMessage(e, 'Favicon yüklenemedi.'));
  }
}
