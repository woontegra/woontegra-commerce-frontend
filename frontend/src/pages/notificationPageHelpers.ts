export type NotificationModuleState = 'unknown' | 'available' | 'unavailable';

export type CategoryStatus = 'active' | 'planned' | 'unavailable';

export interface NotificationCategoryCard {
  id: string;
  label: string;
  description: string;
  backendTypes: string[];
}

export interface EmailPreferenceItem {
  id: string;
  label: string;
  description: string;
}

export interface ChannelStatusItem {
  id: string;
  label: string;
  status: string;
  tone: 'success' | 'warning' | 'muted' | 'info';
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  note?: string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryCard[] = [
  {
    id: 'order',
    label: 'Sipariş Bildirimleri',
    description: 'Yeni sipariş ve sipariş durumu değişiklikleri.',
    backendTypes: ['ORDER_CREATED', 'ORDER_STATUS_CHANGED'],
  },
  {
    id: 'payment',
    label: 'Ödeme Bildirimleri',
    description: 'Başarılı/başarısız ödeme ve abonelik olayları.',
    backendTypes: ['PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'SUBSCRIPTION_ACTIVATED', 'SUBSCRIPTION_CANCELED'],
  },
  {
    id: 'stock',
    label: 'Stok Bildirimleri',
    description: 'Düşük stok ve stok tükenme uyarıları.',
    backendTypes: ['STOCK_LOW', 'STOCK_OUT'],
  },
  {
    id: 'marketplace',
    label: 'Pazaryeri Bildirimleri',
    description: 'Pazaryeri senkron ve soru bildirimleri.',
    backendTypes: [],
  },
  {
    id: 'support',
    label: 'Destek Talepleri',
    description: 'Yeni destek talebi ve mesaj bildirimleri.',
    backendTypes: [],
  },
  {
    id: 'system',
    label: 'Sistem Uyarıları',
    description: 'Deneme süresi, askıya alma ve sistem mesajları.',
    backendTypes: ['SYSTEM_MESSAGE', 'TRIAL_ENDING_SOON', 'TRIAL_EXPIRED', 'TENANT_SUSPENDED', 'USER_BANNED'],
  },
];

export const EMAIL_PREFERENCE_ITEMS: EmailPreferenceItem[] = [
  { id: 'order_new', label: 'Yeni sipariş geldiğinde', description: 'Mağaza yöneticisine e-posta gönderimi.' },
  { id: 'payment_success', label: 'Ödeme başarılı olduğunda', description: 'Ödeme onayı bildirimi.' },
  { id: 'payment_failed', label: 'Ödeme başarısız olduğunda', description: 'Başarısız ödeme uyarısı.' },
  { id: 'bank_transfer', label: 'Havale/EFT beklediğinde', description: 'Manuel ödeme onayı hatırlatması.' },
  { id: 'return_request', label: 'İade/iptal talebi geldiğinde', description: 'İade süreci bildirimi.' },
  { id: 'stock_critical', label: 'Stok kritik seviyeye düştüğünde', description: 'Stok eşiği uyarısı.' },
  { id: 'marketplace_question', label: 'Müşteri sorusu geldiğinde', description: 'Pazaryeri soru bildirimi.' },
  { id: 'support_ticket', label: 'Destek talebi geldiğinde', description: 'Destek merkezi bildirimi.' },
];

export function formatNotificationDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getDate() === now.getDate()
    && d.getMonth() === now.getMonth()
    && d.getFullYear() === now.getFullYear();
}

export function categoryLabelForType(type: string): string {
  const t = type.toUpperCase();
  if (t.startsWith('ORDER')) return 'Sipariş';
  if (t.startsWith('PAYMENT') || t.startsWith('SUBSCRIPTION')) return 'Ödeme';
  if (t.startsWith('STOCK')) return 'Stok';
  if (t.startsWith('TRIAL') || t === 'TENANT_SUSPENDED' || t === 'USER_BANNED' || t === 'SYSTEM_MESSAGE') {
    return 'Sistem';
  }
  return 'Genel';
}

export function categoryStatusLabel(status: CategoryStatus): string {
  switch (status) {
    case 'active': return 'Aktif';
    case 'planned': return 'Planlandı';
    default: return 'Endpoint yok';
  }
}

export function categoryStatusClass(status: CategoryStatus): string {
  switch (status) {
    case 'active': return 'bg-emerald-100 text-emerald-800';
    case 'planned': return 'bg-amber-100 text-amber-800';
    default: return 'bg-slate-100 text-slate-600';
  }
}

export function resolveCategoryStatus(
  card: NotificationCategoryCard,
  moduleState: NotificationModuleState,
  _seenTypes: Set<string>,
): CategoryStatus {
  if (moduleState === 'unavailable') return 'unavailable';
  if (moduleState !== 'available') return 'planned';
  if (card.backendTypes.length === 0) return 'planned';
  return 'active';
}
