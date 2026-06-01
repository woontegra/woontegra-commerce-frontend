import axios from 'axios';

type ApiErrorBody = {
  error?: string;
  message?: string;
};

function readApiMessage(e: unknown): string | null {
  if (!axios.isAxiosError(e)) return null;
  const data = e.response?.data as ApiErrorBody | undefined;
  const apiMsg = data?.error ?? data?.message;
  if (typeof apiMsg === 'string' && apiMsg.trim()) {
    return apiMsg.trim();
  }
  return null;
}

function isDuplicateEmailMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    /zaten\s+kay[iı]tl[iı]/.test(m) ||
    /already\s+exists/.test(m) ||
    /email\s+already/.test(m) ||
    /customer\s+already/.test(m) ||
    /duplicate\s+email/.test(m)
  );
}

const REGISTER_DUPLICATE_EMAIL_MSG =
  'Bu e-posta adresiyle kayıtlı bir hesap var. Giriş yapmayı deneyin veya şifrenizi sıfırlayın.';

const REGISTER_VALIDATION_MSG = 'Lütfen bilgileri kontrol edip tekrar deneyin.';

const REGISTER_SERVER_MSG =
  'Kayıt işlemi şu anda tamamlanamadı. Lütfen daha sonra tekrar deneyin.';

/** Vitrin müşteri kayıt hatalarını kullanıcı dostu Türkçe mesaja çevirir. */
export function getStorefrontRegisterErrorMessage(e: unknown): string {
  const apiMsg = readApiMessage(e);

  if (apiMsg && isDuplicateEmailMessage(apiMsg)) {
    return REGISTER_DUPLICATE_EMAIL_MSG;
  }

  if (axios.isAxiosError(e)) {
    const status = e.response?.status;
    if (status === 400) {
      return REGISTER_VALIDATION_MSG;
    }
    if (!e.response || (status != null && status >= 500)) {
      return REGISTER_SERVER_MSG;
    }
    if (apiMsg) {
      return apiMsg;
    }
    return REGISTER_SERVER_MSG;
  }

  if (e instanceof Error) {
    const msg = e.message.trim();
    if (msg && isDuplicateEmailMessage(msg)) {
      return REGISTER_DUPLICATE_EMAIL_MSG;
    }
    if (msg && !/request failed with status code/i.test(msg)) {
      return msg;
    }
  }

  return REGISTER_SERVER_MSG;
}

/** Axios / API hatalarını vitrin için Türkçe mesaja çevirir. */
export function getStorefrontApiErrorMessage(e: unknown, fallback: string): string {
  const apiMsg = readApiMessage(e);

  if (apiMsg) {
    return apiMsg;
  }

  if (axios.isAxiosError(e)) {
    if (e.response?.status === 401) {
      return 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
    }
    if (e instanceof Error) {
      const msg = e.message.trim();
      if (msg && !/request failed with status code/i.test(msg)) {
        return msg;
      }
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
