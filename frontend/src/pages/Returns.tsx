import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchReturnRequests,
  type ReturnRequest,
  type ReturnRequestStatus,
  type ReturnRequestType,
} from '../services/returnRequest.service';

const RETURN_TYPE_LABELS: Record<ReturnRequestType, string> = {
  CANCEL_REQUEST: 'İptal talebi',
  RETURN_REQUEST: 'İade talebi',
};

const RETURN_STATUS_LABELS: Record<ReturnRequestStatus, string> = {
  PENDING:   'Beklemede',
  APPROVED:  'Onaylandı',
  REJECTED:  'Reddedildi',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal edildi',
};

export default function Returns() {
  const [items, setItems] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchReturnRequests({
          status: statusFilter || undefined,
          limit: 50,
        });
        if (!cancelled) setItems(res.items);
      } catch (e: unknown) {
        if (!cancelled) setError((e as Error)?.message || 'Talepler yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [statusFilter]);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">İade / İptal Talepleri</h1>
          <p className="text-sm text-slate-500 mt-1">Mağaza müşteri talepleri</p>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tüm durumlar</option>
          {Object.entries(RETURN_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-slate-500">Yükleniyor…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-slate-500">Henüz talep yok.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Talep no</th>
                <th className="text-left px-4 py-3">Sipariş</th>
                <th className="text-left px-4 py-3">Müşteri</th>
                <th className="text-left px-4 py-3">Tür</th>
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-left px-4 py-3">Tarih</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{r.requestNumber}</td>
                  <td className="px-4 py-3">{r.order?.orderNumber ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.customer
                      ? `${r.customer.firstName} ${r.customer.lastName}`.trim()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{RETURN_TYPE_LABELS[r.type]}</td>
                  <td className="px-4 py-3">{RETURN_STATUS_LABELS[r.status]}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/dashboard/returns/${r.id}`}
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
