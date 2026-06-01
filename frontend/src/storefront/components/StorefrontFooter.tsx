import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import type { StorefrontTenantInfo } from '../../contexts/StorefrontTenantContext';
import type { StorefrontThemeSettings } from '../types/storefront.types';
import { displayStorefrontName } from '../../utils/displayStoreName';
import {
  DEFAULT_LEGAL_LINKS,
  mergeFooterSettings,
  resolveFooterHref,
  resolveFooterLogoUrl,
  whatsappHref,
  type FooterColumn,
  type FooterLink,
  type FooterSettings,
} from '../../utils/footerSettingsHelpers';

type Props = {
  tenant: StorefrontTenantInfo;
  settings?: StorefrontThemeSettings;
  footerSettings?: FooterSettings | Record<string, unknown>;
  storeLink?: (path: string) => string;
  preview?: boolean;
};

function LegacyStorefrontFooter({ tenant, settings }: { tenant: StorefrontTenantInfo; settings: StorefrontThemeSettings }) {
  const year = new Date().getFullYear();
  const footerNote = settings.footerText ?? `© ${year} ${tenant.name}. Tüm hakları saklıdır.`;

  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row justify-between gap-6 text-sm text-slate-500">
          <p>{footerNote}</p>
          {settings.socialLinks.length > 0 && (
            <ul className="flex flex-wrap gap-4">
              {settings.socialLinks.map(s => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-indigo-600">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-4 text-xs text-slate-400">Woontegra e-ticaret altyapısı</p>
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
  const logoUrl = resolveFooterLogoUrl(settings, tenant.logoUrl);
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
          <img src={logoUrl} alt={displayName} className="h-10 w-auto object-contain mb-3" />
        ) : (
          <Link to={storeLink ? storeLink('/store') : '/store'}>
            <img src={logoUrl} alt={displayName} className="h-10 w-auto object-contain mb-3" />
          </Link>
        )
      ) : (
        <p className="text-base font-semibold mb-2" style={{ color: settings.headingColor }}>
          {displayName}
        </p>
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
    primaryColor: '#4f46e5',
    logoUrl: tenant.logoUrl,
    faviconUrl: null,
    bannerTitle: null,
    bannerSubtitle: null,
    footerText: null,
    socialLinks: [],
  };

  const merged = mergeFooterSettings(footerSettings);
  if (!merged.enabled) {
    return <LegacyStorefrontFooter tenant={tenant} settings={legacySettings} />;
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
