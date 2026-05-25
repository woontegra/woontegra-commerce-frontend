import axios from 'axios';

/** Axios / API hatalarını vitrin için Türkçe mesaja çevirir. */
export function getStorefrontApiErrorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string; message?: string } | undefined;
    const apiMsg = data?.error ?? data?.message;
    if (typeof apiMsg === 'string' && apiMsg.trim()) {
      return apiMsg.trim();
    }
    if (e.response?.status === 401) {
      return 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
    }
    return fallback;
  }
  if (e instanceof Error) {
    const msg = e.message.trim();
    if (msg && !/request failed with status code/i.test(msg)) {
      return msg;
    }
  }
  return fallback;
}
