/**
 * ProductSendValidationModal
 *
 * Shows pre-flight validation results before sending products to Trendyol.
 * - Hard errors block that product only (batch still proceeds for others)
 * - Category unmapped → skip (informational)
 * - Warnings are shown but don't block send
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ValidationIssue {
  level:   'error' | 'warning' | 'skip';
  code:    string;
  message: string;
  tab:     string | null;
  hint?:   string;
}

export interface ValidationReport {
  productId:   string;
  productName: string;
  canSend:     boolean;
  issues:      ValidationIssue[];
}

interface Props {
  isOpen:       boolean;
  isValidating: boolean;
  /** true while the /products/send API call is in-flight */
  isSending?:   boolean;
  reports:      ValidationReport[];
  totalCount:   number;       // total products being validated
  pendingIds?:  string[];     // original IDs – used as fallback when reports is empty
  onSendValid:  (ids: string[]) => void;
  onCancel:     () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isCategorySkip(report: ValidationReport): boolean {
  return !report.canSend && report.issues.length > 0
    && report.issues.every(i => i.code === 'NO_CATEGORY_MAP');
}

function isHardError(report: ValidationReport): boolean {
  return report.issues.some(i => i.level === 'error');
}

function tabToFixUrl(tab: string | null, productId: string): string {
  switch (tab) {
    case 'categories':  return '/dashboard/trendyol?tab=categories';
    case 'brands':      return '/dashboard/trendyol?tab=brands';
    case 'attributes':  return '/dashboard/trendyol?tab=attributes';
    case 'setup':       return '/dashboard/trendyol?tab=setup';
    case 'product':     return `/dashboard/products/${productId}/edit`;
    default:            return '/dashboard/trendyol';
  }
}

function tabLabel(tab: string | null): string {
  switch (tab) {
    case 'categories':  return 'Kategori Eşleştirme';
    case 'brands':      return 'Marka Eşleştirme';
    case 'attributes':  return 'Özellik Eşleştirme';
    case 'setup':       return 'Bağlantı Ayarları';
    case 'product':     return 'Ürün Düzenle';
    default:            return 'Trendyol Entegrasyon';
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ report }: { report: ValidationReport }) {
  const { canSend, issues } = report;
  if (issues.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Hazır
      </span>
    );
  }
  if (isCategorySkip(report)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"/>Atlanacak
      </span>
    );
  }
  if (!canSend) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"/>Hata
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"/>Uyarı
    </span>
  );
}

function ProductReportRow({ report, navigate }: { report: ValidationReport; navigate: ReturnType<typeof useNavigate> }) {
  const [expanded, setExpanded] = useState(!report.canSend);
  const errors   = report.issues.filter(i => i.level === 'error');
  const warnings = report.issues.filter(i => i.level === 'warning');
  const skips    = report.issues.filter(i => i.level === 'skip');
  const skipped  = isCategorySkip(report);

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      isHardError(report) && !report.canSend ? 'border-red-200 bg-red-50/30' :
      skipped ? 'border-slate-200 bg-slate-50/40' :
      warnings.length > 0 ? 'border-amber-200 bg-amber-50/20' :
      'border-emerald-200 bg-emerald-50/20'
    }`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <StatusBadge report={report} />
        <span className="flex-1 text-sm font-semibold text-gray-800 truncate" title={report.productName}>
          {report.productName}
        </span>
        {report.issues.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
          >
            {expanded ? 'Gizle ▲' : `${report.issues.length} sorun ▼`}
          </button>
        )}
        {report.issues.length === 0 && (
          <span className="text-xs text-emerald-600 flex-shrink-0">✓ Gönderime hazır</span>
        )}
      </div>

      {expanded && report.issues.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-2">
          {errors.map((issue, i) => (
            <div key={`e-${i}`} className="flex items-start gap-2">
              <span className="mt-0.5 w-4 h-4 flex-shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">!</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-red-700 font-medium">{issue.message}</p>
                {issue.hint && <p className="text-[11px] text-gray-500 mt-0.5">{issue.hint}</p>}
              </div>
              {issue.tab && (
                <button
                  onClick={() => navigate(tabToFixUrl(issue.tab, report.productId))}
                  className="flex-shrink-0 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline whitespace-nowrap"
                >
                  → {tabLabel(issue.tab)}
                </button>
              )}
            </div>
          ))}
          {skips.map((issue, i) => (
            <div key={`s-${i}`} className="flex items-start gap-2">
              <span className="mt-0.5 w-4 h-4 flex-shrink-0 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">—</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 font-medium">{issue.message}</p>
                {issue.hint && <p className="text-[11px] text-gray-500 mt-0.5">{issue.hint}</p>}
              </div>
              {issue.tab && (
                <button
                  onClick={() => navigate(tabToFixUrl(issue.tab, report.productId))}
                  className="flex-shrink-0 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline whitespace-nowrap"
                >
                  → {tabLabel(issue.tab)}
                </button>
              )}
            </div>
          ))}
          {warnings.map((issue, i) => (
            <div key={`w-${i}`} className="flex items-start gap-2">
              <span className="mt-0.5 w-4 h-4 flex-shrink-0 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">⚠</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-700">{issue.message}</p>
                {issue.hint && <p className="text-[11px] text-gray-500 mt-0.5">{issue.hint}</p>}
              </div>
              {issue.tab && (
                <button
                  onClick={() => navigate(tabToFixUrl(issue.tab, report.productId))}
                  className="flex-shrink-0 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline whitespace-nowrap"
                >
                  → {tabLabel(issue.tab)}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function ProductSendValidationModal({
  isOpen, isValidating, isSending = false, reports, totalCount, pendingIds, onSendValid, onCancel,
}: Props) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const validIds      = reports.filter(r => r.canSend).map(r => r.productId);
  const hardErrorCount = reports.filter(r => !r.canSend && isHardError(r)).length;
  const skipCount     = reports.filter(isCategorySkip).length;
  const warnCount     = reports.filter(r => r.canSend && r.issues.length > 0).length;
  const cleanCount    = reports.filter(r => r.canSend && r.issues.length === 0).length;

  const allSendableIds: string[] =
    reports.length === 0 && pendingIds && pendingIds.length > 0
      ? pendingIds
      : validIds;

  const allValidCount = allSendableIds.length || Math.max(0, totalCount - hardErrorCount - skipCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isSending ? undefined : onCancel}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Trendyol Gönderim Kontrolü</h2>
              <p className="text-xs text-gray-500">{totalCount} ürün kontrol ediliyor</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {isValidating && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
            <svg className="w-10 h-10 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-sm text-gray-500">Ürünler kontrol ediliyor…</p>
          </div>
        )}

        {!isValidating && (
          <>
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
              <p className="text-xs text-blue-800">
                Eşleşmeyen kategorilere ait ürünler gönderilmeyecektir.
              </p>
              {reports.length > 0 && (
                <p className="text-xs font-semibold text-blue-900 mt-1">
                  <span className="text-emerald-700">{allValidCount} ürün gönderilecek</span>
                  {skipCount > 0 && (
                    <> · <span className="text-slate-600">{skipCount} ürün kategori eşleşmediği için gönderilmeyecek</span></>
                  )}
                  {hardErrorCount > 0 && (
                    <> · <span className="text-red-700">{hardErrorCount} ürün hatalı</span></>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"/>
                <span className="text-xs font-semibold text-gray-700">{cleanCount + warnCount} gönderilecek</span>
              </div>
              {skipCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"/>
                  <span className="text-xs text-gray-600">{skipCount} kategori atlanacak</span>
                </div>
              )}
              {warnCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"/>
                  <span className="text-xs text-gray-600">{warnCount} uyarılı</span>
                </div>
              )}
              {hardErrorCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"/>
                  <span className="text-xs text-gray-600">{hardErrorCount} hatalı</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {reports.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Tüm ürünler gönderime hazır</p>
                  <p className="text-xs text-gray-500 mt-1">Herhangi bir sorun tespit edilmedi.</p>
                </div>
              )}
              {reports.map(r => (
                <ProductReportRow key={r.productId} report={r} navigate={navigate} />
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={onCancel}
                disabled={isSending}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                İptal
              </button>

              <div className="flex items-center gap-2">
                {allValidCount === 0 && (
                  <p className="text-xs text-red-600 font-medium">Gönderilecek ürün yok</p>
                )}
                {allValidCount > 0 && (
                  <button
                    onClick={() => onSendValid(allSendableIds)}
                    disabled={isSending}
                    className="px-5 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Gönderiliyor…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                        </svg>
                        {skipCount > 0 || hardErrorCount > 0
                          ? `${allValidCount} ürünü gönder`
                          : `${allValidCount} ürünü Trendyol'a gönder`}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
