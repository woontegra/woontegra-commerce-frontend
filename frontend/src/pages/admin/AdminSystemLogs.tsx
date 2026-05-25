import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/apiClient';
import { unwrapAdmin } from '../../utils/adminApi';
import toast from 'react-hot-toast';
import { Loader2, RefreshCw, ScrollText, AlertTriangle, Webhook } from 'lucide-react';

type LogTab = 'activity' | 'errors' | 'webhooks';

interface LogPage {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const AdminSystemLogs: React.FC = () => {
  const [tab, setTab]       = useState<LogTab>('activity');
  const [data, setData]     = useState<LogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [tenantId, setTenantId] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: '40' });
      if (tenantId.trim()) q.set('tenantId', tenantId.trim());
      if (tab === 'activity' && search.trim()) q.set('search', search.trim());

      const path =
        tab === 'activity' ? `/admin/logs/activity?${q}` :
        tab === 'errors'   ? `/admin/logs/errors?${q}` :
        `/admin/logs/webhooks?${q}`;
      const res = await api.get(path);
      setData(unwrapAdmin<LogPage>(res));
    } catch (e: any) {
      toast.error(e?.message || 'Loglar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [tab, page, tenantId, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search, tenantId, tab]);

  const tabs: { id: LogTab; label: string; icon: React.ElementType }[] = [
    { id: 'activity', label: 'API & işlem', icon: ScrollText },
    { id: 'errors', label: 'Hata', icon: AlertTriangle },
    { id: 'webhooks', label: 'Webhook', icon: Webhook },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Sistem logları</h2>
          <p className="text-gray-500 text-sm mt-0.5">Tüm tenantlar — sayfalama ve filtre</p>
        </div>
        <button
          type="button"
          onClick={() => fetchLogs()}
          className="flex items-center gap-2 self-start px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Yenile
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === id
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={tenantId}
          onChange={e => setTenantId(e.target.value)}
          placeholder="Tenant ID ile filtrele"
          className="flex-1 min-w-[200px] bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
        />
        {tab === 'activity' && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Aksiyon / açıklama ara"
            className="flex-1 min-w-[200px] bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
          />
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading && !data ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-950 text-gray-500 text-xs uppercase border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3">Zaman</th>
                    <th className="px-4 py-3">Tenant</th>
                    {tab === 'webhooks' ? (
                      <>
                        <th className="px-4 py-3">Olay</th>
                        <th className="px-4 py-3">HTTP</th>
                        <th className="px-4 py-3">Sonuç</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3">Seviye / tip</th>
                        <th className="px-4 py-3">Aksiyon</th>
                        <th className="px-4 py-3">Açıklama</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80 text-gray-300">
                  {(data?.items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">Kayıt yok</td>
                    </tr>
                  ) : (
                    (data?.items ?? []).map((row: any) => (
                      <tr key={row.id} className="hover:bg-gray-800/40">
                        <td className="px-4 py-2 whitespace-nowrap text-xs">
                          {new Date(row.createdAt).toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-2 text-xs max-w-[140px] truncate" title={row.tenantName ?? ''}>
                          {row.tenantName ?? '—'}
                        </td>
                        {tab === 'webhooks' ? (
                          <>
                            <td className="px-4 py-2 text-xs font-mono">{row.event}</td>
                            <td className="px-4 py-2 text-xs">{row.statusCode ?? '—'}</td>
                            <td className="px-4 py-2">
                              <span className={row.success ? 'text-emerald-400' : 'text-red-400'}>
                                {row.success ? 'OK' : 'Hata'}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-xs">{row.level} / {row.logType}</td>
                            <td className="px-4 py-2 text-xs font-mono max-w-[180px] truncate" title={row.action}>
                              {row.action}
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-400 max-w-md truncate" title={row.description}>
                              {row.description ?? '—'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {data && data.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-800 flex justify-between text-xs text-gray-500">
                <span>{data.total} kayıt</span>
                <div className="flex gap-2">
                  <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-blue-400 disabled:opacity-30">Önceki</button>
                  <span>{page} / {data.totalPages}</span>
                  <button type="button" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="text-blue-400 disabled:opacity-30">Sonraki</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSystemLogs;
