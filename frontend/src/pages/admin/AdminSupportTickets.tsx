import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
} from 'lucide-react';
import {
  formatSupportDate,
  priorityBadgeClass,
  priorityLabel,
  statusBadgeClass,
  statusLabel,
  type SupportTicketMessage,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from '../../pages/supportPageHelpers';
import type { AdminSupportSummary, AdminSupportTicket, AdminSupportTicketDetail } from '../../services/adminSupport.service';
import {
  fetchAdminSupportTickets,
  getAdminSupportTicket,
  sendAdminSupportTicketMessage,
  updateAdminSupportTicketStatus,
} from '../../services/adminSupport.service';

const inputCls =
  'w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40';

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 min-w-[90px] flex-1">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-white mt-1">{value}</p>
    </div>
  );
}

function MessageBubble({ msg }: { msg: SupportTicketMessage }) {
  const isSupport = msg.senderType === 'support';
  return (
    <div className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
          isSupport
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-md'
        }`}
      >
        <p className="text-[11px] font-medium mb-1 opacity-80">
          {isSupport ? 'Destek' : 'Müşteri'}
        </p>
        <p className="text-[13px] whitespace-pre-wrap break-words">{msg.message}</p>
        <p className={`text-[10px] mt-1.5 ${isSupport ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatSupportDate(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [summary, setSummary] = useState<AdminSupportSummary>({
    total: 0,
    open: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<SupportTicketPriority | 'all'>('all');
  const [tenantFilter, setTenantFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminSupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusDraft, setStatusDraft] = useState<SupportTicketStatus>('open');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await fetchAdminSupportTickets({
      status: statusFilter,
      priority: priorityFilter,
      tenantId: tenantFilter,
      search,
      page: 1,
      limit: 100,
    });
    if (result.ok) {
      setTickets(result.tickets);
      setSummary(result.summary);
    } else {
      setTickets([]);
      setLoadError(result.message);
    }
    setLoading(false);
  }, [statusFilter, priorityFilter, tenantFilter, search]);

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    setDetailError(null);
    setMessageError(null);
    const result = await getAdminSupportTicket(id);
    if (result.ok) {
      setDetail(result.ticket);
      setStatusDraft(result.ticket.status);
      setDetailError(null);
    } else {
      setDetail(null);
      setDetailError(result.message);
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId != null) {
      void loadDetail(selectedId);
    } else {
      setDetail(null);
      setDetailError(null);
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages.length, detailLoading]);

  const selectTicket = (id: number) => {
    setSelectedId(id);
    setMessageInput('');
    setMessageError(null);
  };

  const handleSend = async () => {
    if (!selectedId || !detail) return;
    const text = messageInput.trim();
    if (text.length < 2) {
      setMessageError('Mesaj en az 2 karakter olmalıdır.');
      return;
    }
    setSending(true);
    setMessageError(null);
    const result = await sendAdminSupportTicketMessage(selectedId, text);
    setSending(false);
    if (result.ok) {
      toast.success('Cevap gönderildi.');
      setMessageInput('');
      await Promise.all([loadDetail(selectedId), loadList()]);
    } else {
      setMessageError(result.message);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedId || !detail) return;
    if (statusDraft === detail.status) return;
    setStatusUpdating(true);
    const result = await updateAdminSupportTicketStatus(selectedId, statusDraft);
    setStatusUpdating(false);
    if (result.ok) {
      toast.success('Talep durumu güncellendi.');
      await Promise.all([loadDetail(selectedId), loadList()]);
    } else {
      toast.error(result.message);
    }
  };

  const filteredCount = useMemo(() => tickets.length, [tickets]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Destek Talepleri</h2>
          <p className="text-gray-500 text-sm mt-0.5">Tüm tenant destek talepleri — görüntüle ve cevapla</p>
        </div>
        <button
          type="button"
          onClick={() => void loadList()}
          className="flex items-center gap-2 self-start px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Destek verileri yüklenemedi.</p>
              <p className="text-xs mt-0.5 opacity-90">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadList()}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <MetricCard label="Toplam" value={loading ? '…' : summary.total} />
        <MetricCard label="Açık" value={loading ? '…' : summary.open} />
        <MetricCard label="Yanıt Bekleyen" value={loading ? '…' : summary.waiting} />
        <MetricCard label="Çözülen" value={loading ? '…' : summary.resolved} />
        <MetricCard label="Kapalı" value={loading ? '…' : summary.closed} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                className={inputCls}
                value={statusFilter}
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
                onChange={e => setPriorityFilter(e.target.value as SupportTicketPriority | 'all')}
              >
                <option value="all">Öncelik: Tümü</option>
                <option value="low">Düşük</option>
                <option value="medium">Normal</option>
                <option value="high">Yüksek</option>
              </select>
              <input
                className={inputCls}
                placeholder="Tenant ID…"
                value={tenantFilter}
                onChange={e => setTenantFilter(e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Konu, talep no, mağaza…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">Talepler</h3>
              <span className="text-xs text-gray-500">{filteredCount} kayıt</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-800">
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Konu</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Öncelik</th>
                    <th className="px-4 py-3">Güncelleme</th>
                    <th className="px-4 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                        Yükleniyor…
                      </td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-gray-400">
                        Henüz destek talebi bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    tickets.map(t => (
                      <tr
                        key={t.id}
                        className={`border-b border-gray-800/60 last:border-0 ${
                          selectedId === t.id ? 'bg-blue-950/30' : 'hover:bg-gray-800/40'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-gray-400">#{t.id}</td>
                        <td className="px-4 py-3 text-gray-300 max-w-[140px] truncate">
                          {t.tenant?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">
                          {t.subject}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(t.status)}`}>
                            {statusLabel(t.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityBadgeClass(t.priority)}`}>
                            {priorityLabel(t.priority)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {formatSupportDate(t.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => selectTicket(t.id)}
                            className="text-xs font-medium text-blue-400 hover:text-blue-300"
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
          </div>
        </div>

        <div className="space-y-4">
          {!selectedId ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                Detay ve cevap için listeden bir talep seçin.
              </p>
            </div>
          ) : detailError ? (
            <div className="bg-gray-900 border border-red-900/50 rounded-xl p-4 text-sm text-red-300">
              <p className="font-medium">Talep detayı yüklenemedi.</p>
              <p className="text-xs mt-1 opacity-90">{detailError}</p>
              <button
                type="button"
                onClick={() => void loadDetail(selectedId)}
                className="mt-3 px-3 py-1.5 bg-gray-800 rounded-lg text-xs"
              >
                Tekrar Dene
              </button>
            </div>
          ) : detailLoading && !detail ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
            </div>
          ) : detail ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <p className="text-xs text-gray-500 font-mono">#{detail.id}</p>
                <h3 className="text-sm font-semibold text-white mt-1">{detail.subject}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {detail.tenant?.name ?? '—'}
                  {detail.tenant?.slug ? ` · ${detail.tenant.slug}` : ''}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(detail.status)}`}>
                    {statusLabel(detail.status)}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityBadgeClass(detail.priority)}`}>
                    {priorityLabel(detail.priority)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Oluşturulma: {formatSupportDate(detail.createdAt)}
                </p>
              </div>

              <div className="p-4 space-y-3 max-h-[320px] overflow-y-auto">
                {detail.messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="p-4 border-t border-gray-800 space-y-3">
                <label className="block text-[11px] text-gray-500 uppercase">Durum güncelle</label>
                <div className="flex gap-2">
                  <select
                    className={`${inputCls} flex-1`}
                    value={statusDraft}
                    onChange={e => setStatusDraft(e.target.value as SupportTicketStatus)}
                  >
                    <option value="open">Açık</option>
                    <option value="in_progress">Yanıt Bekleyen</option>
                    <option value="resolved">Çözüldü</option>
                    <option value="closed">Kapalı</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleStatusUpdate()}
                    disabled={statusUpdating || statusDraft === detail.status}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-xl disabled:opacity-50"
                  >
                    {statusUpdating ? '…' : 'Kaydet'}
                  </button>
                </div>

                <label className="block text-[11px] text-gray-500 uppercase">Cevap yaz</label>
                {messageError && (
                  <p className="text-xs text-red-400">{messageError}</p>
                )}
                <textarea
                  className={`${inputCls} min-h-[88px] resize-y`}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  placeholder="Destek cevabınız…"
                  disabled={sending || detail.status === 'closed'}
                />
                {detail.status === 'closed' && (
                  <p className="text-xs text-gray-500">Kapalı talep — durumu değiştirerek cevap verebilirsiniz.</p>
                )}
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !messageInput.trim() || detail.status === 'closed'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Cevap Gönder
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
