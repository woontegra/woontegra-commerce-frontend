import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, ChevronLeft, ChevronRight,
  CheckCircle, Clock, XCircle, AlertCircle, Loader2,
  ArrowUpCircle, ArrowDownCircle, Receipt,
} from 'lucide-react';
import api from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID';
type InvoiceType   = 'SUBSCRIPTION' | 'UPGRADE_PRORATION' | 'DOWNGRADE_CREDIT' | 'MANUAL';

interface LineItem {
  description: string;
  quantity:    number;
  unitAmount:  number;
  amount:      number;
}

interface Invoice {
  id:             string;
  number:         string;
  type:           InvoiceType;
  status:         InvoiceStatus;
  currency:       string;
  subtotal:       number;
  tax:            number;
  total:          number;
  description:    string | null;
  lineItems:      LineItem[];
  dueDate:        string | null;
  paidAt:         string | null;
  periodStart:    string | null;
  periodEnd:      string | null;
  createdAt:      string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Taslak',   color: 'bg-gray-100 text-gray-600 border-gray-200',   icon: Clock        },
  OPEN:  { label: 'Bekliyor', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertCircle  },
  PAID:  { label: 'Ödendi',   color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle  },
  VOID:  { label: 'İptal',    color: 'bg-red-50 text-red-600 border-red-200',       icon: XCircle      },
};

const TYPE_CONFIG: Record<InvoiceType, { label: string; icon: React.ElementType; color: string }> = {
  SUBSCRIPTION:      { label: 'Abonelik',       icon: Receipt,         color: 'text-blue-600'   },
  UPGRADE_PRORATION: { label: 'Plan Yükseltme', icon: ArrowUpCircle,   color: 'text-purple-600' },
  DOWNGRADE_CREDIT:  { label: 'Plan Düşürme',   icon: ArrowDownCircle, color: 'text-orange-500' },
  MANUAL:            { label: 'Manuel',          icon: FileText,        color: 'text-gray-500'   },
};

function fmt(amount: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── InvoiceRow ────────────────────────────────────────────────────────────────

const InvoiceRow: React.FC<{ invoice: Invoice; onExpand: () => void; expanded: boolean }> = ({
  invoice, onExpand, expanded,
}) => {
  const status = STATUS_CONFIG[invoice.status];
  const type   = TYPE_CONFIG[invoice.type];
  const StatusIcon = status.icon;
  const TypeIcon   = type.icon;

  return (
    <>
      <tr
        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
        onClick={onExpand}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <TypeIcon className={`w-4 h-4 ${type.color} flex-shrink-0`} />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{invoice.number}</p>
              <p className="text-xs text-gray-500">{type.label}</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
          {fmtDate(invoice.createdAt)}
        </td>
        <td className="px-6 py-4">
          {invoice.periodStart && invoice.periodEnd ? (
            <span className="text-xs text-gray-500">
              {fmtDate(invoice.periodStart)} – {fmtDate(invoice.periodEnd)}
            </span>
          ) : '—'}
        </td>
        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white text-right">
          {fmt(Number(invoice.total), invoice.currency)}
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </td>
        <td className="px-6 py-4">
          <button
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title="Detayları göster"
            onClick={(e) => { e.stopPropagation(); onExpand(); }}
          >
            <Download className="w-4 h-4" />
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 dark:bg-gray-800/30">
          <td colSpan={6} className="px-6 pb-4 pt-2">
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              {/* Description */}
              {invoice.description && (
                <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.description}</p>
                </div>
              )}

              {/* Line items */}
              {invoice.lineItems?.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-2 text-left font-medium">Açıklama</th>
                      <th className="px-4 py-2 text-right font-medium">Miktar</th>
                      <th className="px-4 py-2 text-right font-medium">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                    {invoice.lineItems.map((li, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{li.description}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{li.quantity}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${li.amount < 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                          {fmt(li.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                      <td colSpan={2} className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">Toplam</td>
                      <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">
                        {fmt(Number(invoice.total), invoice.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* Dates */}
              <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-6 text-xs text-gray-500">
                {invoice.dueDate  && <span>Son ödeme: <b>{fmtDate(invoice.dueDate)}</b></span>}
                {invoice.paidAt   && <span>Ödendi:    <b>{fmtDate(invoice.paidAt)}</b></span>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotal]    = useState(1);
  const [expanded, setExpanded]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res: any = await api.get(`/billing/invoices?page=${page}&limit=20`);
        const data     = res?.data?.data || res?.data;
        setInvoices(data?.invoices ?? []);
        setTotal(data?.totalPages ?? 1);
      } catch (e: any) {
        setError(e?.message || 'Faturalar yüklenemedi.');
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Faturalar</h1>
          <p className="text-sm text-gray-500 mt-1">Tüm abonelik ve işlem faturalarınız</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/billing')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          Abonelik Detayı →
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-6 text-red-600">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Henüz fatura yok</p>
            <p className="text-sm mt-1">İlk ödemenizden sonra faturalar burada görünecek.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                {['Fatura', 'Tarih', 'Dönem', 'Tutar', 'Durum', ''].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {invoices.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  expanded={expanded === inv.id}
                  onExpand={() => toggle(inv.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Sayfa {page} / {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
