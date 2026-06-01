import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
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
  type SupportTicketPriority,
  type SupportTicketStatus,
} from './supportPageHelpers';
import {
  createSupportTicket,
  fetchSupportTickets,
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

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const stats = summary;
  const filtered = useMemo(
    () => filterTickets(tickets, statusFilter, priorityFilter, search),
    [tickets, statusFilter, priorityFilter, search],
  );

  const canCreate = moduleState === 'available';
  const filtersDisabled = moduleState !== 'available';

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
      void loadTickets();
    } else {
      toast.error(result.message);
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
                          <tr key={ticket.id} className="border-b border-slate-50 last:border-0">
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
                                onClick={() => {
                                  setActiveTab('chat');
                                  toast('Mesajlaşma detayı sonraki fazda aktif edilecektir.', { icon: 'ℹ️' });
                                }}
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
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-[14px] font-medium text-slate-800">
                  Mesajlaşma modülü sonraki fazda aktif edilecek.
                </p>
                <p className="text-[12px] text-slate-500 mt-2 max-w-md mx-auto">
                  Destek talebi detayı ve mesaj geçmişi backend entegrasyonu tamamlandığında
                  bu sekmeden yönetilebilecek.
                </p>
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
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
                <span>Aktif filtre</span>
                <span className="font-medium text-slate-800">
                  {statusLabel(statusFilter)} · {priorityLabel(priorityFilter)}
                </span>
              </li>
            </ul>
          </Panel>

          <Panel title="Bilgilendirme">
            <p className="text-[12px] text-slate-600 leading-relaxed">
              Destek talepleri oluşturma ve mesajlaşma modülü tenant panelinde kademeli olarak
              devreye alınacaktır. Bağlantı sorunlarında yalnızca &quot;Tekrar Dene&quot; ile
              yeniden istek gönderilir; otomatik tekrar yapılmaz.
            </p>
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
