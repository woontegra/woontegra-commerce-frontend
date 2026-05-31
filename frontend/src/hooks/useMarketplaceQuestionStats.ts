import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import { AUTH_LOGIN_EVENT, AUTH_LOGOUT_EVENT } from '../services/authEvents';

export const MARKETPLACE_QUESTIONS_STATS_REFRESH = 'marketplace-questions-stats-refresh';

const POLL_MS = 60_000;

export function useMarketplaceQuestionStats() {
  const [waitingAnswer, setWaitingAnswer] = useState(0);
  const [loading, setLoading]             = useState(true);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setWaitingAnswer(0);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.get<{ success: boolean; data: { waitingAnswer: number } }>(
        '/marketplace-questions/stats',
        { skipErrorToast: true },
      );
      setWaitingAnswer(res.data?.data?.waitingAnswer ?? 0);
    } catch {
      // Panel bozulmasın — badge sessizce 0 kalır veya önceki değer korunur
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const onRefresh = () => { void refresh(); };
    const onAuth = () => { void refresh(); };
    const onLogout = () => {
      setWaitingAnswer(0);
      setLoading(false);
    };

    window.addEventListener(MARKETPLACE_QUESTIONS_STATS_REFRESH, onRefresh);
    window.addEventListener(AUTH_LOGIN_EVENT, onAuth);
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);

    const timer = window.setInterval(() => { void refresh(); }, POLL_MS);

    return () => {
      window.removeEventListener(MARKETPLACE_QUESTIONS_STATS_REFRESH, onRefresh);
      window.removeEventListener(AUTH_LOGIN_EVENT, onAuth);
      window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { waitingAnswer, loading, refresh };
}

export function notifyMarketplaceQuestionStatsRefresh() {
  window.dispatchEvent(new CustomEvent(MARKETPLACE_QUESTIONS_STATS_REFRESH));
}
