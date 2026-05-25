import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PermissionRow {
  key:       string;
  effective: boolean;
  override:  boolean | null;  // null = inherited
  fromRole:  boolean;
}

interface UserInfo {
  id:        string;
  email:     string;
  firstName: string;
  lastName:  string;
  role:      string;
}

// ─── Permission groups for display ───────────────────────────────────────────

const GROUPS: { label: string; prefix: string }[] = [
  { label: 'Ürünler',      prefix: 'product'  },
  { label: 'Siparişler',   prefix: 'order'    },
  { label: 'Müşteriler',   prefix: 'customer' },
  { label: 'Kategoriler',  prefix: 'category' },
  { label: 'Raporlar',     prefix: 'report'   },
  { label: 'Ayarlar',      prefix: 'settings' },
  { label: 'Faturalama',   prefix: 'billing'  },
  { label: 'Ekip',         prefix: 'team'     },
  { label: 'Kampanyalar',  prefix: 'campaign' },
  { label: 'Destek',       prefix: 'support'  },
  { label: 'CSV',          prefix: 'csv'      },
];

const ACTION_LABELS: Record<string, string> = {
  view:    'Görüntüle',
  create:  'Oluştur',
  update:  'Güncelle',
  delete:  'Sil',
  manage:  'Yönet',
  import:  'İçe Aktar',
  export:  'Dışa Aktar',
  invite:  'Davet Et',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminUserPermissions() {
  const { userId } = useParams<{ userId: string }>();
  const navigate   = useNavigate();

  const [user,        setUser]        = useState<UserInfo | null>(null);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  // Local edits: key → true | false | null (null = delete override)
  const [edits, setEdits] = useState<Record<string, boolean | null>>({});
  const dirty = Object.keys(edits).length > 0;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res  = await api.get(`/permissions/${userId}`);
      const data = (res.data as any).data;
      setUser(data.user);
      setPermissions(data.permissions);
    } catch (err: any) {
      toast.error('İzinler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Compute effective value considering pending edits
  function effectiveValue(row: PermissionRow): boolean {
    const e = edits[row.key];
    if (e === null) return row.fromRole;     // override removed → fall back to role
    if (e !== undefined) return e;
    return row.effective;
  }

  function overrideState(row: PermissionRow): 'granted' | 'revoked' | 'inherited' {
    const e = edits[row.key];
    if (e === null) return 'inherited';
    if (e !== undefined) return e ? 'granted' : 'revoked';
    if (row.override === null) return 'inherited';
    return row.override ? 'granted' : 'revoked';
  }

  function toggleEdit(key: string, currentEffective: boolean) {
    setEdits(prev => {
      const cur = prev[key];
      if (cur === undefined) {
        // No edit yet: flip effective value
        return { ...prev, [key]: !currentEffective };
      }
      if (cur !== null) {
        // Already flipped: remove override
        return { ...prev, [key]: null };
      }
      // Marked for deletion: clear edit entirely
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      const entries = Object.entries(edits)
        .filter(([, v]) => v !== null)
        .map(([key, granted]) => ({ key, granted: granted as boolean }));

      const removals = Object.entries(edits)
        .filter(([, v]) => v === null)
        .map(([key]) => key);

      if (entries.length) await api.put(`/permissions/${userId}`, { permissions: entries });
      for (const key of removals) await api.delete(`/permissions/${userId}/${key}`);

      toast.success('İzinler kaydedildi.');
      setEdits({});
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!userId || !confirm('Tüm izin overrideları sıfırlansın mı?')) return;
    setSaving(true);
    try {
      await api.delete(`/permissions/${userId}`);
      setEdits({});
      toast.success('Sıfırlandı — rol varsayılanları aktif.');
      await load();
    } catch {
      toast.error('Sıfırlanamadı.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1 flex items-center gap-1"
          >
            ← Geri
          </button>
          {user && (
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                {user.role}
              </span>
            </h1>
          )}
          {user && <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>}
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={() => setEdits({})}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Vazgeç
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-3 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            Sıfırla
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition"
          >
            {saving ? 'Kaydediliyor...' : `Kaydet${dirty ? ` (${Object.keys(edits).length})` : ''}`}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 rounded-xl">
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-green-500" /> Verildi</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-400" /> Engellendi</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-600" /> Rol varsayılanı</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-dashed border-amber-400" /> Değiştirildi (kaydedilmedi)</span>
      </div>

      {/* Permission groups */}
      <div className="space-y-4">
        {GROUPS.map(group => {
          const rows = permissions.filter(p => p.key.startsWith(`${group.prefix}.`));
          if (!rows.length) return null;

          return (
            <div key={group.prefix} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{group.label}</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map(row => {
                  const [, action] = row.key.split('.');
                  const eff        = effectiveValue(row);
                  const state      = overrideState(row);
                  const hasPendingEdit = edits[row.key] !== undefined;

                  return (
                    <div
                      key={row.key}
                      className={`flex items-center justify-between px-5 py-3 transition ${
                        hasPendingEdit ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Status dot */}
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          eff ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`} />

                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {ACTION_LABELS[action] ?? action}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{row.key}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Override badge */}
                        {state !== 'inherited' && (
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            state === 'granted'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {state === 'granted' ? 'Verildi' : 'Engellendi'}
                          </span>
                        )}
                        {state === 'inherited' && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            Rol ({row.fromRole ? 'açık' : 'kapalı'})
                          </span>
                        )}

                        {/* Toggle switch */}
                        <button
                          onClick={() => toggleEdit(row.key, eff)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            eff ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          } ${hasPendingEdit ? 'ring-2 ring-amber-400' : ''}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            eff ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
