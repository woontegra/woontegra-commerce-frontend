import { useCallback, useState } from 'react';
import { resendStoreOrderPaymentPendingEmail } from '../services/storefrontOrderApi';

const SUCCESS_MSG = 'Ödeme bilgileri e-posta adresinize gönderildi.';
const ERROR_MSG =
  'Ödeme bilgileri şu anda gönderilemedi. Lütfen daha sonra tekrar deneyin.';

export function useResendBankTransferEmail(tenantSlug: string | undefined, orderNumber: string) {
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const resend = useCallback(async () => {
    if (!tenantSlug || !orderNumber.trim()) return;
    setIsResending(true);
    setFeedback(null);
    try {
      const res = await resendStoreOrderPaymentPendingEmail(tenantSlug, orderNumber);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message || SUCCESS_MSG });
      } else {
        setFeedback({
          type: 'error',
          text: res.message || ERROR_MSG,
        });
      }
    } catch {
      setFeedback({ type: 'error', text: ERROR_MSG });
    } finally {
      setIsResending(false);
    }
  }, [tenantSlug, orderNumber]);

  return { resend, isResending, feedback };
}
