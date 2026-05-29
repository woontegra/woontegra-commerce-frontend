import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAppStore } from '../store/useAppStore';
import {
  isSellerLoginSlug,
  SELLER_LOGIN_ERROR_MESSAGE,
  SUPER_ADMIN_LOGIN_ERROR_MESSAGE,
} from '../utils/planDisplay';

export default function Login() {
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAppStore();

  const normalizeTenantSlug = (raw: string) => {
    const slug = raw.trim();
    const placeholderSlugs = ['magaza-slug', 'magaza slug'];
    return placeholderSlugs.includes(slug.toLowerCase()) ? '' : slug;
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError('');
    try {
      const result = await authService.demoLogin();
      const user = (result as any)?.data?.user || (result as any)?.user;
      if (user) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
      }
      if (user?.onboardingCompleted === false) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Demo giriş başarısız. Lütfen tekrar deneyin.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const slug = normalizeTenantSlug(tenantSlug);
      const result = await authService.login(
        email,
        password,
        slug,
      );
      const user = (result as any)?.data?.user || (result as any)?.user;
      
      // Update store with user data
      if (user) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
      }

      const needsOnboarding = user?.onboardingCompleted === false
        || (user?.onboardingCompleted === undefined && !user?.isDemo);

      if (needsOnboarding) {
        navigate('/onboarding');
      } else if (user?.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (isSellerLoginSlug(tenantSlug)) {
        setError(SELLER_LOGIN_ERROR_MESSAGE);
      } else {
        const msg = err.response?.data?.error || err.response?.data?.message;
        setError(
          msg
          || (err.response?.status === 401
            ? SUPER_ADMIN_LOGIN_ERROR_MESSAGE
            : 'Giriş başarısız.'),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)'
        }} />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center text-white font-bold text-lg shadow-glow">
              W
            </div>
            <span className="text-white font-semibold text-lg">Woontegra</span>
          </div>
          <h1 className="text-3xl font-semibold text-white leading-tight mb-4">
            Mağazanızı bir sonraki seviyeye taşıyın
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            Tüm satış kanallarınızı tek panelden yönetin. Ürün, sipariş, müşteri ve daha fazlası.
          </p>
          <div className="space-y-4">
            {[
              { icon: '⚡', text: 'Hızlı kurulum, anında satış' },
              { icon: '🔒', text: 'Güvenli ödeme altyapısı' },
              { icon: '📊', text: 'Gerçek zamanlı analitik' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base">
                  {f.icon}
                </div>
                <span className="text-sm text-slate-400">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{background:'linear-gradient(135deg,#6366f1,#7c3aed)'}}>
              W
            </div>
            <span className="text-slate-900 font-semibold">Woontegra</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900">Giriş yapın</h2>
            <p className="text-slate-500 text-sm mt-1.5">Hesabınıza erişmek için bilgilerinizi girin</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 animate-scale-in">
              <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tenant slug */}
            <div>
              <label className="wn-label">
                Mağaza Slug
                <span className="text-slate-600 font-normal ml-1">(Super Admin için boş bırakın)</span>
              </label>
              <input
                type="text"
                value={tenantSlug}
                onChange={e => setTenantSlug(e.target.value)}
                className="wn-input"
                placeholder="magaza-slug"
              />
            </div>

            {/* Email */}
            <div>
              <label className="wn-label">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="wn-input"
                placeholder="siz@ornek.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="wn-label">Şifre</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="wn-input pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn w-full mt-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Giriş yapılıyor...
                </>
              ) : 'Giriş Yap'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
              Kayıt olun
            </Link>
          </p>

          {/* Demo separator */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"/>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-50 px-3 text-xs text-slate-400 font-medium">veya</span>
            </div>
          </div>

          {/* Demo Login */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 text-orange-700 font-semibold text-sm transition-all disabled:opacity-50"
          >
            {demoLoading ? (
              <svg className="w-4 h-4 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            )}
            {demoLoading ? 'Demo yükleniyor…' : 'Demo Olarak Dene'}
          </button>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            Kayıt gerektirmez · Tüm özellikler açık · Veriler her 2 saatte sıfırlanır
          </p>
        </div>
      </div>
    </div>
  );
}
