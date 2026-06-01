import api, { extractErrorMessage } from './apiClient';
import type {
  SupportDetailLoadResult,
  SupportLoadResult,
  SupportSendMessageResult,
  SupportSummary,
  SupportTicket,
  SupportTicketDetail,
  SupportTicketMessage,
} from '../pages/supportPageHelpers';

type TicketsPayload = {
  success?: boolean;
  tickets?: SupportTicket[];
  summary?: SupportSummary;
  pagination?: { total?: number };
  data?: {
    tickets?: SupportTicket[];
    summary?: SupportSummary;
    pagination?: { total?: number };
  };
};

function normalizeTickets(body: unknown): {
  tickets: SupportTicket[];
  summary: SupportSummary;
  total: number;
} {
  const root = body && typeof body === 'object' ? (body as TicketsPayload) : {};
  const nested = root.data && typeof root.data === 'object' ? root.data : root;
  const tickets = Array.isArray(nested.tickets) ? nested.tickets : [];
  const summary = nested.summary ?? {
    total: tickets.length,
    open: 0,
    waiting: 0,
    resolved: 0,
  };
  const total = nested.pagination?.total ?? summary.total ?? tickets.length;
  return { tickets, summary, total };
}

function loadFailure(err: unknown): SupportLoadResult {
  const status = (err as { status?: number })?.status;
  const message = extractErrorMessage(err, 'Destek verileri yüklenemedi.');

  if (status === 404) {
    return {
      ok: false,
      reason: 'not_available',
      message: 'Destek endpoint\'i aktif değil.',
    };
  }

  const code = (err as { code?: string })?.code;
  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT' || status == null) {
    return {
      ok: false,
      reason: 'network',
      message: 'Sunucuya ulaşılamıyor veya destek endpoint\'i aktif değil.',
    };
  }

  return { ok: false, reason: 'error', message };
}

export async function fetchSupportTickets(): Promise<SupportLoadResult> {
  try {
    const r = await api.get('/support/tickets', { skipErrorToast: true });
    const { tickets, summary, total } = normalizeTickets(r.data);
    return { ok: true, tickets, summary, total };
  } catch (err: unknown) {
    return loadFailure(err);
  }
}

export async function createSupportTicket(body: {
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const priorityMap = { low: 'LOW', medium: 'NORMAL', high: 'HIGH' } as const;
  try {
    await api.post('/support/ticket', {
      subject: body.subject,
      message: body.message,
      category: body.category,
      priority: priorityMap[body.priority],
    }, { skipErrorToast: true });
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Talep oluşturulamadı.') };
  }
}

function normalizeTicketDetail(body: unknown): SupportTicketDetail | null {
  const root = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === 'object'
    ? (root.data as Record<string, unknown>)
    : root;
  const ticket = data.ticket;
  if (!ticket || typeof ticket !== 'object') return null;
  const t = ticket as SupportTicketDetail;
  if (!Array.isArray(t.messages)) {
    t.messages = [];
  }
  return t;
}

export async function getSupportTicket(id: number): Promise<SupportDetailLoadResult> {
  try {
    const r = await api.get(`/support/tickets/${id}`, { skipErrorToast: true });
    const ticket = normalizeTicketDetail(r.data);
    if (!ticket) {
      return { ok: false, message: 'Talep detayı alınamadı.' };
    }
    return { ok: true, ticket };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Talep detayı yüklenemedi.') };
  }
}

export async function sendSupportTicketMessage(
  id: number,
  message: string,
): Promise<SupportSendMessageResult> {
  try {
    const r = await api.post(`/support/tickets/${id}/messages`, { message }, { skipErrorToast: true });
    const root = r.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : {};
    const data = root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;
    const msg = data.message as SupportTicketMessage | undefined;
    if (!msg) {
      return { ok: false, message: 'Mesaj gönderilemedi.' };
    }
    return { ok: true, message: msg };
  } catch (err: unknown) {
    return { ok: false, message: extractErrorMessage(err, 'Mesaj gönderilemedi.') };
  }
}
