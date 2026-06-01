import api, { extractErrorMessage } from './apiClient';

export type MediaAsset = {
  id: string;
  tenantId: string;
  url: string;
  secureUrl: string | null;
  publicId: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  type: string;
  createdAt: string;
  updatedAt: string;
};

type MediaListResponse = {
  success?: boolean;
  assets?: MediaAsset[];
  total?: number;
};

type MediaUploadResponse = {
  success?: boolean;
  url?: string;
  asset?: MediaAsset;
  message?: string;
};

export async function fetchMediaAssets(limit = 200): Promise<{ assets: MediaAsset[]; total: number }> {
  try {
    const r = await api.get<MediaListResponse>('/media', {
      params: { limit },
      skipErrorToast: true,
    });
    const root = r.data ?? {};
    return {
      assets: Array.isArray(root.assets) ? root.assets : [],
      total: typeof root.total === 'number' ? root.total : 0,
    };
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err, 'Medya dosyaları yüklenemedi.'));
  }
}

export async function uploadMediaAsset(file: File): Promise<MediaAsset> {
  const form = new FormData();
  form.append('file', file);
  try {
    const r = await api.post<MediaUploadResponse>('/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      skipErrorToast: true,
    });
    const asset = r.data?.asset;
    if (!asset?.url) {
      throw new Error('Sunucu geçerli bir medya kaydı döndürmedi.');
    }
    return asset;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err, 'Medya yüklenemedi.'));
  }
}

export async function deleteMediaAsset(id: string): Promise<void> {
  try {
    await api.delete(`/media/${encodeURIComponent(id)}`, { skipErrorToast: true });
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err, 'Görsel silinemedi.'));
  }
}

export function formatMediaBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateMediaFile(file: File, maxSizeMb = 5): string | null {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase() : '';
  const okExt = ['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext);
  const okMime = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type);
  if (!okMime && !(file.type === '' && okExt)) return 'Bu görsel formatı desteklenmiyor.';
  if (file.size > maxSizeMb * 1024 * 1024) return 'Görsel dosyası en fazla 5 MB olabilir.';
  return null;
}
