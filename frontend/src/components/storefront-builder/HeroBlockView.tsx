import { resolveHeroMode } from '../../utils/heroSliderHelpers';
import type { HeroPreviewViewport } from '../../utils/heroBuilderConstants';
import HeroSlideFrame from './HeroSlideFrame';
import HeroSliderView from './HeroSliderView';

type HeroBlockViewProps = {
  settings: Record<string, unknown>;
  imageUrl?: string | null;
  mobileImageUrl?: string | null;
  themePrimary?: string | null;
  resolveHref?: (path: string) => string;
  preview?: boolean;
  previewViewport?: HeroPreviewViewport;
  previewActiveSlideId?: string | null;
  className?: string;
};

export default function HeroBlockView({
  settings,
  imageUrl,
  mobileImageUrl,
  themePrimary = null,
  resolveHref = p => p,
  preview = false,
  previewViewport,
  previewActiveSlideId,
  className = '',
}: HeroBlockViewProps) {
  const mode = resolveHeroMode(settings);

  if (mode === 'slider') {
    return (
      <HeroSliderView
        settings={settings}
        themePrimary={themePrimary}
        resolveHref={resolveHref}
        preview={preview}
        previewViewport={previewViewport}
        previewActiveSlideId={previewActiveSlideId}
        className={className}
      />
    );
  }

  return (
    <HeroSlideFrame
      settings={settings}
      imageUrl={imageUrl}
      mobileImageUrl={mobileImageUrl}
      themePrimary={themePrimary}
      resolveHref={resolveHref}
      preview={preview}
      previewViewport={previewViewport}
      className={className}
    />
  );
}
