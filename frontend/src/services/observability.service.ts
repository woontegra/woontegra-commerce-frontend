import { api } from './apiClient';

export interface LogEntry {
  id: string;
  level: string;
  module: string;
  action: string;
  status: string | null;
  traceId: string | null;
  tenantId: string | null;
  userId: string | null;
  message: string;
  errorMessage: string | null;
  stack: string | null;
  event: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AlertEntry extends LogEntry {
  retry: {
    type: string;
    label: string;
    payload: Record<string, string>;
  } | null;
}

export interface BusinessMetrics {
  periodDays: number;
  counts: {
    product_sent: number;
    xml_sync: number;
    payment_success: number;
    subscription_activated: number;
  };
  byDay: Record<string, Record<string, number>>;
}

function unwrap<T>(res: { data: unknown }): T {
  const body = res.data as { data?: T };
  return (body?.data ?? body) as T;
}

export const observabilityApi = {
  getLogs(params: {
    page?: number;
    limit?: number;
    module?: string;
    level?: string;
    traceId?: string;
    search?: string;
    event?: string;
  }) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.module) q.set('module', params.module);
    if (params.level) q.set('level', params.level);
    if (params.traceId) q.set('traceId', params.traceId);
    if (params.search) q.set('search', params.search);
    if (params.event) q.set('event', params.event);
    return api.get(`/observability/logs?${q}`).then(r => unwrap<Paginated<LogEntry>>(r));
  },

  getAlerts(page = 1, limit = 20) {
    return api
      .get(`/observability/alerts?page=${page}&limit=${limit}`)
      .then(r => unwrap<Paginated<AlertEntry>>(r));
  },

  getMetrics(days = 7) {
    return api.get(`/observability/metrics?days=${days}`).then(r => unwrap<BusinessMetrics>(r));
  },

  retry(type: string, payload: Record<string, string>) {
    return api.post('/observability/retry', { type, payload }).then(r => unwrap<{ ok: boolean; message: string }>(r));
  },
};
