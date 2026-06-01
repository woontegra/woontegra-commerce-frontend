import { Link } from 'react-router-dom';
import {
  featuredHeaderTextAlignClass,
  resolveFeaturedHeaderSettings,
} from '../../utils/featuredProductsBlockHelpers';

type FeaturedProductsSectionHeaderProps = {
  settings: Record<string, unknown>;
  viewAllHref: string;
  preview?: boolean;
};

export default function FeaturedProductsSectionHeader({
  settings,
  viewAllHref,
  preview = false,
}: FeaturedProductsSectionHeaderProps) {
  const header = resolveFeaturedHeaderSettings(settings);
  const alignCls = featuredHeaderTextAlignClass(header.headerAlign);

  const eyebrow =
    header.showTitle && header.showEyebrow && header.eyebrowText.trim()
      ? header.eyebrowText.trim()
      : undefined;
  const title = header.showTitle && header.title.trim() ? header.title.trim() : undefined;
  const description =
    header.showTitle && header.showDescription && header.description.trim()
      ? header.description.trim()
      : undefined;

  if (!title && !eyebrow && !description && !header.showViewAll) return null;

  const viewAllEl = header.showViewAll ? (
    preview ? (
      <span className="store-section-link whitespace-nowrap shrink-0">{header.viewAllLabel} →</span>
    ) : (
      <Link to={viewAllHref} className="store-section-link whitespace-nowrap shrink-0">
        {header.viewAllLabel} →
      </Link>
    )
  ) : null;

  const textBlock = (
    <div className={`flex flex-col min-w-0 ${alignCls}`}>
      {eyebrow && <p className="store-section-eyebrow">{eyebrow}</p>}
      {title && <h2 className="store-section-heading">{title}</h2>}
      {description && <p className="store-section-desc">{description}</p>}
    </div>
  );

  if (header.headerAlign === 'center') {
    return (
      <div className="store-section-header relative">
        {viewAllEl && (
          <div className="flex justify-end mb-2 sm:absolute sm:top-0 sm:right-0 sm:mb-0">{viewAllEl}</div>
        )}
        <div className="flex flex-col items-center text-center gap-1">{textBlock}</div>
      </div>
    );
  }

  if (header.headerAlign === 'right') {
    return (
      <div className="store-section-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        {viewAllEl && <div className="order-2 sm:order-1 shrink-0 self-start sm:self-auto">{viewAllEl}</div>}
        <div className="order-1 sm:order-2 min-w-0 sm:ml-auto">{textBlock}</div>
      </div>
    );
  }

  return (
    <div className="store-section-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      {textBlock}
      {viewAllEl}
    </div>
  );
}
