import { useState } from 'react';

const TIPS = [
  { icon: '🔍', title: 'Meta Açıklamalar', desc: 'Her ürün ve kategoriye benzersiz meta açıklama ekleyin.' },
  { icon: '🔗', title: 'Canonical URL', desc: 'Tekrar eden içeriklerde canonical tag kullanın.' },
  { icon: '🗺️', title: 'Site Haritası', desc: 'XML sitemap otomatik olarak güncellenmektedir.' },
  { icon: '⚡', title: 'Sayfa Hızı', desc: 'Görselleri optimize edin ve lazy loading kullanın.' },
];

export default function SEOManagement() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sitemap' | 'robots'>('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">SEO Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Arama motoru optimizasyonu ayarlarını yönetin
          </p>
        </div>
        <a
          href="/dashboard/products"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Ürünlerin SEO ayarları
        </a>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-1">
        {(['overview', 'sitemap', 'robots'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' ? 'Genel Bakış' : tab === 'sitemap' ? 'Site Haritası' : 'Robots.txt'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tips */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">SEO İpuçları</h2>
            <div className="space-y-4">
              {TIPS.map(tip => (
                <div key={tip.title} className="flex gap-3">
                  <span className="text-xl flex-shrink-0">{tip.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tip.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global Settings */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Global Ayarlar</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Başlığı</label>
                <input
                  type="text"
                  placeholder="Mağaza adı - Slogan"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Açıklama</label>
                <textarea
                  rows={3}
                  placeholder="Sitenizin genel açıklaması..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anahtar Kelimeler</label>
                <input
                  type="text"
                  placeholder="kelime1, kelime2, kelime3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                Kaydet
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="lg:col-span-2 grid grid-cols-3 gap-4">
            {[
              { label: 'İndexlenen Sayfa', value: '—', icon: '📄' },
              { label: 'Ortalama Konum', value: '—', icon: '📊' },
              { label: 'Tıklama Oranı', value: '—', icon: '🖱️' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sitemap' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">XML Site Haritası</h2>
              <p className="text-sm text-gray-500 mt-1">Arama motorlarına gönderilecek site haritası</p>
            </div>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:underline font-medium"
            >
              /sitemap.xml →
            </a>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 font-mono text-xs text-gray-600 overflow-auto">
            {`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://siteniz.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://siteniz.com/urunler/</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Tüm ürün ve kategoriler otomatik eklenir -->
</urlset>`}
          </div>
        </div>
      )}

      {activeTab === 'robots' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Robots.txt</h2>
            <p className="text-sm text-gray-500 mt-1">Arama motoru botlarının erişim kuralları</p>
          </div>
          <textarea
            rows={10}
            defaultValue={`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /dashboard/\nSitemap: https://siteniz.com/sitemap.xml`}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Kaydet
          </button>
        </div>
      )}
    </div>
  );
}
