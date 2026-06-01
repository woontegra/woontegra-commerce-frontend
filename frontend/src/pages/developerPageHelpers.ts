// ─── Developer page helpers (presentation only) ───────────────────────────────

export interface ApiTokenRow {
  id:         string;
  name:       string;
  token:      string;
  scopes:     string[];
  rateLimit:  number;
  lastUsedAt: string | null;
  expiresAt:  string | null;
  isActive:   boolean;
  createdAt:  string;
}

export interface WebhookRow {
  id:          string;
  url:         string;
  events:      string[];
  description: string | null;
  isActive:    boolean;
  secret:      string;
  createdAt:   string;
  _count:      { logs: number };
}

export const TOKEN_SCOPES = [
  { key: 'products:read',   label: 'Ürünleri okuma'     },
  { key: 'products:write',  label: 'Ürünleri yazma'     },
  { key: 'orders:read',     label: 'Siparişleri okuma'  },
  { key: 'orders:write',    label: 'Siparişleri yazma'  },
  { key: 'customers:read',  label: 'Müşterileri okuma'  },
  { key: 'customers:write', label: 'Müşterileri yazma'  },
] as const;

export const WEBHOOK_EVENTS = [
  'order.created', 'order.updated', 'order.deleted',
  'payment.success', 'payment.failed',
  'subscription.activated', 'subscription.canceled',
  'product.created', 'product.updated', 'product.deleted',
  'customer.created', 'customer.updated',
  'trial.ending_soon', 'trial.expired', 'tenant.suspended',
] as const;

const WEBHOOK_EVENT_LABELS: Record<string, string> = {
  'order.created':              'Sipariş oluşturuldu',
  'order.updated':              'Sipariş güncellendi',
  'order.deleted':              'Sipariş silindi',
  'payment.success':            'Ödeme alındı',
  'payment.failed':             'Ödeme başarısız',
  'product.updated':            'Ürün güncellendi',
  'product.created':            'Ürün oluşturuldu',
  'product.deleted':            'Ürün silindi',
  'customer.created':           'Müşteri oluşturuldu',
  'customer.updated':           'Müşteri güncellendi',
  'subscription.activated':     'Abonelik aktifleşti',
  'subscription.canceled':      'Abonelik iptal edildi',
  'trial.ending_soon':          'Deneme süresi bitiyor',
  'trial.expired':              'Deneme süresi doldu',
  'tenant.suspended':           'Hesap askıya alındı',
};

export function fmtDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('tr-TR', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  }).format(new Date(iso));
}

export function scopeLabel(key: string): string {
  return TOKEN_SCOPES.find(s => s.key === key)?.label ?? key;
}

export function scopeLabels(keys: string[]): string {
  if (!keys.length) return 'Tam erişim';
  return keys.map(scopeLabel).join(', ');
}

export function webhookEventLabel(event: string): string {
  return WEBHOOK_EVENT_LABELS[event] ?? event;
}

export function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: T[] }).data;
  }
  return [];
}

export interface DeveloperSummary {
  activeTokens:    number;
  activeWebhooks:  number;
  hourlyLimit:     string;
  lastApiUsage:    string;
  lastWebhookNote: string;
}

export function computeSummary(tokens: ApiTokenRow[], hooks: WebhookRow[]): DeveloperSummary {
  const activeTokens   = tokens.filter(t => t.isActive).length;
  const activeWebhooks = hooks.filter(h => h.isActive).length;

  const activeLimits = tokens.filter(t => t.isActive).map(t => t.rateLimit);
  const hourlyLimit  = activeLimits.length
    ? `${Math.max(...activeLimits).toLocaleString('tr-TR')}/sa`
    : tokens.length
      ? `${Math.max(...tokens.map(t => t.rateLimit)).toLocaleString('tr-TR')}/sa`
      : '—';

  const usageTimes = tokens
    .map(t => t.lastUsedAt)
    .filter(Boolean)
    .map(d => new Date(d!).getTime());
  const lastApiUsage = usageTimes.length
    ? (fmtDateTime(new Date(Math.max(...usageTimes)).toISOString()) ?? 'Henüz kullanılmadı')
    : 'Henüz kullanılmadı';

  const totalDeliveries = hooks.reduce((sum, h) => sum + (h._count?.logs ?? 0), 0);
  const lastWebhookNote = totalDeliveries > 0
    ? `${totalDeliveries.toLocaleString('tr-TR')} toplam teslimat`
    : 'Henüz yok';

  return { activeTokens, activeWebhooks, hourlyLimit, lastApiUsage, lastWebhookNote };
}

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  return raw.replace(/\/api\/?$/, '');
}
