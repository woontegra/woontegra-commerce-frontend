import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient, { extractErrorMessage } from '../services/apiClient';

type QuestionSource = 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'PAZARAMA' | 'WOONTEGRA' | 'AMAZON';
type QuestionStatus = 'WAITING_ANSWER' | 'PENDING_APPROVAL' | 'ANSWERED' | 'EXPIRED' | 'CLOSED';
type QuestionType = 'PRODUCT_QUESTION' | 'ORDER_QUESTION';

interface MarketplaceQuestion {
  id:                 string;
  source:             QuestionSource;
  sourceLabel:        string;
  type:               QuestionType;
  status:             QuestionStatus;
  questionText:       string;
  answerText:         string | null;
  customerName:       string | null;
  productName:        string | null;
  barcode:            string | null;
  askedAt:            string;
  answeredAt:         string | null;
}

const STATUS_LABEL: Record<QuestionStatus, string> = {
  WAITING_ANSWER:   'Cevap Bekliyor',
  PENDING_APPROVAL: 'Onay Bekliyor',
  ANSWERED:         'Cevaplandı',
  EXPIRED:          'Süresi Doldu',
  CLOSED:           'Kapalı',
};

const STATUS_CLS: Record<QuestionStatus, string> = {
  WAITING_ANSWER:   'bg-amber-50 text-amber-800 border-amber-200',
  PENDING_APPROVAL: 'bg-blue-50 text-blue-800 border-blue-200',
  ANSWERED:         'bg-emerald-50 text-emerald-800 border-emerald-200',
  EXPIRED:          'bg-red-50 text-red-700 border-red-200',
  CLOSED:           'bg-slate-100 text-slate-600 border-slate-200',
};

const TYPE_LABEL: Record<QuestionType, string> = {
  PRODUCT_QUESTION: 'Ürün Sorusu',
  ORDER_QUESTION:   'Sipariş Sorusu',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function truncate(text: string, max = 80) {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export default function MarketplaceQuestions() {
  const [items, setItems]       = useState<MarketplaceQuestion[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('TRENDYOL');
  const [search, setSearch]       = useState('');

  const limit = 20;

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(limit),
      });
      if (sourceFilter) params.set('source', sourceFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiClient.get<{ success: boolean; data: { items: MarketplaceQuestion[]; pagination: { total: number } } }>(
        `/marketplace-questions?${params}`,
      );
      const data = res.data?.data;
      setItems(data?.items ?? []);
      setTotal(data?.pagination?.total ?? 0);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Sorular yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [page, sourceFilter, statusFilter, search]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: { fetched: number; created: number; updated: number } }>(
        '/marketplace-questions/sync',
        { source: sourceFilter || 'TRENDYOL' },
        { timeout: 120_000 },
      );
      const d = res.data?.data;
      toast.success(
        `Senkron tamamlandı: ${d?.fetched ?? 0} soru çekildi, ${d?.created ?? 0} yeni, ${d?.updated ?? 0} güncellendi.`,
      );
      setPage(1);
      await fetchQuestions();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Sorular senkronize edilemedi.'));
    } finally {
      setSyncing(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Müşteri Soruları</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pazaryeri müşteri sorularını tek ekrandan görüntüleyin. İlk faz: Trendyol ürün soruları.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl
                     bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 transition-colors"
        >
          <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? 'Çekiliyor…' : 'Soruları Çek'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Tüm kaynaklar</option>
          <option value="TRENDYOL">Trendyol</option>
          <option value="HEPSIBURADA">Hepsiburada</option>
          <option value="N11">N11</option>
          <option value="PAZARAMA">Pazarama</option>
          <option value="WOONTEGRA">Woontegra</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Tüm durumlar</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Ürün, müşteri veya soru metni…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchQuestions(); } }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-[220px] flex-1"
        />
        <button
          type="button"
          onClick={() => { setPage(1); fetchQuestions(); }}
          className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          Ara
        </button>
      </div>

      {loading && (
        <p className="text-sm text-slate-500">Yükleniyor…</p>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-slate-600 font-medium">Henüz soru yok</p>
          <p className="text-sm text-slate-500 mt-2">
            Trendyol&apos;dan soruları almak için <strong>Soruları Çek</strong> butonuna tıklayın.
          </p>
          <Link
            to="/dashboard/trendyol-integration"
            className="inline-block mt-4 text-sm text-orange-600 hover:text-orange-800 font-medium"
          >
            Trendyol entegrasyonunu kontrol et →
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Kaynak</th>
                <th className="text-left px-4 py-3 font-semibold">Tip</th>
                <th className="text-left px-4 py-3 font-semibold">Müşteri</th>
                <th className="text-left px-4 py-3 font-semibold">Ürün / Soru</th>
                <th className="text-left px-4 py-3 font-semibold">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(q => (
                <tr key={q.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-100">
                      {q.sourceLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[q.type] ?? q.type}</td>
                  <td className="px-4 py-3 text-slate-700">{q.customerName ?? '—'}</td>
                  <td className="px-4 py-3 max-w-xs">
                    {q.productName && (
                      <p className="font-medium text-slate-800 truncate">{q.productName}</p>
                    )}
                    <p className="text-slate-500 text-xs mt-0.5">{truncate(q.questionText)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(q.askedAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CLS[q.status]}`}>
                      {STATUS_LABEL[q.status] ?? q.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{total} soru</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
            >
              Önceki
            </button>
            <span className="px-2 py-1.5">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
