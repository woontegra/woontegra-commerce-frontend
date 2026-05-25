import { api } from '../services/apiClient';
import { useAppStore } from '../store/useAppStore';

/** Sunucudaki onboarding durumunu çeker; tamamlandıysa store + localStorage güncellenir. */
export async function refreshOnboardingUserInStore(): Promise<void> {
  try {
    const res = await api.get('/onboarding/wizard/status');
    const raw = res.data as { data?: { onboardingCompleted?: boolean }; onboardingCompleted?: boolean };
    const d = raw?.data ?? raw;
    if (!d?.onboardingCompleted) return;
    const u = useAppStore.getState().user;
    if (!u) return;
    const updated = { ...u, onboardingCompleted: true, onboardingStep: 4 };
    useAppStore.getState().setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}
