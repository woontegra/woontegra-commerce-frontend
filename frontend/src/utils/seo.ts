/**
 * Generate SEO-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Turkish characters
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    // Remove special characters
    .replace(/[^\w\s-]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate text for meta descriptions
 */
export function truncateText(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate meta title with site name
 */
export function generateMetaTitle(title: string, siteName: string = 'Woontegra'): string {
  return `${title} | ${siteName}`;
}

/**
 * Extract plain text from HTML
 */
export function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Generate product meta description
 */
export function generateProductMeta(product: {
  name: string;
  description?: string;
  price: number;
}): { title: string; description: string } {
  const title = generateMetaTitle(product.name);
  const description = product.description
    ? truncateText(stripHtml(product.description))
    : `${product.name} - $${product.price.toFixed(2)} - Hemen satın alın!`;

  return { title, description };
}

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(path: string, baseUrl: string = window.location.origin): string {
  return `${baseUrl}${path}`;
}
