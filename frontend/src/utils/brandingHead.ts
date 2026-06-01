import { normalizeImageUrl } from './imageUtils';

const DEFAULT_FAVICON = '/favicon.svg';

/** Tarayıcı sekmesi favicon — panel ve vitrin ortak. */
export function injectDocumentFavicon(rawUrl: string | null | undefined): void {
  const href = normalizeImageUrl(rawUrl);
  if (!href) return;

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function resetDocumentFavicon(fallback: string = DEFAULT_FAVICON): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) link.href = fallback;
}

export { DEFAULT_FAVICON };
