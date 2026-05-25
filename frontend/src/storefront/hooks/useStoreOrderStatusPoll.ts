import { useCallback, useEffect, useRef, useState } from 'react';
import { getStoreOrderStatus, type StoreOrderStatusResponse } from '../services/storefrontOrderApi';

const POLL_MS = 3000;
const MAX_ATTEMPTS = 6;

export type OrderStatusPollState = {
  data: StoreOrderStatusResponse | null;
  error: string | null;
  loading: boolean;
  attempts: number;
  /** Polling bitti (terminal durum veya max deneme) */
  done: boolean;
};

function isTerminal(status: string | undefined): boolean {
  return status === 'PAID' || status === 'CANCELLED';
}

export function useStoreOrderStatusPoll(
  tenantSlug: string | undefined,
  orderNumber: string | undefined,
  options?: { enabled?: boolean },
): OrderStatusPollState {
  const enabled = options?.enabled !== false;
  const [data, setData] = useState<StoreOrderStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);
  const attemptRef = useRef(0);

  const fetchOnce = useCallback(async (): Promise<StoreOrderStatusResponse | null> => {
    if (!tenantSlug || !orderNumber) return null;
    const decoded = decodeURIComponent(orderNumber);
    return getStoreOrderStatus(tenantSlug, decoded);
  }, [tenantSlug, orderNumber]);

  useEffect(() => {
    if (!enabled || !tenantSlug || !orderNumber) {
      setLoading(false);
      setDone(true);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    attemptRef.current = 0;

    const run = async () => {
      setLoading(true);
      setError(null);

      while (attemptRef.current < MAX_ATTEMPTS && !cancelled) {
        attemptRef.current += 1;
        if (!cancelled) setAttempts(attemptRef.current);

        try {
          const res = await fetchOnce();
          if (cancelled || !res) return;

          if (!res.success) {
            setError(res.error || 'Sipariş durumu şu anda doğrulanamıyor.');
            setLoading(false);
            setDone(true);
            return;
          }

          setData(res);
          const status = res.order?.status;
          if (isTerminal(status) || attemptRef.current >= MAX_ATTEMPTS) {
            setLoading(false);
            setDone(true);
            return;
          }
        } catch {
          if (cancelled) return;
          setError('Sipariş durumu şu anda doğrulanamıyor.');
          setLoading(false);
          setDone(true);
          return;
        }

        await new Promise<void>(resolve => {
          timer = setTimeout(resolve, POLL_MS);
        });
      }

      if (!cancelled) {
        setLoading(false);
        setDone(true);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, tenantSlug, orderNumber, fetchOnce]);

  return { data, error, loading, attempts, done };
}

/** Tek seferlik durum sorgusu (ödeme iframe sayfası için). */
export async function fetchStoreOrderStatusOnce(
  tenantSlug: string,
  orderNumber: string,
): Promise<StoreOrderStatusResponse> {
  return getStoreOrderStatus(tenantSlug, decodeURIComponent(orderNumber));
}
