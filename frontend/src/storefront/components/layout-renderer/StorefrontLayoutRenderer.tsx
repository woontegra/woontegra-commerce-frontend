import type { StorefrontLayout, StorefrontSection } from '../../../types/storefrontBuilder.types';
import { useStorefrontTenant } from '../../hooks/useStorefrontTenant';
import { activeLayoutSections, themePrimaryColor } from './layoutRendererHelpers';
import {
  CampaignBannerSection,
  CategoryGridSection,
  FeaturedProductsSection,
  HeroSection,
  TextImageSection,
  TrustBadgesSection,
} from './LayoutSections';

type Props = {
  layout: StorefrontLayout;
};

function renderSection(
  section: StorefrontSection,
  primaryColor: string | null,
  storeLink: (path: string) => string,
) {
  const common = { section, primaryColor, storeLink };
  switch (section.type) {
    case 'hero':
      return <HeroSection key={section.id} {...common} />;
    case 'categoryGrid':
      return <CategoryGridSection key={section.id} {...common} />;
    case 'featuredProducts':
      return <FeaturedProductsSection key={section.id} {...common} />;
    case 'campaignBanner':
      return <CampaignBannerSection key={section.id} {...common} />;
    case 'trustBadges':
      return <TrustBadgesSection key={section.id} {...common} />;
    case 'textImage':
      return <TextImageSection key={section.id} {...common} />;
    default:
      return null;
  }
}

export default function StorefrontLayoutRenderer({ layout }: Props) {
  const { storeLink } = useStorefrontTenant();
  const sections = activeLayoutSections(layout.sections);
  const primaryColor = themePrimaryColor(layout.theme);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="storefront-built-layout">
      {sections.map(section => renderSection(section, primaryColor, storeLink))}
    </div>
  );
}
