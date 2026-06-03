import api, { extractErrorMessage } from './apiClient';

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  isRead: boolean;
  createdAt: string;
}

export type NotificationLoadReason = 'not_available' | 'network' | 'error';

export type NotificationLoadResult =
  | { ok: true; items: ApiNotification[]; total: number; unread: number }
  | { ok: false; reason: NotificationLoadReason; message: string };

function normalizeList(body: unknown): { items: ApiNotification[]; total: number; unread: number } {
  const root = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const nested = root.data;
  const data =
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : root;
  const items = Array.isArray(data.items) ? (data.items as ApiNotification[]) : [];
  const total = typeof data.total === 'number' ? data.total : items.length;
  const unread =
    typeof data.unread === 'number'
      ? data.unread
      : items.filter(n => !n.isRead).length;
  return { items, total, unread };
}

function loadFailure(err: unknown): NotificationLoadResult {
  const status = (err as { status?: number })?.status;
  const message = extractErrorMessage(err, 'Bildirimler yüklenemedi.');

  if (status === 404) {
    return {
      ok: false,
      reason: 'not_available',
      message: 'Bildirim endpoint\'i aktif değil.',
    };
  }

  const code = (err as { code?: string })?.code;
  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT' || status == null) {
    return {
      ok: false,
      reason: 'network',
      message: 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.',
    };
  }

  return { ok: false, reason: 'error', message };
}

export async function fetchNotifications(page = 1, limit = 50): Promise<NotificationLoadResult> {
  try {
    const r = await api.get('/notifications', {
      params: { page, limit },
      skipErrorToast: true,
    });
    const { items, total, unread } = normalizeList(r.data);
    return { ok: true, items, total, unread };
  } catch (err: unknown) {
    return loadFailure(err);
  }
}

export async function fetchUnreadNotificationCount(): Promise<number | null> {
  try {
    const r = await api.get('/notifications/unread-count', { skipErrorToast: true });
    const root = r.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : {};
    const count = root.count ?? (root.data as Record<string, unknown> | undefined)?.count;
    return typeof count === 'number' ? count : 0;
  } catch {
    return null;
  }
}

export async function markNotificationRead(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await api.patch(`/notifications/${id}/read`, undefined, { skipErrorToast: true });
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Bildirim güncellenemedi.') };
  }
}

export async function markAllNotificationsRead(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await api.patch('/notifications/read-all', undefined, { skipErrorToast: true });
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Bildirimler güncellenemedi.') };
  }
}
