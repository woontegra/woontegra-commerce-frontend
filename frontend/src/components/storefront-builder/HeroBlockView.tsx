import { Link } from 'react-router-dom';
import '../../styles/heroBlock.css';
import {
  buildHeroBlockModel,
  heroButtonClassName,
  heroButtonInlineStyle,
  type HeroButtonStyle,
} from '../../utils/heroBlockHelpers';
import type { HeroPreviewViewport } from '../../utils/heroBuilderConstants';

type HeroBlockViewProps = {
  settings: Record<string, unknown>;
  imageUrl: string | null;
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

export default function HeroBlockView({
  settings,
  imageUrl,
  themePrimary = null,
  resolveHref = p => p,
  preview = false,
  previewViewport,
  className = '',
}: HeroBlockViewProps) {
  const model = buildHeroBlockModel({
    settings,
    imageUrl,
    themePrimary,
    resolveHref,
    previewViewport,
  });
  const { content, visual, height } = model;

  return (
    <div
      className={`${model.sectionShell} ${height.className} ${className}`}
      style={height.style}
    >
      {visual.baseStyle && <div className="absolute inset-0" style={visual.baseStyle} aria-hidden />}
      {visual.imageLayerStyle && (
        <div className="absolute inset-0" style={visual.imageLayerStyle} aria-hidden />
      )}
      {visual.showOverlay && visual.overlayStyle && (
        <div className="absolute inset-0 pointer-events-none" style={visual.overlayStyle} aria-hidden />
      )}
      <div className={`relative px-4 sm:px-6 py-8 sm:py-12 flex flex-col min-h-[inherit] ${content.placement.outer}`}>
        <div
          className={`${content.placement.inner} ${content.contentWidth.className} ${content.contentBoxClass}`}
          style={{ ...content.contentWidth.style, ...content.contentBoxStyle }}
        >
          <h1 className={`tracking-tight ${content.titleWeightClass}`} style={content.titleStyle}>
            {content.title}
          </h1>
          {content.subtitle && (
            <p className={content.subtitleClass} style={content.subtitleStyle}>
              {content.subtitle}
            </p>
          )}
          {(content.primaryButton.show || content.secondaryButton.show) && (
            <div className={`mt-8 flex flex-wrap gap-3 ${content.buttonRowClass}`}>
              <HeroButton btn={content.primaryButton} preview={preview} />
              <HeroButton btn={content.secondaryButton} preview={preview} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
