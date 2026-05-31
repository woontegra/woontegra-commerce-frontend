import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient, { extractErrorMessage } from '../services/apiClient';
import { notifyMarketplaceQuestionStatsRefresh } from '../hooks/useMarketplaceQuestionStats';

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

const ANSWER_MIN = 10;
const ANSWER_MAX = 2000;

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

function canAnswerQuestion(q: MarketplaceQuestion): boolean {
  return q.status === 'WAITING_ANSWER' && q.type === 'PRODUCT_QUESTION';
}

function QuestionDetailModal({
  question,
  onClose,
}: {
  question: MarketplaceQuestion;
  onClose:  () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Soru Detayı</h3>
            <p className="text-sm text-slate-500 mt-1">{question.sourceLabel} · {TYPE_LABEL[question.type]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Durum</p>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CLS[question.status]}`}>
              {STATUS_LABEL[question.status]}
            </span>
          </div>

          {question.productName && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ürün</p>
              <p className="text-slate-800 font-medium">{question.productName}</p>
              {question.barcode && (
                <p className="text-xs text-slate-500 mt-0.5">Barkod: {question.barcode}</p>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Müşteri</p>
            <p className="text-slate-700">{question.customerName ?? '—'}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Soru</p>
            <p className="text-slate-800 whitespace-pre-wrap">{question.questionText}</p>
            <p className="text-xs text-slate-400 mt-2">{fmtDate(question.askedAt)}</p>
          </div>

          {question.answerText && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cevap</p>
              <p className="text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-xl p-3 border border-slate-100">
                {question.answerText}
              </p>
              {question.answeredAt && (
                <p className="text-xs text-slate-400 mt-2">{fmtDate(question.answeredAt)}</p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function AnswerQuestionModal({
  question,
  onClose,
  onSubmit,
  loading,
}: {
  question: MarketplaceQuestion;
  onClose:  () => void;
  onSubmit: (text: string) => void;
  loading:  boolean;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length < ANSWER_MIN) {
      setError(`Cevap en az ${ANSWER_MIN} karakter olmalıdır.`);
      return;
    }
    if (trimmed.length > ANSWER_MAX) {
      setError(`Cevap en fazla ${ANSWER_MAX} karakter olabilir.`);
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  const charCount = text.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Soruyu Cevapla</h3>
          <p className="text-sm text-slate-500 mt-1">
            Cevabınız Trendyol onay sürecine gönderilecektir.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {question.productName && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ürün</p>
              <p className="text-sm font-medium text-slate-800">{question.productName}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Müşteri</p>
            <p className="text-sm text-slate-700">{question.customerName ?? '—'}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Soru</p>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{question.questionText}</p>
          </div>

          <div>
            <label htmlFor="answerText" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Cevabınız <span className="text-red-500">*</span>
            </label>
            <textarea
              id="answerText"
              value={text}
              onChange={e => {
                setText(e.target.value);
                if (error) setError('');
              }}
              rows={5}
              maxLength={ANSWER_MAX}
              placeholder="Müşteriye gönderilecek cevabı yazın…"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-y min-h-[120px]"
              disabled={loading}
              autoFocus
            />
            <div className="flex items-center justify-between mt-1.5">
              {error
                ? <p className="text-xs text-red-600">{error}</p>
                : <p className="text-xs text-slate-400">En az {ANSWER_MIN} karakter</p>
              }
              <p className={`text-xs ${charCount > ANSWER_MAX ? 'text-red-600' : 'text-slate-400'}`}>
                {charCount} / {ANSWER_MAX}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || text.trim().length < ANSWER_MIN}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Gönderiliyor…' : 'Cevabı Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
  const [detailQuestion, setDetailQuestion] = useState<MarketplaceQuestion | null>(null);
  const [answerQuestion, setAnswerQuestion] = useState<MarketplaceQuestion | null>(null);
  const [submitting, setSubmitting]         = useState(false);

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
      notifyMarketplaceQuestionStatsRefresh();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Sorular senkronize edilemedi.'));
    } finally {
      setSyncing(false);
    }
  };

  const handleAnswerSubmit = async (text: string) => {
    if (!answerQuestion) return;
    setSubmitting(true);
    try {
      await apiClient.post(
        `/marketplace-questions/${answerQuestion.id}/answer`,
        { text },
        { skipErrorToast: true, timeout: 60_000 },
      );
      toast.success('Cevap Trendyol\'a gönderildi. Onay süreci bekleniyor.');
      setAnswerQuestion(null);
      await fetchQuestions();
      notifyMarketplaceQuestionStatsRefresh();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Cevap gönderilemedi.'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="w-full space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Müşteri Soruları</h1>
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
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-[200px] flex-1 max-w-md"
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
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm w-full">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Kaynak</th>
                <th className="text-left px-4 py-3 font-semibold">Tip</th>
                <th className="text-left px-4 py-3 font-semibold">Müşteri</th>
                <th className="text-left px-4 py-3 font-semibold">Ürün / Soru</th>
                <th className="text-left px-4 py-3 font-semibold">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold">Durum</th>
                <th className="text-left px-4 py-3 font-semibold">İşlem</th>
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
                  <td className="px-4 py-3">
                    {q.productName && (
                      <p className="font-medium text-slate-800">{q.productName}</p>
                    )}
                    <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{q.questionText}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(q.askedAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CLS[q.status]}`}>
                      {STATUS_LABEL[q.status] ?? q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailQuestion(q)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        Detay
                      </button>
                      {canAnswerQuestion(q) ? (
                        <button
                          type="button"
                          onClick={() => setAnswerQuestion(q)}
                          className="text-xs font-semibold text-orange-700 hover:text-orange-900 px-2.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100"
                        >
                          Cevapla
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="Yalnızca cevap bekleyen ürün soruları cevaplanabilir"
                          className="text-xs font-semibold text-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-100 bg-slate-50 cursor-not-allowed"
                        >
                          Cevapla
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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

      {detailQuestion && (
        <QuestionDetailModal
          question={detailQuestion}
          onClose={() => setDetailQuestion(null)}
        />
      )}

      {answerQuestion && (
        <AnswerQuestionModal
          question={answerQuestion}
          onClose={() => !submitting && setAnswerQuestion(null)}
          onSubmit={handleAnswerSubmit}
          loading={submitting}
        />
      )}
    </div>
  );
}
