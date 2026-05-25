import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight, RefreshCcw, Home } from 'lucide-react';

const PLAN_NAMES: Record<string, string> = {
  STARTER:    'Starter',
  PRO:        'Pro',
  ENTERPRISE: 'Enterprise',
};

const PaymentResult: React.FC = () => {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const [countdown, setCountdown] = useState(8);

  const status = searchParams.get('status') as 'success' | 'failed' | null;
  const plan   = searchParams.get('plan') || '';
  const reason = searchParams.get('reason') || '';

  const isSuccess = status === 'success';

  // Auto-redirect after success
  useEffect(() => {
    if (!isSuccess) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSuccess, navigate]);

  const friendlyReason = (r: string): string => {
    const map: Record<string, string> = {
      not_found:        'Ödeme kaydı bulunamadı.',
      payment_failed:   'Ödeme işlemi başarısız oldu.',
      missing_token:    'Geçersiz ödeme oturumu.',
      db_error:         'Sistem hatası oluştu. Destek ekibiyle iletişime geçin.',
      server_error:     'Sunucu hatası oluştu.',
      FAILED:           'Banka tarafından reddedildi.',
      INIT_ABORTED:     'Ödeme işleminden vazgeçildi.',
    };
    return map[r] || 'Ödeme tamamlanamadı.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Top banner */}
        <div
          className={`h-2 w-full ${isSuccess ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
        />

        <div className="p-10 text-center">
          {/* Icon */}
          <div
            className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
              isSuccess ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            {isSuccess ? (
              <CheckCircle className="w-14 h-14 text-green-500" strokeWidth={1.5} />
            ) : (
              <XCircle className="w-14 h-14 text-red-500" strokeWidth={1.5} />
            )}
          </div>

          {/* Title */}
          <h1 className={`text-3xl font-bold mb-2 ${isSuccess ? 'text-gray-900' : 'text-gray-800'}`}>
            {isSuccess ? 'Ödeme Başarılı!' : 'Ödeme Başarısız'}
          </h1>

          {/* Subtitle */}
          {isSuccess ? (
            <p className="text-gray-600 mb-2">
              <span className="font-semibold text-purple-600">{PLAN_NAMES[plan] || plan}</span> planınız
              başarıyla aktifleştirildi.
            </p>
          ) : (
            <p className="text-gray-600 mb-2">
              {friendlyReason(reason)}
            </p>
          )}

          {/* Details card */}
          {isSuccess && (
            <div className="mt-6 bg-green-50 border border-green-100 rounded-2xl p-5 text-left space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-700">Aboneliğiniz hemen aktif oldu</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-700">Tüm {PLAN_NAMES[plan] || plan} özellikleri kullanılabilir</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-700">Fatura e-posta adresinize gönderildi</span>
              </div>
            </div>
          )}

          {!isSuccess && reason && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs text-red-600">
                Hata kodu: <code className="font-mono">{reason}</code>
              </p>
            </div>
          )}

          {/* Auto-redirect countdown */}
          {isSuccess && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{countdown} saniye içinde dashboard'a yönlendiriliyorsunuz...</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3">
            {isSuccess ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-semibold transition-all duration-200"
              >
                Dashboard'a Git
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <>
                <Link
                  to="/plans"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-semibold transition-all duration-200"
                >
                  <RefreshCcw className="w-5 h-5" />
                  Tekrar Dene
                </Link>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 py-3.5 rounded-xl font-medium transition-all duration-200"
                >
                  <Home className="w-5 h-5" />
                  Dashboard'a Dön
                </button>
              </>
            )}
          </div>

          {/* Support link */}
          {!isSuccess && (
            <p className="mt-6 text-xs text-gray-400">
              Sorun devam ediyorsa{' '}
              <Link to="/support" className="text-blue-600 underline hover:text-blue-700">
                destek ekibiyle iletişime geçin
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;
