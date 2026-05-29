/**
 * DemoBanner
 *
 * Demo modunda giriş yapan kullanıcılara gösterilen turuncu üst banner.
 * Kalan süreyi, sonraki data reset zamanını ve "Gerçek Hesap Oluştur" CTA'yı gösterir.
 * Dashboard layout'un en üstüne monte edilir.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNextReset(): Date | null {
  try {
    const meta = localStorage.getItem('demoMeta');
    if (!meta) return null;
    const parsed = JSON.parse(meta);
    return parsed.nextReset ? new Date(parsed.nextReset) : null;
  } catch {
    return null;
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Az önce';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}s ${m}dk`;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useDemoCountdown() {
  const [msLeft, setMsLeft] = useState<number>(0);
  const nextReset = getNextReset();

  useEffect(() => {
    if (!nextReset) return;
    const tick = () => setMsLeft(Math.max(0, nextReset.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextReset?.getTime()]);

  return { msLeft, nextReset };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose?: () => void;
}

export default function DemoBanner({ onClose }: Props) {
  const navigate = useNavigate();
  const { msLeft, nextReset } = useDemoCountdown();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleExit = () => {
    authService.logout();
    navigate('/login');
  };

  const handleUpgrade = () => {
    navigate('/register');
  };

  return (
    <div className="relative z-50 bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-2.5 min-h-[44px]">

          {/* Left: badge + main message */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-widest border border-white/30">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>
              Demo
            </span>
            <p className="text-sm font-semibold truncate">
              Demo modundasınız —{' '}
              <span className="font-normal opacity-90">
                Tüm özellikler açık. Veriler her 2 saatte sıfırlanır.
              </span>
            </p>
          </div>

          {/* Center: countdown */}
          {nextReset && (
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <svg className="w-3.5 h-3.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-xs font-semibold opacity-90 tabular-nums">
                Sıfırlanma: <strong>{formatCountdown(msLeft)}</strong>
              </span>
            </div>
          )}

          {/* Right: CTAs */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleUpgrade}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-orange-600 text-xs font-black rounded-lg hover:bg-orange-50 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Gerçek Hesap Oluştur
            </button>

            <button
              onClick={handleExit}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg border border-white/30 transition-colors"
              title="Demo'dan çık"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span className="hidden sm:inline">Çıkış</span>
            </button>

            <button
              onClick={() => { setDismissed(true); onClose?.(); }}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Bannerı kapat"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

/**
 * Hook: yalnızca gerçek demo oturumunda true (Süper admin / normal giriş hariç).
 */
export function useIsDemo(): boolean {
  if (localStorage.getItem('isDemo') !== 'true') return false;

  const user = authService.getCurrentUser() as { role?: string; isDemo?: boolean } | null;
  if (!user) return false;

  // Eski demo flag kalmış olabilir — platform admin asla demo sayılmaz
  if (user.role === 'SUPER_ADMIN' || user.role === 'OWNER') {
    localStorage.removeItem('isDemo');
    localStorage.removeItem('demoMeta');
    return false;
  }

  return user.isDemo === true;
}
