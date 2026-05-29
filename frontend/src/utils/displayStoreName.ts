const DEFAULT_PANEL_NAME = 'Woontegra';
const DEFAULT_STOREFRONT_NAME = 'Mağaza';

function isPlaceholderStoreName(name?: string | null): boolean {
  const trimmed = name?.trim();
  return !trimmed || trimmed === 'My Store' || trimmed === 'Mağazam';
}

/** Panel sidebar / branding — boş veya varsayılan → Woontegra */
export function displayStoreName(name?: string | null, fallback = DEFAULT_PANEL_NAME): string {
  if (isPlaceholderStoreName(name)) return fallback;
  return name!.trim();
}

/** Vitrin header — boş veya varsayılan → Mağaza */
export function displayStorefrontName(name?: string | null, fallback = DEFAULT_STOREFRONT_NAME): string {
  if (isPlaceholderStoreName(name)) return fallback;
  return name!.trim();
}

/** GET /settings yanıtından panel için en iyi mağaza adı */
export function resolveStoreNameFromSettings(data: Record<string, unknown>): string {
  const storeName = typeof data.storeName === 'string' ? data.storeName.trim() : '';
  const siteName = typeof data.siteName === 'string' ? data.siteName.trim() : '';
  if (storeName && !isPlaceholderStoreName(storeName)) return storeName;
  if (siteName && !isPlaceholderStoreName(siteName)) return siteName;
  return '';
}
