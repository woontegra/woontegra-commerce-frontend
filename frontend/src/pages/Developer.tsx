import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiToken {
  id:         string;
  name:       string;
  token:      string;
  scopes:     string[];
  rateLimit:  number;
  lastUsedAt: string | null;
  expiresAt:  string | null;
  isActive:   boolean;
  createdAt:  string;
}

interface Webhook {
  id:          string;
  url:         string;
  events:      string[];
  description: string | null;
  isActive:    boolean;
  secret:      string;
  createdAt:   string;
  _count:      { logs: number };
}

interface WebhookLog {
  id:         string;
  event:      string;
  success:    boolean;
  statusCode: number | null;
  attempts:   number;
  createdAt:  string;
}

// ─── Available scopes ────────────────────────────────────────────────────────

const SCOPES = [
  { key: 'products:read',   label: 'Ürünler (okuma)'   },
  { key: 'orders:read',     label: 'Siparişler (okuma)' },
  { key: 'orders:write',    label: 'Siparişler (yazma)' },
  { key: 'customers:read',  label: 'Müşteriler (okuma)' },
  { key: 'customers:write', label: 'Müşteriler (yazma)' },
];

const WEBHOOK_EVENTS = [
  'order.created', 'order.updated', 'order.deleted',
  'payment.success', 'payment.failed',
  'subscription.activated', 'subscription.canceled',
  'product.created', 'product.updated', 'product.deleted',
  'customer.created', 'customer.updated',
  'trial.ending_soon', 'trial.expired', 'tenant.suspended',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Developer() {
  const [tab, setTab] = useState<'tokens' | 'webhooks' | 'docs'>('tokens');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Geliştirici Ayarları</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Public API erişimi, webhook yönetimi ve entegrasyon dokümantasyonu
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {([
          { key: 'tokens',   label: '🔑 API Tokenları' },
          { key: 'webhooks', label: '🔔 Webhooklar'    },
          { key: 'docs',     label: '📖 Dokümantasyon' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'tokens'   && <ApiTokensTab />}
      {tab === 'webhooks' && <WebhooksTab />}
      {tab === 'docs'     && <DocsTab />}
    </div>
  );
}

// ─── API Tokens Tab ───────────────────────────────────────────────────────────

function ApiTokensTab() {
  const [tokens,   setTokens]   = useState<ApiToken[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const [form, setForm] = useState({
    name:          '',
    scopes:        [] as string[],
    rateLimit:     1000,
    expiresInDays: '' as string | number,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api-tokens');
      setTokens((res.data as any).data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      const data = (res.data as any).data;
      setNewToken(data.token);
      setForm({ name: '', scopes: [], rateLimit: 1000, expiresInDays: '' });
      toast.success('Token oluşturuldu.');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Oluşturulamadı.');
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Token silinsin mi?')) return;
    try {
      await api.delete(`/api-tokens/${id}`);
      toast.success('Token silindi.');
      await load();
    } catch { toast.error('Silinemedi.'); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/api-tokens/${id}`, { isActive: !isActive });
      toast.success(isActive ? 'Devre dışı bırakıldı.' : 'Aktifleştirildi.');
      await load();
    } catch { toast.error('Güncellenemedi.'); }
  };

  return (
    <div className="space-y-6">
      {/* New token revealed */}
      {newToken && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400 font-semibold text-sm">✅ Token oluşturuldu — Şimdi kopyalayın!</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Bir daha gösterilmeyecek.</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
              {newToken}
            </code>
            <button onClick={() => { navigator.clipboard.writeText(newToken); toast.success('Kopyalandı!'); }}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition">
              Kopyala
            </button>
          </div>
          <button onClick={() => setNewToken(null)} className="text-xs text-gray-500 underline">Kapat</button>
        </div>
      )}

      {/* Create form */}
      <Card title="Yeni API Token">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Token Adı *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Örn: Mobil Uygulama" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Rate Limit (istek/saat)</label>
            <input type="number" value={form.rateLimit} onChange={e => setForm(f => ({ ...f, rateLimit: +e.target.value }))}
              className={inputCls} min={1} max={10000} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Son Kullanma (gün, boş = sınırsız)</label>
            <input type="number" value={form.expiresInDays} onChange={e => setForm(f => ({ ...f, expiresInDays: e.target.value }))}
              placeholder="30" className={inputCls} min={1} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Yetkiler (Scopes)</label>
            <div className="flex flex-wrap gap-2">
              {SCOPES.map(s => (
                <label key={s.key} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.scopes.includes(s.key)}
                    onChange={e => setForm(f => ({
                      ...f,
                      scopes: e.target.checked ? [...f.scopes, s.key] : f.scopes.filter(x => x !== s.key),
                    }))}
                    className="w-3.5 h-3.5 rounded text-blue-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{s.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Boş bırakılırsa tam erişim.</p>
          </div>
        </div>
        <button onClick={handleCreate} disabled={creating}
          className="mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
          {creating ? 'Oluşturuluyor...' : '+ Token Oluştur'}
        </button>
      </Card>

      {/* Token list */}
      <Card title={`API Tokenları (${tokens.length})`}>
        {loading ? <Spinner /> : tokens.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">Henüz token yok.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {tokens.map(t => (
              <div key={t.id} className="py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{t.name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${t.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                      {t.isActive ? 'Aktif' : 'Devre dışı'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gray-400 dark:text-gray-500">
                    {t.token.slice(0, 12)}••••••••{t.token.slice(-6)}
                    <button onClick={() => { navigator.clipboard.writeText(t.token); toast.success('Kopyalandı!'); }}
                      className="ml-2 text-blue-500 hover:text-blue-600 text-xs">kopyala</button>
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {t.scopes.length > 0 && <span>Scope: {t.scopes.join(', ')}</span>}
                    <span>Limit: {t.rateLimit}/sa</span>
                    {t.lastUsedAt && <span>Son: {new Date(t.lastUsedAt).toLocaleDateString('tr-TR')}</span>}
                    {t.expiresAt  && <span>Bitiş: {new Date(t.expiresAt).toLocaleDateString('tr-TR')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleToggle(t.id, t.isActive)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    {t.isActive ? 'Durdur' : 'Aktifleştir'}
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition">
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Webhooks Tab ─────────────────────────────────────────────────────────────

function WebhooksTab() {
  const [hooks,    setHooks]    = useState<Webhook[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [logsFor,  setLogsFor]  = useState<string | null>(null);
  const [logs,     setLogs]     = useState<WebhookLog[]>([]);

  const [form, setForm] = useState({ url: '', events: [] as string[], description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/webhooks');
      setHooks((res.data as any).data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.url.trim())    { toast.error('URL zorunlu.'); return; }
    if (!form.events.length) { toast.error('En az bir event seçin.'); return; }
    setCreating(true);
    try {
      await api.post('/webhooks', form);
      toast.success('Webhook oluşturuldu.');
      setForm({ url: '', events: [], description: '' });
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Oluşturulamadı.');
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Webhook silinsin mi?')) return;
    try { await api.delete(`/webhooks/${id}`); toast.success('Silindi.'); await load(); }
    catch { toast.error('Silinemedi.'); }
  };

  const handleTest = async (id: string) => {
    try {
      const res = await api.post(`/webhooks/${id}/test`);
      const { success } = (res.data as any).data;
      toast[success ? 'success' : 'error'](success ? 'Test başarılı!' : 'Test başarısız.');
    } catch { toast.error('Test gönderilemedi.'); }
  };

  const handleRotate = async (id: string) => {
    if (!confirm('Signing secret yenilensin mi?')) return;
    try {
      const res = await api.post(`/webhooks/${id}/rotate-secret`);
      const { secret } = (res.data as any).data;
      navigator.clipboard.writeText(secret);
      toast.success('Yeni secret kopyalandı!');
      await load();
    } catch { toast.error('Yenilenemedi.'); }
  };

  const loadLogs = async (id: string) => {
    setLogsFor(id);
    try {
      const res = await api.get(`/webhooks/${id}/logs`);
      setLogs((res.data as any).data?.logs ?? []);
    } catch { setLogs([]); }
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card title="Yeni Webhook">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Endpoint URL *</label>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://siteniz.com/webhooks" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Açıklama</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Örn: Sipariş bildirimleri" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Olaylar *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WEBHOOK_EVENTS.map(ev => (
                <label key={ev} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.events.includes(ev)}
                    onChange={e => setForm(f => ({
                      ...f,
                      events: e.target.checked ? [...f.events, ev] : f.events.filter(x => x !== ev),
                    }))}
                    className="w-3.5 h-3.5 rounded text-blue-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
            {creating ? 'Oluşturuluyor...' : '+ Webhook Oluştur'}
          </button>
        </div>
      </Card>

      {/* List */}
      <Card title={`Webhooklar (${hooks.length})`}>
        {loading ? <Spinner /> : hooks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Henüz webhook yok.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {hooks.map(h => (
              <div key={h.id} className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${h.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <code className="text-sm font-mono text-blue-600 dark:text-blue-400 truncate max-w-xs">{h.url}</code>
                    </div>
                    {h.description && <p className="text-xs text-gray-500">{h.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {h.events.map(ev => (
                        <span key={ev} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded font-mono">{ev}</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      Secret: <code className="font-mono">{h.secret.slice(0, 8)}••••</code>
                      &nbsp;·&nbsp;{h._count.logs} teslimat
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => handleTest(h.id)}
                      className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition">
                      Test Et
                    </button>
                    <button onClick={() => loadLogs(h.id === logsFor ? null as any : h.id)}
                      className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      Loglar
                    </button>
                    <button onClick={() => handleRotate(h.id)}
                      className="text-xs px-3 py-1.5 border border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition">
                      Secret Yenile
                    </button>
                    <button onClick={() => handleDelete(h.id)}
                      className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition">
                      Sil
                    </button>
                  </div>
                </div>

                {/* Log panel */}
                {logsFor === h.id && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Son Teslimatlar</p>
                    {logs.length === 0 ? (
                      <p className="text-xs text-gray-400">Henüz teslimat yok.</p>
                    ) : logs.map(l => (
                      <div key={l.id} className="flex items-center gap-3 text-xs">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${l.success ? 'bg-green-500' : 'bg-red-500'}`} />
                        <code className="font-mono text-gray-600 dark:text-gray-400">{l.event}</code>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          l.statusCode && l.statusCode < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{l.statusCode ?? 'hata'}</span>
                        <span className="text-gray-400">{l.attempts} deneme</span>
                        <span className="text-gray-400 ml-auto">{new Date(l.createdAt).toLocaleString('tr-TR')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Docs Tab ─────────────────────────────────────────────────────────────────

function DocsTab() {
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');

  return (
    <div className="space-y-6">
      <Card title="Hızlı Başlangıç">
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <p>Woontegra Public API, <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono text-xs">Bearer TOKEN</code> ile kimlik doğrulaması yapar.</p>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Base URL</p>
            <CodeBlock>{`${baseUrl}/api/v1`}</CodeBlock>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Örnek istek</p>
            <CodeBlock>{`curl ${baseUrl}/api/v1/products \\
  -H "Authorization: Bearer wnt_YOUR_TOKEN"`}</CodeBlock>
          </div>
        </div>
      </Card>

      <Card title="Endpointler">
        <div className="space-y-3">
          {[
            { method: 'GET',  path: '/api/v1/products',       scope: 'products:read',   desc: 'Ürün listesi'       },
            { method: 'GET',  path: '/api/v1/products/:id',   scope: 'products:read',   desc: 'Ürün detayı'        },
            { method: 'GET',  path: '/api/v1/orders',         scope: 'orders:read',     desc: 'Sipariş listesi'    },
            { method: 'POST', path: '/api/v1/orders',         scope: 'orders:write',    desc: 'Sipariş oluştur'    },
            { method: 'GET',  path: '/api/v1/orders/:id',     scope: 'orders:read',     desc: 'Sipariş detayı'     },
            { method: 'GET',  path: '/api/v1/customers',      scope: 'customers:read',  desc: 'Müşteri listesi'    },
            { method: 'POST', path: '/api/v1/customers',      scope: 'customers:write', desc: 'Müşteri oluştur'    },
            { method: 'GET',  path: '/api/v1/customers/:id',  scope: 'customers:read',  desc: 'Müşteri detayı'     },
          ].map(e => (
            <div key={e.path} className="flex items-center gap-3 text-xs py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] w-12 text-center ${
                e.method === 'GET' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                   : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              }`}>{e.method}</span>
              <code className="font-mono text-gray-700 dark:text-gray-300 flex-1">{e.path}</code>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono">{e.scope}</span>
              <span className="text-gray-500 dark:text-gray-400 min-w-[120px] text-right">{e.desc}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Webhook Doğrulama (HMAC-SHA256)">
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <p>Her webhook isteği <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded font-mono text-xs">X-Woontegra-Sig</code> header'ı ile imzalanır.</p>
          <CodeBlock>{`// Node.js doğrulama örneği
const crypto = require('crypto');

function verify(secret, rawBody, signature) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// Express middleware
app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-woontegra-sig'];
  if (!verify(process.env.WEBHOOK_SECRET, req.body, sig)) {
    return res.status(401).send('Invalid signature');
  }
  const event = JSON.parse(req.body);
  console.log('Event:', event.event, event.data);
  res.sendStatus(200);
});`}</CodeBlock>
        </div>
      </Card>

      <Card title="Webhook Payload Örneği">
        <CodeBlock>{`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "order.created",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "tenantId": "tenant-uuid",
  "data": {
    "orderId": "order-uuid",
    "orderNumber": "ORD-1234",
    "totalAmount": 299.99,
    "currency": "TRY",
    "customerEmail": "musteri@ornek.com"
  }
}`}</CodeBlock>
      </Card>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputCls = 'w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 text-xs font-mono p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
