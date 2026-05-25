import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  TrendingUp,
  ChevronRight,
  Download,
  FileText,
  X,
  Zap,
  Sparkles,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

function resolvePayload<T>(payload: T | { data?: T }): T | null {
  if (payload != null && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data?: T }).data ?? null;
  }
  return (payload as T) ?? null;
}

function resolveList<T>(payload: T[] | { data?: T[] }): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.data ?? [];
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subscription {
  id:           string;
  plan:         'STARTER' | 'PRO' | 'ENTERPRISE';
  billingCycle: 'MONTHLY' | 'YEARLY';
  status:       'PENDING' | 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAST_DUE';
  startDate:    string;
  endDate:      string;
  canceledAt:   string | null;
  payments:     Payment[];
}

interface Payment {
  id:            string;
  amount:        number;
  currency:      string;
  status:        'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  provider:      string;
  transactionId: string | null;
  createdAt:     string;
  subscription:  { plan: string; billingCycle: string } | null;
}

interface Plan {
  key:      'STARTER' | 'PRO' | 'ENTERPRISE';
  name:     string;
  prices:   { MONTHLY: number; YEARLY: number };
  currency: string;
  popular?: boolean;
  features: string[];
}

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
  status:         InvoiceStatus;
  type:           InvoiceType;
  total:          number;
  subtotal:       number;
  tax:            number;
  currency:       string;
  description:    string | null;
  lineItems:      LineItem[];
  dueDate:        string | null;
  paidAt:         string | null;
  createdAt:      string;
  periodStart:    string | null;
  periodEnd:      string | null;
}

// ─── Invoice helpers ──────────────────────────────────────────────────────────

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; className: string }> = {
  PAID:  { label: 'Ödendi',    className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  OPEN:  { label: 'Ödenmedi',  className: 'bg-red-50    text-red-700    border-red-200'    },
  DRAFT: { label: 'Taslak',    className: 'bg-gray-50   text-gray-500   border-gray-200'   },
  VOID:  { label: 'İptal',     className: 'bg-orange-50 text-orange-600 border-orange-200' },
};

const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  SUBSCRIPTION:      'Abonelik',
  UPGRADE_PRORATION: 'Plan Yükseltme',
  DOWNGRADE_CREDIT:  'Plan Düşürme Kredisi',
  MANUAL:            'Manuel',
};

// ─── Plan Section ─────────────────────────────────────────────────────────────

const PLAN_ICONS: Record<string, React.ReactNode> = {
  STARTER:    <Zap className="w-5 h-5" />,
  PRO:        <Sparkles className="w-5 h-5" />,
  ENTERPRISE: <Building2 className="w-5 h-5" />,
};

const PLAN_GRADIENTS: Record<string, string> = {
  STARTER:    'from-blue-500 to-blue-600',
  PRO:        'from-indigo-500 to-purple-600',
  ENTERPRISE: 'from-amber-500 to-orange-600',
};

const PLAN_RING: Record<string, string> = {
  STARTER:    'ring-blue-500',
  PRO:        'ring-indigo-500',
  ENTERPRISE: 'ring-amber-500',
};

function PlanSection({
  plans,
  currentPlan,
  currentCycle: _currentCycle,
  onSelect,
  selecting,
}: {
  plans:        Plan[];
  currentPlan:  string | null;
  currentCycle: string | null;
  onSelect:     (plan: Plan, cycle: 'MONTHLY' | 'YEARLY') => void;
  selecting:    string | null;
}) {
  const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Planlar
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">İhtiyacınıza uygun planı seçin</p>
        </div>

        {/* Cycle toggle */}
        <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          {(['MONTHLY', 'YEARLY'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                cycle === c
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {c === 'MONTHLY' ? 'Aylık' : (
                <span className="flex items-center gap-1.5">
                  Yıllık
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                    %17 İndirim
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const price     = plan.prices[cycle];
          const isFree    = price === 0;
          const isSelecting = selecting === plan.key;

          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border-2 transition-all ${
                isCurrent
                  ? `border-transparent ring-2 ${PLAN_RING[plan.key]} shadow-lg`
                  : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
              } ${plan.popular ? 'md:-mt-3 md:mb-0' : ''}`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                    <Sparkles className="w-3 h-3" /> En Popüler
                  </span>
                </div>
              )}

              {/* Card header */}
              <div className={`px-5 pt-6 pb-4 ${plan.popular ? 'pt-8' : ''}`}>
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${PLAN_GRADIENTS[plan.key]} text-white mb-3`}>
                  {PLAN_ICONS[plan.key]}
                </div>

                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>

                <div className="mt-3 flex items-end gap-1">
                  {isFree ? (
                    <span className="text-3xl font-extrabold text-gray-900">Ücretsiz</span>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-gray-900">
                        ₺{price.toLocaleString('tr-TR')}
                      </span>
                      <span className="text-sm text-gray-400 mb-1">
                        /{cycle === 'MONTHLY' ? 'ay' : 'yıl'}
                      </span>
                    </>
                  )}
                </div>

                {!isFree && cycle === 'YEARLY' && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    ≈ ₺{Math.round(price / 12).toLocaleString('tr-TR')}/ay
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 mx-5" />

              {/* Features */}
              <div className="px-5 py-4 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="px-5 pb-5">
                {isCurrent ? (
                  <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Mevcut Plan
                  </div>
                ) : (
                  <button
                    onClick={() => onSelect(plan, cycle)}
                    disabled={!!selecting}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm hover:shadow-md'
                        : 'bg-gray-900 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {isSelecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {isFree ? 'Ücretsiz Başla' : 'Planı Seç'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Plan Confirm Modal ───────────────────────────────────────────────────────

function PlanConfirmModal({
  plan,
  cycle,
  onConfirm,
  onClose,
  loading,
}: {
  plan:      Plan;
  cycle:     'MONTHLY' | 'YEARLY';
  onConfirm: () => void;
  onClose:   () => void;
  loading:   boolean;
}) {
  const price  = plan.prices[cycle];
  const isFree = price === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Plan Değiştir</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${PLAN_GRADIENTS[plan.key]} text-white`}>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              {PLAN_ICONS[plan.key]}
            </div>
            <div>
              <p className="font-bold text-lg">{plan.name}</p>
              <p className="text-sm text-white/80">
                {isFree ? 'Ücretsiz' : `₺${price.toLocaleString('tr-TR')}/${cycle === 'MONTHLY' ? 'ay' : 'yıl'}`}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            {isFree
              ? `${plan.name} planına geçmek istediğinize emin misiniz? Değişiklik hemen geçerli olacaktır.`
              : `${plan.name} planını ${cycle === 'MONTHLY' ? 'aylık' : 'yıllık'} ₺${price.toLocaleString('tr-TR')} ile aktifleştirmek istediğinize emin misiniz? Ödeme sayfasına yönlendirileceksiniz.`}
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 bg-gradient-to-r ${PLAN_GRADIENTS[plan.key]}`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {loading ? 'İşleniyor...' : 'Onayla'}
            </button>
            <button
              onClick={onClose}
              className="px-5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Vazgeç
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Detail Modal ─────────────────────────────────────────────────────

function InvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const statusCfg = INVOICE_STATUS[invoice.status];

  const handlePrint = () => {
    const lines = (invoice.lineItems ?? []).map((l: LineItem) =>
      `  ${l.description.padEnd(50, '.')}  ${formatCurrency(l.amount, invoice.currency)}`
    ).join('\n');

    const content = [
      '═══════════════════════════════════════════════════',
      `  FATURA                        ${invoice.number}`,
      '═══════════════════════════════════════════════════',
      `  Tarih   : ${formatDate(invoice.createdAt)}`,
      invoice.paidAt ? `  Ödeme   : ${formatDate(invoice.paidAt)}` : `  Durum   : ${statusCfg.label}`,
      invoice.description ? `  Açıklama: ${invoice.description}` : '',
      '───────────────────────────────────────────────────',
      lines,
      '───────────────────────────────────────────────────',
      `  Ara Toplam  :  ${formatCurrency(Number(invoice.subtotal), invoice.currency)}`,
      `  KDV        :  ${formatCurrency(Number(invoice.tax), invoice.currency)}`,
      `  TOPLAM     :  ${formatCurrency(Number(invoice.total), invoice.currency)}`,
      '═══════════════════════════════════════════════════',
    ].filter(Boolean).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${invoice.number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-gray-900 text-lg">{invoice.number}</h3>
              <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusCfg.className}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {INVOICE_TYPE_LABELS[invoice.type]} · {formatDate(invoice.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        {invoice.description && (
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600 border-b border-gray-100">
            {invoice.description}
          </div>
        )}

        {/* Line items */}
        {invoice.lineItems?.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Kalemler</p>
            <div className="space-y-2">
              {invoice.lineItems.map((item: LineItem, i: number) => (
                <div key={i} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-gray-600 flex-1">{item.description}</span>
                  <span className={`font-semibold flex-shrink-0 ${Number(item.amount) < 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {formatCurrency(Number(item.amount), invoice.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="px-6 py-4 bg-gray-50 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Ara Toplam</span>
            <span>{formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>KDV</span>
            <span>{formatCurrency(Number(invoice.tax), invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200 mt-1">
            <span>Toplam</span>
            <span>{formatCurrency(Number(invoice.total), invoice.currency)}</span>
          </div>
          {invoice.paidAt && (
            <p className="text-xs text-emerald-600 pt-1">
              ✓ {formatDate(invoice.paidAt)} tarihinde ödendi
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Faturayı İndir
          </button>
          <button
            onClick={onClose}
            className="px-5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Status Badge ─────────────────────────────────────────────────────

function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const cfg = INVOICE_STATUS[status] ?? INVOICE_STATUS.OPEN;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.className}`}>
      {status === 'PAID'
        ? <CheckCircle className="w-3 h-3" />
        : status === 'VOID'
        ? <XCircle className="w-3 h-3" />
        : <Clock className="w-3 h-3" />}
      {cfg.label}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  STARTER:    'Starter',
  PRO:        'Pro',
  ENTERPRISE: 'Enterprise',
};

const PLAN_COLORS: Record<string, string> = {
  STARTER:    'bg-blue-100 text-blue-700',
  PRO:        'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  ACTIVE:   { label: 'Aktif',        icon: <CheckCircle className="w-4 h-4" />,   className: 'text-green-600 bg-green-50 border-green-200' },
  CANCELED: { label: 'İptal Edildi', icon: <XCircle className="w-4 h-4" />,       className: 'text-orange-600 bg-orange-50 border-orange-200' },
  EXPIRED:  { label: 'Süresi Doldu', icon: <Clock className="w-4 h-4" />,         className: 'text-red-600 bg-red-50 border-red-200' },
  PENDING:  { label: 'Bekliyor',     icon: <Loader2 className="w-4 h-4 animate-spin" />, className: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  PAST_DUE: { label: 'Ödeme Gecikmiş', icon: <AlertTriangle className="w-4 h-4" />, className: 'text-red-600 bg-red-50 border-red-200' },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  SUCCESS:  { label: 'Başarılı',  color: 'text-green-600' },
  FAILED:   { label: 'Başarısız', color: 'text-red-600' },
  PENDING:  { label: 'Bekliyor',  color: 'text-yellow-600' },
  REFUNDED: { label: 'İade Edildi', color: 'text-blue-600' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatCurrency(amount: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
}

function daysRemaining(endDate: string): number {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const BillingDashboard: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [history, setHistory]           = useState<Payment[]>([]);
  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [invoicePage, setInvoicePage]   = useState(1);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice]   = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [canceling, setCanceling]       = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // ── Plans ──────────────────────────────────────────────────────────────────
  const [plans, setPlans]                       = useState<Plan[]>([]);
  const [pendingPlan, setPendingPlan]           = useState<{ plan: Plan; cycle: 'MONTHLY' | 'YEARLY' } | null>(null);
  const [selectingPlan, setSelectingPlan]       = useState<string | null>(null);

  const INVOICE_LIMIT = 10;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchInvoices(invoicePage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoicePage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, histRes, planRes] = await Promise.all([
        api.get<Subscription | { data?: Subscription }>('/billing/subscription'),
        api.get<Payment[] | { data?: Payment[] }>('/billing/history'),
        api.get<Plan[] | { data?: Plan[] }>('/billing/plans'),
      ]);
      setSubscription(resolvePayload(subRes.data));
      setHistory(resolveList(histRes.data));
      setPlans(resolveList(planRes.data));
    } catch (err: any) {
      if (err?.status !== 404) {
        toast.error('Fatura bilgileri yüklenemedi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: Plan, cycle: 'MONTHLY' | 'YEARLY') => {
    setPendingPlan({ plan, cycle });
  };

  const handleConfirmPlan = async () => {
    if (!pendingPlan) return;
    const { plan, cycle } = pendingPlan;
    setSelectingPlan(plan.key);

    try {
      if (plan.prices[cycle] === 0) {
        // Free plan — no payment needed
        toast.success(`${plan.name} planına geçildi.`);
        setPendingPlan(null);
        fetchData();
        return;
      }

      const res = await api.post<{ checkoutFormContent?: string; paymentPageUrl?: string }>(
        '/billing/payment/init',
        { plan: plan.key, billingCycle: cycle },
      );
      const data = res.data as any;
      const url  = data?.paymentPageUrl || data?.checkoutFormContent;

      if (url) {
        window.location.href = url;
      } else {
        toast.success('Ödeme başlatıldı. Yönlendiriliyorsunuz...');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Plan seçimi başarısız.');
    } finally {
      setSelectingPlan(null);
      setPendingPlan(null);
    }
  };

  const fetchInvoices = async (page: number) => {
    try {
      const res = await api.get<{ invoices: Invoice[]; total: number }>(
        `/billing/invoices?page=${page}&limit=${INVOICE_LIMIT}`,
      );
      const d = (res.data as any);
      setInvoices(d?.invoices ?? []);
      setInvoiceTotal(d?.total ?? 0);
    } catch {
      // silently ignore — invoices section just stays empty
    }
  };

  const handleViewInvoice = async (inv: Invoice) => {
    if (inv.lineItems?.length) {
      setSelectedInvoice(inv);
      return;
    }
    setLoadingInvoice(inv.id);
    try {
      const res  = await api.get<Invoice>(`/billing/invoices/${inv.id}`);
      setSelectedInvoice((res.data as any) ?? inv);
    } catch {
      setSelectedInvoice(inv);
    } finally {
      setLoadingInvoice(null);
    }
  };

  const handleCancel = async () => {
    try {
      setCanceling(true);
      await api.post('/billing/subscription/cancel');
      toast.success('Aboneliğiniz iptal edildi. Dönem sonuna kadar erişiminiz devam edecek.');
      setShowCancelConfirm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'İptal işlemi başarısız.');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const days     = subscription ? daysRemaining(subscription.endDate) : 0;
  const statusCfg = subscription ? STATUS_CONFIG[subscription.status] : null;

  return (
    <div className="-mx-6 -my-6 px-6 py-6 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fatura & Abonelik</h1>
        <p className="text-gray-500 mt-1">Aboneliğinizi ve ödeme geçmişinizi yönetin.</p>
      </div>

      {/* Active subscription card */}
      {subscription ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-500" />
              Mevcut Abonelik
            </h2>
            {statusCfg && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${statusCfg.className}`}>
                {statusCfg.icon}
                {statusCfg.label}
              </span>
            )}
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Plan */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Plan</p>
              <span className={`inline-block text-sm font-bold px-3 py-1 rounded-lg ${PLAN_COLORS[subscription.plan]}`}>
                {PLAN_LABELS[subscription.plan]}
              </span>
              <p className="text-xs text-gray-400">
                {subscription.billingCycle === 'MONTHLY' ? 'Aylık faturalandırma' : 'Yıllık faturalandırma'}
              </p>
            </div>

            {/* Period */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Dönem</p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formatDate(subscription.startDate)}
              </div>
              <p className="text-xs text-gray-400">— {formatDate(subscription.endDate)}</p>
            </div>

            {/* Days remaining */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Kalan Süre</p>
              <div className={`text-2xl font-bold ${days <= 7 ? 'text-red-600' : 'text-gray-900'}`}>
                {days} gün
              </div>
              {days <= 7 && days > 0 && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Aboneliğiniz yakında sona eriyor
                </p>
              )}
              {subscription.canceledAt && (
                <p className="text-xs text-orange-500">
                  İptal tarihi: {formatDate(subscription.canceledAt)}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex flex-wrap gap-3">
            <Link
              to="/plans"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Planı Yükselt
            </Link>

            {subscription.status === 'ACTIVE' && !subscription.canceledAt && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="inline-flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Aboneliği İptal Et
              </button>
            )}
          </div>
        </div>
      ) : (
        // No active subscription
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
            <CreditCard className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aktif Abonelik Yok</h3>
          <p className="text-gray-500 text-sm mb-6">
            Tüm özelliklere erişmek için bir plan seçin.
          </p>
          <Link
            to="/plans"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Planları Görüntüle
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* ── Plan Selection ──────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <PlanSection
          plans={plans}
          currentPlan={subscription?.plan ?? null}
          currentCycle={subscription?.billingCycle ?? null}
          onSelect={handleSelectPlan}
          selecting={selectingPlan}
        />
      )}

      {/* Billing History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-gray-400" />
            Ödeme Geçmişi
          </h2>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Henüz ödeme kaydı bulunmuyor.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((payment) => (
              <div key={payment.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    payment.status === 'SUCCESS' ? 'bg-green-100' : payment.status === 'FAILED' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {payment.status === 'SUCCESS' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : payment.status === 'FAILED' ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {PLAN_LABELS[payment.subscription?.plan || ''] || 'Abonelik'} —{' '}
                      {payment.subscription?.billingCycle === 'MONTHLY' ? 'Aylık' : 'Yıllık'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(payment.createdAt)}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(Number(payment.amount), payment.currency)}
                  </p>
                  <p className={`text-xs font-medium ${PAYMENT_STATUS[payment.status]?.color || 'text-gray-500'}`}>
                    {PAYMENT_STATUS[payment.status]?.label || payment.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Invoices ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            Faturalar
          </h2>
          {invoiceTotal > 0 && (
            <span className="text-xs text-gray-400">{invoiceTotal} fatura</span>
          )}
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Henüz fatura bulunmuyor.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <span>Fatura No</span>
              <span>Tutar</span>
              <span>Tarih</span>
              <span>Durum</span>
              <span>İşlem</span>
            </div>

            <div className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                >
                  {/* Fatura No */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{inv.number}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {INVOICE_TYPE_LABELS[inv.type]}
                      {inv.description ? ` · ${inv.description}` : ''}
                    </p>
                  </div>

                  {/* Tutar */}
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(Number(inv.total), inv.currency)}
                  </div>

                  {/* Tarih */}
                  <div className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(inv.createdAt)}
                  </div>

                  {/* Durum */}
                  <div>
                    <InvoiceBadge status={inv.status} />
                  </div>

                  {/* İşlem */}
                  <div>
                    <button
                      onClick={() => handleViewInvoice(inv)}
                      disabled={loadingInvoice === inv.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
                      title="Faturayı görüntüle ve indir"
                    >
                      {loadingInvoice === inv.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Download className="w-3.5 h-3.5" />}
                      İndir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {invoiceTotal > INVOICE_LIMIT && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {Math.min((invoicePage - 1) * INVOICE_LIMIT + 1, invoiceTotal)}–
                  {Math.min(invoicePage * INVOICE_LIMIT, invoiceTotal)} / {invoiceTotal}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                    disabled={invoicePage === 1}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    ← Önceki
                  </button>
                  <button
                    onClick={() => setInvoicePage((p) => p + 1)}
                    disabled={invoicePage * INVOICE_LIMIT >= invoiceTotal}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    Sonraki →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}

      {/* Plan Confirm Modal */}
      {pendingPlan && (
        <PlanConfirmModal
          plan={pendingPlan.plan}
          cycle={pendingPlan.cycle}
          onConfirm={handleConfirmPlan}
          onClose={() => setPendingPlan(null)}
          loading={!!selectingPlan}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Aboneliği İptal Et</h3>
                <p className="text-sm text-gray-500">Bu işlem geri alınamaz</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Aboneliğinizi iptal ederseniz, mevcut dönem sonuna (
              <strong>{subscription ? formatDate(subscription.endDate) : ''}</strong>) kadar
              tüm özelliklere erişmeye devam edebilirsiniz. Dönem sona erdiğinde planınız{' '}
              <strong>Starter</strong>'a düşecektir.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors"
              >
                {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {canceling ? 'İptal Ediliyor...' : 'Evet, İptal Et'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-3 rounded-xl transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingDashboard;
