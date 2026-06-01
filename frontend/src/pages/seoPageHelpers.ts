import type { Category } from '../services/category.service';

// ─── Capability flags (flip when backend ships) ───────────────────────────────

export const SEO_CAPABILITIES = {
  seoAuditEndpoint:    false,
  sitemapApi:          false,
  sitemapRefresh:      false,
  robotsSave:          false,
  productSeoListApi:   false,
  metaTemplates:       false,
  schemaAutomation:    false,
  openGraphFields:     false,
  keywordsField:       false,
} as const;

export type SeoTabKey =
  | 'overview'
  | 'global'
  | 'products'
  | 'categories'
  | 'sitemap'
  | 'robots'
  | 'schema';

export const SEO_TABS: { key: SeoTabKey; label: string }[] = [
  { key: 'overview',   label: 'Genel Bakış' },
  { key: 'global',     label: 'Global SEO' },
  { key: 'products',   label: 'Ürün SEO' },
  { key: 'categories', label: 'Kategori SEO' },
  { key: 'sitemap',    label: 'Sitemap' },
  { key: 'robots',     label: 'Robots.txt' },
  { key: 'schema',     label: 'Schema / Yapılandırılmış Veri' },
];

export const SEO_TIPS = [
  {
    title: 'Meta açıklamaları tamamlayın',
    desc:  'Her ürün ve kategori için benzersiz, 150–160 karakterlik açıklama yazın.',
  },
  {
    title: 'Kategori açıklamalarını güçlendirin',
    desc:  'Kategori sayfalarında arama niyetine uygun özet metin kullanın.',
  },
  {
    title: 'Ürün görsellerine alt metin ekleyin',
    desc:  'Görsel alt metinleri erişilebilirlik ve görsel arama için önemlidir.',
  },
  {
    title: 'Yinelenen başlıkları kontrol edin',
    desc:  'Aynı SEO başlığını birden fazla sayfada kullanmaktan kaçının.',
  },
  {
    title: 'Sitemap güncelliğini koruyun',
    desc:  'Yeni ürün ve kategoriler indekslenebilir URL listesine dahil edilmelidir.',
  },
];

export const SEO_TEMPLATES = {
  productTitle:       '{productName} | {storeName}',
  productDescription: '{productName} ürününü {storeName} güvencesiyle satın alın. Hızlı kargo ve güvenli ödeme avantajlarını keşfedin.',
  categoryTitle:      '{categoryName} Ürünleri | {storeName}',
  categoryDescription:'{categoryName} kategorisindeki ürünleri inceleyin. {storeName} ile güvenli alışveriş yapın.',
};

export const AUTO_SEO_RULES = [
  { label: 'Ürün canonical URL otomatik oluşturulur',        status: 'active' as const },
  { label: 'Kategori canonical URL otomatik oluşturulur',    status: 'active' as const },
  { label: 'Slug yapısı SEO uyumlu tutulur',                 status: 'active' as const },
  { label: 'Sitemap otomatik güncellenir',                   status: 'planned' as const },
  { label: 'Ürün schema verisi otomatik hazırlanır',         status: 'planned' as const },
  { label: 'Eksik meta alanları şablondan tamamlanabilir',   status: 'planned' as const },
];

export const SCHEMA_ITEMS = [
  { key: 'product',      label: 'Product schema',      status: 'planned' as const },
  { key: 'offer',        label: 'Offer schema',        status: 'planned' as const },
  { key: 'breadcrumb',   label: 'Breadcrumb schema',   status: 'planned' as const },
  { key: 'organization', label: 'Organization schema', status: 'planned' as const },
  { key: 'website',      label: 'Website schema',      status: 'planned' as const },
];

export interface CategorySeoStats {
  total:                 number;
  active:                number;
  missingMetaTitle:      number;
  missingMetaDescription:number;
  duplicateTitles:       number;
}

export function computeCategorySeoStats(categories: Category[]): CategorySeoStats {
  const active = categories.filter(c => c.isActive);
  const missingMetaTitle = active.filter(c => !c.metaTitle?.trim()).length;
  const missingMetaDescription = active.filter(c => !c.metaDescription?.trim()).length;

  const titleCounts = new Map<string, number>();
  for (const c of active) {
    const key = (c.metaTitle?.trim() || c.name.trim()).toLowerCase();
    if (key) titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
  }
  const duplicateTitles = [...titleCounts.values()].filter(n => n > 1).length;

  return {
    total: categories.length,
    active: active.length,
    missingMetaTitle,
    missingMetaDescription,
    duplicateTitles,
  };
}

export function computeHealthScore(params: {
  categoryStats: CategorySeoStats | null;
  hasSiteName: boolean;
  hasStoreDescription: boolean;
  productCount: number;
  domainVerified: boolean;
}): { score: number | null; label: string } {
  const { categoryStats, hasSiteName, hasStoreDescription, productCount, domainVerified } = params;
  if (!categoryStats) {
    return { score: null, label: 'Kontrol edilmedi' };
  }

  let points = 0;
  const active = categoryStats.active || 1;
  const metaCoverage = 1 - (categoryStats.missingMetaDescription / active);
  points += Math.round(metaCoverage * 40);
  if (hasSiteName) points += 15;
  if (hasStoreDescription) points += 15;
  if (productCount > 0) points += 15;
  if (domainVerified) points += 15;
  points = Math.min(100, Math.max(0, points));

  return { score: points, label: `${points}/100` };
}

export function categorySeoStatus(c: Category): 'good' | 'partial' | 'missing' {
  const hasTitle = Boolean(c.metaTitle?.trim());
  const hasDesc  = Boolean(c.metaDescription?.trim());
  if (hasTitle && hasDesc) return 'good';
  if (hasTitle || hasDesc) return 'partial';
  return 'missing';
}

export const STATUS_LABELS = {
  good:    'Tamam',
  partial: 'Eksik',
  missing: 'Boş',
} as const;

export const STATUS_STYLE = {
  good:    'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  partial: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
  missing: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
} as const;

export const RULE_BADGE = {
  active:  'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  planned: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
} as const;

export const RULE_BADGE_LABEL = {
  active:  'Aktif',
  planned: 'Planlandı',
} as const;

export function defaultRobotsTxt(sitemapUrl: string): string {
  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /login

Sitemap: ${sitemapUrl}`;
}
