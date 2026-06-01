import type { Order } from '../services/order.service';
import { ORDER_PAYMENT_PROVIDER_LABELS } from './orderPaymentLabels';

export type ReportTab = 'sales' | 'products' | 'customers';
export type DateRangeKey = '7days' | '30days' | '90days' | 'thisMonth' | 'lastMonth' | 'custom';

export function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function fmtCurrency(value: unknown): string {
  return new Intl.NumberFormat('tr-TR', {
    style:                 'currency',
    currency:              'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function fmtNumber(value: unknown): string {
  return toNumber(value).toLocaleString('tr-TR');
}

export function fmtPercent(value: unknown, digits = 1): string {
  return `%${toNumber(value).toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function fmtShortDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day:   '2-digit',
    month: 'short',
  }).format(new Date(iso));
}

export function fmtDateTime(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function getReportDateRange(
  key: DateRangeKey,
  customStart = '',
  customEnd = '',
): { startDate: string; endDate: string } {
  const today = new Date();
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  if (key === 'custom') {
    return { startDate: customStart, endDate: customEnd };
  }

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  if (key === '7days') {
    start.setDate(start.getDate() - 6);
  } else if (key === '30days') {
    start.setDate(start.getDate() - 29);
  } else if (key === '90days') {
    start.setDate(start.getDate() - 89);
  } else if (key === 'thisMonth') {
    start.setDate(1);
  } else if (key === 'lastMonth') {
    start.setMonth(start.getMonth() - 1, 1);
    end.setMonth(end.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate:   end.toISOString().split('T')[0],
  };
}

export function isInDateRange(iso: string, startDate: string, endDate: string): boolean {
  if (!iso || !startDate || !endDate) return false;
  const d = iso.slice(0, 10);
  return d >= startDate && d <= endDate;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING:    'Bekliyor',
  PROCESSING: 'Hazırlanıyor',
  PAID:       'Ödendi',
  SHIPPED:    'Kargoda',
  DELIVERED:  'Teslim edildi',
  CANCELLED:  'İptal edildi',
  RETURNED:   'İade edildi',
  REFUNDED:   'İade edildi',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING:    '#f59e0b',
  PROCESSING: '#3b82f6',
  PAID:       '#10b981',
  SHIPPED:    '#8b5cf6',
  DELIVERED:  '#059669',
  CANCELLED:  '#ef4444',
  RETURNED:   '#dc2626',
  REFUNDED:   '#dc2626',
};

const STATUS_ALIASES: Record<string, string> = {
  pending:    'PENDING',
  processing: 'PROCESSING',
  paid:       'PAID',
  shipped:    'SHIPPED',
  delivered:  'DELIVERED',
  cancelled:  'CANCELLED',
  canceled:   'CANCELLED',
  returned:   'RETURNED',
  refunded:   'REFUNDED',
};

export function normalizeStatusKey(raw: string): string {
  const upper = raw.toUpperCase();
  if (ORDER_STATUS_LABELS[upper]) return upper;
  return STATUS_ALIASES[raw.toLowerCase()] ?? upper;
}

export function labelOrderStatus(raw: string): string {
  const key = normalizeStatusKey(raw);
  return ORDER_STATUS_LABELS[key] ?? raw;
}

export function statusColor(raw: string): string {
  const key = normalizeStatusKey(raw);
  return ORDER_STATUS_COLORS[key] ?? '#94a3b8';
}

export function breakdownEntries(breakdown: Record<string, unknown> | null | undefined) {
  return Object.entries(breakdown ?? {})
    .map(([name, value]) => ({
      key:   normalizeStatusKey(name),
      name:  labelOrderStatus(name),
      value: toNumber(value),
      color: statusColor(name),
    }))
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function countFromBreakdown(
  breakdown: Record<string, unknown> | null | undefined,
  keys: string[],
): number {
  let total = 0;
  for (const [raw, value] of Object.entries(breakdown ?? {})) {
    const key = normalizeStatusKey(raw);
    if (keys.includes(key)) total += toNumber(value);
  }
  return total;
}

export function cancelReturnRate(
  breakdown: Record<string, unknown> | null | undefined,
  totalOrders: number,
): number | null {
  if (totalOrders <= 0) return null;
  const bad = countFromBreakdown(breakdown, ['CANCELLED', 'RETURNED', 'REFUNDED']);
  if (bad <= 0) return 0;
  return (bad / totalOrders) * 100;
}

export function topRevenueDays(
  rows: Array<{ date?: string; revenue?: unknown }> | null | undefined,
  limit = 5,
) {
  return [...(rows ?? [])]
    .sort((a, b) => toNumber(b.revenue) - toNumber(a.revenue))
    .slice(0, limit);
}

export function paymentMethodBreakdown(orders: Order[]) {
  const map = new Map<string, number>();
  for (const order of orders) {
    const raw = order.paymentProvider
      ?? order.payment?.provider
      ?? order.admin?.payment?.provider
      ?? 'UNKNOWN';
    const label = ORDER_PAYMENT_PROVIDER_LABELS[raw] ?? ORDER_PAYMENT_PROVIDER_LABELS.UNKNOWN;
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function aggregateCities(customers: Array<{ city?: string | null }>) {
  const map = new Map<string, number>();
  for (const c of customers) {
    const city = c.city?.trim();
    if (!city) continue;
    map.set(city, (map.get(city) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function hasChartData<T>(rows: T[] | null | undefined, min = 1): boolean {
  return Array.isArray(rows) && rows.length >= min;
}
