import type { StorefrontTenantInfo } from '../../contexts/StorefrontTenantContext';
import type { StorefrontThemeSettings } from '../types/storefront.types';

type Props = {
  tenant: StorefrontTenantInfo;
  settings: StorefrontThemeSettings;
};

export function StorefrontFooter({ tenant, settings }: Props) {
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
