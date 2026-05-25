import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchReturnRequest,
  updateReturnRequestStatus,
  type ReturnRequest,
  type ReturnRequestStatus,
  type ReturnRequestType,
} from '../services/returnRequest.service';
import {
  cancelReturnRefund,
  createReturnRefund,
  fetchReturnRefunds,
  REFUND_METHOD_OPTIONS,
  type RefundMethod,
  type RefundRecord,
  type RefundSummary,
} from '../services/returnRefund.service';

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

const ALL_STATUSES: ReturnRequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
];

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<ReturnRequestStatus>('PENDING');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [refundSummary, setRefundSummary] = useState<RefundSummary | null>(null);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('MANUAL_BANK_TRANSFER');
  const [refundNote, setRefundNote] = useState('');
  const [refundDate, setRefundDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [refundSaving, setRefundSaving] = useState(false);
  const [refundMsg, setRefundMsg] = useState<string | null>(null);

  const loadRefunds = async (requestId: string) => {
    try {
      const data = await fetchReturnRefunds(requestId);
      setRefundSummary(data.summary);
      setRefunds(data.refunds);
    } catch {
      setRefundSummary(null);
      setRefunds([]);
    }
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchReturnRequest(id);
      setItem(r);
      setStatusDraft(r.status);
      setAdminNote(r.adminNote ?? '');
      await loadRefunds(id);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Talep yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async () => {
    if (!id || !item) return;
    setSaving(true);
    setSuccessMsg(null);
    try {
      const { request: updated, sync } = await updateReturnRequestStatus(id, statusDraft, adminNote);
      setItem(updated);
      setAdminNote(updated.adminNote ?? '');
      const parts: string[] = ['Talep durumu kaydedildi.'];
      if (sync?.message) parts.push(sync.message);
      setSuccessMsg(parts.join(' '));
    } catch (e: unknown) {
      alert((e as Error)?.message || 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const showCancelApproveWarning =
    item?.type === 'CANCEL_REQUEST' &&
    statusDraft === 'APPROVED' &&
    item.status !== 'APPROVED';

  const showReturnApproveWarning =
    item?.type === 'RETURN_REQUEST' &&
    statusDraft === 'APPROVED' &&
    item.status !== 'APPROVED';

  const showReturnCompleteWarning =
    item?.type === 'RETURN_REQUEST' &&
    statusDraft === 'COMPLETED' &&
    item.status !== 'COMPLETED';

  const showStockAlreadyRestored =
    item?.type === 'RETURN_REQUEST' && Boolean(item.stockRestoredAt);

  const canRecordRefund =
    item &&
    ((item.type === 'RETURN_REQUEST' && item.status === 'COMPLETED') ||
      (item.type === 'CANCEL_REQUEST' && ['APPROVED', 'COMPLETED'].includes(item.status)));

  const handleCreateRefund = async () => {
    if (!id) return;
    setRefundSaving(true);
    setRefundMsg(null);
    try {
      const amount = Number(refundAmount.replace(',', '.'));
      const { summary } = await createReturnRefund(id, {
        amount,
        method: refundMethod,
        note: refundNote.trim() || undefined,
        refundedAt: new Date(refundDate).toISOString(),
      });
      setRefundSummary(summary);
      const data = await fetchReturnRefunds(id);
      setRefunds(data.refunds);
      setRefundAmount('');
      setRefundNote('');
      setRefundMsg('Para iadesi kaydı oluşturuldu.');
    } catch (e: unknown) {
      alert((e as Error)?.message || 'Kayıt oluşturulamadı.');
    } finally {
      setRefundSaving(false);
    }
  };

  const handleCancelRefund = async (refundId: string) => {
    if (!id || !confirm('Bu iade kaydını iptal etmek istediğinize emin misiniz?')) return;
    try {
      const { summary } = await cancelReturnRefund(refundId);
      setRefundSummary(summary);
      const data = await fetchReturnRefunds(id);
      setRefunds(data.refunds);
      setRefundMsg('İade kaydı iptal edildi.');
    } catch (e: unknown) {
      alert((e as Error)?.message || 'İptal edilemedi.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600">{error || 'Talep bulunamadı.'}</p>
        <Link to="/dashboard/returns" className="mt-4 inline-block text-indigo-600">
          Listeye dön
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Link to="/dashboard/returns" className="text-sm text-indigo-600 hover:underline">
        ← İade / iptal talepleri
      </Link>
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{item.requestNumber}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {RETURN_TYPE_LABELS[item.type]} · {RETURN_STATUS_LABELS[item.status]}
          </p>
        </div>
        {item.order && (
          <Link
            to={`/dashboard/orders/${item.orderId}`}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Sipariş #{item.order.orderNumber} →
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 space-y-4 text-sm">
          <h2 className="font-semibold">Müşteri</h2>
          {item.customer ? (
            <dl className="space-y-2">
              <div>
                <dt className="text-slate-500">Ad soyad</dt>
                <dd>{item.customer.firstName} {item.customer.lastName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">E-posta</dt>
                <dd>{item.customer.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Telefon</dt>
                <dd>{item.customer.phone || '—'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-slate-500">—</p>
          )}
          <h2 className="font-semibold pt-2">Talep bilgisi</h2>
          <p><span className="text-slate-500">Sebep:</span> {item.reason}</p>
          {item.customerNote && (
            <p className="whitespace-pre-wrap">
              <span className="text-slate-500">Müşteri notu:</span> {item.customerNote}
            </p>
          )}
          <p className="text-xs text-slate-400">
            Oluşturulma: {new Date(item.createdAt).toLocaleString('tr-TR')}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 space-y-4 text-sm">
          <h2 className="font-semibold">Durum yönetimi</h2>
          {successMsg && (
            <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              {successMsg}
            </p>
          )}
          {showCancelApproveWarning && (
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Bu işlem siparişi iptal edecek ve stok iadesi mevcut sipariş servisi üzerinden yapılacaktır.
            </p>
          )}
          {showReturnApproveWarning && (
            <p className="text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              Bu işlem yalnızca iade talebini onaylar. Para iadesi ve stok iadesi bu adımda yapılmaz.
            </p>
          )}
          {showReturnCompleteWarning && (
            <p className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Bu işlem iade talebindeki ürünleri stoğa geri ekleyecektir. Para iadesi yapılmaz.
              {item.status !== 'APPROVED' && (
                <span className="block mt-1 text-amber-800">
                  Tamamlamak için talep önce onaylanmış olmalıdır.
                </span>
              )}
            </p>
          )}
          {showStockAlreadyRestored && (
            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Bu talep için stok iadesi daha önce yapılmış
              {item.stockRestoredAt
                ? ` (${new Date(item.stockRestoredAt).toLocaleString('tr-TR')})`
                : ''}
              .
            </p>
          )}
          <p className="text-xs text-slate-500">
            İade talebi onayında sipariş durumu değişmez; tamamlandığında seçili ürünler stoğa eklenir.
            İptal talebi onayında sipariş iptal edilir.
          </p>
          <label className="block">
            <span className="text-xs text-slate-500">Durum</span>
            <select
              value={statusDraft}
              onChange={e => setStatusDraft(e.target.value as ReturnRequestStatus)}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{RETURN_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Admin notu</span>
            <textarea
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              rows={4}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="Müşteriye iletilecek iç not veya red gerekçesi"
            />
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 space-y-4 text-sm">
        <h2 className="font-semibold text-base">Ödeme İadesi</h2>
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Bu işlem ödeme sağlayıcısına otomatik para iadesi göndermez. Sadece manuel iade kaydı oluşturur.
        </p>
        {refundMsg && (
          <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {refundMsg}
          </p>
        )}
        {refundSummary && (
          <dl className="grid sm:grid-cols-3 gap-3">
            <div>
              <dt className="text-slate-500 text-xs">İade edilebilir (ürün)</dt>
              <dd className="font-semibold">
                {refundSummary.refundableAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                {refundSummary.currency}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 text-xs">Kayıtlı iade</dt>
              <dd className="font-semibold">
                {refundSummary.refundedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                {refundSummary.currency}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 text-xs">Kalan</dt>
              <dd className="font-semibold text-indigo-700">
                {refundSummary.remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                {refundSummary.currency}
              </dd>
            </div>
          </dl>
        )}
        {item.type === 'RETURN_REQUEST' && item.status !== 'COMPLETED' && (
          <p className="text-amber-800 text-xs">
            İade talebi tamamlanmadan para iadesi kaydı oluşturulamaz.
          </p>
        )}
        {canRecordRefund && refundSummary && refundSummary.remainingAmount > 0 && (
          <div className="border-t pt-4 space-y-3">
            <p className="font-medium text-slate-800">Para iadesi yapıldı olarak kaydet</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-slate-500">Tutar ({refundSummary.currency})</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={refundSummary.remainingAmount}
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  placeholder={String(refundSummary.remainingAmount)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Yöntem</span>
                <select
                  value={refundMethod}
                  onChange={e => setRefundMethod(e.target.value as RefundMethod)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                  {REFUND_METHOD_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">İade tarihi</span>
                <input
                  type="datetime-local"
                  value={refundDate}
                  onChange={e => setRefundDate(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-slate-500">Not (iç kullanım)</span>
                <textarea
                  value={refundNote}
                  onChange={e => setRefundNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  placeholder="Örn. Müşteriye banka havalesi ile iade yapıldı."
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleCreateRefund}
              disabled={refundSaving || !refundAmount}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-60"
            >
              {refundSaving ? 'Kaydediliyor…' : 'Para iadesi yapıldı olarak kaydet'}
            </button>
          </div>
        )}
        {refunds.length > 0 && (
          <div className="border-t pt-4">
            <p className="font-medium mb-2">Kayıt listesi</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b text-left">
                  <th className="py-2 pr-2">Tutar</th>
                  <th className="py-2 pr-2">Yöntem</th>
                  <th className="py-2 pr-2">Tarih</th>
                  <th className="py-2 pr-2">Durum</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {refunds.map(ref => (
                  <tr key={ref.id} className="border-b border-slate-50 align-top">
                    <td className="py-2 pr-2 whitespace-nowrap">
                      {ref.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {ref.currency}
                    </td>
                    <td className="py-2 pr-2">{ref.methodLabel}</td>
                    <td className="py-2 pr-2 whitespace-nowrap">
                      {new Date(ref.refundedAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2 pr-2">
                      {ref.status === 'RECORDED' ? (
                        <span className="text-emerald-700">Kayıtlı</span>
                      ) : (
                        <span className="text-slate-500">İptal</span>
                      )}
                    </td>
                    <td className="py-2">
                      {ref.status === 'RECORDED' && (
                        <button
                          type="button"
                          onClick={() => handleCancelRefund(ref.id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          İptal et
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {refunds.some(r => r.note) && (
              <ul className="mt-2 text-xs text-slate-600 space-y-1">
                {refunds.filter(r => r.note).map(r => (
                  <li key={r.id}>
                    <span className="text-slate-400">{new Date(r.refundedAt).toLocaleDateString('tr-TR')}:</span>{' '}
                    {r.note}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {item.items.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold mb-3">Talep edilen ürünler</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b">
                <th className="text-left py-2">Ürün</th>
                <th className="text-right py-2">Adet</th>
                <th className="text-left py-2">Not</th>
              </tr>
            </thead>
            <tbody>
              {item.items.map(i => (
                <tr key={i.id} className="border-b border-slate-50">
                  <td className="py-2">
                    {i.productName}
                    {i.variantName ? ` — ${i.variantName}` : ''}
                  </td>
                  <td className="py-2 text-right">{i.quantity}</td>
                  <td className="py-2 text-slate-600">{i.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
