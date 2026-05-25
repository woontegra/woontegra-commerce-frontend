/**
 * SaaS onboarding — mağaza kurulum yolu seçimi
 *
 * İlk ürün eklendiğinde veya "Sonra yap" ile onboarding tamamlanır.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/apiClient';
import { useAppStore } from '../store/useAppStore';
import { authService } from '../services/auth.service';
import {
  Loader2,
  FileCode2,
  FileSpreadsheet,
  PackagePlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface WizardStatus {
  onboardingCompleted: boolean;
  hasProducts: boolean;
}

const ROUTES = {
  xml:    '/dashboard/products/import/xml',
  excel:  '/dashboard/import-export',
  manual: '/dashboard/products/new',
} as const;

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resume = searchParams.get('resume') === '1';

  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const [status, setStatus] = useState<WizardStatus | null>(null);

  const refreshStatus = useCallback(async () => {
    const res = await api.get('/onboarding/wizard/status');
    const raw = res.data as { data?: WizardStatus };
    const data = raw?.data ?? (res.data as WizardStatus);
    setStatus({
      onboardingCompleted: !!data.onboardingCompleted,
      hasProducts:         !!data.hasProducts,
    });
    return data as WizardStatus;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await refreshStatus();
        if (cancelled) return;

        if (data.onboardingCompleted && !resume) {
          navigate('/dashboard', { replace: true });
          return;
        }

        if (user && (data.onboardingCompleted !== user.onboardingCompleted)) {
          const updated = { ...user, onboardingCompleted: data.onboardingCompleted };
          setUser(updated);
          localStorage.setItem('user', JSON.stringify(updated));
        }
      } catch (e) {
        console.error('Onboarding status:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, resume, refreshStatus, setUser, user]);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await api.post('/onboarding/dismiss');
      const u = authService.getCurrentUser();
      if (u) {
        const updated = { ...u, onboardingCompleted: true, onboardingStep: 4 };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
      navigate('/dashboard', { replace: true });
    } catch {
      /* toast from interceptor */
    } finally {
      setDismissing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  const showCatalogHint = status?.hasProducts && resume;

  return (
    <div className="min-h-screen bg-[#0c0e14] text-white">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.45), transparent),
            radial-gradient(ellipse 60% 40% at 100% 0%, rgba(139, 92, 246, 0.2), transparent)
          `,
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-200">Woontegra</span>
        </div>
        <button
          type="button"
          onClick={() => { void handleDismiss(); }}
          disabled={dismissing}
          className="text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 disabled:opacity-50"
        >
          {dismissing ? 'Kaydediliyor…' : 'Sonra yap'}
        </button>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20 pt-4 md:pt-10">
        {showCatalogHint && (
          <div className="mb-8 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100/90">
            Kataloğunuzda ürün var. Yeni içe aktarma yapabilir veya{' '}
            <Link to="/dashboard" className="underline font-medium text-white hover:text-emerald-200">
              panele dönebilirsiniz
            </Link>
            .
          </div>
        )}

        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/80 mb-3">
            Hızlı başlangıç
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            Mağazanı nasıl kurmak istersin?
          </h1>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Boş panele takılmadan önce en az bir ürün ekleyin. İsterseniz XML veya Excel ile toplu yükleyin,
            ya da tek tek oluşturun.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:gap-8 lg:items-stretch">
          {/* XML — highlighted */}
          <Link
            to={ROUTES.xml}
            className="group relative flex flex-col rounded-3xl border-2 border-indigo-500/50 bg-gradient-to-b from-indigo-500/15 to-slate-900/80 p-8 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-400/20 lg:col-span-1 lg:scale-[1.02] lg:z-[1] transition-transform hover:scale-[1.03] hover:border-indigo-400/70"
          >
            <span className="absolute top-5 right-5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded-md">
              Önerilen
            </span>
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:bg-indigo-500/30 transition-colors">
              <FileCode2 className="w-7 h-7" strokeWidth={1.5} />
            </div>
            <h2 className="mt-6 text-xl font-bold text-white">XML ile ürün yükle</h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed flex-1">
              Tedarikçi XML’i veya hazır şablonu içe aktar; alan eşleme ve mükerrer kontrolü ile hızlı katalog.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 group-hover:text-indigo-200">
              XML içe aktar
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>

          <Link
            to={ROUTES.excel}
            className="group flex flex-col rounded-3xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-sm hover:border-white/20 hover:bg-slate-900/60 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <h2 className="mt-6 text-lg font-bold text-white">Excel ile yükle</h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed flex-1">
              CSV / Excel şablonu ile toplu ürün; mevcut içe aktarma ekranından devam et.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400/90 group-hover:text-emerald-300">
              Dosya yükle
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>

          <Link
            to={ROUTES.manual}
            className="group flex flex-col rounded-3xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-sm hover:border-white/20 hover:bg-slate-900/60 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-300">
              <PackagePlus className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <h2 className="mt-6 text-lg font-bold text-white">Manuel ürün ekle</h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed flex-1">
              İlk ürününü tek tek oluştur; fiyat, stok ve görselleri hemen tanımla.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 group-hover:text-violet-200">
              Ürün oluştur
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        </div>

        <p className="mt-14 text-center text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          İlk ürün kaydedildiğinde onboarding otomatik tamamlanır ve tüm panel açılır.
          İstediğiniz zaman menüden <strong className="text-slate-400">Mağaza kurulumu</strong> ile buraya dönebilirsiniz.
        </p>
      </main>
    </div>
  );
}
