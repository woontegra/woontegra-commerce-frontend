import type { LogEntry } from '../services/observability.service';

export type ActivityCategory =
  | 'system'
  | 'order'
  | 'product'
  | 'marketplace'
  | 'xml'
  | 'payment'
  | 'shipping';

export type ActivityResult = 'success' | 'warning' | 'error' | 'info';

export interface PresentedActivity {
  category: ActivityCategory;
  categoryLabel: string;
  operation: string;
  result: ActivityResult;
  resultLabel: string;
  description: string;
  isTechnical: boolean;
  isAuth: boolean;
}

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  system:      'Sistem',
  order:       'Sipariş',
  product:     'Ürün',
  marketplace: 'Pazaryeri',
  xml:         'XML',
  payment:     'Ödeme',
  shipping:    'Kargo',
};

const RESULT_STYLE: Record<ActivityResult, string> = {
  success: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
  error:   'bg-red-50 text-red-800 ring-1 ring-red-100',
  info:    'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

const RESULT_LABELS: Record<ActivityResult, string> = {
  success: 'Başarılı',
  warning: 'Uyarı',
  error:   'Hata',
  info:    'Bilgi',
};

const AUTH_ACTIONS = new Set([
  'login', 'logout', 'authenticate', 'auth', 'token_refresh', 'session',
  'register', 'password_reset', 'refresh_token',
]);

const AUTH_MESSAGE_PATTERNS = [
  /user authenticated successfully/i,
  /authentication successful/i,
  /login successful/i,
  /token (refreshed|issued|validated)/i,
  /session (created|started|validated)/i,
  /oturum açıldı/i,
];

const TECHNICAL_ACTIONS = new Set([
  'health_check', 'heartbeat', 'ping', 'debug', 'trace', 'middleware',
]);

const ACTION_LABELS: Record<string, string> = {
  product_sent:           'Ürün gönderildi',
  product_sync:           'Ürün senkronu',
  xml_sync:               'XML senkronu',
  xml_import:             'XML içe aktarma',
  payment_success:        'Ödeme alındı',
  payment_failed:         'Ödeme başarısız',
  order_created:          'Sipariş oluşturuldu',
  order_updated:          'Sipariş güncellendi',
  order_cancelled:        'Sipariş iptal edildi',
  order_shipped:          'Sipariş kargolandı',
  shipping_updated:       'Kargo bilgisi güncellendi',
  trendyol_sync:          'Trendyol senkronu',
  trendyol_resend:        'Trendyol yeniden gönderim',
  subscription_activated: 'Abonelik aktifleştirildi',
  stock_updated:          'Stok güncellendi',
};

const MESSAGE_OVERRIDES: Array<{ pattern: RegExp; text: string }> = [
  { pattern: /user authenticated successfully/i, text: 'Oturum açıldı' },
  { pattern: /authentication (failed|error)/i, text: 'Oturum doğrulanamadı' },
  { pattern: /payment success/i, text: 'Ödeme başarıyla alındı' },
  { pattern: /payment failed/i, text: 'Ödeme alınamadı' },
  { pattern: /xml sync (completed|success)/i, text: 'XML senkronu tamamlandı' },
  { pattern: /xml sync (failed|error)/i, text: 'XML senkronu başarısız oldu' },
  { pattern: /product(s)? sent/i, text: 'Ürünler pazaryerine gönderildi' },
  { pattern: /order (created|placed)/i, text: 'Yeni sipariş oluşturuldu' },
  { pattern: /order (shipped|dispatched)/i, text: 'Sipariş kargoya verildi' },
  { pattern: /order (cancelled|canceled)/i, text: 'Sipariş iptal edildi' },
  { pattern: /subscription activated/i, text: 'Abonelik planı aktifleştirildi' },
];

function humanizeToken(raw: string): string {
  return raw
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function resolveResult(row: LogEntry): ActivityResult {
  const status = row.status?.toLowerCase();
  if (row.level === 'error') return 'error';
  if (row.level === 'warn' || row.level === 'warning') return 'warning';
  if (status === 'success' || status === 'ok' || status === 'completed') return 'success';
  if (status === 'failed' || status === 'error') return 'error';
  if (status === 'pending' || status === 'warning') return 'warning';
  return 'info';
}

function resolveCategory(row: LogEntry): ActivityCategory {
  const module = row.module?.toLowerCase() ?? '';
  const action = row.action?.toLowerCase() ?? '';
  const event  = row.event?.toLowerCase() ?? '';
  const blob   = `${module} ${action} ${event} ${row.message}`.toLowerCase();

  if (module === 'xml' || blob.includes('xml')) return 'xml';
  if (module === 'trendyol' || blob.includes('trendyol') || blob.includes('marketplace')) return 'marketplace';
  if (module === 'billing' || blob.includes('payment') || blob.includes('ödeme')) return 'payment';
  if (blob.includes('ship') || blob.includes('cargo') || blob.includes('kargo')) return 'shipping';
  if (blob.includes('order') || blob.includes('sipariş')) return 'order';
  if (blob.includes('product') || blob.includes('ürün') || blob.includes('stock') || blob.includes('stok')) return 'product';

  return 'system';
}

function resolveOperation(row: LogEntry): string {
  const key = row.action?.toLowerCase() ?? '';
  if (ACTION_LABELS[key]) return ACTION_LABELS[key];
  if (row.event && ACTION_LABELS[row.event.toLowerCase()]) {
    return ACTION_LABELS[row.event.toLowerCase()];
  }
  if (row.action) return humanizeToken(row.action);
  if (row.event) return humanizeToken(row.event);
  return 'İşlem kaydı';
}

function resolveDescription(row: LogEntry): string {
  for (const { pattern, text } of MESSAGE_OVERRIDES) {
    if (pattern.test(row.message)) return text;
  }
  if (row.errorMessage) return row.errorMessage;
  const msg = row.message?.trim();
  if (!msg) return 'İşlem tamamlandı.';
  if (/^[a-z0-9_.-]+$/i.test(msg) && msg.includes('_')) {
    return humanizeToken(msg);
  }
  if (msg.length > 120) return `${msg.slice(0, 117)}…`;
  return msg;
}

export function isAuthLog(row: LogEntry): boolean {
  const action = row.action?.toLowerCase() ?? '';
  const module = row.module?.toLowerCase() ?? '';
  if (module === 'auth') return true;
  if (AUTH_ACTIONS.has(action)) return true;
  return AUTH_MESSAGE_PATTERNS.some(p => p.test(row.message));
}

export function isTechnicalLog(row: LogEntry): boolean {
  if (isAuthLog(row)) return true;
  const action = row.action?.toLowerCase() ?? '';
  if (TECHNICAL_ACTIONS.has(action)) return true;
  if (/^(debug|trace|health|ping)/i.test(row.action ?? '')) return true;
  return false;
}

export function presentActivity(row: LogEntry): PresentedActivity {
  const category = resolveCategory(row);
  const result   = resolveResult(row);
  return {
    category,
    categoryLabel: CATEGORY_LABELS[category],
    operation:     resolveOperation(row),
    result,
    resultLabel:   RESULT_LABELS[result],
    description:   resolveDescription(row),
    isTechnical:   isTechnicalLog(row),
    isAuth:        isAuthLog(row),
  };
}

export function resultBadgeClass(result: ActivityResult): string {
  return RESULT_STYLE[result];
}

export function categoryFilterOptions(): Array<{ value: '' | ActivityCategory; label: string }> {
  return [
    { value: '', label: 'Tüm kategoriler' },
    { value: 'system', label: CATEGORY_LABELS.system },
    { value: 'order', label: CATEGORY_LABELS.order },
    { value: 'product', label: CATEGORY_LABELS.product },
    { value: 'marketplace', label: CATEGORY_LABELS.marketplace },
    { value: 'xml', label: CATEGORY_LABELS.xml },
    { value: 'payment', label: CATEGORY_LABELS.payment },
    { value: 'shipping', label: CATEGORY_LABELS.shipping },
  ];
}

export function categoryToModule(value: ActivityCategory | ''): string | undefined {
  const map: Partial<Record<ActivityCategory, string>> = {
    marketplace: 'trendyol',
    xml:         'xml',
    payment:     'billing',
    system:      'app',
  };
  return value ? map[value] : undefined;
}

export function matchesCategoryFilter(row: LogEntry, filter: ActivityCategory | ''): boolean {
  if (!filter) return true;
  return presentActivity(row).category === filter;
}

export function matchesResultFilter(row: LogEntry, filter: '' | ActivityResult): boolean {
  if (!filter) return true;
  return presentActivity(row).result === filter;
}
