import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Copy,
  Loader2,
  RefreshCw,
  ScrollText,
} from 'lucide-react';
import {
  observabilityApi,
  type AlertEntry,
  type BusinessMetrics,
  type LogEntry,
} from '../services/observability.service';

type Tab = 'logs' | 'alerts' | 'metrics';

const MODULES = ['', 'auth', 'billing', 'trendyol', 'xml', 'business', 'app'];
const LEVELS  = ['', 'info', 'warn', 'error'];

const METRIC_LABELS: Record<string, string> = {
  product_sent:           'Trendyol ürün gönderimi',
  xml_sync:               'XML senkron',
  payment_success:        'Başarılı ödeme',
  subscription_activated: 'Abonelik aktivasyonu',
};

const Observability: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('logs');

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gözlem & Loglar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sistem logları, hata uyarıları ve iş metrikleri — trace ID ile uçtan uca izleme
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {([
          { id: 'logs' as Tab, label: 'Log görüntüleyici', icon: ScrollText },
          { id: 'alerts' as Tab, label: 'Uyarı merkezi', icon: AlertTriangle },
          { id: 'metrics' as Tab, label: 'Metrikler', icon: BarChart3 },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'logs' && <LogsViewer />}
      {tab === 'alerts' && <AlertCenter navigate={navigate} />}
      {tab === 'metrics' && <MetricsDashboard />}
    </div>
  );
};

function LogsViewer() {
  const [data, setData] = useState<{ items: LogEntry[]; total: number; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [module, setModule] = useState('');
  const [level, setLevel] = useState('');
  const [traceId, setTraceId] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await observabilityApi.getLogs({
        page,
        limit: 30,
        module: module || undefined,
        level: level || undefined,
        traceId: traceId.trim() || undefined,
        search: search.trim() || undefined,
      });
      setData(r);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Loglar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, module, level, traceId, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search, module, level, traceId]);

  const copyTrace = (id: string | null) => {
    if (!id) return;
    void navigator.clipboard.writeText(id);
    toast.success('Trace ID kopyalandı');
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 items-end">
        <FilterSelect label="Modül" value={module} onChange={setModule} options={MODULES} />
        <FilterSelect label="Seviye" value={level} onChange={setLevel} options={LEVELS} />
        <input
          value={traceId}
          onChange={e => setTraceId(e.target.value)}
          placeholder="Trace ID"
          className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
        />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Mesaj / aksiyon ara…"
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button type="button" onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm">
          <RefreshCw className="w-4 h-4" /> Yenile
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading && !data ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Zaman</th>
                    <th className="px-4 py-3">Seviye</th>
                    <th className="px-4 py-3">Modül</th>
                    <th className="px-4 py-3">Aksiyon</th>
                    <th className="px-4 py-3">Trace</th>
                    <th className="px-4 py-3">Mesaj</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data?.items ?? []).length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Kayıt yok — yeni loglar işlem yaptıkça görünür</td></tr>
                  ) : (
                    data?.items.map(row => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                          {new Date(row.createdAt).toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-2"><LevelBadge level={row.level} /></td>
                        <td className="px-4 py-2 text-xs font-medium">{row.module}</td>
                        <td className="px-4 py-2 text-xs font-mono max-w-[120px] truncate" title={row.action}>{row.action}</td>
                        <td className="px-4 py-2">
                          {row.traceId ? (
                            <button type="button" onClick={() => copyTrace(row.traceId)} className="text-xs font-mono text-indigo-600 hover:underline flex items-center gap-1" title={row.traceId}>
                              {row.traceId.slice(0, 8)}… <Copy className="w-3 h-3" />
                            </button>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700 max-w-md truncate" title={row.message}>{row.message}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {data && data.totalPages > 1 && (
              <Pagination page={page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
            )}
          </>
        )}
      </div>
    </>
  );
}

function AlertCenter({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [data, setData] = useState<{ items: AlertEntry[]; total: number; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await observabilityApi.getAlerts(page, 20));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Uyarılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const onRetry = async (item: AlertEntry) => {
    if (!item.retry) return;
    setRetrying(item.id);
    try {
      const r = await observabilityApi.retry(item.retry.type, item.retry.payload);
      toast.success(r.message);
      if (item.retry.type === 'trendyol_resend') {
        navigate('/dashboard/marketplaces/trendyol');
      } else {
        load();
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Retry başarısız');
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Son hata logları — desteklenen işlemler için tekrar deneyebilirsiniz.</p>
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 shadow-sm">
        {loading && !data ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-red-400" /></div>
        ) : (data?.items ?? []).length === 0 ? (
          <p className="p-8 text-center text-gray-400">Aktif uyarı yok</p>
        ) : (
          data?.items.map(item => (
            <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">{item.module} / {item.action}</span>
                  <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('tr-TR')}</span>
                </div>
                <p className="text-sm text-red-700 mt-1">{item.errorMessage ?? item.message}</p>
                {item.traceId && (
                  <p className="text-xs font-mono text-gray-400 mt-1">trace: {item.traceId}</p>
                )}
              </div>
              {item.retry && (
                <button
                  type="button"
                  disabled={retrying === item.id}
                  onClick={() => onRetry(item)}
                  className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {retrying === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : item.retry.label}
                </button>
              )}
            </div>
          ))
        )}
      </div>
      {data && data.totalPages > 1 && (
        <Pagination page={page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
      )}
    </div>
  );
}

function MetricsDashboard() {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMetrics(await observabilityApi.getMetrics(days));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Metrikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (loading && !metrics) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  const counts = metrics?.counts ?? {
    product_sent: 0,
    xml_sync: 0,
    payment_success: 0,
    subscription_activated: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Dönem</label>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value={7}>7 gün</option>
          <option value={14}>14 gün</option>
          <option value={30}>30 gün</option>
        </select>
        <button type="button" onClick={load} className="p-2 rounded-lg bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(counts).map(([key, value]) => (
          <div key={key} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Activity className="w-5 h-5" />
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{METRIC_LABELS[key] ?? key}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {metrics?.byDay && Object.keys(metrics.byDay).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Günlük dağılım</h3>
          <div className="space-y-2 text-xs">
            {Object.entries(metrics.byDay).map(([day, events]) => (
              <div key={day} className="flex flex-wrap gap-3 py-1 border-b border-gray-50">
                <span className="font-mono text-gray-500 w-24">{day}</span>
                {Object.entries(events).map(([ev, n]) => (
                  <span key={ev} className="text-gray-700">{METRIC_LABELS[ev] ?? ev}: <strong>{n}</strong></span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[120px]">
        {options.map(o => (
          <option key={o || 'all'} value={o}>{o || 'Tümü'}</option>
        ))}
      </select>
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    error: 'bg-red-100 text-red-800',
    warn:  'bg-amber-100 text-amber-800',
    info:  'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[level] ?? 'bg-gray-100 text-gray-700'}`}>
      {level}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
      <span>{total} kayıt</span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="text-indigo-600 disabled:opacity-30">Önceki</button>
        <span>{page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="text-indigo-600 disabled:opacity-30">Sonraki</button>
      </div>
    </div>
  );
}

export default Observability;
