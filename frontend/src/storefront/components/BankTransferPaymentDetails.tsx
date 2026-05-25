import { useState } from 'react';
import { hasBankTransferPaymentDetails } from '../utils/bankTransferPayment';

export type BankTransferPaymentInfo = {
  bankName:         string | null;
  accountHolder:    string | null;
  iban:             string | null;
  description:      string | null;
  paymentReference: string;
};

type ResendEmailProps = {
  onResend: () => void;
  isResending: boolean;
  feedback: { type: 'success' | 'error'; text: string } | null;
};

type Props = {
  bankTransferPayment: BankTransferPaymentInfo | null;
  /** bankTransferPayment null iken eksik ayar mesajı */
  showUnavailable?: boolean;
  className?: string;
  resendEmail?: ResendEmailProps;
};

export function BankTransferPaymentDetails({
  bankTransferPayment,
  showUnavailable = false,
  className = 'rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm',
  resendEmail,
}: Props) {
  const [copied, setCopied] = useState(false);
  const hasDetails = hasBankTransferPaymentDetails(bankTransferPayment);

  if (!hasDetails && !showUnavailable) return null;

  const copyIban = async () => {
    const iban = bankTransferPayment?.iban?.trim();
    if (!iban || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(iban);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={className}>
      <h3 className="font-medium text-slate-900 mb-3">Havale/EFT bilgileri</h3>

      {showUnavailable && !hasDetails && (
        <p className="text-slate-600">
          Banka bilgileri şu anda görüntülenemiyor. Lütfen mağaza ile iletişime geçin.
        </p>
      )}

      {hasDetails && bankTransferPayment && (
        <>
          <dl className="space-y-2">
            <div>
              <dt className="text-slate-500 text-xs">Banka adı</dt>
              <dd className="font-medium text-slate-900">{bankTransferPayment.bankName}</dd>
            </div>
            {bankTransferPayment.accountHolder?.trim() && (
              <div>
                <dt className="text-slate-500 text-xs">Hesap sahibi</dt>
                <dd className="font-medium text-slate-900">{bankTransferPayment.accountHolder}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500 text-xs">IBAN</dt>
              <dd className="font-mono font-medium text-slate-900 break-all">
                {bankTransferPayment.iban}
              </dd>
            </div>
            {bankTransferPayment.description?.trim() && (
              <div>
                <dt className="text-slate-500 text-xs">Açıklama / ödeme notu</dt>
                <dd className="text-slate-900">{bankTransferPayment.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500 text-xs">Ödeme açıklamasına yazılacak sipariş no</dt>
              <dd className="font-mono font-medium text-slate-900">
                {bankTransferPayment.paymentReference}
              </dd>
            </div>
          </dl>
          <p className="text-slate-600 text-xs mt-3">
            Ödemenizin eşleştirilebilmesi için açıklama alanına sipariş numaranızı yazmanız
            önerilir.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {bankTransferPayment.iban && typeof navigator !== 'undefined' && navigator.clipboard && (
              <>
                <button
                  type="button"
                  onClick={() => void copyIban()}
                  className="px-3 py-1.5 text-xs font-medium border border-amber-300 rounded-lg
                             bg-white text-slate-700 hover:bg-amber-50"
                >
                  IBAN&apos;ı kopyala
                </button>
                {copied && <span className="text-xs text-emerald-700">Kopyalandı</span>}
              </>
            )}
            {resendEmail && (
              <button
                type="button"
                onClick={resendEmail.onResend}
                disabled={resendEmail.isResending}
                className="px-3 py-1.5 text-xs font-medium border border-indigo-200 rounded-lg
                           bg-white text-indigo-700 hover:bg-indigo-50
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendEmail.isResending
                  ? 'Gönderiliyor…'
                  : 'Ödeme bilgilerini e-posta olarak tekrar gönder'}
              </button>
            )}
          </div>
          {resendEmail?.feedback && (
            <p
              className={`text-xs mt-2 ${
                resendEmail.feedback.type === 'success' ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {resendEmail.feedback.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}
