import api, { extractErrorMessage } from './apiClient';
import type { SupportLoadResult, SupportSummary, SupportTicket } from '../pages/supportPageHelpers';

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
