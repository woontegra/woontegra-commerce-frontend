export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high';

export interface SupportSummary {
  total: number;
  open: number;
  waiting: number;
  resolved: number;
}

export interface SupportTicket {
  id: number;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category?: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessage?: {
    id: number;
    message: string;
    createdAt: string;
    isInternal: boolean;
  } | null;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export type SupportLoadReason = 'not_available' | 'network' | 'error';

export type SupportLoadResult =
  | { ok: true; tickets: SupportTicket[]; summary: SupportSummary; total: number }
  | { ok: false; reason: SupportLoadReason; message: string };

export function statusLabel(status: SupportTicketStatus | 'all'): string {
  switch (status) {
    case 'open':         return 'Açık';
    case 'in_progress':  return 'Yanıt Bekleyen';
    case 'resolved':     return 'Çözüldü';
    case 'closed':       return 'Kapalı';
    case 'all':          return 'Tümü';
    default:             return 'Bilinmiyor';
  }
}

export function priorityLabel(priority: SupportTicketPriority | 'all'): string {
  switch (priority) {
    case 'low':    return 'Düşük';
    case 'medium': return 'Normal';
    case 'high':   return 'Yüksek';
    case 'all':    return 'Tümü';
    default:       return 'Bilinmiyor';
  }
}

export function statusBadgeClass(status: SupportTicketStatus): string {
  switch (status) {
    case 'open':        return 'bg-emerald-100 text-emerald-800';
    case 'in_progress': return 'bg-amber-100 text-amber-800';
    case 'resolved':    return 'bg-sky-100 text-sky-800';
    case 'closed':      return 'bg-slate-100 text-slate-600';
    default:            return 'bg-slate-100 text-slate-600';
  }
}

export function priorityBadgeClass(priority: SupportTicketPriority): string {
  switch (priority) {
    case 'high':   return 'bg-red-100 text-red-800';
    case 'medium': return 'bg-orange-100 text-orange-800';
    case 'low':    return 'bg-sky-100 text-sky-800';
    default:       return 'bg-slate-100 text-slate-600';
  }
}

export function formatSupportDate(value: string | null | undefined): string {
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

export function computeTicketStats(tickets: SupportTicket[]): SupportSummary {
  const open = tickets.filter(t => t.status === 'open').length;
  const waiting = tickets.filter(t => t.status === 'in_progress').length;
  const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  return {
    total: tickets.length,
    open,
    waiting,
    resolved,
  };
}

export const EMPTY_SUPPORT_SUMMARY: SupportSummary = {
  total: 0,
  open: 0,
  waiting: 0,
  resolved: 0,
};

export function filterTickets(
  tickets: SupportTicket[],
  status: SupportTicketStatus | 'all',
  priority: SupportTicketPriority | 'all',
  search: string,
): SupportTicket[] {
  const q = search.trim().toLowerCase();
  return tickets.filter(t => {
    if (status !== 'all' && t.status !== status) return false;
    if (priority !== 'all' && t.priority !== priority) return false;
    if (!q) return true;
    const hay = `${t.id} ${t.subject}`.toLowerCase();
    return hay.includes(q);
  });
}
