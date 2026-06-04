import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Archive, Mail, MailOpen } from 'lucide-react';
import { Table } from '../components/ui/Table';
import {
  fetchContactMessage,
  fetchContactMessages,
  updateContactMessageStatus,
} from '../services/contactMessage.service';
import type { ContactMessage, ContactMessageStatus } from '../types/contactMessage';

const STATUS_LABELS: Record<ContactMessageStatus, string> = {
  NEW: 'Yeni',
  READ: 'Okundu',
  ARCHIVED: 'Arşiv',
};

const STATUS_STYLE: Record<ContactMessageStatus, string> = {
  NEW: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100',
  READ: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  ARCHIVED: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: ContactMessageStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function ContactMessagesManagement() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'' | ContactMessageStatus>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchContactMessages(filter || undefined);
      setMessages(rows);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Mesajlar yüklenemedi.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void fetchContactMessage(selectedId)
      .then(row => {
        if (!cancelled) setDetail(row);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Mesaj detayı yüklenemedi.');
          setSelectedId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const newCount = useMemo(() => messages.filter(m => m.status === 'NEW').length, [messages]);

  const setStatus = async (id: string, status: ContactMessageStatus) => {
    setUpdating(true);
    try {
      const updated = await updateContactMessageStatus(id, status);
      setMessages(prev => prev.map(m => (m.id === id ? updated : m)));
      if (detail?.id === id) setDetail(updated);
      toast.success('Durum güncellendi.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Güncelleme başarısız.');
    } finally {
      setUpdating(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Ad',
      cell: (row: ContactMessage) => (
        <button
          type="button"
          onClick={() => setSelectedId(row.id)}
          className="text-left font-medium text-slate-900 hover:text-indigo-600"
        >
          {row.name}
        </button>
      ),
    },
    {
      key: 'email',
      header: 'E-posta',
      cell: (row: ContactMessage) => (
        <a href={`mailto:${row.email}`} className="text-indigo-600 hover:underline text-[13px]">
          {row.email}
        </a>
      ),
    },
    {
      key: 'subject',
      header: 'Konu',
      cell: (row: ContactMessage) => (
        <span className="text-[13px] text-slate-700 line-clamp-1 max-w-[200px]">{row.subject}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Tarih',
      cell: (row: ContactMessage) => (
        <span className="text-[12px] text-slate-500 tabular-nums">{fmtDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      cell: (row: ContactMessage) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="w-full space-y-6 pb-10 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            İletişim Mesajları
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xl">
            Vitrin iletişim formundan gelen mesajları görüntüleyin ve yönetin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-slate-500">Filtre</label>
          <select
            className="border border-slate-200 rounded-lg text-[13px] px-3 py-2 bg-white"
            value={filter}
            onChange={e => setFilter(e.target.value as '' | ContactMessageStatus)}
          >
            <option value="">Tümü</option>
            <option value="NEW">Yeni</option>
            <option value="READ">Okundu</option>
            <option value="ARCHIVED">Arşiv</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
        <div className="wn-card px-4 py-3 border border-slate-200/80">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Toplam</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{messages.length}</p>
        </div>
        <div className="wn-card px-4 py-3 border border-slate-200/80">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Yeni</p>
          <p className="text-xl font-semibold text-indigo-700 mt-1">{newCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 wn-card overflow-hidden border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <h2 className="text-[13px] font-semibold text-slate-800">Mesaj listesi</h2>
          </div>
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table
              data={messages}
              columns={columns}
              keyExtractor={row => row.id}
              stickyHeader
              emptyState={
                <div className="empty-state py-14 px-6">
                  <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="empty-state-title">Henüz mesaj yok</p>
                  <p className="empty-state-desc">
                    Müşteriler /store/iletisim sayfasından mesaj gönderdiğinde burada listelenir.
                  </p>
                </div>
              }
            />
          )}
        </div>

        <div className="xl:col-span-2 wn-card border border-slate-200 shadow-sm overflow-hidden min-h-[320px]">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <h2 className="text-[13px] font-semibold text-slate-800">Mesaj detayı</h2>
          </div>
          <div className="p-5">
            {!selectedId ? (
              <p className="text-[13px] text-slate-500 text-center py-12">Listeden bir mesaj seçin.</p>
            ) : detailLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{detail.name}</p>
                    <a
                      href={`mailto:${detail.email}`}
                      className="text-[13px] text-indigo-600 hover:underline"
                    >
                      {detail.email}
                    </a>
                    {detail.phone && (
                      <p className="text-[13px] text-slate-600 mt-0.5">{detail.phone}</p>
                    )}
                  </div>
                  <StatusBadge status={detail.status} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase">Konu</p>
                  <p className="text-[14px] text-slate-800 mt-0.5">{detail.subject}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase">Mesaj</p>
                  <p className="text-[14px] text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed">
                    {detail.message}
                  </p>
                </div>
                <p className="text-[12px] text-slate-400">{fmtDate(detail.createdAt)}</p>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {detail.status !== 'READ' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => void setStatus(detail.id, 'READ')}
                      className="btn btn-secondary text-[12px] inline-flex items-center gap-1.5"
                    >
                      <MailOpen className="w-3.5 h-3.5" />
                      Okundu
                    </button>
                  )}
                  {detail.status !== 'ARCHIVED' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => void setStatus(detail.id, 'ARCHIVED')}
                      className="btn btn-secondary text-[12px] inline-flex items-center gap-1.5"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Arşivle
                    </button>
                  )}
                  {detail.status !== 'NEW' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => void setStatus(detail.id, 'NEW')}
                      className="btn btn-secondary text-[12px]"
                    >
                      Yeni olarak işaretle
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
