import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import type { StorefrontTenantInfo } from '../../contexts/StorefrontTenantContext';
import type { StorefrontThemeSettings } from '../types/storefront.types';
import { displayStorefrontName } from '../../utils/displayStoreName';
import {
  DEFAULT_LEGAL_LINKS,
  footerLogoImageStyle,
  mergeFooterSettings,
  resolveFooterHref,
  resolveFooterLogoUrl,
  whatsappHref,
  type FooterColumn,
  type FooterLink,
  type FooterSettings,
} from '../../utils/footerSettingsHelpers';
import { normalizeStoreImageUrl } from '../services/storefrontApi';

type Props = {
  tenant: StorefrontTenantInfo;
  settings?: StorefrontThemeSettings;
  footerSettings?: FooterSettings | Record<string, unknown>;
  storeLink?: (path: string) => string;
  preview?: boolean;
};

function LegacyStorefrontFooter({
  tenant,
  settings,
  storeLink,
}: {
  tenant: StorefrontTenantInfo;
  settings: StorefrontThemeSettings;
  storeLink?: (path: string) => string;
}) {
  const year = new Date().getFullYear();
  const displayName = displayStorefrontName(tenant.name);
  const logoSrc = normalizeStoreImageUrl(tenant.logoUrl);
  const home = storeLink ? storeLink('/store') : '/store';
  const products = storeLink ? storeLink('/store/urunler') : '/store/urunler';
  const cart = storeLink ? storeLink('/store/sepet') : '/store/sepet';
  const account = storeLink ? storeLink('/store/hesabim') : '/store/hesabim';

  const quickLinks = [
    { label: 'Ana sayfa', to: home },
    { label: 'Ürünler', to: products },
    { label: 'Sepet', to: cart },
    { label: 'Hesabım', to: account },
  ];

  return (
    <footer className="store-footer mt-auto">
      <div className="store-container-wide store-footer-main">
        <div className="store-footer-newsletter">
          <div>
            <p className="store-section-eyebrow mb-1">Bülten</p>
            <p className="store-footer-brand text-base">Yeni koleksiyonlardan haberdar olun</p>
            <p className="store-footer-muted text-sm mt-1">Kampanya ve özel fırsatlar e-posta ile.</p>
          </div>
          <span className="store-btn-primary inline-flex px-6 py-2.5 text-sm shrink-0 cursor-default opacity-90">
            Yakında
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="lg:col-span-4 store-footer-brand-block">
            {logoSrc ? (
              <Link to={home} className="inline-flex max-w-full shrink-0">
                <img src={logoSrc} alt={displayName} className="store-footer-logo-img" />
              </Link>
            ) : (
              <div className="store-footer-brand-row">
                <span className="store-header-logo-fallback">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="store-footer-brand">{displayName}</p>
                  <p className="store-section-eyebrow mt-1 mb-0">Premium e-ticaret</p>
                </div>
              </div>
            )}
            <p className="store-footer-muted text-sm leading-relaxed max-w-md">
              {settings.footerText ??
                'Özenle seçilmiş ürünler, güvenli alışveriş ve hızlı teslimat. Butik deneyimi, modern e-ticaret altyapısı.'}
            </p>
          </div>

          <div className="lg:col-span-2">
            <h3 className="store-footer-col-title">Mağaza</h3>
            <ul className="space-y-2.5">
              {quickLinks.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="store-footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="store-footer-col-title">Yardım</h3>
            <ul className="space-y-2.5">
              <li><span className="store-footer-link">Sık sorulan sorular</span></li>
              <li><span className="store-footer-link">Kargo & teslimat</span></li>
              <li><span className="store-footer-link">İade & değişim</span></li>
              <li><span className="store-footer-link">Gizlilik politikası</span></li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="store-footer-col-title">İletişim</h3>
            <ul className="space-y-2.5 store-footer-muted text-sm">
              <li>Pazartesi – Cuma, 09:00 – 18:00</li>
              <li>
                <a href={`mailto:destek@${tenant.slug || 'magaza'}.com`} className="store-footer-link">
                  destek@{tenant.slug || 'magaza'}.com
                </a>
              </li>
            </ul>
            {settings.socialLinks.length > 0 && (
              <ul className="flex flex-wrap gap-2 mt-5">
                {settings.socialLinks.map(s => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="store-footer-social-link">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="store-footer-bottom">
          <p>© {year} {displayName}</p>
          <p>Güvenli alışveriş · Woontegra altyapısı</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLinkItem({
  link,
  storeLink,
  preview,
  style,
}: {
  link: FooterLink;
  storeLink?: (path: string) => string;
  preview?: boolean;
  style?: React.CSSProperties;
}) {
  const href = resolveFooterHref(link.url, storeLink);
  const label = link.label.trim() || link.url.trim() || 'Link';
  if (preview) {
    return (
      <span className="hover:opacity-100 opacity-80 transition-opacity cursor-default" style={style}>
        {label}
      </span>
    );
  }
  if (/^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="hover:opacity-100 opacity-80 transition-opacity" style={style}>
        {label}
      </a>
    );
  }
  return (
    <Link to={href} className="hover:opacity-100 opacity-80 transition-opacity" style={style}>
      {label}
    </Link>
  );
}

function FooterColumnBlock({
  column,
  storeLink,
  preview,
  headingColor,
  textColor,
}: {
  column: FooterColumn;
  storeLink?: (path: string) => string;
  preview?: boolean;
  headingColor: string;
  textColor: string;
}) {
  const validLinks = column.links.filter(l => l.label.trim() || l.url.trim());
  if (!column.title.trim() && validLinks.length === 0) return null;

  return (
    <div className="min-w-0">
      {column.title.trim() && (
        <h3 className="text-sm font-semibold mb-3" style={{ color: headingColor }}>
          {column.title}
        </h3>
      )}
      {validLinks.length > 0 && (
        <ul className="space-y-2 text-sm">
          {validLinks.map(link => (
            <li key={link.id}>
              <FooterLinkItem link={link} storeLink={storeLink} preview={preview} style={{ color: textColor }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConfiguredStorefrontFooter({
  tenant,
  settings,
  storeLink,
  preview = false,
}: {
  tenant: StorefrontTenantInfo;
  settings: FooterSettings;
  storeLink?: (path: string) => string;
  preview?: boolean;
}) {
  const year = new Date().getFullYear();
  const displayName = displayStorefrontName(tenant.name);
  const logoUrl = normalizeStoreImageUrl(resolveFooterLogoUrl(settings, tenant.logoUrl));
  const logoStyle = footerLogoImageStyle(settings);
  const waHref = whatsappHref(settings.whatsappNumber);
  const legalLinks = settings.legalLinksEnabled ? DEFAULT_LEGAL_LINKS : [];
  const visibleColumns = settings.columns.filter(
    c => c.title.trim() || c.links.some(l => l.label.trim() || l.url.trim()),
  );
  const socialLinks = settings.showSocialLinks
    ? settings.socialLinks.filter(l => l.label.trim() || l.url.trim())
    : [];

  const footerStyle: React.CSSProperties = {
    backgroundColor: settings.backgroundColor,
    color: settings.textColor,
    borderTop: '1px solid rgba(148, 163, 184, 0.25)',
  };

  const brandBlock = (
    <div className={`min-w-0 ${settings.layout === 'centered' ? 'text-center mx-auto max-w-lg' : ''}`}>
      {logoUrl ? (
        preview ? (
          <img
            src={logoUrl}
            alt={displayName}
            className="store-footer-logo-img--configured mb-3"
            style={logoStyle}
          />
        ) : (
          <Link to={storeLink ? storeLink('/store') : '/store'} className="inline-flex max-w-full">
            <img
              src={logoUrl}
              alt={displayName}
              className="store-footer-logo-img--configured mb-3"
              style={logoStyle}
            />
          </Link>
        )
      ) : (
        <>
          <span className="store-header-logo-fallback mb-3">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <p className="text-base font-semibold mb-2" style={{ color: settings.headingColor }}>
            {displayName}
          </p>
        </>
      )}
      {settings.description.trim() && (
        <p className="text-sm leading-relaxed opacity-90 max-w-md">{settings.description.trim()}</p>
      )}
    </div>
  );

  return (
    <footer className="mt-auto" style={footerStyle}>
      <div className="max-w-6xl mx-auto px-4 py-10">
        {settings.layout === 'simple' ? (
          <div className="flex flex-col sm:flex-row justify-between gap-6 text-sm">
            <div>
              {brandBlock}
              <p className="mt-4 text-xs opacity-70">© {year} {displayName}. Tüm hakları saklıdır.</p>
            </div>
            {(socialLinks.length > 0 || settings.showWhatsapp) && (
              <div className="flex flex-wrap gap-3 items-start">
                {socialLinks.map(link => (
                  <FooterLinkItem key={link.id} link={link} storeLink={storeLink} preview={preview} />
                ))}
                {settings.showWhatsapp && waHref && (
                  preview ? (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </span>
                  ) : (
                    <a href={waHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm hover:opacity-100 opacity-80">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`grid gap-8 ${
              settings.layout === 'centered'
                ? 'grid-cols-1'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {brandBlock}
            {visibleColumns.map(col => (
              <FooterColumnBlock
                key={col.id}
                column={col}
                storeLink={storeLink}
                preview={preview}
                headingColor={settings.headingColor}
                textColor={settings.textColor}
              />
            ))}
          </div>
        )}

        {(socialLinks.length > 0 || (settings.showWhatsapp && waHref) || legalLinks.length > 0) &&
          settings.layout !== 'simple' && (
            <div className="mt-8 pt-6 border-t border-slate-200/40 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {socialLinks.map(link => (
                  <FooterLinkItem key={link.id} link={link} storeLink={storeLink} preview={preview} />
                ))}
                {settings.showWhatsapp && waHref && (
                  preview ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </span>
                  ) : (
                    <a href={waHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:opacity-100 opacity-80">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  )
                )}
              </div>
              {legalLinks.length > 0 && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {legalLinks.map(link => (
                    <li key={link.id}>
                      <FooterLinkItem link={link} storeLink={storeLink} preview={preview} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

        {settings.layout === 'simple' && legalLinks.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {legalLinks.map(link => (
              <li key={link.id}>
                <FooterLinkItem link={link} storeLink={storeLink} preview={preview} />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-xs opacity-60">
          © {year} {displayName}. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}

export function StorefrontFooter({
  tenant,
  settings: themeSettings,
  footerSettings,
  storeLink,
  preview = false,
}: Props) {
  const legacySettings = themeSettings ?? {
    primaryColor: '#1c1917',
    logoUrl: tenant.logoUrl,
    faviconUrl: null,
    bannerTitle: null,
    bannerSubtitle: null,
    footerText: null,
    socialLinks: [],
  };

  const merged = mergeFooterSettings(footerSettings);
  if (!merged.enabled) {
    return <LegacyStorefrontFooter tenant={tenant} settings={legacySettings} storeLink={storeLink} />;
  }

  return (
    <ConfiguredStorefrontFooter
      tenant={tenant}
      settings={merged}
      storeLink={storeLink}
      preview={preview}
    />
  );
}
