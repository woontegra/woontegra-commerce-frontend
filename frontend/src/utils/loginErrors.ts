export const SELLER_LOGIN_ERROR_MESSAGE =
  'E-posta, şifre veya mağaza slug hatalı.';

const SUPER_ADMIN_HINT_PATTERN =
  /süper admin|super admin|slug alanını boş/i;

function readApiErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { error?: string; message?: string } } })
    ?.response?.data;
  return String(data?.error || data?.message || '').trim();
}

/** Panel login hatalarını kullanıcıya gösterilecek metne çevirir. */
export function resolveLoginErrorMessage(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const apiMsg = readApiErrorMessage(err);

  // 401 ve backend super-admin mesajı — satıcıya asla gösterme
  if (status === 401 || SUPER_ADMIN_HINT_PATTERN.test(apiMsg)) {
    return SELLER_LOGIN_ERROR_MESSAGE;
  }

  if (apiMsg) return apiMsg;

  return 'Giriş başarısız.';
}
