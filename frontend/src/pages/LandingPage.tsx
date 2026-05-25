/**
 * Woontegra — SaaS Satış Landing Page
 *
 * Bölümler:
 *  1. Navbar
 *  2. Hero
 *  3. Problem
 *  4. Çözüm
 *  5. Özellikler
 *  6. Fiyatlandırma
 *  7. CTA (final)
 *  8. Footer
 */

import React, { useState, useEffect } from 'react';

// ─── Lucide-free inline icons ─────────────────────────────────────────────────

const Icon = ({ d, cls = 'w-5 h-5' }: { d: string; cls?: string }) => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d}/>
  </svg>
);

const IC = {
  zap:      'M13 10V3L4 14h7v7l9-11h-7z',
  check:    'M5 13l4 4L19 7',
  x:        'M6 18L18 6M6 6l12 12',
  arrow:    'M17 8l4 4m0 0l-4 4m4-4H3',
  store:    'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  market:   'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z',
  bolt:     'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  chart:    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  globe:    'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  package:  'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  order:    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  shield:   'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  headset:  'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  star:     'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  lock:     'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  mobile:   'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  menu:     'M4 6h16M4 12h16M4 18h16',
  close2:   'M6 18L18 6M6 6l12 12',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, [threshold]);
  return scrolled;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);

  const links = [
    { label: 'Özellikler',    id: 'ozellikler' },
    { label: 'Fiyatlandırma', id: 'fiyat' },
    { label: 'Çözümler',      id: 'cozum' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollTo('hero')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={IC.bolt}/>
              </svg>
            </div>
            <span className={`text-lg font-black tracking-tight ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              Woontegra
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className={`text-sm font-semibold transition-colors hover:text-orange-500 ${
                  scrolled ? 'text-gray-600' : 'text-white/90'
                }`}>
                {l.label}
              </button>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a href="/login"
              className={`text-sm font-semibold transition-colors hover:text-orange-500 ${scrolled ? 'text-gray-600' : 'text-white/90'}`}>
              Giriş Yap
            </a>
            <button onClick={() => scrollTo('fiyat')}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors">
              Ücretsiz Başla
            </button>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg">
            <Icon d={open ? IC.close2 : IC.menu} cls={`w-5 h-5 ${scrolled ? 'text-gray-700' : 'text-white'}`}/>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4 space-y-1">
            {links.map(l => (
              <button key={l.id} onClick={() => { scrollTo(l.id); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                {l.label}
              </button>
            ))}
            <div className="px-4 pt-2 flex flex-col gap-2">
              <a href="/login" className="text-center py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:border-orange-300 transition-colors">Giriş Yap</a>
              <button onClick={() => { scrollTo('fiyat'); setOpen(false); }}
                className="py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors">
                Ücretsiz Başla
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden
      bg-gradient-to-br from-gray-950 via-gray-900 to-orange-950">

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-orange-500/10 blur-3xl"/>
        <div className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full bg-orange-600/8 blur-3xl"/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-orange-500/5 blur-3xl"/>
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="text-center max-w-4xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"/>
            Ticimax Alternatifi • Türk SaaS Altyapısı
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
            E-Ticaret Sitenizi{' '}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                1 Günde
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full opacity-60"/>
            </span>
            {' '}Yayına Alın
          </h1>

          {/* Sub */}
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Ticimax'a harcadığınız bütçenin <strong className="text-white">yarısıyla</strong> daha hızlı, daha güçlü bir e-ticaret altyapısı.
            Trendyol, Hepsiburada entegrasyonu dahil.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button onClick={() => scrollTo('fiyat')}
              className="group flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold text-base rounded-2xl transition-all hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] hover:-translate-y-0.5">
              Ücretsiz Başla
              <Icon d={IC.arrow} cls="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
            </button>
            <button onClick={() => scrollTo('ozellikler')}
              className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/15 text-white font-semibold text-base rounded-2xl border border-white/20 transition-all hover:-translate-y-0.5 backdrop-blur-sm">
              Demo Talep Et
              <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </button>
          </div>

          {/* Social proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
            {[
              { icon: IC.check, text: 'Kurulum gerektirmez' },
              { icon: IC.check, text: 'Kredi kartı gerekmez' },
              { icon: IC.check, text: '14 gün ücretsiz' },
            ].map(item => (
              <span key={item.text} className="flex items-center gap-1.5">
                <Icon d={item.icon} cls="w-4 h-4 text-emerald-400 flex-shrink-0"/>
                {item.text}
              </span>
            ))}
          </div>

        </div>

        {/* Dashboard mockup */}
        <div className="mt-16 relative max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
            {/* Browser bar */}
            <div className="h-10 bg-gray-800 flex items-center px-4 gap-2 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70"/>
                <div className="w-3 h-3 rounded-full bg-yellow-500/70"/>
                <div className="w-3 h-3 rounded-full bg-emerald-500/70"/>
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-700 rounded-md h-5 flex items-center px-3">
                  <span className="text-[10px] text-gray-400">app.woontegra.com/dashboard</span>
                </div>
              </div>
            </div>
            {/* Dashboard content */}
            <div className="bg-gray-900 p-6 grid grid-cols-4 gap-4 min-h-[300px]">
              {/* Sidebar */}
              <div className="col-span-1 space-y-2">
                <div className="h-8 bg-orange-500/20 rounded-lg flex items-center px-3 gap-2">
                  <div className="w-3 h-3 rounded bg-orange-500"/>
                  <div className="h-2 bg-orange-400/60 rounded w-16"/>
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-7 bg-white/5 rounded-lg flex items-center px-3 gap-2">
                    <div className="w-3 h-3 rounded bg-white/20"/>
                    <div className="h-2 bg-white/20 rounded" style={{ width: `${50 + i * 8}%` }}/>
                  </div>
                ))}
              </div>
              {/* Main content */}
              <div className="col-span-3 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Toplam Sipariş', val: '1,284', color: 'text-white' },
                    { label: 'Gelir', val: '₺48,200', color: 'text-emerald-400' },
                    { label: 'Ürün', val: '892', color: 'text-white' },
                    { label: 'Trendyol', val: '621', color: 'text-orange-400' },
                  ].map(card => (
                    <div key={card.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wide">{card.label}</p>
                      <p className={`text-base font-bold mt-0.5 ${card.color}`}>{card.val}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 h-28 flex items-end gap-2">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-orange-500 to-orange-400 rounded-sm opacity-70" style={{ height: `${h}%` }}/>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Glow under mockup */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-orange-500/20 blur-2xl rounded-full pointer-events-none"/>
        </div>

      </div>
    </section>
  );
}

// ─── Problem ──────────────────────────────────────────────────────────────────

function Problem() {
  const problems = [
    {
      emoji: '😤',
      title: 'Kurulum Zor',
      desc: 'Geleneksel platformlarda kurulum haftalar alıyor. Teknik destek için günlerce beklemek zorunda kalıyorsunuz.',
      stat: '3-4 hafta',
      statLabel: 'ortalama kurulum süresi',
    },
    {
      emoji: '💸',
      title: 'Çok Pahalı',
      desc: 'Lisans ücretleri, entegrasyon maliyetleri ve zorunlu modüller. Yıllık toplam maliyet beklediğinizin 3 katına çıkıyor.',
      stat: '₺60.000+',
      statLabel: 'yıllık ortalama maliyet',
    },
    {
      emoji: '🐌',
      title: 'Rakiplerden Yavaş',
      desc: 'Rakipleriniz saatler içinde pazaryerine girip sipariş alırken, siz hâlâ entegrasyon sorunlarıyla boğuşuyorsunuz.',
      stat: '%60 daha yavaş',
      statLabel: 'rakiplere göre',
    },
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider mb-4">
            Sorun
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
            Mevcut çözümler sizi geri tutuyor
          </h2>
          <p className="text-gray-500 text-lg">
            Rakipleriniz büyürken siz altyapı sorunlarıyla mücadele ediyorsunuz.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-red-200 hover:shadow-lg transition-all group">
              <div className="text-4xl mb-5">{p.emoji}</div>
              <h3 className="text-xl font-black text-gray-900 mb-3">{p.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">{p.desc}</p>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-2xl font-black text-red-500">{p.stat}</p>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">{p.statLabel}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Transition arrow */}
        <div className="flex flex-col items-center mt-16 gap-3">
          <p className="text-gray-400 text-sm font-semibold">Woontegra ile her şey değişiyor</p>
          <svg className="w-6 h-6 text-orange-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
    </section>
  );
}

// ─── Çözüm ────────────────────────────────────────────────────────────────────

function Cozum() {
  const solutions = [
    {
      step: '01',
      icon: IC.bolt,
      color: 'bg-orange-500',
      title: 'Hazır E-Ticaret Sitesi',
      desc: 'Mağazanızı dakikalar içinde açın. Onlarca profesyonel tema, özelleştirilebilir tasarım ve mobil uyumlu yapı hazır sizi bekliyor.',
      items: ['Mobil uyumlu temalar', 'Özel domain desteği', 'SSL sertifikası dahil'],
    },
    {
      step: '02',
      icon: IC.market,
      color: 'bg-purple-500',
      title: 'Pazaryeri Entegrasyonu',
      desc: 'Trendyol, Hepsiburada ve diğer pazaryerleriyle tek panel üzerinden bağlanın. Stok ve fiyat otomatik senkronize.',
      items: ['Trendyol entegrasyonu', 'Otomatik stok sync', 'Toplu ürün gönderimi'],
    },
    {
      step: '03',
      icon: IC.zap,
      color: 'bg-emerald-500',
      title: 'Hızlı Kurulum',
      desc: 'IT departmanına, ajansa ya da teknik bilgiye ihtiyaç duymadan. 3 adımda kurulum tamamlanıyor.',
      items: ['Teknik bilgi gerekmez', 'Rehberli kurulum', '7/24 destek'],
    },
  ];

  return (
    <section id="cozum" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
            Çözüm
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
            Büyümek için ihtiyacınız olan her şey
          </h2>
          <p className="text-gray-500 text-lg">
            Karmaşık kurulum yok. Gizli maliyet yok. Sadece büyüme.
          </p>
        </div>

        <div className="space-y-8">
          {solutions.map((s, i) => (
            <div key={i} className={`flex flex-col ${i % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center`}>
              {/* Content */}
              <div className="flex-1 space-y-5">
                <div className="flex items-center gap-4">
                  <span className="text-5xl font-black text-gray-100">{s.step}</span>
                  <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center`}>
                    <Icon d={s.icon} cls="w-6 h-6 text-white"/>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed">{s.desc}</p>
                <ul className="space-y-2">
                  {s.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Icon d={IC.check} cls="w-3 h-3 text-emerald-600"/>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual */}
              <div className="flex-1 flex items-center justify-center">
                <div className={`w-64 h-64 rounded-3xl ${s.color}/10 border-2 border-dashed ${s.color.replace('bg-', 'border-')}/30 flex flex-col items-center justify-center gap-4`}>
                  <div className={`w-20 h-20 rounded-2xl ${s.color} flex items-center justify-center shadow-lg`}>
                    <Icon d={s.icon} cls="w-10 h-10 text-white"/>
                  </div>
                  <p className="text-sm font-bold text-gray-600">{s.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Özellikler ───────────────────────────────────────────────────────────────

function Ozellikler() {
  const features = [
    { icon: IC.package,  color: 'bg-blue-500',    title: 'Ürün Yönetimi',        desc: 'Sınırsız ürün, varyant ve kategori. Toplu import, barcode üretimi, resim yönetimi hepsi dahil.' },
    { icon: IC.order,    color: 'bg-orange-500',   title: 'Sipariş Yönetimi',     desc: 'Tüm kanallardan gelen siparişler tek ekranda. Otomatik stok düşme, kargo entegrasyonu.' },
    { icon: IC.market,   color: 'bg-purple-500',   title: 'Pazaryeri Entegrasyonu', desc: 'Trendyol, Hepsiburada, N11 ve daha fazlası. Toplu gönderim, senkronizasyon, hata takibi.' },
    { icon: IC.chart,    color: 'bg-emerald-500',  title: 'Gelişmiş Raporlar',    desc: 'Satış analitiği, müşteri davranışları, ürün performansı. Gerçek zamanlı dashboard.' },
    { icon: IC.mobile,   color: 'bg-indigo-500',   title: 'Mobil Uygulama',       desc: 'iOS ve Android uygulaması ile mağazanızı her yerden yönetin.' },
    { icon: IC.shield,   color: 'bg-rose-500',     title: 'Güvenlik',             desc: 'SSL, 2FA, rol bazlı erişim. Verileriniz Türkiye sunucularında güvende.' },
    { icon: IC.globe,    color: 'bg-cyan-500',     title: 'Çok Dil & Para Birimi', desc: 'Türkçe, İngilizce ve 10+ dil. USD, EUR, TRY otomatik döviz kurları.' },
    { icon: IC.headset,  color: 'bg-amber-500',    title: '7/24 Destek',          desc: 'Türkçe teknik destek. Telefon, e-posta ve canlı sohbet. Ortalama yanıt < 2 dk.' },
  ];

  return (
    <section id="ozellikler" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold uppercase tracking-wider mb-4">
            Özellikler
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
            İhtiyacınız olan her şey tek platformda
          </h2>
          <p className="text-gray-500 text-lg">
            Büyük kurumsal altyapının gücü, KOBİ'lerin anlayacağı sadelikte.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-orange-200 hover:shadow-lg transition-all group cursor-default">
              <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:-translate-y-0.5 transition-transform`}>
                <Icon d={f.icon} cls="w-5 h-5 text-white"/>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Competitor comparison strip */}
        <div className="mt-16 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700">Neden Woontegra?</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-gray-500 font-semibold w-1/4">Özellik</th>
                  {['Woontegra', 'Ticimax', 'Ideasoft'].map(p => (
                    <th key={p} className={`text-center px-4 py-3 font-bold ${p === 'Woontegra' ? 'text-orange-600 bg-orange-50' : 'text-gray-400'}`}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ['Pazaryeri Entegrasyonu', true, true, true],
                  ['Kurulum Süresi', '1 gün', '2-4 hafta', '1-2 hafta'],
                  ['Türkçe Destek', true, true, true],
                  ['Otomatik Stok Sync', true, false, false],
                  ['Fiyat (Başlangıç)', '₺299/ay', '₺800+/ay', '₺600+/ay'],
                  ['Ücretsiz Deneme', '14 gün', 'Yok', 'Demo'],
                ].map(([label, ...vals], i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 text-gray-600 font-medium text-xs">{label}</td>
                    {vals.map((v, j) => (
                      <td key={j} className={`px-4 py-3 text-center text-xs ${j === 0 ? 'bg-orange-50/50 font-bold text-orange-700' : 'text-gray-400'}`}>
                        {typeof v === 'boolean'
                          ? v
                            ? <span className={j === 0 ? 'text-emerald-500' : 'text-emerald-400'}>✓</span>
                            : <span className="text-red-300">✗</span>
                          : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Fiyatlandırma ────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Starter',
    monthlyPrice: 299,
    desc: 'Yeni başlayanlar için',
    color: 'border-gray-200',
    btnClass: 'bg-gray-900 hover:bg-gray-800 text-white',
    badge: null,
    features: [
      '500 Ürün',
      '5 GB Depolama',
      'Trendyol Entegrasyonu',
      'Temel Raporlar',
      'E-posta Desteği',
      'Mobil Uyumlu',
      'SSL Dahil',
    ],
    notIncluded: ['Otomatik Stok Sync', 'API Erişimi', 'White Label'],
  },
  {
    name: 'Pro',
    monthlyPrice: 599,
    desc: 'Büyüyen işletmeler için',
    color: 'border-orange-500 ring-2 ring-orange-500/20',
    btnClass: 'bg-orange-500 hover:bg-orange-400 text-white shadow-[0_8px_30px_rgba(249,115,22,0.35)]',
    badge: 'En Popüler',
    features: [
      '5.000 Ürün',
      '25 GB Depolama',
      'Tüm Pazaryerleri',
      'Otomatik Stok Sync',
      'Gelişmiş Raporlar',
      'Öncelikli Destek',
      'API Erişimi',
      'Mobil Uygulama',
    ],
    notIncluded: ['White Label'],
  },
  {
    name: 'Enterprise',
    monthlyPrice: 1499,
    desc: 'Kurumsal müşteriler için',
    color: 'border-gray-200',
    btnClass: 'bg-gray-900 hover:bg-gray-800 text-white',
    badge: null,
    features: [
      'Sınırsız Ürün',
      '200 GB Depolama',
      'Tüm Pazaryerleri',
      'Otomatik Stok Sync',
      'Özel Raporlar',
      '7/24 Öncelikli Destek',
      'Tam API Erişimi',
      'White Label',
      'Özel Entegrasyon',
      'Dedicated Sunucu',
    ],
    notIncluded: [],
  },
];

function Fiyat() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="fiyat" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4">
            Fiyatlandırma
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
            Şeffaf fiyatlandırma, gizli ücret yok
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            14 gün ücretsiz deneyin. İptal istediğiniz zaman.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setYearly(false)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${!yearly ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              Aylık
            </button>
            <button onClick={() => setYearly(true)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${yearly ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              Yıllık
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md">%20 İndirim</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => {
            const price = yearly ? Math.floor(plan.monthlyPrice * 0.8) : plan.monthlyPrice;
            return (
              <div key={plan.name}
                className={`relative rounded-2xl border-2 p-8 transition-all hover:shadow-xl ${plan.color}`}>
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-white text-xs font-black rounded-full">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-black text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-400">{plan.desc}</p>
                </div>
                <div className="mb-8">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-gray-900">₺{price.toLocaleString('tr-TR')}</span>
                    <span className="text-gray-400 text-sm pb-1.5">/ay</span>
                  </div>
                  {yearly && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      Yıllık ödemede ₺{(plan.monthlyPrice - price).toLocaleString('tr-TR')}/ay tasarruf
                    </p>
                  )}
                </div>

                <button className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 mb-8 ${plan.btnClass}`}>
                  14 Gün Ücretsiz Dene
                </button>

                <ul className="space-y-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Icon d={IC.check} cls="w-2.5 h-2.5 text-emerald-600"/>
                      </div>
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Icon d={IC.x} cls="w-2.5 h-2.5 text-gray-300"/>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Tüm planlarda <strong className="text-gray-600">SSL sertifikası</strong>, <strong className="text-gray-600">CDN</strong> ve <strong className="text-gray-600">otomatik yedekleme</strong> dahildir.
          Enterprise için <a href="mailto:satis@woontegra.com" className="text-orange-500 hover:text-orange-600 font-semibold">özel teklif alın →</a>
        </p>
      </div>
    </section>
  );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────

function CTA() {
  const [email, setEmail] = useState('');

  return (
    <section className="py-24 bg-gradient-to-br from-gray-950 via-gray-900 to-orange-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"/>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl"/>
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider mb-8">
          Hemen Başlayın
        </div>

        <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
          Rakipleriniz büyürken<br/>
          <span className="text-orange-400">siz de büyüyün</span>
        </h2>

        <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
          Bugün başlayın, 14 gün boyunca ücretsiz kullanın.
          Kredi kartı gerekmez, iptal kolaydır.
        </p>

        {/* Email + CTA form */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-8">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="E-posta adresiniz"
            className="flex-1 px-5 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm"
          />
          <button
            onClick={() => { if (email) { window.location.href = `/register?email=${encodeURIComponent(email)}`; } }}
            className="px-7 py-3.5 bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm rounded-xl transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] hover:-translate-y-0.5 whitespace-nowrap"
          >
            Şimdi Başla →
          </button>
        </div>

        {/* Trust signals */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-gray-500 text-xs">
          {[
            '✓ 14 gün ücretsiz',
            '✓ Kredi kartı gerekmez',
            '✓ İstediğiniz zaman iptal',
          ].map(t => (
            <span key={t} className="font-semibold">{t}</span>
          ))}
        </div>

        {/* Stars */}
        <div className="flex items-center justify-center gap-2 mt-10">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                <path d={IC.star}/>
              </svg>
            ))}
          </div>
          <span className="text-gray-400 text-sm font-semibold">4.9 / 5 — 200+ mutlu müşteri</span>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const cols = [
    {
      title: 'Ürün',
      links: [
        { label: 'Özellikler', id: 'ozellikler' },
        { label: 'Fiyatlandırma', id: 'fiyat' },
        { label: 'Çözümler', id: 'cozum' },
      ],
    },
    {
      title: 'Şirket',
      links: [
        { label: 'Hakkımızda', href: '/about' },
        { label: 'Blog', href: '/blog' },
        { label: 'Kariyer', href: '/career' },
      ],
    },
    {
      title: 'Destek',
      links: [
        { label: 'Yardım Merkezi', href: '/help' },
        { label: 'İletişim', href: '/contact' },
        { label: 'Durum', href: '/status' },
      ],
    },
    {
      title: 'Yasal',
      links: [
        { label: 'Gizlilik', href: '/gizlilik' },
        { label: 'Kullanım Koşulları', href: '/kullanim-sartlari' },
        { label: 'KVKK', href: '/kvkk' },
      ],
    },
  ];

  return (
    <footer className="bg-gray-950 border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Icon d={IC.bolt} cls="w-4 h-4 text-white"/>
              </div>
              <span className="text-lg font-black text-white">Woontegra</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              Türk KOBİ'leri için tasarlanmış modern e-ticaret altyapısı.
            </p>
            <p className="text-xs text-gray-600 mt-4">🇹🇷 Türkiye'de üretildi</p>
          </div>

          {/* Links */}
          {cols.map(col => (
            <div key={col.title}>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map(link => (
                  <li key={link.label}>
                    {'id' in link ? (
                      <button onClick={() => scrollTo(link.id)}
                        className="text-sm text-gray-500 hover:text-white transition-colors text-left">
                        {link.label}
                      </button>
                    ) : (
                      <a href={(link as any).href} className="text-sm text-gray-500 hover:text-white transition-colors">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">© 2025 Woontegra. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-xs text-gray-600 hover:text-white transition-colors font-semibold">Giriş Yap</a>
            <button onClick={() => scrollTo('fiyat')}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold rounded-lg transition-colors">
              Ücretsiz Başla
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LeadCapture() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, source: 'landing' }),
      });
      setDone(true);
      setEmail('');
      setName('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-slate-950 py-14 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 md:p-8 shadow-xl">
          <h3 className="text-xl font-bold text-slate-900">Erken Erişim ve Demo</h3>
          <p className="text-sm text-slate-600 mt-1">E-posta bırakın, ürün canlı satışa açılır açılmaz size dönüş yapalım.</p>
          <form onSubmit={submit} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Adınız (opsiyonel)" className="h-11 rounded-xl border border-slate-300 px-3 text-sm" />
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="E-posta adresiniz" className="h-11 rounded-xl border border-slate-300 px-3 text-sm" />
            <button disabled={saving} className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm disabled:opacity-60">
              {saving ? 'Kaydediliyor...' : 'Bana Ulaşın'}
            </button>
          </form>
          {done && <p className="text-xs text-emerald-600 mt-3">Teşekkürler, kaydınız alındı.</p>}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen antialiased">
      <Navbar />
      <Hero />
      <Problem />
      <Cozum />
      <Ozellikler />
      <Fiyat />
      <CTA />
      <LeadCapture />
      <Footer />
    </div>
  );
}
