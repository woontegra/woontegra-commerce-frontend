import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, UserX, UserCheck, Loader2, ChevronLeft,
  ChevronRight, Users, Filter, RefreshCw, ShieldCheck, Plus,
} from 'lucide-react';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';
import { unwrapAdmin } from '../../utils/adminApi';

interface User {
  id: string; email: string; firstName: string; lastName: string;
  role: string; isActive: boolean; plan: string; createdAt: string;
  tenant: { id: string; name: string; slug: string; isActive: boolean } | null;
}

interface Page { users: User[]; total: number; page: number; limit: number; totalPages: number }

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-900/40 text-red-300 border-red-700/40',
  ADMIN:       'bg-blue-900/40 text-blue-300 border-blue-700/40',
  MANAGER:     'bg-purple-900/40 text-purple-300 border-purple-700/40',
  USER:        'bg-gray-800 text-gray-400 border-gray-700',
};

const PLAN_BADGE: Record<string, string> = {
  STARTER:    'text-blue-300',
  PRO:        'text-purple-300',
  ENTERPRISE: 'text-amber-300',
};

const PLAN_OPTIONS = ['STARTER', 'PRO', 'ENTERPRISE'] as const;

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData]       = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRole] = useState('');
  const [onlyBanned, setOnlyBanned] = useState(false);
  const [page, setPage]       = useState(1);
  const [acting, setActing]   = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<null | { userId: string; kind: 'plan' | 'active' }>(null);
  const [modal, setModal]     = useState<null | { type: 'ban' | 'unban'; user: User }>(null);
  const [reason, setReason]   = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [ce, setCe] = useState('');
  const [cp, setCp] = useState('');
  const [cf, setCf] = useState('');
  const [cl, setCl] = useState('');
  const [ctid, setCtid] = useState('');
  const [crole, setCrole] = useState('ADMIN');

  const fetchUsers = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: '30',
        ...(search    && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(onlyBanned && { isActive: 'false' }),
      });
      const res = await api.get(`/admin/users?${params}`);
      setData(unwrapAdmin<Page>(res));
    } catch (e: any) {
      toast.error(e?.message || 'Yüklenemedi.');
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }, [page, search, roleFilter, onlyBanned]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const patchUserActive = async (u: User, isActive: boolean) => {
    if (u.role === 'SUPER_ADMIN') return;
    setRowBusy({ userId: u.id, kind: 'active' });
    try {
      await api.patch(`/admin/users/${u.id}/status`, { isActive });
      toast.success(isActive ? 'Kullanıcı aktifleştirildi.' : 'Kullanıcı pasifleştirildi.');
      await fetchUsers({ quiet: true });
    } catch (e: any) {
      toast.error(e?.message || 'Durum güncellenemedi.');
    } finally {
      setRowBusy(null);
    }
  };

  const patchUserPlan = async (u: User, plan: string) => {
    if (u.role === 'SUPER_ADMIN' || plan === u.plan) return;
    setRowBusy({ userId: u.id, kind: 'plan' });
    try {
      await api.patch(`/admin/users/${u.id}/plan`, { plan });
      toast.success('Plan güncellendi.');
      await fetchUsers({ quiet: true });
    } catch (e: any) {
      toast.error(e?.message || 'Plan güncellenemedi.');
    } finally {
      setRowBusy(null);
    }
  };

  const doAction = async () => {
    if (!modal) return;
    setActing(modal.user.id);
    try {
      if (modal.type === 'ban') {
        await api.post('/admin/user/ban', { userId: modal.user.id, reason });
        toast.success('Kullanıcı yasaklandı.');
      } else {
        await api.post('/admin/user/unban', { userId: modal.user.id });
        toast.success('Kullanıcı yasağı kaldırıldı.');
      }
      setModal(null);
      setReason('');
      fetchUsers();
    } catch (e: any) {
      toast.error(e?.message || 'İşlem başarısız.');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Kullanıcı Yönetimi</h2>
          <p className="text-gray-500 text-sm mt-0.5">{data ? `${data.total} kullanıcı` : '…'}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Kullanıcı oluştur
          </button>
          <button onClick={() => void fetchUsers()} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="İsim veya e-posta ara..."
            className="w-full bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 text-sm pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          {['', 'ADMIN', 'MANAGER', 'USER'].map((r) => (
            <button key={r} onClick={() => { setRole(r); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === r ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}>
              {r || 'Tümü'}
            </button>
          ))}
          <button onClick={() => { setOnlyBanned(!onlyBanned); setPage(1); }}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              onlyBanned ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            Banlılar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : !data?.users.length ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Kullanıcı bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Kullanıcı', 'Tenant', 'Rol', 'Plan', 'Durum', 'Oluşturulma', 'Aksiyon'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {data.users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.tenant ? (
                        <div>
                          <p className="text-gray-300 text-xs">{u.tenant.name}</p>
                          <p className="text-gray-600 text-xs">{u.tenant.slug}</p>
                        </div>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_BADGE[u.role] || ROLE_BADGE.USER}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'SUPER_ADMIN' ? (
                        <span className={`text-xs font-medium ${PLAN_BADGE[u.plan] || 'text-gray-400'}`}>{u.plan}</span>
                      ) : (
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <select
                            value={PLAN_OPTIONS.includes(u.plan as (typeof PLAN_OPTIONS)[number]) ? u.plan : 'STARTER'}
                            disabled={rowBusy?.userId === u.id}
                            onChange={(e) => { void patchUserPlan(u, e.target.value); }}
                            className={`bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ${PLAN_BADGE[u.plan] || ''}`}
                          >
                            {PLAN_OPTIONS.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          {rowBusy?.userId === u.id && rowBusy.kind === 'plan' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 shrink-0" />
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'SUPER_ADMIN' ? (
                        <span className="text-xs text-gray-500">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={u.isActive}
                            disabled={rowBusy?.userId === u.id}
                            onClick={() => { void patchUserActive(u, !u.isActive); }}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-50 ${
                              u.isActive ? 'bg-emerald-600' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                u.isActive ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-xs font-medium ${u.isActive ? 'text-green-400' : 'text-red-400'}`}>
                            {u.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                          {rowBusy?.userId === u.id && rowBusy.kind === 'active' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => navigate(`/admin/users/${u.id}/permissions`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-400 rounded-lg text-xs transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> İzinler
                      </button>
                      {u.role !== 'SUPER_ADMIN' && (
                        u.isActive ? (
                          <button
                            onClick={() => setModal({ type: 'ban', user: u })}
                            disabled={acting === u.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-xs transition-colors"
                          >
                            <UserX className="w-3.5 h-3.5" /> Banla
                          </button>
                        ) : (
                          <button
                            onClick={() => setModal({ type: 'unban', user: u })}
                            disabled={acting === u.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded-lg text-xs transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Yasağı Kaldır
                          </button>
                        )
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500">{(page-1)*30+1}–{Math.min(page*30, data.total)} / {data.total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="p-1.5 rounded-lg bg-gray-800 disabled:opacity-40 text-gray-400 hover:text-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(data.totalPages,p+1))} disabled={page===data.totalPages}
                className="p-1.5 rounded-lg bg-gray-800 disabled:opacity-40 text-gray-400 hover:text-white">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 space-y-3 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Kullanıcı oluştur</h3>
            <p className="text-xs text-gray-500">Tenant UUID&apos;sini tenant detay sayfasından kopyalayabilirsiniz.</p>
            <input value={ce} onChange={e => setCe(e.target.value)} placeholder="E-posta" className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" />
            <input type="password" value={cp} onChange={e => setCp(e.target.value)} placeholder="Şifre (min 8)" className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" />
            <div className="flex gap-2">
              <input value={cf} onChange={e => setCf(e.target.value)} placeholder="Ad" className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" />
              <input value={cl} onChange={e => setCl(e.target.value)} placeholder="Soyad" className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" />
            </div>
            <input value={ctid} onChange={e => setCtid(e.target.value)} placeholder="Tenant ID" className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono text-xs" />
            <select value={crole} onChange={e => setCrole(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white">
              <option value="ADMIN">ADMIN (panel)</option>
              <option value="USER">USER</option>
              <option value="STAFF">STAFF</option>
              <option value="OWNER">OWNER</option>
            </select>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 rounded-xl">İptal</button>
              <button
                type="button"
                disabled={createBusy}
                onClick={async () => {
                  if (!ce.trim() || cp.length < 8 || !ctid.trim()) {
                    toast.error('E-posta, şifre (8+) ve tenant ID gerekli.');
                    return;
                  }
                  setCreateBusy(true);
                  try {
                    await api.post('/admin/users', {
                      email: ce.trim(),
                      password: cp,
                      firstName: cf.trim() || 'User',
                      lastName: cl.trim() || '',
                      tenantId: ctid.trim(),
                      role: crole,
                    });
                    toast.success('Kullanıcı oluşturuldu.');
                    setCreateOpen(false);
                    setCe(''); setCp(''); setCf(''); setCl(''); setCtid('');
                    fetchUsers();
                  } catch (e: any) {
                    toast.error(e?.message || 'Başarısız.');
                  } finally {
                    setCreateBusy(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {createBusy ? '…' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-8 shadow-2xl space-y-4">
            <h3 className="text-white font-bold text-lg">
              {modal.type === 'ban' ? 'Kullanıcıyı Banla' : 'Yasağı Kaldır'}
            </h3>
            <p className="text-gray-400 text-sm">
              <strong className="text-white">{modal.user.email}</strong>{' '}
              {modal.type === 'ban' ? 'kullanıcısı yasaklanacak.' : 'kullanıcısının yasağı kaldırılacak.'}
            </p>
            {modal.type === 'ban' && (
              <input
                value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Ban nedeni (opsiyonel)"
                className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
              />
            )}
            <div className="flex gap-3">
              <button onClick={doAction} disabled={!!acting}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm ${
                  modal.type === 'ban' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                } text-white disabled:opacity-50`}>
                {acting && <Loader2 className="w-4 h-4 animate-spin" />} Onayla
              </button>
              <button onClick={() => { setModal(null); setReason(''); }}
                className="flex-1 border border-gray-700 text-gray-400 hover:text-white py-2.5 rounded-xl text-sm">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
