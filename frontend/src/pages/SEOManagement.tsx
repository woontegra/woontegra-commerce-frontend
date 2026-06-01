import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Table } from '../components/ui/Table';
import { useBranding } from '../context/BrandingContext';
import { api } from '../services/apiClient';
import { categoryService, type Category } from '../services/category.service';
import { productService, type ProductListItem } from '../services/product.service';
import { buildAbsoluteStorefrontListUrl } from '../utils/storefrontUrl';
import {
  AUTO_SEO_RULES,
  SEO_CAPABILITIES,
  SEO_TABS,
  SEO_TEMPLATES,
  SEO_TIPS,
  SCHEMA_ITEMS,
  STATUS_LABELS,
  STATUS_STYLE,
  RULE_BADGE,
  RULE_BADGE_LABEL,
  categorySeoStatus,
  computeCategorySeoStats,
  computeHealthScore,
  defaultRobotsTxt,
  type SeoTabKey,
} from './seoPageHelpers';

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300';

function SummaryMetric({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string | number;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="wn-card px-4 py-3 min-w-[120px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold mt-1 tabular-nums leading-tight ${valueClassName ?? 'text-slate-900'}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`wn-card p-5 sm:p-6 space-y-4 ${className ?? ''}`}>
      <h3 className="text-[13px] font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{children}</p>;
}

function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 ring-1 ring-slate-200">
      Sonraki faz
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SEOManagement() {
  const { branding, refresh } = useBranding();
  const [tab, setTab] = useState<SeoTabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productPreview, setProductPreview] = useState<ProductListItem[]>([]);
  const [storeDescription, setStoreDescription] = useState('');
  const [storeInfo, setStoreInfo] = useState({
    storeName:      '',
    contactEmail:   '',
    contactPhone:   '',
    contactAddress: '',
    logoUrl:        '',
  });

  const [globalForm, setGlobalForm] = useState({
    siteName:              '',
    defaultMetaDescription:'',
    keywords:              '',
    titleTemplate:         '{pageTitle} | {storeName}',
    ogTitle:               '',
    ogDescription:         '',
    ogImage:               '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, products, settingsRes] = await Promise.all([
        categoryService.getAll().catch(() => [] as Category[]),
        productService.search({ limit: 20, page: 1, isActive: true }).catch(() => ({
          items: [], total: 0, page: 1, limit: 20, totalPages: 0,
        })),
        api.get('/settings', { skipErrorToast: true } as never).catch(() => null),
      ]);

      setCategories(Array.isArray(cats) ? cats : []);
      setProductTotal(products.total ?? products.items.length);
      setProductPreview(products.items ?? []);

      const settingsData = (settingsRes?.data as { data?: Record<string, unknown> })?.data ?? {};
      const desc = String(settingsData.description ?? '');
      setStoreDescription(desc);
      setStoreInfo({
        storeName:      String(settingsData.storeName ?? settingsData.siteName ?? branding.siteName ?? ''),
        contactEmail:   String(settingsData.contactEmail ?? ''),
        contactPhone:   String(settingsData.contactPhone ?? ''),
        contactAddress: String(settingsData.contactAddress ?? ''),
        logoUrl:        String(settingsData.tenantLogoUrl ?? settingsData.logoUrl ?? branding.logoUrl ?? ''),
      });
      setGlobalForm(prev => ({
        ...prev,
        siteName:               branding.siteName || String(settingsData.siteName ?? ''),
        defaultMetaDescription: desc,
      }));
    } finally {
      setLoading(false);
    }
  }, [branding.siteName]);

  useEffect(() => { void load(); }, [load]);

  const categoryStats = useMemo(
    () => (categories.length ? computeCategorySeoStats(categories) : null),
    [categories],
  );

  const health = useMemo(
    () => computeHealthScore({
      categoryStats,
      hasSiteName: Boolean(globalForm.siteName.trim()),
      hasStoreDescription: Boolean(storeDescription.trim()),
      productCount: productTotal,
      domainVerified: branding.domainVerified,
    }),
    [categoryStats, globalForm.siteName, storeDescription, productTotal, branding.domainVerified],
  );

  const indexablePages = useMemo(() => {
    const activeCats = categories.filter(c => c.isActive).length;
    return productTotal + activeCats + 1;
  }, [categories, productTotal]);

  const storefrontSlug = branding.storefrontSlug ?? branding.slug ?? '';
  const canonicalBase = useMemo(() => {
    if (branding.customDomain && branding.domainVerified) {
      return `https://${branding.customDomain}`;
    }
    if (!storefrontSlug) return '';
    try {
      const u = new URL(buildAbsoluteStorefrontListUrl(storefrontSlug));
      return `${u.origin}/store`;
    } catch {
      return '';
    }
  }, [branding.customDomain, branding.domainVerified, storefrontSlug]);
  const sitemapUrl = canonicalBase ? `${canonicalBase}/sitemap.xml` : '';

  const handleSaveGlobal = async () => {
    if (!globalForm.siteName.trim()) {
      toast.error('Site başlığı zorunludur.');
      return;
    }
    setSavingGlobal(true);
    try {
      await api.put('/settings', {
        siteName:       globalForm.siteName.trim(),
        primaryColor:   branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor:    branding.accentColor,
        fontFamily:     branding.fontFamily,
        borderRadius:   branding.borderRadius,
        customCss:      branding.customCss ?? '',
        currency:       branding.currency,
        language:       branding.language,
      });
      await api.put('/settings/store-info', {
        ...storeInfo,
        storeName:   globalForm.siteName.trim(),
        description: globalForm.defaultMetaDescription.trim(),
      }, { skipErrorToast: true } as never);
      setStoreDescription(globalForm.defaultMetaDescription.trim());
      await refresh();
      toast.success('Global SEO ayarları kaydedildi.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Kaydedilemedi.');
    } finally {
      setSavingGlobal(false);
    }
  };

  const categoryColumns = useMemo(() => [
    {
      key:    'name',
      header: 'Kategori',
      cell:   (row: Category) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      key:    'metaTitle',
      header: 'SEO Başlığı',
      cell:   (row: Category) => (
        <span className="text-[12px] text-slate-600">{row.metaTitle?.trim() || '—'}</span>
      ),
    },
    {
      key:    'metaDescription',
      header: 'Meta Açıklama',
      cell:   (row: Category) => (
        <span className="text-[12px] text-slate-500 line-clamp-2 max-w-[220px]">
          {row.metaDescription?.trim() || '—'}
        </span>
      ),
    },
    {
      key:    'slug',
      header: 'Slug',
      cell:   (row: Category) => (
        <code className="text-[11px] font-mono text-indigo-700">{row.slug}</code>
      ),
    },
    {
      key:    'status',
      header: 'Durum',
      cell:   (row: Category) => {
        const st = categorySeoStatus(row);
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[st]}`}>
            {STATUS_LABELS[st]}
          </span>
        );
      },
    },
    {
      key:    'actions',
      header: 'İşlem',
      align:  'right' as const,
      cell:   () => (
        <Link
          to="/dashboard/categories"
          className="text-[11px] text-indigo-600 hover:text-indigo-800"
          onClick={e => e.stopPropagation()}
        >
          Düzenle
        </Link>
      ),
    },
  ], []);

  const productColumns = useMemo(() => [
    {
      key:    'name',
      header: 'Ürün',
      cell:   (row: ProductListItem) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      key:    'metaTitle',
      header: 'SEO Başlığı',
      cell:   () => (
        <span className="text-[12px] text-slate-400" title="Ürün düzenleme ekranından yönetilir">Ürün kaydında</span>
      ),
    },
    {
      key:    'metaDescription',
      header: 'Meta Açıklama',
      cell:   () => (
        <span className="text-[12px] text-slate-400">Ürün kaydında</span>
      ),
    },
    {
      key:    'slug',
      header: 'Slug',
      cell:   (row: ProductListItem) => (
        <code className="text-[11px] font-mono text-indigo-700">{row.slug}</code>
      ),
    },
    {
      key:    'canonical',
      header: 'Canonical',
      cell:   (row: ProductListItem) => (
        <span className="text-[11px] text-slate-500">{row.isActive ? 'Otomatik' : '—'}</span>
      ),
    },
    {
      key:    'status',
      header: 'Durum',
      cell:   (row: ProductListItem) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
          row.isActive ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
        }`}>
          {row.isActive ? 'Yayında' : 'Pasif'}
        </span>
      ),
    },
    {
      key:    'actions',
      header: 'İşlem',
      align:  'right' as const,
      cell:   (row: ProductListItem) => (
        <Link
          to={`/dashboard/products/${row.id}/edit`}
          className="text-[11px] text-indigo-600 hover:text-indigo-800"
          onClick={e => e.stopPropagation()}
        >
          SEO düzenle
        </Link>
      ),
    },
  ], []);

  return (
    <div className="w-full space-y-6 pb-10 page-enter">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            SEO Yönetimi
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Mağazanızın arama motoru görünürlüğünü, sitemap ve meta ayarlarını yönetin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/dashboard/products" className="btn btn-secondary text-[13px]">
            Ürün SEO Ayarları
          </Link>
          <button
            type="button"
            disabled
            title="SEO kontrolü sonraki fazda aktif olacak."
            className="btn btn-secondary text-[13px] opacity-50 cursor-not-allowed"
          >
            SEO Kontrolü Yap
          </button>
          <button
            type="button"
            disabled={!sitemapUrl}
            title={sitemapUrl ? 'Sitemap yeni sekmede açılır' : 'Sitemap URL henüz yapılandırılmadı'}
            onClick={() => { if (sitemapUrl) window.open(sitemapUrl, '_blank', 'noopener,noreferrer'); }}
            className={`btn btn-primary text-[13px] ${!sitemapUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Sitemap&apos;i Görüntüle
          </button>
        </div>
      </div>

      {/* Health metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryMetric
          label="SEO Sağlık Skoru"
          value={loading ? '…' : (health.score != null ? health.label : 'Kontrol edilmedi')}
          sub={health.score != null ? 'kategori ve temel ayarlara göre' : undefined}
        />
        <SummaryMetric
          label="İndekslenebilir Sayfa"
          value={loading ? '…' : indexablePages.toLocaleString('tr-TR')}
          sub="ürün + kategori + vitrin"
        />
        <SummaryMetric
          label="Eksik Meta Açıklama"
          value={loading ? '…' : categoryStats ? categoryStats.missingMetaDescription : '0'}
          sub={categoryStats ? `kategori · ürün: kontrol edilmedi` : 'kategori verisi yok'}
        />
        <SummaryMetric
          label="Duplicate Başlık"
          value={loading ? '…' : categoryStats ? categoryStats.duplicateTitles : '0'}
          sub="kategori bazlı"
        />
        <SummaryMetric
          label="Sitemap Durumu"
          value={SEO_CAPABILITIES.sitemapApi ? '—' : 'Planlandı'}
          sub="otomasyon sonraki faz"
        />
        <SummaryMetric
          label="Robots.txt Durumu"
          value={SEO_CAPABILITIES.robotsSave ? '—' : 'Varsayılan'}
          sub="panelden düzenleme yakında"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {SEO_TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition -mb-px ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Genel Bakış ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Panel title="SEO durum özeti" className="xl:col-span-2">
              {loading ? (
                <p className="text-[13px] text-slate-400">Yükleniyor…</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Eksik meta açıklaması (kategori)', value: categoryStats?.missingMetaDescription ?? 0 },
                    { label: 'Eksik SEO başlığı (kategori)', value: categoryStats?.missingMetaTitle ?? 0 },
                    { label: 'Eksik meta açıklaması (ürün)', value: 'Kontrol edilmedi' },
                    { label: 'Eksik görsel alt metni (ürün)', value: 'Kontrol edilmedi' },
                    { label: 'Noindex sayfa', value: '0' },
                    { label: 'Sitemap URL sayısı', value: SEO_CAPABILITIES.sitemapApi ? '—' : 'Planlandı' },
                    { label: 'Robots.txt', value: 'Varsayılan şablon' },
                    { label: 'Canonical URL', value: canonicalBase ? 'Otomatik' : 'Yapılandırılmadı' },
                    { label: 'Schema durumu', value: 'Planlandı' },
                    { label: 'Aktif ürün', value: productTotal.toLocaleString('tr-TR') },
                  ].map(row => (
                    <div key={row.label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                      <p className="text-[11px] text-slate-400">{row.label}</p>
                      <p className="text-[14px] font-semibold text-slate-800 mt-0.5 tabular-nums">{row.value}</p>
                    </div>
                  ))}
                </div>
              )}
              {!loading && !categoryStats && (
                <p className="text-[13px] text-slate-500 mt-3">
                  SEO kontrolü henüz çalıştırılmadı. Kategori verisi yüklendiğinde özet burada görünecek.
                </p>
              )}
            </Panel>

            <Panel title="SEO ipuçları">
              <ul className="space-y-3">
                {SEO_TIPS.map(tip => (
                  <li key={tip.title} className="text-[13px] leading-relaxed">
                    <p className="font-medium text-slate-800">{tip.title}</p>
                    <p className="text-slate-500 mt-0.5">{tip.desc}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <Panel title="Otomatik SEO">
            <p className="text-[13px] text-slate-500 -mt-2">
              Woontegra tarafından yönetilen veya planlanan SEO kuralları.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AUTO_SEO_RULES.map(rule => (
                <div key={rule.label} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-100">
                  <span className="text-[13px] text-slate-700">{rule.label}</span>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${RULE_BADGE[rule.status]}`}>
                    {RULE_BADGE_LABEL[rule.status]}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* ── Global SEO ── */}
      {tab === 'global' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <Panel title="Global SEO ayarları">
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Site başlığı</label>
                <input
                  className={inputCls}
                  value={globalForm.siteName}
                  onChange={e => setGlobalForm(f => ({ ...f, siteName: e.target.value }))}
                  placeholder="Mağaza adı"
                />
                <FieldHint>Marka adınız; arama sonuçlarında varsayılan başlık olarak kullanılır.</FieldHint>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Başlık şablonu</label>
                <input className={inputCls} value={globalForm.titleTemplate} disabled />
                <FieldHint>Sayfa başlıkları için varsayılan şablon. Özelleştirme sonraki fazda aktif olacak.</FieldHint>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Varsayılan meta açıklama</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={globalForm.defaultMetaDescription}
                  onChange={e => setGlobalForm(f => ({ ...f, defaultMetaDescription: e.target.value }))}
                  placeholder="Mağazanızın genel tanımı…"
                  maxLength={160}
                />
                <FieldHint>Mağaza vitrininde ve paylaşımlarda kullanılabilecek kısa açıklama (mağaza bilgisi).</FieldHint>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-2">
                  Anahtar kelimeler <ComingSoonBadge />
                </label>
                <input className={`${inputCls} opacity-60`} disabled placeholder="Sonraki fazda aktif olacak" />
              </div>
              <button type="button" onClick={() => void handleSaveGlobal()} disabled={savingGlobal} className="btn btn-primary text-[13px]">
                {savingGlobal ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="Open Graph ve canonical">
              <div className="space-y-4">
                {[
                  { label: 'Varsayılan Open Graph başlığı', key: 'ogTitle' as const },
                  { label: 'Varsayılan Open Graph açıklaması', key: 'ogDescription' as const },
                  { label: 'Varsayılan paylaşım görseli', key: 'ogImage' as const },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-2">
                      {field.label} <ComingSoonBadge />
                    </label>
                    <input className={`${inputCls} opacity-60`} disabled placeholder="Sonraki fazda aktif olacak" />
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Canonical domain</label>
                  <input
                    className={`${inputCls} bg-slate-50`}
                    readOnly
                    value={branding.customDomain && branding.domainVerified
                      ? `https://${branding.customDomain}`
                      : storefrontSlug
                        ? buildAbsoluteStorefrontListUrl(storefrontSlug).split('?')[0]
                        : 'Henüz yapılandırılmadı'}
                  />
                  <FieldHint>
                    Özel alan adı için{' '}
                    <Link to="/dashboard/settings" className="text-indigo-600 hover:underline">Görünüm Ayarları</Link>
                    {' '}bölümünü kullanın.
                  </FieldHint>
                </div>
              </div>
            </Panel>

            <Panel title="Otomatik SEO şablonları">
              {SEO_CAPABILITIES.metaTemplates ? null : (
                <>
                  <p className="text-[13px] text-slate-500 -mt-2">
                    Otomatik SEO şablonları sonraki fazda aktif olacak. Ürün ve kategori sayfaları için önerilen yapı:
                  </p>
                  <div className="space-y-3 text-[12px]">
                    {Object.entries(SEO_TEMPLATES).map(([key, tpl]) => (
                      <div key={key} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">{key}</p>
                        <code className="font-mono text-indigo-800 text-[11px] leading-relaxed">{tpl}</code>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* ── Ürün SEO ── */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="wn-card px-4 py-3.5 border-indigo-100/80 bg-indigo-50/40">
            <p className="text-[13px] text-slate-700 leading-relaxed">
              Ürün SEO başlığı ve meta açıklaması her ürünün düzenleme ekranındaki <strong>SEO</strong> sekmesinden yönetilir.
              Toplu SEO listesi sonraki fazda eklenecek.
            </p>
          </div>
          <div className="wn-card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-semibold text-slate-800">Ürün SEO listesi</h3>
                <p className="text-[12px] text-slate-500 mt-0.5">{productTotal.toLocaleString('tr-TR')} ürün</p>
              </div>
              <Link to="/dashboard/products" className="btn btn-secondary text-[13px]">Tüm ürünlere git</Link>
            </div>
            <Table
              data={productPreview}
              columns={productColumns}
              keyExtractor={row => row.id}
              loading={loading}
              stickyHeader
              emptyState={
                <div className="empty-state py-14 px-6">
                  <p className="empty-state-title">Henüz ürün yok.</p>
                  <p className="empty-state-desc mx-auto max-w-md">
                    Ürün ekledikten sonra SEO alanlarını ürün düzenleme ekranından yönetebilirsiniz.
                  </p>
                  <Link to="/dashboard/products/new" className="btn btn-primary text-[13px] mt-4 inline-flex">Yeni ürün ekle</Link>
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* ── Kategori SEO ── */}
      {tab === 'categories' && (
        <div className="wn-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-800">Kategori SEO</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">{categories.length} kategori</p>
            </div>
            <Link to="/dashboard/categories" className="btn btn-secondary text-[13px]">Kategorileri yönet</Link>
          </div>
          <Table
            data={categories.filter(c => c.isActive)}
            columns={categoryColumns}
            keyExtractor={row => row.id}
            loading={loading}
            stickyHeader
            emptyState={
              <div className="empty-state py-14 px-6">
                <p className="empty-state-title">Aktif kategori yok.</p>
                <p className="empty-state-desc mx-auto max-w-md">
                  Kategori SEO alanlarını kategori yönetim ekranından düzenleyebilirsiniz.
                </p>
                <Link to="/dashboard/categories" className="btn btn-primary text-[13px] mt-4 inline-flex">Kategorilere git</Link>
              </div>
            }
          />
        </div>
      )}

      {/* ── Sitemap ── */}
      {tab === 'sitemap' && (
        <div className="space-y-6">
          <div className="wn-card px-4 py-3.5 border-indigo-100/80 bg-indigo-50/40">
            <p className="text-[13px] text-slate-700 leading-relaxed">
              Sitemap, ürün ve kategori sayfalarınızın arama motorları tarafından keşfedilmesini kolaylaştırır.
              Sitemap otomasyonu sonraki fazda aktif olacak.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <SummaryMetric label="Sitemap durumu" value="Planlandı" />
            <SummaryMetric label="Son güncelleme" value="Henüz yok" />
            <SummaryMetric label="URL sayısı" value={indexablePages.toLocaleString('tr-TR')} sub="tahmini" />
            <SummaryMetric label="Ürün URL" value={productTotal.toLocaleString('tr-TR')} />
            <SummaryMetric label="Kategori URL" value={categoryStats?.active.toLocaleString('tr-TR') ?? '0'} />
          </div>
          <Panel title="Sitemap URL">
            <p className="text-[13px] font-mono text-indigo-700 break-all">
              {sitemapUrl || 'Mağaza alan adı yapılandırıldığında sitemap URL burada görünecek.'}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={!sitemapUrl}
                onClick={() => { if (sitemapUrl) window.open(sitemapUrl, '_blank', 'noopener,noreferrer'); }}
                className={`btn btn-secondary text-[13px] ${!sitemapUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Sitemap&apos;i görüntüle
              </button>
              <button type="button" disabled className="btn btn-secondary text-[13px] opacity-50 cursor-not-allowed" title="Sonraki fazda aktif olacak">
                Sitemap&apos;i yenile
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* ── Robots.txt ── */}
      {tab === 'robots' && (
        <Panel title="Robots.txt">
          <p className="text-[13px] text-slate-500 -mt-2">
            Arama motoru botlarının hangi sayfalara erişebileceğini tanımlar. Panelden kaydetme sonraki fazda aktif olacak.
          </p>
          <textarea
            readOnly
            rows={12}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-mono text-slate-700 bg-slate-50 resize-none"
            value={defaultRobotsTxt(sitemapUrl || 'https://magazaniz.com/sitemap.xml')}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled className="btn btn-primary text-[13px] opacity-50 cursor-not-allowed">
              Kaydet
            </button>
            <span className="text-[12px] text-slate-400 self-center">Salt okunur önizleme</span>
          </div>
        </Panel>
      )}

      {/* ── Schema ── */}
      {tab === 'schema' && (
        <div className="space-y-6">
          <div className="wn-card px-4 py-3.5 border-indigo-100/80 bg-indigo-50/40">
            <p className="text-[13px] text-slate-700 leading-relaxed">
              Woontegra ürün sayfalarında yapılandırılmış veri desteği sonraki fazda otomatik yönetilecek.
              Schema işaretlemeleri zengin arama sonuçları için önemlidir.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SCHEMA_ITEMS.map(item => (
              <div key={item.key} className="wn-card px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-slate-800">{item.label}</span>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${RULE_BADGE[item.status]}`}>
                  {item.status === 'planned' ? 'Planlandı' : 'Aktif'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
