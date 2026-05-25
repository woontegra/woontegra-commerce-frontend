/**
 * ProductSendProgress
 *
 * Fixed bottom-right panel shown after products are queued for Trendyol.
 * Polls GET /trendyol/batches/:batchId every 1.5 s until status === 'done'.
 * Shows per-product status with expandable error details.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../../services/apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

type ItemStatus = 'pending' | 'sending' | 'success' | 'error' | 'skipped';

interface ProductResult {
  productId:        string;
  productName:      string;
  status:           ItemStatus;
  message?:         string;
  trendyolBatchId?: string;
}

interface BatchStatus {
  batchId:    string;
  status:     'pending' | 'running' | 'done';
  total:      number;
  processed:  number;
  success:    number;
  failed:     number;
  skipped:    number;
  results:    ProductResult[];
  startedAt:  string;
  finishedAt?: string;
}

interface Props {
  batchId:  string;
  onClose?: () => void;
}

// ── Status helpers ─────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === 'success') return (
    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
      </svg>
    </span>
  );
  if (status === 'error') return (
    <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </span>
  );
  if (status === 'skipped') return (
    <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
      </svg>
    </span>
  );
  if (status === 'sending') return (
    <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-3 h-3 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </span>
  );
  // pending
  return (
    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300"/>
    </span>
  );
}

function statusLabel(status: ItemStatus): { text: string; cls: string } {
  switch (status) {
    case 'success': return { text: 'Başarılı',    cls: 'text-emerald-600' };
    case 'error':   return { text: 'Hata',         cls: 'text-red-600' };
    case 'skipped': return { text: 'Atlandı',      cls: 'text-amber-600' };
    case 'sending': return { text: 'Gönderiliyor', cls: 'text-blue-500' };
    default:        return { text: 'Bekliyor…',    cls: 'text-gray-400' };
  }
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse"/>
        <div className="space-y-1.5">
          <div className="w-40 h-3 bg-gray-200 rounded animate-pulse"/>
          <div className="w-24 h-2.5 bg-gray-100 rounded animate-pulse"/>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100">
        <div className="h-full w-1/4 bg-gray-200 rounded-full animate-pulse"/>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="px-5 py-2.5 border-b border-gray-50 flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full bg-gray-100 animate-pulse flex-shrink-0"/>
          <div className="flex-1 h-3 bg-gray-100 rounded animate-pulse"/>
          <div className="w-12 h-3 bg-gray-100 rounded animate-pulse"/>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductSendProgress({ batchId, onClose }: Props) {
  const [batch,      setBatch]      = useState<BatchStatus | null>(null);
  const [pollErrors, setPollErrors] = useState(0);
  const [expanded,   setExpanded]   = useState<Record<string, boolean>>({});
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchBatch = useCallback(async () => {
    try {
      const res  = await apiClient.get(`/trendyol/batches/${batchId}`);
      const data = res.data as BatchStatus;
      setBatch(data);
      setPollErrors(0);
      if (data.status === 'done') stopPolling();
    } catch {
      setPollErrors(n => {
        const next = n + 1;
        // After 5 consecutive failures stop polling and surface the error
        if (next >= 5) stopPolling();
        return next;
      });
    }
  }, [batchId, stopPolling]);

  useEffect(() => {
    fetchBatch();
    intervalRef.current = setInterval(fetchBatch, 1500);
    return stopPolling;
  }, [batchId, fetchBatch, stopPolling]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!batch) {
    if (pollErrors >= 5) {
      return (
        <div className="bg-white border border-red-200 rounded-2xl shadow-md p-5 text-center">
          <p className="text-sm font-semibold text-red-600">Durum alınamadı</p>
          <p className="text-xs text-gray-500 mt-1">Sunucu yanıt vermiyor. Sayfayı yenileyip tekrar deneyin.</p>
          {onClose && (
            <button onClick={onClose} className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline">
              Kapat
            </button>
          )}
        </div>
      );
    }
    return <Skeleton />;
  }

  const isDone = batch.status === 'done';
  const pct    = batch.total > 0 ? Math.round((batch.processed / batch.total) * 100) : 0;
  const allOk  = isDone && batch.failed === 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          {isDone ? (
            allOk ? (
              <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
              </span>
            ) : (
              <span className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01"/>
                </svg>
              </span>
            )
          ) : (
            <svg className="w-5 h-5 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          )}

          <div>
            <p className="text-sm font-bold text-gray-800">
              {isDone ? (allOk ? 'Gönderim Tamamlandı ✓' : 'Gönderim Tamamlandı') : "Trendyol'a Gönderiliyor…"}
            </p>
            <p className="text-xs text-gray-500">
              {isDone ? (
                <>
                  {batch.success > 0 && <span className="text-emerald-600">{batch.success} başarılı</span>}
                  {batch.failed  > 0 && <span className="text-red-500 ml-1.5">{batch.failed} hatalı</span>}
                  {batch.skipped > 0 && <span className="text-amber-500 ml-1.5">{batch.skipped} atlandı</span>}
                </>
              ) : (
                <>{batch.processed} / {batch.total} işlendi</>
              )}
            </p>
          </div>
        </div>

        {/* Close button — always visible when done; also shown while running so user can dismiss */}
        {onClose && (
          <button
            onClick={onClose}
            title={isDone ? 'Kapat' : 'Arka plana al'}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className={`h-full transition-all duration-500 ${
            allOk    ? 'bg-emerald-500' :
            isDone   ? 'bg-orange-500'  :
                       'bg-orange-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Summary chips (only while running) */}
      {!isDone && batch.total > 0 && (
        <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold">
          <span className="text-emerald-600">{batch.success} ✓</span>
          <span className="text-red-500">{batch.failed} hata</span>
          <span className="text-gray-400">{batch.total - batch.processed} bekliyor</span>
        </div>
      )}

      {/* Per-product rows */}
      {batch.results.length > 0 && (
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {batch.results.map(r => {
            const label = statusLabel(r.status);
            const hasDetail = !!r.message && r.status !== 'success';
            return (
              <div key={r.productId} className="px-5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <StatusIcon status={r.status} />
                  <span className="text-sm text-gray-800 truncate flex-1 min-w-0">
                    {r.productName || r.productId}
                  </span>
                  <span className={`text-[11px] font-semibold flex-shrink-0 ${label.cls}`}>
                    {label.text}
                  </span>
                  {hasDetail && (
                    <button
                      onClick={() => setExpanded(e => ({ ...e, [r.productId]: !e[r.productId] }))}
                      className="text-[11px] text-gray-400 hover:text-gray-700 flex-shrink-0 transition-colors"
                    >
                      {expanded[r.productId] ? '▲' : 'Detay ▼'}
                    </button>
                  )}
                </div>
                {expanded[r.productId] && r.message && (
                  <p className="mt-1.5 ml-7 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 break-words">
                    {r.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Polling error warning (partial failure — not fatal) */}
      {pollErrors > 0 && pollErrors < 5 && (
        <div className="px-5 py-2 bg-amber-50 border-t border-amber-100">
          <p className="text-[11px] text-amber-700">Bağlantı gecikmesi — yeniden deneniyor…</p>
        </div>
      )}
    </div>
  );
}
