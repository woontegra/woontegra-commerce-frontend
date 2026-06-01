import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import {
  buildHeroBlockModel,
  heroButtonClassName,
  heroButtonInlineStyle,
  normalizeHeroImageUrl,
  type HeroButtonStyle,
} from '../../utils/heroBlockHelpers';
import { shouldUseLightHeroFallback } from '../../utils/storefrontImageLayout';
import type { HeroPreviewViewport } from '../../utils/heroBuilderConstants';

type HeroSlideFrameProps = {
  settings: Record<string, unknown>;
  imageUrl?: string | null;
  mobileImageUrl?: string | null;
  themePrimary?: string | null;
  resolveHref?: (path: string) => string;
  preview?: boolean;
  previewViewport?: HeroPreviewViewport;
  className?: string;
  absoluteFill?: boolean;
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

function withLightHeroText(style: CSSProperties, light: boolean, fallback: string): CSSProperties {
  if (!light) return style;
  const c = String(style.color ?? '').trim().toLowerCase();
  if (!c || c === '#ffffff' || c === '#fff' || c === 'white' || c === 'rgb(255, 255, 255)') {
    return { ...style, color: fallback };
  }
  return style;
}

export default function HeroSlideFrame({
  settings,
  imageUrl: imageUrlProp,
  mobileImageUrl: mobileImageUrlProp,
  themePrimary = null,
  resolveHref = p => p,
  preview = false,
  previewViewport,
  className = '',
  absoluteFill = false,
}: HeroSlideFrameProps) {
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
  const lightFallback = shouldUseLightHeroFallback(settings, desktopImageUrl || mobileImageUrl);
  const overlayActive = visual.showOverlay && !!visual.overlayStyle;
  const viewVariant = hasImage
    ? `hero-block-view--has-image hero-block-view--editorial${overlayActive ? ' hero-block-view--overlay' : ''}`
    : `hero-block-view--no-image${lightFallback ? ' hero-block-view--light' : ''}`;

  const titleStyle = withLightHeroText(content.titleStyle, lightFallback && !hasImage, '#1c1917');
  const subtitleStyle = withLightHeroText(content.subtitleStyle, lightFallback && !hasImage, '#57534e');
  const eyebrow = str(settings, 'eyebrowText');

  const renderImageLayers = () => {
    if (previewViewport || !visual.useResponsiveImages) {
      const layer = visual.desktopImageLayerStyle;
      if (!layer) return null;
      return <div className="absolute inset-0 z-0 hero-block-image-layer" style={layer} aria-hidden />;
    }
    return (
      <>
        {visual.desktopImageLayerStyle && (
          <div className="absolute inset-0 z-0 hidden md:block hero-block-image-layer" style={visual.desktopImageLayerStyle} aria-hidden />
        )}
        {visual.mobileImageLayerStyle ? (
          <div className="absolute inset-0 z-0 md:hidden hero-block-image-layer" style={visual.mobileImageLayerStyle} aria-hidden />
        ) : (
          visual.desktopImageLayerStyle && (
            <div className="absolute inset-0 z-0 md:hidden hero-block-image-layer" style={visual.desktopImageLayerStyle} aria-hidden />
          )
        )}
      </>
    );
  };

  const shellClass = [
    absoluteFill ? 'absolute inset-0' : model.sectionShell,
    'hero-block-view',
    viewVariant,
    height.className,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass} style={height.style}>
      {lightFallback && !hasImage && <div className="hero-block-fallback-bg" aria-hidden />}
      {visual.baseStyle && !hasImage && (
        <div className="absolute inset-0 z-0" style={visual.baseStyle} aria-hidden />
      )}
      {!hasImage && (
        <>
          <div className="hero-block-deco hero-block-deco--orb-1" aria-hidden />
          <div className="hero-block-deco hero-block-deco--orb-2" aria-hidden />
          <div className="hero-block-deco hero-block-deco--grain" aria-hidden />
        </>
      )}
      {renderImageLayers()}
      {overlayActive && visual.overlayStyle && (
        <div className="absolute inset-0 z-[1] pointer-events-none" style={visual.overlayStyle} aria-hidden />
      )}
      <div
        className={`hero-block-content relative z-[2] px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14 flex flex-col min-h-[inherit] ${content.placement.outer}`}
      >
        <div
          className={`${content.placement.inner} ${content.contentWidth.className} ${content.contentBoxClass}`}
          style={{ ...content.contentWidth.style, ...content.contentBoxStyle }}
        >
          {eyebrow && <span className="hero-block-eyebrow">{eyebrow}</span>}
          <h1 className={`tracking-tight ${content.titleWeightClass}`} style={titleStyle}>
            {content.title}
          </h1>
          {content.subtitle && (
            <p className={`hero-block-subtitle ${content.subtitleClass}`} style={subtitleStyle}>
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
