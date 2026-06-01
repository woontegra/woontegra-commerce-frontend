import api, { extractErrorMessage } from './apiClient';
import type {
  SupportTicketDetail,
  SupportTicketMessage,
  SupportTicketPriority,
  SupportTicketStatus,
} from '../pages/supportPageHelpers';

export interface AdminSupportTenant {
  id: string;
  name: string;
  slug: string;
}

export interface AdminSupportTicket {
  id: number;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category?: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  tenant?: AdminSupportTenant;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface AdminSupportSummary {
  total: number;
  open: number;
  waiting: number;
  resolved: number;
  closed: number;
}

export type AdminSupportTicketDetail = SupportTicketDetail & {
  tenant?: AdminSupportTenant;
};

type ListPayload = {
  tickets?: AdminSupportTicket[];
  summary?: AdminSupportSummary;
  pagination?: { total?: number; page?: number; limit?: number; totalPages?: number };
};

function normalizeList(body: unknown): {
  tickets: AdminSupportTicket[];
  summary: AdminSupportSummary;
  pagination: ListPayload['pagination'];
} {
  const root = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === 'object'
    ? (root.data as ListPayload)
    : (root as ListPayload);
  const tickets = Array.isArray(data.tickets) ? data.tickets : Array.isArray(root.tickets) ? root.tickets as AdminSupportTicket[] : [];
  const summary = data.summary ?? (root.summary as AdminSupportSummary) ?? {
    total: 0,
    open: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
  };
  const pagination = data.pagination ?? (root.pagination as ListPayload['pagination']);
  return { tickets, summary, pagination };
}

function normalizeDetail(body: unknown): AdminSupportTicketDetail | null {
  const root = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === 'object'
    ? (root.data as Record<string, unknown>)
    : root;
  const ticket = data.ticket;
  if (!ticket || typeof ticket !== 'object') return null;
  const t = ticket as AdminSupportTicketDetail;
  if (!Array.isArray(t.messages)) t.messages = [];
  return t;
}

const STATUS_API: Record<SupportTicketStatus, string> = {
  open: 'OPEN',
  in_progress: 'WAITING_REPLY',
  resolved: 'RESOLVED',
  closed: 'CLOSED',
};

const PRIORITY_API: Record<SupportTicketPriority, string> = {
  low: 'LOW',
  medium: 'NORMAL',
  high: 'HIGH',
};

export async function fetchAdminSupportTickets(params: {
  status?: SupportTicketStatus | 'all';
  priority?: SupportTicketPriority | 'all';
  tenantId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<
  | { ok: true; tickets: AdminSupportTicket[]; summary: AdminSupportSummary; pagination: ListPayload['pagination'] }
  | { ok: false; message: string }
> {
  try {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'all') q.set('status', STATUS_API[params.status]);
    if (params.priority && params.priority !== 'all') q.set('priority', PRIORITY_API[params.priority]);
    if (params.tenantId?.trim()) q.set('tenantId', params.tenantId.trim());
    if (params.search?.trim()) q.set('search', params.search.trim());
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));

    const r = await api.get(`/admin/support/tickets?${q}`, { skipErrorToast: true });
    const { tickets, summary, pagination } = normalizeList(r.data);
    return { ok: true, tickets, summary, pagination };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Destek talepleri yüklenemedi.') };
  }
}

export async function getAdminSupportTicket(id: number): Promise<
  | { ok: true; ticket: AdminSupportTicketDetail }
  | { ok: false; message: string }
> {
  try {
    const r = await api.get(`/admin/support/tickets/${id}`, { skipErrorToast: true });
    const ticket = normalizeDetail(r.data);
    if (!ticket) return { ok: false, message: 'Talep detayı alınamadı.' };
    return { ok: true, ticket };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Talep detayı yüklenemedi.') };
  }
}

export async function sendAdminSupportTicketMessage(
  id: number,
  message: string,
): Promise<{ ok: true; message: SupportTicketMessage } | { ok: false; message: string }> {
  try {
    const r = await api.post(`/admin/support/tickets/${id}/messages`, { message }, { skipErrorToast: true });
    const root = r.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : {};
    const data = root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;
    const msg = data.message as SupportTicketMessage | undefined;
    if (!msg) return { ok: false, message: 'Mesaj gönderilemedi.' };
    return { ok: true, message: msg };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Mesaj gönderilemedi.') };
  }
}

export async function updateAdminSupportTicketStatus(
  id: number,
  status: SupportTicketStatus,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await api.patch(`/admin/support/tickets/${id}/status`, { status: STATUS_API[status] }, { skipErrorToast: true });
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Talep durumu güncellenemedi.') };
  }
}
