import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Ticket,
} from 'lucide-react';
import {
  EMPTY_SUPPORT_SUMMARY,
  filterTickets,
  formatSupportDate,
  priorityBadgeClass,
  priorityLabel,
  statusBadgeClass,
  statusLabel,
  type SupportSummary,
  type SupportTicket,
  type SupportTicketDetail,
  type SupportTicketMessage,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from './supportPageHelpers';
import {
  createSupportTicket,
  fetchSupportTickets,
  getSupportTicket,
  sendSupportTicketMessage,
} from '../services/support.service';

type TabKey = 'tickets' | 'chat';
type ModuleState = 'unknown' | 'available' | 'unavailable';

const inputCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300';

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[100px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-[15px] font-semibold mt-1 text-slate-900">{value}</p>
    </div>
  );
}

function Panel({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="wn-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-[13px] font-semibold text-slate-800">{title}</h2>
        {desc && <p className="text-[12px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: SupportTicketMessage }) {
  const isUser = msg.senderType === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-slate-100 text-slate-800 rounded-bl-md'
        }`}
      >
        <p className="text-[11px] font-medium mb-1 opacity-80">
          {isUser ? 'Siz' : 'Destek'}
        </p>
        <p className="text-[13px] whitespace-pre-wrap break-words">{msg.message}</p>
        <p className={`text-[10px] mt-1.5 ${isUser ? 'text-indigo-100' : 'text-slate-400'}`}>
          {formatSupportDate(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

function MessageThread({
  messages,
  loading,
}: {
  messages: SupportTicketMessage[];
  loading?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  if (loading) {
    return (
      <div className="py-10 text-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
        Mesajlar yükleniyor…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <p className="text-[13px] text-slate-500 text-center py-8">
        Henüz mesaj bulunmuyor.
      </p>
    );
  }

  return (
    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      {messages.map(msg => (
        <MessageBubble key={msg.id} msg={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function TicketDetailPanel({
  ticket,
  loading,
  error,
  onRetry,
  messageInput,
  onMessageChange,
  onSend,
  sending,
  messageError,
  compact,
}: {
  ticket: SupportTicketDetail | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  messageInput: string;
  onMessageChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  messageError: string | null;
  compact?: boolean;
}) {
  const isClosed = ticket?.status === 'closed';

  if (loading) {
    return (
      <Panel title="Talep detayı">
        <div className="py-8 text-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
          Talep detayı yükleniyor…
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Talep detayı">
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-[13px] text-red-800">
          <p className="font-medium">Talep detayı yüklenemedi.</p>
          <p className="text-[12px] mt-0.5 opacity-90">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="btn btn-secondary text-[12px] mt-3 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tekrar Dene
          </button>
        </div>
      </Panel>
    );
  }

  if (!ticket) {
    return (
      <Panel title="Talep detayı">
        <p className="text-[13px] text-slate-500 leading-relaxed">
          Detayları görüntülemek için listeden bir destek talebi seçin.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title={`Talep #${ticket.id}`}
      desc={ticket.subject}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(ticket.status)}`}>
            {statusLabel(ticket.status)}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityBadgeClass(ticket.priority)}`}>
            {priorityLabel(ticket.priority)}
          </span>
        </div>
        <dl className="grid grid-cols-1 gap-2 text-[12px]">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Oluşturulma</dt>
            <dd className="font-medium text-slate-800">{formatSupportDate(ticket.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Son güncelleme</dt>
            <dd className="font-medium text-slate-800">{formatSupportDate(ticket.updatedAt)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Mesaj sayısı</dt>
            <dd className="font-medium text-slate-800">{ticket.messages.length}</dd>
          </div>
        </dl>

        {!compact && (
          <>
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-[12px] font-semibold text-slate-700 mb-3">Mesaj geçmişi</h3>
              <MessageThread messages={ticket.messages} />
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                Yeni mesaj
              </label>
              {isClosed && (
                <p className="text-[12px] text-slate-500">
                  Bu talep kapalı olduğu için yeni mesaj gönderilemez.
                </p>
              )}
              {messageError && (
                <p className="text-[12px] text-red-600">{messageError}</p>
              )}
              <textarea
                className={`${inputCls} min-h-[88px] resize-y disabled:bg-slate-50 disabled:text-slate-400`}
                value={messageInput}
                onChange={e => onMessageChange(e.target.value)}
                placeholder={isClosed ? 'Kapalı talep' : 'Mesajınızı yazın…'}
                disabled={isClosed || sending}
              />
              <button
                type="button"
                onClick={onSend}
                disabled={isClosed || sending || !messageInput.trim()}
                className="btn btn-primary text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gönderiliyor…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Gönder
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

export default function Support() {
  const [activeTab, setActiveTab] = useState<TabKey>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [summary, setSummary] = useState<SupportSummary>(EMPTY_SUPPORT_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moduleState, setModuleState] = useState<ModuleState>('unknown');
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<SupportTicketPriority | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showCreateInfo, setShowCreateInfo] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    message: '',
    priority: 'medium' as SupportTicketPriority,
    category: 'GENERAL',
  });
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketDetail, setTicketDetail] = useState<SupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await fetchSupportTickets();
    if (result.ok) {
      setTickets(result.tickets);
      setSummary(result.summary);
      setModuleState('available');
      setLoadError(null);
    } else if (result.reason === 'not_available') {
      setTickets([]);
      setSummary(EMPTY_SUPPORT_SUMMARY);
      setModuleState('unavailable');
      setLoadError(null);
    } else {
      setTickets([]);
      setSummary(EMPTY_SUPPORT_SUMMARY);
      setModuleState('unknown');
      setLoadError(result.message);
    }
    setLoading(false);
  }, []);

  const loadTicketDetail = useCallback(async (ticketId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    setMessageError(null);
    const result = await getSupportTicket(ticketId);
    if (result.ok) {
      setTicketDetail(result.ticket);
      setDetailError(null);
    } else {
      setTicketDetail(null);
      setDetailError(result.message);
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const selectTicket = useCallback((ticketId: number, switchToChat = false) => {
    setSelectedTicketId(ticketId);
    setMessageInput('');
    setMessageError(null);
    if (switchToChat) {
      setActiveTab('chat');
    }
    void loadTicketDetail(ticketId);
  }, [loadTicketDetail]);

  const stats = summary;
  const filtered = useMemo(
    () => filterTickets(tickets, statusFilter, priorityFilter, search),
    [tickets, statusFilter, priorityFilter, search],
  );

  const canCreate = moduleState === 'available';
  const filtersDisabled = moduleState !== 'available';
  const isClosed = ticketDetail?.status === 'closed';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    if (!ticketForm.subject.trim() || !ticketForm.message.trim()) {
      toast.error('Konu ve mesaj zorunludur.');
      return;
    }
    if (ticketForm.subject.trim().length < 3) {
      toast.error('Konu en az 3 karakter olmalıdır.');
      return;
    }
    if (ticketForm.message.trim().length < 10) {
      toast.error('Mesaj en az 10 karakter olmalıdır.');
      return;
    }
    setCreating(true);
    const result = await createSupportTicket({
      subject: ticketForm.subject.trim(),
      message: ticketForm.message.trim(),
      priority: ticketForm.priority,
      category: ticketForm.category.trim() || 'GENERAL',
    });
    setCreating(false);
    if (result.ok) {
      toast.success('Destek talebiniz oluşturuldu.');
      setTicketForm({ subject: '', message: '', priority: 'medium', category: 'GENERAL' });
      setShowCreateInfo(false);
      await loadTickets();
    } else {
      toast.error(result.message);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicketId || !ticketDetail || isClosed) return;
    const text = messageInput.trim();
    if (text.length < 2) {
      setMessageError('Mesaj en az 2 karakter olmalıdır.');
      return;
    }
    setSendingMessage(true);
    setMessageError(null);
    const result = await sendSupportTicketMessage(selectedTicketId, text);
    setSendingMessage(false);
    if (result.ok) {
      toast.success('Mesajınız gönderildi.');
      setMessageInput('');
      await Promise.all([loadTicketDetail(selectedTicketId), loadTickets()]);
    } else {
      setMessageError(result.message);
    }
  };

  const openCreate = () => {
    if (canCreate) {
      setShowCreateInfo(true);
      return;
    }
    toast('Destek talebi oluşturma modülü sonraki fazda aktif edilecektir.', { icon: 'ℹ️' });
  };

  return (
    <div className="w-full space-y-6 pb-10 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Destek Merkezi
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Destek taleplerinizi takip edin, mesajlaşmaları görüntüleyin ve yeni talep oluşturun.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!canCreate}
          title={canCreate ? undefined : 'Sonraki faz — destek modülü henüz aktif değil'}
          className="btn btn-primary text-[13px] inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Plus className="w-4 h-4" />
          Yeni Talep Oluştur
          {!canCreate && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/20">
              Sonraki faz
            </span>
          )}
        </button>
      </div>

      {moduleState === 'unavailable' && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-[13px] text-indigo-900">
          <p className="font-medium">Destek sistemi henüz aktif değil.</p>
          <p className="text-[12px] text-indigo-800/80 mt-1">
            Destek talepleri ve mesajlaşma modülü sonraki fazda kullanılabilir olacak.
          </p>
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Destek verileri yüklenemedi.</p>
              <p className="text-[12px] mt-0.5 opacity-90">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadTickets()}
            className="btn btn-secondary text-[12px] inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tekrar Dene
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryMetric label="Toplam Talep" value={loading ? '…' : stats.total} />
        <SummaryMetric label="Açık Talepler" value={loading ? '…' : stats.open} />
        <SummaryMetric label="Yanıt Bekleyen" value={loading ? '…' : stats.waiting} />
        <SummaryMetric label="Çözülen" value={loading ? '…' : stats.resolved} />
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${
            activeTab === 'tickets' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          Destek Talepleri
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${
            activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Mesajlaşma
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          {activeTab === 'tickets' && (
            <>
              <Panel title="Filtreler" desc="Talepleri durum, öncelik ve arama ile süzün">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    className={inputCls}
                    value={statusFilter}
                    disabled={filtersDisabled}
                    onChange={e => setStatusFilter(e.target.value as SupportTicketStatus | 'all')}
                  >
                    <option value="all">Durum: Tümü</option>
                    <option value="open">Açık</option>
                    <option value="in_progress">Yanıt Bekleyen</option>
                    <option value="resolved">Çözüldü</option>
                    <option value="closed">Kapalı</option>
                  </select>
                  <select
                    className={inputCls}
                    value={priorityFilter}
                    disabled={filtersDisabled}
                    onChange={e => setPriorityFilter(e.target.value as SupportTicketPriority | 'all')}
                  >
                    <option value="all">Öncelik: Tümü</option>
                    <option value="low">Düşük</option>
                    <option value="medium">Normal</option>
                    <option value="high">Yüksek</option>
                  </select>
                  <input
                    className={inputCls}
                    placeholder="Konu veya talep no ara…"
                    value={search}
                    disabled={filtersDisabled}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </Panel>

              <Panel title="Destek talepleri">
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full min-w-[640px] text-[13px]">
                    <thead>
                      <tr className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide border-b border-slate-100">
                        <th className="pb-3 pr-3">Talep No</th>
                        <th className="pb-3 pr-3">Konu</th>
                        <th className="pb-3 pr-3">Durum</th>
                        <th className="pb-3 pr-3">Öncelik</th>
                        <th className="pb-3 pr-3">Son Güncelleme</th>
                        <th className="pb-3">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                            Destek talepleri yükleniyor…
                          </td>
                        </tr>
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center">
                            <p className="text-slate-700 font-medium">Henüz destek talebi bulunmuyor.</p>
                            <p className="text-[12px] text-slate-500 mt-1 max-w-md mx-auto">
                              {moduleState === 'unavailable'
                                ? 'Destek modülü aktif edildiğinde talepleriniz burada listelenecektir.'
                                : 'Yeni bir destek talebi oluşturduğunuzda burada listelenecektir.'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filtered.map(ticket => (
                          <tr
                            key={ticket.id}
                            className={`border-b border-slate-50 last:border-0 ${
                              selectedTicketId === ticket.id ? 'bg-indigo-50/50' : ''
                            }`}
                          >
                            <td className="py-3 pr-3 font-mono text-slate-600">#{ticket.id}</td>
                            <td className="py-3 pr-3 font-medium text-slate-800 max-w-[200px] truncate">
                              {ticket.subject}
                            </td>
                            <td className="py-3 pr-3">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(ticket.status)}`}>
                                {statusLabel(ticket.status)}
                              </span>
                            </td>
                            <td className="py-3 pr-3">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityBadgeClass(ticket.priority)}`}>
                                {priorityLabel(ticket.priority)}
                              </span>
                            </td>
                            <td className="py-3 pr-3 text-slate-500 whitespace-nowrap">
                              {formatSupportDate(ticket.updatedAt || ticket.createdAt)}
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                disabled={moduleState !== 'available'}
                                onClick={() => selectTicket(ticket.id, true)}
                                className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                              >
                                Görüntüle
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}

          {activeTab === 'chat' && (
            <Panel title="Mesajlaşma" desc="Talep bazlı destek sohbeti">
              {!selectedTicketId ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-[14px] font-medium text-slate-800">
                    Mesajlaşmaları görüntülemek için bir destek talebi seçin.
                  </p>
                  <p className="text-[12px] text-slate-500 mt-2 max-w-md mx-auto">
                    Destek Talepleri sekmesinden &quot;Görüntüle&quot; ile bir talep açabilirsiniz.
                  </p>
                </div>
              ) : detailError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-[13px] text-red-800">
                  <p className="font-medium">Mesajlar yüklenemedi.</p>
                  <p className="text-[12px] mt-0.5 opacity-90">{detailError}</p>
                  <button
                    type="button"
                    onClick={() => void loadTicketDetail(selectedTicketId)}
                    className="btn btn-secondary text-[12px] mt-3 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tekrar Dene
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {ticketDetail && (
                    <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
                      <span className="font-mono text-[12px] text-slate-500">#{ticketDetail.id}</span>
                      <span className="font-medium text-slate-800">{ticketDetail.subject}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(ticketDetail.status)}`}>
                        {statusLabel(ticketDetail.status)}
                      </span>
                    </div>
                  )}
                  <MessageThread
                    messages={ticketDetail?.messages ?? []}
                    loading={detailLoading}
                  />
                  {ticketDetail && (
                    <div className="border-t border-slate-100 pt-4 space-y-2">
                      {isClosed && (
                        <p className="text-[12px] text-slate-500">
                          Bu talep kapalı olduğu için yeni mesaj gönderilemez.
                        </p>
                      )}
                      {messageError && (
                        <p className="text-[12px] text-red-600">{messageError}</p>
                      )}
                      <textarea
                        className={`${inputCls} min-h-[96px] resize-y disabled:bg-slate-50 disabled:text-slate-400`}
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        placeholder={isClosed ? 'Kapalı talep' : 'Mesajınızı yazın…'}
                        disabled={isClosed || sendingMessage || detailLoading}
                      />
                      <button
                        type="button"
                        onClick={() => void handleSendMessage()}
                        disabled={isClosed || sendingMessage || detailLoading || !messageInput.trim()}
                        className="btn btn-primary text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {sendingMessage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Gönderiliyor…
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Gönder
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <TicketDetailPanel
            ticket={ticketDetail}
            loading={detailLoading && selectedTicketId != null}
            error={selectedTicketId != null ? detailError : null}
            onRetry={() => selectedTicketId != null && void loadTicketDetail(selectedTicketId)}
            messageInput={messageInput}
            onMessageChange={setMessageInput}
            onSend={() => void handleSendMessage()}
            sending={sendingMessage}
            messageError={messageError}
            compact={activeTab === 'chat'}
          />

          <Panel title="Destek durumu">
            <ul className="space-y-2 text-[12px] text-slate-600">
              <li className="flex justify-between gap-2">
                <span>Modül durumu</span>
                <span className="font-medium text-slate-800">
                  {moduleState === 'available'
                    ? 'Aktif'
                    : moduleState === 'unavailable'
                      ? 'Planlandı'
                      : loadError
                        ? 'Bağlantı hatası'
                        : 'Kontrol ediliyor…'}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Listelenen talep</span>
                <span className="font-medium text-slate-800">{filtered.length}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Seçili talep</span>
                <span className="font-medium text-slate-800">
                  {selectedTicketId != null ? `#${selectedTicketId}` : '—'}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Aktif filtre</span>
                <span className="font-medium text-slate-800">
                  {statusLabel(statusFilter)} · {priorityLabel(priorityFilter)}
                </span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      {showCreateInfo && canCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="wn-card w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[14px] font-semibold text-slate-900">Yeni Destek Talebi</h3>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Konu
                </label>
                <input
                  className={inputCls}
                  value={ticketForm.subject}
                  onChange={e => setTicketForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Destek talebinizin konusu"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Kategori
                </label>
                <select
                  className={inputCls}
                  value={ticketForm.category}
                  onChange={e => setTicketForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="GENERAL">Genel</option>
                  <option value="BILLING">Faturalama</option>
                  <option value="TECHNICAL">Teknik</option>
                  <option value="INTEGRATION">Entegrasyon</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Öncelik
                </label>
                <select
                  className={inputCls}
                  value={ticketForm.priority}
                  onChange={e => setTicketForm(f => ({ ...f, priority: e.target.value as SupportTicketPriority }))}
                >
                  <option value="low">Düşük</option>
                  <option value="medium">Normal</option>
                  <option value="high">Yüksek</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Mesaj
                </label>
                <textarea
                  className={`${inputCls} min-h-[96px] resize-y`}
                  value={ticketForm.message}
                  onChange={e => setTicketForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Sorununuzu detaylı açıklayın…"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateInfo(false)}
                  className="btn btn-secondary text-[13px]"
                >
                  İptal
                </button>
                <button type="submit" disabled={creating} className="btn btn-primary text-[13px]">
                  {creating ? 'Gönderiliyor…' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
