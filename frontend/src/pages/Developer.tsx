import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';
import { Table } from '../components/ui/Table';
import { useFeatureContext, PLAN_META } from '../context/FeatureContext';
import {
  type ApiTokenRow,
  type WebhookRow,
  TOKEN_SCOPES,
  WEBHOOK_EVENTS,
  computeSummary,
  fmtDate,
  fmtDateTime,
  getApiBaseUrl,
  scopeLabels,
  unwrapList,
  webhookEventLabel,
} from './developerPageHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookLog {
  id:         string;
  event:      string;
  success:    boolean;
  statusCode: number | null;
  attempts:   number;
  createdAt:  string;
}

type TabKey = 'tokens' | 'webhooks' | 'docs';

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300';

function SummaryMetric({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string | number;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold mt-1 tabular-nums leading-tight ${valueClassName ?? 'text-slate-900'}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`wn-card p-5 sm:p-6 space-y-4 ${className ?? ''}`}>
      <h3 className="text-[13px] font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-slate-100 text-[11px] font-mono p-4 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed">
      {children}
    </pre>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${
        active
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
          : 'bg-slate-100 text-slate-600 ring-slate-200'
      }`}
    >
      {active ? 'Aktif' : 'Devre dışı'}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Developer() {
  const { plan, isEnabled, loading: featureLoading } = useFeatureContext();
  const [tab, setTab] = useState<TabKey>('tokens');
  const [tokens, setTokens] = useState<ApiTokenRow[]>([]);
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const refreshSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const [tRes, hRes] = await Promise.all([
        api.get('/api-tokens'),
        api.get('/webhooks'),
      ]);
      setTokens(unwrapList<ApiTokenRow>((tRes.data as { data?: unknown })?.data ?? tRes.data));
      setHooks(unwrapList<WebhookRow>((hRes.data as { data?: unknown })?.data ?? hRes.data));
    } catch {
      /* tabs show their own errors */
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => { void refreshSummary(); }, [refreshSummary]);

  const summary = useMemo(() => computeSummary(tokens, hooks), [tokens, hooks]);

  const badgeLabel = plan === 'ENTERPRISE'
    ? PLAN_META.ENTERPRISE.label
    : isEnabled('api_access')
      ? 'Geliştirici erişimi aktif'
      : null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'tokens',   label: 'API Tokenları'  },
    { key: 'webhooks', label: 'Webhooklar'     },
    { key: 'docs',     label: 'Dokümantasyon'  },
  ];

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Geliştirici Merkezi
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
            API tokenları, webhooklar ve entegrasyon dokümantasyonu ile mağazanızı harici sistemlere bağlayın.
          </p>
        </div>
        {badgeLabel && !featureLoading && (
          <span className="inline-flex items-center self-start px-3 py-1.5 rounded-full text-[12px] font-medium bg-amber-50 text-amber-800 ring-1 ring-amber-100">
            {badgeLabel}
          </span>
        )}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryMetric
          label="Aktif API Token"
          value={summaryLoading ? '…' : summary.activeTokens}
        />
        <SummaryMetric
          label="Aktif Webhook"
          value={summaryLoading ? '…' : summary.activeWebhooks}
        />
        <SummaryMetric
          label="Saatlik Limit"
          value={summaryLoading ? '…' : summary.hourlyLimit}
          sub={summary.activeTokens === 0 && !summaryLoading ? 'token yok' : 'en yüksek aktif limit'}
        />
        <SummaryMetric
          label="Son API Kullanımı"
          value={summaryLoading ? '…' : summary.lastApiUsage}
        />
        <SummaryMetric
          label="Son Webhook Olayı"
          value={summaryLoading ? '…' : (summary.lastWebhookNote === 'Henüz yok' ? 'Henüz yok' : 'Kayıtlı')}
          sub={summary.lastWebhookNote !== 'Henüz yok' ? summary.lastWebhookNote : undefined}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition -mb-px ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'tokens' && (
        <ApiTokensTab
          initialTokens={tokens}
          onMutate={refreshSummary}
        />
      )}
      {tab === 'webhooks' && (
        <WebhooksTab
          initialHooks={hooks}
          onMutate={refreshSummary}
        />
      )}
      {tab === 'docs' && <DocsTab />}
    </div>
  );
}

// ─── API Tokens Tab ───────────────────────────────────────────────────────────

function ApiTokensTab({
  initialTokens,
  onMutate,
}: {
  initialTokens: ApiTokenRow[];
  onMutate: () => Promise<void>;
}) {
  const [tokens, setTokens] = useState<ApiTokenRow[]>(initialTokens);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const [form, setForm] = useState({
    name:          '',
    scopes:        [] as string[],
    rateLimit:     1000,
    expiresInDays: '' as string | number,
  });

  useEffect(() => { setTokens(initialTokens); }, [initialTokens]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api-tokens');
      setTokens(unwrapList<ApiTokenRow>((res.data as { data?: unknown })?.data ?? res.data));
      await onMutate();
    } catch {
      toast.error('Tokenlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [onMutate]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Token adı zorunlu.'); return; }
    setCreating(true);
    try {
      const res = await api.post('/api-tokens', {
        name:          form.name,
        scopes:        form.scopes,
        rateLimit:     form.rateLimit,
        expiresInDays: form.expiresInDays || undefined,
      });
      const data = (res.data as { data?: { token?: string } })?.data;
      setNewToken(data?.token ?? null);
      setForm({ name: '', scopes: [], rateLimit: 1000, expiresInDays: '' });
      toast.success('Token oluşturuldu.');
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Token silinsin mi? Bu işlem geri alınamaz.')) return;
    try {
      await api.delete(`/api-tokens/${id}`);
      toast.success('Token silindi.');
      await load();
    } catch {
      toast.error('Silinemedi.');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/api-tokens/${id}`, { isActive: !isActive });
      toast.success(isActive ? 'Devre dışı bırakıldı.' : 'Aktifleştirildi.');
      await load();
    } catch {
      toast.error('Güncellenemedi.');
    }
  };

  const tokenColumns = useMemo(() => [
    {
      key:    'name',
      header: 'Token adı',
      cell:   (row: ApiTokenRow) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      key:    'scopes',
      header: 'Yetkiler',
      cell:   (row: ApiTokenRow) => (
        <span className="text-[12px] text-slate-600 leading-snug">{scopeLabels(row.scopes)}</span>
      ),
    },
    {
      key:    'rateLimit',
      header: 'Rate limit',
      cell:   (row: ApiTokenRow) => (
        <span className="text-[13px] tabular-nums text-slate-700">{row.rateLimit.toLocaleString('tr-TR')}/sa</span>
      ),
    },
    {
      key:    'lastUsedAt',
      header: 'Son kullanım',
      cell:   (row: ApiTokenRow) => (
        <span className="text-[12px] text-slate-500">{fmtDate(row.lastUsedAt) ?? '—'}</span>
      ),
    },
    {
      key:    'createdAt',
      header: 'Oluşturulma',
      cell:   (row: ApiTokenRow) => (
        <span className="text-[12px] text-slate-500">{fmtDate(row.createdAt) ?? '—'}</span>
      ),
    },
    {
      key:    'status',
      header: 'Durum',
      cell:   (row: ApiTokenRow) => <StatusBadge active={row.isActive} />,
    },
    {
      key:    'actions',
      header: 'İşlem',
      align:  'right' as const,
      cell:   (row: ApiTokenRow) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              void navigator.clipboard.writeText(row.token).then(() => toast.success('Kopyalandı.'));
            }}
            className="text-[11px] px-2 py-1 rounded-lg text-indigo-600 hover:bg-indigo-50"
          >
            Kopyala
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); void handleToggle(row.id, row.isActive); }}
            className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            {row.isActive ? 'Durdur' : 'Aktifleştir'}
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); void handleDelete(row.id); }}
            className="text-[11px] px-2 py-1 rounded-lg text-red-600 hover:bg-red-50"
          >
            Sil
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">

      {newToken && (
        <div className="wn-card p-5 border-emerald-200 bg-emerald-50/60 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-emerald-800">Token oluşturuldu — şimdi kopyalayın</span>
            <span className="text-[11px] text-emerald-700/80">Bu token bir daha görüntülenmeyecek.</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <code className="flex-1 bg-white border border-emerald-200 px-3 py-2.5 rounded-xl text-[11px] font-mono text-slate-800 break-all">
              {newToken}
            </code>
            <button
              type="button"
              onClick={() => { void navigator.clipboard.writeText(newToken); toast.success('Kopyalandı!'); }}
              className="btn btn-primary text-[13px] shrink-0"
            >
              Kopyala
            </button>
          </div>
          <button type="button" onClick={() => setNewToken(null)} className="text-[12px] text-slate-500 hover:text-slate-700 underline underline-offset-2">
            Kapat
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Panel title="Yeni API Token oluştur">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Token adı *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Örn: Mobil uygulama, ERP entegrasyonu"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Rate limit (istek/saat)</label>
                <input
                  type="number"
                  value={form.rateLimit}
                  onChange={e => setForm(f => ({ ...f, rateLimit: +e.target.value }))}
                  className={inputCls}
                  min={1}
                  max={10000}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Son kullanım günü</label>
                <input
                  type="number"
                  value={form.expiresInDays}
                  onChange={e => setForm(f => ({ ...f, expiresInDays: e.target.value }))}
                  placeholder="Boş = sınırsız"
                  className={inputCls}
                  min={1}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Yetkiler (scopes)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOKEN_SCOPES.map(s => (
                  <label
                    key={s.key}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                      form.scopes.includes(s.key)
                        ? 'border-indigo-200 bg-indigo-50/60 ring-1 ring-indigo-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.scopes.includes(s.key)}
                      onChange={e => setForm(f => ({
                        ...f,
                        scopes: e.target.checked
                          ? [...f.scopes, s.key]
                          : f.scopes.filter(x => x !== s.key),
                      }))}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-[13px] text-slate-700">{s.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-[12px] text-slate-400 mt-2">Boş bırakılırsa tam erişim verilir.</p>
            </div>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
              className="btn btn-primary w-full sm:w-auto text-[13px]"
            >
              {creating ? 'Oluşturuluyor…' : 'Token oluştur'}
            </button>
          </div>
        </Panel>

        <Panel title="Güvenlik notları">
          <ul className="space-y-3 text-[13px] text-slate-600 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">•</span>
              <span>Token yalnızca oluşturulduğu anda bir kez görüntülenir; tekrar gösterilemez.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">•</span>
              <span>Tokenı güvenli bir yerde saklayın; frontend koduna veya public depolara koymayın.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">•</span>
              <span>Gereksiz yetki vermeyin — yetkileri minimumda tutun.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">•</span>
              <span>Kullanmadığınız tokenları iptal edin veya silin.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">•</span>
              <span>Şüpheli erişim fark ederseniz tokenı hemen devre dışı bırakın.</span>
            </li>
          </ul>
        </Panel>
      </div>

      <div className="wn-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[13px] font-semibold text-slate-800">API Tokenları</h3>
          <p className="text-[12px] text-slate-500 mt-0.5">{tokens.length} kayıt</p>
        </div>
        <Table
          data={tokens}
          columns={tokenColumns}
          keyExtractor={row => row.id}
          loading={loading}
          stickyHeader
          emptyState={
            <div className="empty-state py-14 px-6">
              <div className="empty-state-icon">
                <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <p className="empty-state-title">Henüz API token oluşturulmamış.</p>
              <p className="empty-state-desc mx-auto max-w-md">
                Harici sistemlerin mağazanıza güvenli erişmesi için yukarıdan bir token oluşturabilirsiniz.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}

// ─── Webhooks Tab ─────────────────────────────────────────────────────────────

function WebhooksTab({
  initialHooks,
  onMutate,
}: {
  initialHooks: WebhookRow[];
  onMutate: () => Promise<void>;
}) {
  const [hooks, setHooks] = useState<WebhookRow[]>(initialHooks);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [logsFor, setLogsFor] = useState<string | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [form, setForm] = useState({ url: '', events: [] as string[], description: '' });

  useEffect(() => { setHooks(initialHooks); }, [initialHooks]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/webhooks');
      setHooks(unwrapList<WebhookRow>((res.data as { data?: unknown })?.data ?? res.data));
      await onMutate();
    } catch {
      toast.error('Webhooklar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [onMutate]);

  const handleCreate = async () => {
    if (!form.url.trim())    { toast.error('URL zorunlu.'); return; }
    if (!form.events.length) { toast.error('En az bir olay seçin.'); return; }
    setCreating(true);
    try {
      await api.post('/webhooks', form);
      toast.success('Webhook oluşturuldu.');
      setForm({ url: '', events: [], description: '' });
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Webhook silinsin mi?')) return;
    try {
      await api.delete(`/webhooks/${id}`);
      toast.success('Silindi.');
      if (logsFor === id) setLogsFor(null);
      await load();
    } catch {
      toast.error('Silinemedi.');
    }
  };

  const handleTest = async (id: string) => {
    try {
      const res = await api.post(`/webhooks/${id}/test`);
      const { success } = (res.data as { data?: { success?: boolean } })?.data ?? {};
      toast[success ? 'success' : 'error'](success ? 'Test başarılı!' : 'Test başarısız.');
    } catch {
      toast.error('Test gönderilemedi.');
    }
  };

  const handleRotate = async (id: string) => {
    if (!confirm('Signing secret yenilensin mi? Eski secret geçersiz olur.')) return;
    try {
      const res = await api.post(`/webhooks/${id}/rotate-secret`);
      const { secret } = (res.data as { data?: { secret?: string } })?.data ?? {};
      if (secret) {
        await navigator.clipboard.writeText(secret);
        toast.success('Yeni secret kopyalandı!');
      }
      await load();
    } catch {
      toast.error('Yenilenemedi.');
    }
  };

  const loadLogs = async (id: string) => {
    if (logsFor === id) {
      setLogsFor(null);
      return;
    }
    setLogsFor(id);
    setLogsLoading(true);
    try {
      const res = await api.get(`/webhooks/${id}/logs`);
      setLogs((res.data as { data?: { logs?: WebhookLog[] } })?.data?.logs ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const hookColumns = useMemo(() => [
    {
      key:    'url',
      header: 'Webhook URL',
      cell:   (row: WebhookRow) => (
        <code className="text-[12px] font-mono text-indigo-700 truncate max-w-[240px] block" title={row.url}>
          {row.url}
        </code>
      ),
    },
    {
      key:    'events',
      header: 'Olaylar',
      cell:   (row: WebhookRow) => (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {row.events.slice(0, 3).map(ev => (
            <span key={ev} className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded font-mono">{ev}</span>
          ))}
          {row.events.length > 3 && (
            <span className="text-[10px] text-slate-400">+{row.events.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key:    'description',
      header: 'Açıklama',
      cell:   (row: WebhookRow) => (
        <span className="text-[12px] text-slate-500">{row.description || '—'}</span>
      ),
    },
    {
      key:    'secret',
      header: 'Secret',
      cell:   (row: WebhookRow) => (
        <code className="text-[11px] font-mono text-slate-500">{row.secret.slice(0, 8)}••••</code>
      ),
    },
    {
      key:    'deliveries',
      header: 'Teslimat',
      cell:   (row: WebhookRow) => (
        <span className="text-[13px] tabular-nums text-slate-700">{row._count?.logs ?? 0}</span>
      ),
    },
    {
      key:    'status',
      header: 'Durum',
      cell:   (row: WebhookRow) => <StatusBadge active={row.isActive} />,
    },
    {
      key:    'actions',
      header: 'İşlem',
      align:  'right' as const,
      cell:   (row: WebhookRow) => (
        <div className="flex flex-wrap items-center justify-end gap-1">
          <button type="button" onClick={e => { e.stopPropagation(); void handleTest(row.id); }}
            className="text-[11px] px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
            Test
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); void loadLogs(row.id); }}
            className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Loglar
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); void handleRotate(row.id); }}
            className="text-[11px] px-2 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50">
            Secret
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); void handleDelete(row.id); }}
            className="text-[11px] px-2 py-1 rounded-lg text-red-600 hover:bg-red-50">
            Sil
          </button>
        </div>
      ),
    },
  ], [logsFor]);

  const featuredEvents = [
    'order.created', 'order.updated', 'product.updated', 'payment.success',
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Panel title="Yeni webhook">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Webhook URL *</label>
              <input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://siteniz.com/webhooks/woontegra"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Açıklama</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Örn: Sipariş bildirimleri"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Olaylar *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {WEBHOOK_EVENTS.map(ev => (
                  <label
                    key={ev}
                    className={`flex items-start gap-2 px-3 py-2 rounded-xl border cursor-pointer transition ${
                      form.events.includes(ev)
                        ? 'border-indigo-200 bg-indigo-50/60'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.events.includes(ev)}
                      onChange={e => setForm(f => ({
                        ...f,
                        events: e.target.checked ? [...f.events, ev] : f.events.filter(x => x !== ev),
                      }))}
                      className="w-3.5 h-3.5 mt-0.5 rounded text-indigo-600 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-mono text-slate-700">{ev}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{webhookEventLabel(ev)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
              className="btn btn-primary text-[13px]"
            >
              {creating ? 'Oluşturuluyor…' : 'Webhook oluştur'}
            </button>
          </div>
        </Panel>

        <Panel title="Webhooklar hakkında">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Webhooklar ile sipariş oluşturuldu, ürün güncellendi, ödeme alındı gibi olayları
            harici sistemlere anlık iletebilirsiniz. Her istek HMAC imzası ile doğrulanır.
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 space-y-2">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Öne çıkan olaylar</p>
            <ul className="space-y-1.5">
              {featuredEvents.map(ev => (
                <li key={ev} className="flex items-center gap-2 text-[12px]">
                  <code className="font-mono text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-100">{ev}</code>
                  <span className="text-slate-500">{webhookEventLabel(ev)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <div className="wn-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[13px] font-semibold text-slate-800">Kayıtlı webhooklar</h3>
          <p className="text-[12px] text-slate-500 mt-0.5">{hooks.length} kayıt</p>
        </div>
        <Table
          data={hooks}
          columns={hookColumns}
          keyExtractor={row => row.id}
          loading={loading}
          stickyHeader
          emptyState={
            <div className="empty-state py-14 px-6">
              <div className="empty-state-icon">
                <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="empty-state-title">Henüz webhook tanımlanmamış.</p>
              <p className="empty-state-desc mx-auto max-w-md">
                Harici sistemlerinize olay bildirimi göndermek için sol taraftan bir webhook endpoint&apos;i ekleyin.
              </p>
            </div>
          }
        />
      </div>

      {logsFor && (
        <div className="wn-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-[13px] font-semibold text-slate-800">Son teslimatlar</h4>
            <button type="button" onClick={() => setLogsFor(null)} className="text-[12px] text-slate-500 hover:text-slate-700">
              Kapat
            </button>
          </div>
          {logsLoading ? (
            <p className="text-[13px] text-slate-400 py-4 text-center">Yükleniyor…</p>
          ) : logs.length === 0 ? (
            <p className="text-[13px] text-slate-400 py-4 text-center">Henüz teslimat kaydı yok.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map(l => (
                <div key={l.id} className="flex flex-wrap items-center gap-3 py-2.5 text-[12px]">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${l.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <code className="font-mono text-slate-600">{l.event}</code>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    l.statusCode && l.statusCode < 300 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {l.statusCode ?? 'hata'}
                  </span>
                  <span className="text-slate-400">{l.attempts} deneme</span>
                  <span className="text-slate-400 ml-auto">{fmtDateTime(l.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Docs Tab ─────────────────────────────────────────────────────────────────

function DocsTab() {
  const baseUrl = getApiBaseUrl();

  return (
    <div className="space-y-6">
      <div className="wn-card px-4 py-3.5 border-indigo-100/80 bg-indigo-50/40">
        <p className="text-[13px] text-slate-700 leading-relaxed">
          <strong className="font-medium">Public API endpoint kataloğu</strong> bir sonraki fazda yayınlanacaktır.
          Aşağıda kimlik doğrulama, rate limit ve webhook imzalama bilgileri yer almaktadır.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Kimlik doğrulama">
          <div className="space-y-4 text-[13px] text-slate-600 leading-relaxed">
            <p>
              Woontegra API istekleri{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px]">Authorization: Bearer TOKEN</code>{' '}
              header&apos;ı ile kimlik doğrulanır.
            </p>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Base URL</p>
              <CodeBlock>{`${baseUrl}/api`}</CodeBlock>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Örnek Authorization header</p>
              <CodeBlock>{`Authorization: Bearer wnt_YOUR_API_TOKEN`}</CodeBlock>
            </div>
          </div>
        </Panel>

        <Panel title="Rate limit">
          <div className="space-y-3 text-[13px] text-slate-600 leading-relaxed">
            <p>Her API token için saatlik istek limiti tanımlanır. Limit aşıldığında API <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">429</code> döner.</p>
            <ul className="space-y-2">
              <li className="flex gap-2"><span className="text-indigo-500">•</span>Varsayılan limit token oluştururken belirlenir.</li>
              <li className="flex gap-2"><span className="text-indigo-500">•</span>Aktif token limitinizi üst özet kartından görebilirsiniz.</li>
              <li className="flex gap-2"><span className="text-indigo-500">•</span>Yoğun entegrasyonlar için limit artışı talep edebilirsiniz.</li>
            </ul>
          </div>
        </Panel>
      </div>

      <Panel title="Token yetkileri (scopes)">
        <p className="text-[13px] text-slate-500 mb-4">
          Token oluştururken seçebileceğiniz yetki alanları. Boş bırakıldığında tam erişim verilir.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="py-2 pr-4 text-[11px] font-medium text-slate-400 uppercase tracking-wide">Yetki</th>
                <th className="py-2 text-[11px] font-medium text-slate-400 uppercase tracking-wide">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {TOKEN_SCOPES.map(s => (
                <tr key={s.key}>
                  <td className="py-2.5 pr-4">
                    <code className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{s.key}</code>
                  </td>
                  <td className="py-2.5 text-slate-600">{s.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Webhook doğrulama (HMAC-SHA256)">
          <div className="space-y-3 text-[13px] text-slate-600 leading-relaxed">
            <p>
              Her webhook isteği{' '}
              <code className="px-1 py-0.5 rounded bg-slate-100 font-mono text-[11px]">X-Woontegra-Sig</code>{' '}
              header&apos;ı ile imzalanır.
            </p>
            <CodeBlock>{`const crypto = require('crypto');

function verify(secret, rawBody, signature) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}`}</CodeBlock>
          </div>
        </Panel>

        <Panel title="Webhook payload örneği">
          <CodeBlock>{`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "order.created",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "tenantId": "tenant-uuid",
  "data": {
    "orderId": "order-uuid",
    "orderNumber": "ORD-1234",
    "totalAmount": 299.99,
    "currency": "TRY"
  }
}`}</CodeBlock>
        </Panel>
      </div>
    </div>
  );
}
