import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, XCircle, Clock, CreditCard, X } from 'lucide-react';
import api from '../../services/api';

type TenantStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED' | null;

interface LifecycleInfo {
  status: TenantStatus;
  trialEndsAt: string | null;
  daysLeft: number | null;
}

function getDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const TenantLifecycleBanner: React.FC = () => {
  const navigate = useNavigate();
  const [info, setInfo] = useState<LifecycleInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const user = (() => {
      try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    })();

    // Don't show for SUPER_ADMIN
    if (!user?.tenantId || user?.role === 'SUPER_ADMIN') return;

    api.get<{ status: TenantStatus; trialEndsAt: string | null }>('/tenants/lifecycle')
      .then((res: any) => {
        const data = res?.data?.data || res?.data;
        if (!data) return;
        setInfo({
          status:     data.status,
          trialEndsAt: data.trialEndsAt,
          daysLeft:   getDaysLeft(data.trialEndsAt),
        });
      })
      .catch(() => {
        // Non-blocking
      });
  }, []);

  if (!info || dismissed || info.daysLeft === null) return null;
  const { status, daysLeft } = info;

  // ACTIVE: no banner
  if (status === 'ACTIVE') return null;

  // ── SUSPENDED / CANCELED: full block overlay ──────────────────────────────
  if (status === 'SUSPENDED' || status === 'CANCELED') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950/95 flex items-center justify-center p-6">
        <div className="bg-gray-900 border border-red-800/60 rounded-2xl p-10 max-w-md text-center space-y-5">
          <div className="inline-flex w-16 h-16 rounded-full bg-red-900/30 items-center justify-center">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {status === 'SUSPENDED' ? 'Hesabınız Askıya Alındı' : 'Hesabınız İptal Edildi'}
          </h2>
          <p className="text-gray-400 text-sm">
            {status === 'SUSPENDED'
              ? 'Hesabınız platform yöneticisi tarafından askıya alınmıştır. Daha fazla bilgi için destek ekibiyle iletişime geçin.'
              : 'Aboneliğiniz iptal edilmiştir. Devam etmek için lütfen yeni bir plan seçin.'}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            {status === 'CANCELED' && (
              <button
                onClick={() => navigate('/plans')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Plan Seç
              </button>
            )}
            <button
              onClick={() => navigate('/support')}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors"
            >
              Destek ile İletişim
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PAST_DUE: top sticky warning banner ──────────────────────────────────
  if (status === 'PAST_DUE') {
    return (
      <div className="sticky top-0 z-40 bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium truncate">
            Aboneliğiniz sona erdi. Devam etmek için ödeme yapın.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/plans')}
            className="bg-white text-red-600 hover:bg-red-50 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Ödeme Yap
          </button>
          <button onClick={() => setDismissed(true)} className="hover:opacity-80 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── TRIAL: informational top banner ──────────────────────────────────────
  if (status === 'TRIAL') {
    const isUrgent = daysLeft !== null && daysLeft <= 2;

    return (
      <div className={`sticky top-0 z-40 px-4 py-3 flex items-center justify-between gap-4 shadow-md ${
        isUrgent ? 'bg-amber-500' : 'bg-blue-600'
      } text-white`}>
        <div className="flex items-center gap-3 min-w-0">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium truncate">
            {daysLeft === 0
              ? 'Deneme süreniz bugün sona eriyor!'
              : daysLeft === 1
              ? 'Deneme sürenizin son günü!'
              : `Deneme süreniz ${daysLeft} gün sonra sona eriyor.`}
            {' '}Kesintisiz devam için plan seçin.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/plans')}
            className="bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            Plan Seç
          </button>
          <button onClick={() => setDismissed(true)} className="hover:opacity-80 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default TenantLifecycleBanner;
