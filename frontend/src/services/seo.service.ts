import type { SEOMetaTags, SitemapEntry, RobotsRule, SEOConfig } from '../types/seo';

class SEOService {
  private config: SEOConfig = {
    siteName: 'Woontegra Commerce',
    siteUrl: 'https://woontegra.com',
    defaultTitle: 'Woontegra Commerce - E-ticaret Platformu',
    defaultDescription: 'Modern ve güvenilir e-ticaret çözümleri',
    defaultImage: '/images/og-image.jpg',
    twitterHandle: '@woontegra',
  };

  // Generate slug from text
  generateSlug(text: string): string {
    const turkishMap: Record<string, string> = {
      'ç': 'c', 'Ç': 'c',
      'ğ': 'g', 'Ğ': 'g',
      'ı': 'i', 'İ': 'i',
      'ö': 'o', 'Ö': 'o',
      'ş': 's', 'Ş': 's',
      'ü': 'u', 'Ü': 'u',
    };

    return text
      .split('')
      .map(char => turkishMap[char] || char)
      .join('')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Generate unique slug
  generateUniqueSlug(text: string, existingSlugs: string[]): string {
    let slug = this.generateSlug(text);
    let counter = 1;

    while (existingSlugs.includes(slug)) {
      slug = `${this.generateSlug(text)}-${counter}`;
      counter++;
    }

    return slug;
  }

  // Set meta tags
  setMetaTags(tags: SEOMetaTags): void {
    // Title
    document.title = tags.title || this.config.defaultTitle;

    // Description
    this.setMetaTag('description', tags.description || this.config.defaultDescription);

    // Keywords
    if (tags.keywords && tags.keywords.length > 0) {
      this.setMetaTag('keywords', tags.keywords.join(', '));
    }

    // Canonical
    if (tags.canonical) {
      this.setLinkTag('canonical', tags.canonical);
    }

    // Robots
    if (tags.robots) {
      this.setMetaTag('robots', tags.robots);
    }

    // Author
    if (tags.author) {
      this.setMetaTag('author', tags.author);
    }

    // Open Graph
    this.setMetaTag('og:title', tags.ogTitle || tags.title, 'property');
    this.setMetaTag('og:description', tags.ogDescription || tags.description, 'property');
    this.setMetaTag('og:image', tags.ogImage || this.config.defaultImage, 'property');
    this.setMetaTag('og:type', tags.ogType || 'website', 'property');
    this.setMetaTag('og:url', tags.ogUrl || window.location.href, 'property');
    this.setMetaTag('og:site_name', this.config.siteName, 'property');

    // Twitter Card
    this.setMetaTag('twitter:card', tags.twitterCard || 'summary_large_image');
    this.setMetaTag('twitter:title', tags.twitterTitle || tags.title);
    this.setMetaTag('twitter:description', tags.twitterDescription || tags.description);
    this.setMetaTag('twitter:image', tags.twitterImage || tags.ogImage || this.config.defaultImage);
    
    if (this.config.twitterHandle) {
      this.setMetaTag('twitter:site', this.config.twitterHandle);
    }
  }

  // Set individual meta tag
  private setMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name'): void {
    if (!content) return;

    let element = document.querySelector(`meta[${attribute}="${name}"]`);
    
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, name);
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  }

  // Set link tag
  private setLinkTag(rel: string, href: string): void {
    let element = document.querySelector(`link[rel="${rel}"]`);
    
    if (!element) {
      element = document.createElement('link');
      element.setAttribute('rel', rel);
      document.head.appendChild(element);
    }
    
    element.setAttribute('href', href);
  }

  // Generate sitemap XML
  generateSitemap(entries: SitemapEntry[]): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url>
    <loc>${entry.loc}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''}
    ${entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;

    return xml;
  }

  // Generate sitemap for products
  generateProductsSitemap(products: any[]): SitemapEntry[] {
    return products.map(product => ({
      loc: `${this.config.siteUrl}/products/${product.slug}`,
      lastmod: new Date(product.updatedAt || product.createdAt).toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: 0.8,
    }));
  }

  // Generate sitemap for categories
  generateCategoriesSitemap(categories: any[]): SitemapEntry[] {
    return categories.map(category => ({
      loc: `${this.config.siteUrl}/categories/${category.slug}`,
      lastmod: new Date(category.updatedAt || category.createdAt).toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: 0.7,
    }));
  }

  // Generate static pages sitemap
  generateStaticPagesSitemap(): SitemapEntry[] {
    return [
      {
        loc: this.config.siteUrl,
        changefreq: 'daily',
        priority: 1.0,
      },
      {
        loc: `${this.config.siteUrl}/products`,
        changefreq: 'daily',
        priority: 0.9,
      },
      {
        loc: `${this.config.siteUrl}/categories`,
        changefreq: 'weekly',
        priority: 0.8,
      },
      {
        loc: `${this.config.siteUrl}/about`,
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: `${this.config.siteUrl}/contact`,
        changefreq: 'monthly',
        priority: 0.5,
      },
    ];
  }

  // Generate robots.txt
  generateRobotsTxt(rules: RobotsRule[], sitemapUrl?: string): string {
    let txt = '';

    rules.forEach(rule => {
      txt += `User-agent: ${rule.userAgent}\n`;
      
      if (rule.allow) {
        rule.allow.forEach(path => {
          txt += `Allow: ${path}\n`;
        });
      }
      
      if (rule.disallow) {
        rule.disallow.forEach(path => {
          txt += `Disallow: ${path}\n`;
        });
      }
      
      if (rule.crawlDelay) {
        txt += `Crawl-delay: ${rule.crawlDelay}\n`;
      }
      
      txt += '\n';
    });

    if (sitemapUrl) {
      txt += `Sitemap: ${sitemapUrl}\n`;
    }

    return txt;
  }

  // Generate default robots.txt
  generateDefaultRobotsTxt(): string {
    const rules: RobotsRule[] = [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/admin',
          '/api',
          '/dashboard',
          '/checkout',
          '/cart',
          '/account',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/'],
      },
    ];

    return this.generateRobotsTxt(rules, `${this.config.siteUrl}/sitemap.xml`);
  }

  // Get product meta tags
  getProductMetaTags(product: any): SEOMetaTags {
    return {
      title: `${product.name} - ${this.config.siteName}`,
      description: product.description?.substring(0, 160) || this.config.defaultDescription,
      keywords: product.tags || [],
      ogTitle: product.name,
      ogDescription: product.description?.substring(0, 160),
      ogImage: product.images?.[0] || this.config.defaultImage,
      ogType: 'product',
      ogUrl: `${this.config.siteUrl}/products/${product.slug}`,
      canonical: `${this.config.siteUrl}/products/${product.slug}`,
      robots: 'index, follow',
    };
  }

  // Get category meta tags
  getCategoryMetaTags(category: any): SEOMetaTags {
    return {
      title: `${category.name} - ${this.config.siteName}`,
      description: category.description || `${category.name} kategorisindeki ürünleri keşfedin`,
      ogTitle: category.name,
      ogDescription: category.description,
      ogImage: category.image || this.config.defaultImage,
      ogType: 'website',
      ogUrl: `${this.config.siteUrl}/categories/${category.slug}`,
      canonical: `${this.config.siteUrl}/categories/${category.slug}`,
      robots: 'index, follow',
    };
  }

  // Update config
  updateConfig(config: Partial<SEOConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const seoService = new SEOService();
