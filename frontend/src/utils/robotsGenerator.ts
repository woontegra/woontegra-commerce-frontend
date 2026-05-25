import type { RobotsRule } from '../types/seo';

export function generateRobotsTxt(rules: RobotsRule[], sitemapUrl?: string): string {
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

export function downloadRobotsTxt(txt: string, filename: string = 'robots.txt'): void {
  const blob = new Blob([txt], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function getDefaultRobots(_siteUrl: string): RobotsRule[] {
  return [
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
    {
      userAgent: 'Bingbot',
      allow: ['/'],
    },
  ];
}
