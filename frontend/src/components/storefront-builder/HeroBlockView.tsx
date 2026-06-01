import { Link } from 'react-router-dom';
import '../../styles/heroBlock.css';
import {
  buildHeroBlockModel,
  heroButtonClassName,
  heroButtonInlineStyle,
  normalizeHeroImageUrl,
  type HeroButtonStyle,
} from '../../utils/heroBlockHelpers';
import type { HeroPreviewViewport } from '../../utils/heroBuilderConstants';

type HeroBlockViewProps = {
  settings: Record<string, unknown>;
  imageUrl?: string | null;
  mobileImageUrl?: string | null;
  themePrimary?: string | null;
  resolveHref?: (path: string) => string;
  preview?: boolean;
  previewViewport?: HeroPreviewViewport;
  className?: string;
};

function HeroButton({ btn, preview }: { btn: HeroButtonStyle; preview?: boolean }) {
  if (!btn.show || !btn.text.trim()) return null;
  const className = heroButtonClassName(btn.variant, btn.radius, btn.size);
  const style = heroButtonInlineStyle(btn);
  if (preview || !btn.href) {
    return (
      <span className={className} style={style}>
        {btn.text}
      </span>
    );
  }
  return (
    <Link to={btn.href} className={className} style={style}>
      {btn.text}
    </Link>
  );
}

function str(settings: Record<string, unknown>, key: string): string {
  return String(settings[key] ?? '').trim();
}

export default function HeroBlockView({
  settings,
  imageUrl: imageUrlProp,
  mobileImageUrl: mobileImageUrlProp,
  themePrimary = null,
  resolveHref = p => p,
  preview = false,
  previewViewport,
  className = '',
}: HeroBlockViewProps) {
  const desktopImageUrl = normalizeHeroImageUrl(imageUrlProp ?? (str(settings, 'imageUrl') || null));
  const mobileImageUrl = normalizeHeroImageUrl(mobileImageUrlProp ?? (str(settings, 'mobileImageUrl') || null));

  const model = buildHeroBlockModel({
    settings,
    desktopImageUrl,
    mobileImageUrl,
    themePrimary,
    resolveHref,
    previewViewport,
  });
  const { content, visual, height } = model;

  const hasImage = !!(visual.desktopImageLayerStyle || visual.mobileImageLayerStyle);
  const viewVariant = hasImage ? 'hero-block-view--has-image' : 'hero-block-view--no-image';

  const renderImageLayers = () => {
    if (previewViewport || !visual.useResponsiveImages) {
      const layer = visual.desktopImageLayerStyle;
      if (!layer) return null;
      return <div className="absolute inset-0 z-0" style={layer} aria-hidden />;
    }
    return (
      <>
        {visual.desktopImageLayerStyle && (
          <div className="absolute inset-0 z-0 hidden md:block" style={visual.desktopImageLayerStyle} aria-hidden />
        )}
        {visual.mobileImageLayerStyle ? (
          <div className="absolute inset-0 z-0 md:hidden" style={visual.mobileImageLayerStyle} aria-hidden />
        ) : (
          visual.desktopImageLayerStyle && (
            <div className="absolute inset-0 z-0 md:hidden" style={visual.desktopImageLayerStyle} aria-hidden />
          )
        )}
      </>
    );
  };

  const shellClass =
    `${model.sectionShell} hero-block-view ${viewVariant} ${height.className} ${className}`.trim();

  return (
    <div className={shellClass} style={height.style}>
      {visual.baseStyle && <div className="absolute inset-0 z-0" style={visual.baseStyle} aria-hidden />}
      {!hasImage && (
        <>
          <div className="hero-block-deco hero-block-deco--orb-1" aria-hidden />
          <div className="hero-block-deco hero-block-deco--orb-2" aria-hidden />
          <div className="hero-block-deco hero-block-deco--grain" aria-hidden />
        </>
      )}
      {renderImageLayers()}
      {visual.showOverlay && visual.overlayStyle && (
        <div className="absolute inset-0 z-[1] pointer-events-none" style={visual.overlayStyle} aria-hidden />
      )}
      <div
        className={`hero-block-content relative z-[2] px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14 flex flex-col min-h-[inherit] ${content.placement.outer}`}
      >
        <div
          className={`${content.placement.inner} ${content.contentWidth.className} ${content.contentBoxClass}`}
          style={{ ...content.contentWidth.style, ...content.contentBoxStyle }}
        >
          <span className="hero-block-eyebrow">Yeni Koleksiyon</span>
          <h1 className={`tracking-tight ${content.titleWeightClass}`} style={content.titleStyle}>
            {content.title}
          </h1>
          {content.subtitle && (
            <p
              className={`hero-block-subtitle ${content.subtitleClass}`}
              style={content.subtitleStyle}
            >
              {content.subtitle}
            </p>
          )}
          {(content.primaryButton.show || content.secondaryButton.show) && (
            <div className={`mt-6 sm:mt-8 flex flex-wrap gap-3 ${content.buttonRowClass}`}>
              <HeroButton btn={content.primaryButton} preview={preview} />
              <HeroButton btn={content.secondaryButton} preview={preview} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
