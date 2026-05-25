import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStorefrontTenant } from '../hooks/useStorefrontTenant';
import { BankTransferPaymentDetails } from '../components/BankTransferPaymentDetails';
import {
  getStoreOrderPaymentPending,
  type StorePaymentPendingResponse,
} from '../services/storefrontOrderApi';
import { formatTry } from '../utils/format';
import { formatDateTimeTr } from '../utils/shipping';
import { useResendBankTransferEmail } from '../hooks/useResendBankTransferEmail';
import {
  BANK_TRANSFER_APPROVED_DESCRIPTION,
  BANK_TRANSFER_APPROVED_TITLE,
  hasBankTransferPaymentDetails,
  isBankTransferPaymentSettled,
  isBankTransferPaymentWaiting,
  shouldPollPaymentPendingStatus,
  shouldStopPollingPaymentPending,
} from '../utils/bankTransferPayment';

export const PENDING_PAYMENT_POLL_INTERVAL_MS = 10_000;
export const PENDING_PAYMENT_MAX_POLLS = 30;

export default function StorePaymentPendingPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { storeLink, tenant } = useStorefrontTenant();
  const decoded = orderNumber ? decodeURIComponent(orderNumber) : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StorePaymentPendingResponse | null>(null);
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [lastPollAt, setLastPollAt] = useState<Date | null>(null);
  const [pollStoppedMessage, setPollStoppedMessage] = useState<string | null>(null);
  const [statusUpdatedBanner, setStatusUpdatedBanner] = useState(false);

  const dataRef = useRef(data);
  dataRef.current = data;
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current != null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsPollingActive(false);
  }, []);

  const applyPaymentData = useCallback((res: StorePaymentPendingResponse, fromPoll: boolean) => {
    if (!res.success || !res.order) return false;

    const prevOrder = dataRef.current?.order;
    if (
      fromPoll
      && prevOrder
      && shouldPollPaymentPendingStatus(prevOrder)
      && isBankTransferPaymentSettled(res.order)
    ) {
      setStatusUpdatedBanner(true);
    }

    setData(res);

    if (shouldStopPollingPaymentPending(res.order)) {
      stopPolling();
    }

    return true;
  }, [stopPolling]);

  const fetchPayment = useCallback(
    async (opts: { initial?: boolean }): Promise<StorePaymentPendingResponse | null> => {
      if (!tenant?.slug || !decoded) return null;

      if (opts.initial) {
        setLoading(true);
        setError(null);
        setPollStoppedMessage(null);
        setStatusUpdatedBanner(false);
        stopPolling();
        pollCountRef.current = 0;
      }

      try {
        const res = await getStoreOrderPaymentPending(tenant.slug, decoded);
        if (opts.initial) {
          if (!res.success || !res.order) {
            setError(res.error || 'Sipariş bulunamadı.');
            setData(null);
            return null;
          }
          applyPaymentData(res, false);
        }
        return res;
      } catch (e: unknown) {
        if (opts.initial) {
          setError((e as Error)?.message || 'Ödeme bilgileri yüklenemedi.');
          setData(null);
        }
        return null;
      } finally {
        if (opts.initial) setLoading(false);
      }
    },
    [tenant?.slug, decoded, applyPaymentData, stopPolling],
  );

  useEffect(() => {
    if (!tenant?.slug || !decoded) {
      setLoading(false);
      setError('Mağaza veya sipariş numarası bulunamadı.');
      return;
    }

    let cancelled = false;
    (async () => {
      await fetchPayment({ initial: true });
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [tenant?.slug, decoded, fetchPayment, stopPolling]);

  useEffect(() => {
    if (loading || error || !tenant?.slug || !decoded) {
      stopPolling();
      return;
    }

    const order = data?.order;
    if (!order || !shouldPollPaymentPendingStatus(order)) {
      stopPolling();
      return;
    }

    let cancelled = false;
    setIsPollingActive(true);
    setPollStoppedMessage(null);
    pollCountRef.current = 0;

    const runPoll = async () => {
      if (cancelled) return;

      const current = dataRef.current?.order;
      if (!current || shouldStopPollingPaymentPending(current)) {
        stopPolling();
        return;
      }

      pollCountRef.current += 1;
      if (pollCountRef.current > PENDING_PAYMENT_MAX_POLLS) {
        stopPolling();
        setPollStoppedMessage(
          'Ödeme durumunu otomatik kontrol etmeyi durdurduk. Sayfayı yenileyerek tekrar kontrol edebilirsiniz.',
        );
        return;
      }

      try {
        const res = await getStoreOrderPaymentPending(tenant.slug, decoded);
        if (cancelled) return;
        setLastPollAt(new Date());
        if (res.success && res.order) {
          applyPaymentData(res, true);
        }
      } catch {
        /* Geçici hata: mevcut veri korunur, sonraki denemede devam */
      }
    };

    pollTimerRef.current = setInterval(() => {
      void runPoll();
    }, PENDING_PAYMENT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [
    loading,
    error,
    tenant?.slug,
    decoded,
    data?.order?.paymentStatus,
    data?.order?.status,
    data?.order?.paymentProvider,
    applyPaymentData,
    stopPolling,
  ]);

  const order = data?.order;
  const isWaiting = order ? isBankTransferPaymentWaiting(order) : false;
  const isSettled = order ? isBankTransferPaymentSettled(order) : false;
  const isCancelled = order?.status === 'CANCELLED';
  const isNotBankTransfer = order && order.paymentProvider !== 'BANK_TRANSFER';
  const showResendButton = isWaiting && hasBankTransferPaymentDetails(data?.bankTransferPayment ?? null);
  const { resend, isResending, feedback } = useResendBankTransferEmail(tenant?.slug, decoded);
  const approvedAtLabel = formatDateTimeTr(order?.paymentApprovedAt);
  const lastPollLabel = lastPollAt
    ? lastPollAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const pageTitle = isSettled
    ? BANK_TRANSFER_APPROVED_TITLE
    : 'Ödeme bekleniyor';

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900 text-center">{pageTitle}</h1>

      {loading && (
        <p className="mt-6 text-sm text-slate-500 text-center">Yükleniyor…</p>
      )}

      {error && !loading && (
        <p className="mt-6 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-center">
          {error}
        </p>
      )}

      {!loading && !error && order && (
        <>
          {statusUpdatedBanner && isSettled && (
            <p className="mt-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 text-center">
              Ödeme durumunuz güncellendi.
            </p>
          )}

          {isSettled && !isCancelled && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-900 space-y-4">
              <p>{BANK_TRANSFER_APPROVED_DESCRIPTION}</p>
              <dl className="space-y-2 text-slate-800">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Sipariş no</dt>
                  <dd className="font-mono font-medium">{order.orderNumber}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Toplam</dt>
                  <dd className="font-semibold">{formatTry(order.totalAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Ödeme yöntemi</dt>
                  <dd className="font-medium">{order.paymentProviderLabel}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Ödeme durumu</dt>
                  <dd className="font-medium">{order.paymentStatusLabel}</dd>
                </div>
                {approvedAtLabel && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-600">Onay tarihi</dt>
                    <dd>{approvedAtLabel}</dd>
                  </div>
                )}
              </dl>
              <Link
                to={storeLink(
                  `/store/hesabim/siparisler/${encodeURIComponent(order.orderNumber)}`,
                )}
                className="inline-flex w-full justify-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                Sipariş detayına git
              </Link>
            </div>
          )}

          {isWaiting && (
            <>
              <p className="mt-4 text-slate-600 text-sm text-center">
                Havale/EFT ödemeniz bekleniyor. Aşağıdaki banka bilgilerini kullanarak ödemenizi
                yapabilirsiniz.
              </p>
              <p className="mt-2 text-slate-600 text-sm text-center">
                Sipariş: <span className="font-mono font-medium">{order.orderNumber}</span>
                {' · '}
                Tutar: <span className="font-semibold">{formatTry(order.totalAmount)}</span>
              </p>

              {isPollingActive && (
                <p className="mt-3 text-xs text-slate-500 text-center">
                  Ödeme durumu otomatik kontrol ediliyor.
                  {lastPollLabel ? ` Son kontrol: ${lastPollLabel}.` : ''}
                </p>
              )}

              {pollStoppedMessage && (
                <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-center">
                  {pollStoppedMessage}
                </p>
              )}

              <div className="mt-8">
                <BankTransferPaymentDetails
                  bankTransferPayment={data?.bankTransferPayment ?? null}
                  showUnavailable
                  resendEmail={showResendButton ? { onResend: () => void resend(), isResending, feedback } : undefined}
                />
              </div>

              <p className="mt-4 text-xs text-slate-500 text-center">
                Ödeme bilgileri size e-posta ile de gönderilmiş olabilir.
              </p>
            </>
          )}

          {isCancelled && (
            <p className="mt-6 text-sm text-red-800 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-center">
              Bu sipariş iptal edilmiş.
            </p>
          )}

          {isNotBankTransfer && !isCancelled && (
            <>
              <p className="mt-4 text-slate-600 text-sm text-center">
                Sipariş: <span className="font-mono font-medium">{order.orderNumber}</span>
              </p>
              <p className="mt-6 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-center">
                Bu sayfa yalnızca Havale/EFT siparişleri için kullanılabilir.
              </p>
            </>
          )}
        </>
      )}

      <div className="mt-8 text-center">
        <Link
          to={storeLink('/store')}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold inline-block"
        >
          Ana sayfaya dön
        </Link>
      </div>
      {tenant && (
        <p className="mt-4 text-xs text-slate-400 text-center">{tenant.name}</p>
      )}
    </div>
  );
}
