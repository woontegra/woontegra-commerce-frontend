import React, { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, Search, Loader2,
  ChevronLeft, ChevronRight, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';
import { unwrapAdmin } from '../../utils/adminApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id:         string;
  userId:     string | null;
  userEmail:  string | null;
  userRole:   string | null;
  tenantId:   string | null;
  action:     string;
  category:   string;
  targetType: string;
  targetId:   string;
  targetName: string | null;
  status:     string;
  errorMsg:   string | null;
  ipAddress:  string | null;
  userAgent:  string | null;
  details:    any;
  createdAt:  string;
}

interface Page {
  logs: AuditLog[]; total: number; page: number; limit: number; totalPages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  '', 'AUTH', 'BILLING', 'ORDER', 'PRODUCT', 'CUSTOMER', 'TENANT', 'USER', 'SYSTEM', 'GENERAL',
];

const STATUS_OPTIONS = ['', 'SUCCESS', 'FAILURE', 'WARNING'];

const CATEGORY_COLORS: Record<string, string> = {
  AUTH:     'bg-violet-900/40 text-violet-300 border-violet-700/40',
  BILLING:  'bg-blue-900/40  text-blue-300  border-blue-700/40',
  ORDER:    'bg-green-900/40 text-green-300 border-green-700/40',
  PRODUCT:  'bg-teal-900/40  text-teal-300  border-teal-700/40',
  CUSTOMER: 'bg-sky-900/40   text-sky-300   border-sky-700/40',
  TENANT:   'bg-amber-900/40 text-amber-300 border-amber-700/40',
  USER:     'bg-pink-900/40  text-pink-300  border-pink-700/40',
  SYSTEM:   'bg-gray-800     text-gray-400  border-gray-700/40',
};

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'text-green-400',
  FAILURE: 'text-red-400',
  WARNING: 'text-amber-400',
};

const STATUS_ICONS: Record<string, string> = {
  SUCCESS: '✓',
  FAILURE: '✗',
  WARNING: '⚠',
};

const TARGET_ICONS: Record<string, string> = {
  Tenant:       '🏢',
  User:         '👤',
  Order:        '📦',
  Payment:      '💳',
  Subscription: '🔄',
  Product:      '🛍️',
  Customer:     '🧑',
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminAuditLogs: React.FC = () => {
  const [data, setData]             = useState<Page | null>(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [categoryFilter, setCategory] = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [page, setPage]             = useState(1);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: '50',
        ...(search         && { search }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(statusFilter   && { status:   statusFilter }),
      });
      const res = await api.get(`/admin/audit-logs?${params}`);
      setData(unwrapAdmin<Page>(res));
    } catch (e: any) {
      toast.error(e?.message || 'Yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            Audit Loglar
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {data ? `${data.total.toLocaleString('tr-TR')} kayıt` : '…'}
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition"
        >
          <RefreshCw className="w-4 h-4" /> Yenile
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kullanıcı, hedef veya aksiyon ara..."
            className="w-full bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 text-sm pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => { setCategory(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm px-3 py-2.5 rounded-xl focus:outline-none"
        >
          {CATEGORY_OPTIONS.map(c => (
            <option key={c} value={c}>{c || 'Tüm kategoriler'}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm px-3 py-2.5 rounded-xl focus:outline-none"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s || 'Tüm sonuçlar'}</option>
          ))}
        </select>
      </div>

      {/* Log list */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : !data?.logs.length ? (
          <div className="py-16 text-center">
            <ClipboardList className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Log bulunamadı.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {data.logs.map(log => (
              <div key={log.id}>
                <button
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="w-full text-left px-5 py-3.5 flex items-start gap-4 hover:bg-gray-800/40 transition-colors"
                >
                  {/* Time */}
                  <div className="flex-shrink-0 text-right w-20">
                    <p className="text-xs text-gray-500 tabular-nums">
                      {new Date(log.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(log.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>

                  {/* Status icon */}
                  <span className={`flex-shrink-0 font-bold text-sm mt-0.5 w-4 ${STATUS_COLORS[log.status] || 'text-gray-400'}`}>
                    {STATUS_ICONS[log.status] || '•'}
                  </span>

                  {/* Category badge */}
                  <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border mt-0.5 ${
                    CATEGORY_COLORS[log.category] || 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}>
                    {log.category}
                  </span>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white font-mono font-medium">{log.action}</span>
                      {log.targetType && (
                        <span className="text-xs text-gray-400">
                          {TARGET_ICONS[log.targetType] || '📋'} {log.targetName || log.targetId}
                          <span className="text-gray-600 ml-1">({log.targetType})</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {log.userEmail && (
                        <span className="text-xs text-gray-500">
                          👤 {log.userEmail}
                          {log.userRole && <span className="ml-1 text-gray-600">[{log.userRole}]</span>}
                        </span>
                      )}
                      {log.ipAddress && (
                        <span className="text-xs text-gray-600 font-mono">{log.ipAddress}</span>
                      )}
                      {log.errorMsg && (
                        <span className="text-xs text-red-400 truncate max-w-xs">{log.errorMsg}</span>
                      )}
                    </div>
                  </div>

                  {/* Expand icon */}
                  {log.details && (
                    <span className="flex-shrink-0 text-gray-600 mt-0.5">
                      {expanded === log.id
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                      }
                    </span>
                  )}
                </button>

                {/* Expanded details */}
                {expanded === log.id && (
                  <div className="px-5 pb-4 ml-28 space-y-2">
                    {log.userAgent && (
                      <p className="text-xs text-gray-600 font-mono truncate">
                        🌐 {log.userAgent}
                      </p>
                    )}
                    {log.details && (
                      <pre className="text-xs text-gray-400 bg-gray-800 rounded-xl p-4 overflow-auto max-h-48 font-mono leading-relaxed">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {(page - 1) * 50 + 1}–{Math.min(page * 50, data.total)} / {data.total.toLocaleString('tr-TR')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-gray-800 disabled:opacity-40 text-gray-400 hover:text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 self-center px-2">{page} / {data.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="p-1.5 rounded-lg bg-gray-800 disabled:opacity-40 text-gray-400 hover:text-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
