import { useEffect, useRef } from 'react';

export const STORE_ACCOUNT_REFRESH_COOLDOWN_MS = 30_000;

export function canRunFocusRefresh(
  lastRunAt: number,
  now: number,
  cooldownMs = STORE_ACCOUNT_REFRESH_COOLDOWN_MS,
): boolean {
  return now - lastRunAt >= cooldownMs;
}

type UseRefreshOnFocusOptions = {
  enabled?: boolean;
  cooldownMs?: number;
  onRefresh: () => void | Promise<void>;
};

/**
 * Calls onRefresh when the tab becomes visible or the window regains focus.
 * Cooldown prevents burst requests; in-flight guard prevents overlapping refreshes.
 * Initial mount seeds cooldown so the first load is not duplicated immediately.
 */
export function useRefreshOnFocus({
  enabled = true,
  cooldownMs = STORE_ACCOUNT_REFRESH_COOLDOWN_MS,
  onRefresh,
}: UseRefreshOnFocusOptions): void {
  const onRefreshRef = useRef(onRefresh);
  const lastRefreshAtRef = useRef(Date.now());
  const inFlightRef = useRef(false);

  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    lastRefreshAtRef.current = Date.now();

    const tryRefresh = () => {
      if (document.visibilityState !== 'visible') return;

      const now = Date.now();
      if (!canRunFocusRefresh(lastRefreshAtRef.current, now, cooldownMs)) return;
      if (inFlightRef.current) return;

      lastRefreshAtRef.current = now;
      inFlightRef.current = true;

      void Promise.resolve(onRefreshRef.current())
        .catch(() => {})
        .finally(() => {
          inFlightRef.current = false;
        });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tryRefresh();
    };

    const onWindowFocus = () => tryRefresh();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [enabled, cooldownMs]);
}
