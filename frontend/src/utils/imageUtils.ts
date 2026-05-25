/**
 * Derives the backend base URL from the Vite API URL env var.
 * e.g. VITE_API_URL = "http://localhost:3000/api"  →  base = "http://localhost:3000"
 */
const BACKEND_BASE: string = (() => {
  const raw = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
  return raw.replace(/\/api\/?$/, '');
})();

/**
 * Normalize an image URL so it always points to the correct backend host.
 *
 * Rules:
 *   1. null / undefined / empty → null (caller shows placeholder)
 *   2. Already a full http(s) URL:
 *      - Replace any localhost:<wrong-port> with the current backend base
 *        (handles old records saved with port 3001)
 *      - Otherwise return as-is
 *   3. Starts with "/" → prepend BACKEND_BASE
 *   4. Anything else    → prepend BACKEND_BASE + "/"
 */
export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Fix records stored with wrong localhost port (e.g. 3001 instead of 3000)
    return url.replace(/http:\/\/localhost:\d+/, BACKEND_BASE);
  }

  if (url.startsWith('/')) return `${BACKEND_BASE}${url}`;

  return `${BACKEND_BASE}/${url}`;
}

/**
 * Pick the best image URL from a product's image list.
 * Priority: isMain === true → first image → null
 */
export function getMainImageUrl(
  images: Array<{ url: string; isMain?: boolean }> | null | undefined,
): string | null {
  if (!images?.length) return null;
  const main = images.find((i) => i.isMain);
  return normalizeImageUrl((main ?? images[0]).url);
}
