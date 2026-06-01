import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HeroSlideFrame from './HeroSlideFrame';
import { heroHeightStyle } from '../../utils/heroBlockHelpers';
import {
  resolveHeroSlides,
  resolveSliderSettings,
  slideToHeroSettings,
  type HeroSlide,
} from '../../utils/heroSliderHelpers';
import type { HeroPreviewViewport } from '../../utils/heroBuilderConstants';

type HeroSliderViewProps = {
  settings: Record<string, unknown>;
  themePrimary?: string | null;
  resolveHref?: (path: string) => string;
  preview?: boolean;
  previewViewport?: HeroPreviewViewport;
  previewActiveSlideId?: string | null;
  className?: string;
};

function str(settings: Record<string, unknown>, key: string, fallback = ''): string {
  return String(settings[key] ?? fallback);
}

export default function HeroSliderView({
  settings,
  themePrimary = null,
  resolveHref = p => p,
  preview = false,
  previewViewport,
  previewActiveSlideId,
  className = '',
}: HeroSliderViewProps) {
  const slides = useMemo(() => resolveHeroSlides(settings), [settings]);
  const sliderSettings = useMemo(() => resolveSliderSettings(settings), [settings]);
  const height = heroHeightStyle(settings, previewViewport);
  const widthMode = str(settings, 'widthMode', 'full');

  const initialIndex = useMemo(() => {
    const targetId = previewActiveSlideId || str(settings, 'activeSlideId');
    if (targetId) {
      const idx = slides.findIndex(s => s.id === targetId);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [slides, previewActiveSlideId, settings]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  const goTo = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      const next = ((index % slides.length) + slides.length) % slides.length;
      setActiveIndex(next);
    },
    [slides.length],
  );

  useEffect(() => {
    if (preview || !sliderSettings.autoplay || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex(i => (i + 1) % slides.length);
    }, sliderSettings.intervalMs);
    return () => window.clearInterval(timer);
  }, [preview, sliderSettings.autoplay, sliderSettings.intervalMs, slides.length]);

  if (slides.length === 0) {
    if (preview) {
      return (
        <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/80 px-4 py-8 text-center text-sm text-amber-800">
          Slider için en az bir slide ekleyin.
        </div>
      );
    }
    return null;
  }

  const shellClass = [
    widthMode === 'full'
      ? 'hero-slider relative overflow-hidden w-full'
      : 'hero-slider relative overflow-hidden rounded-2xl w-full',
    height.className,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const renderSlide = (slide: HeroSlide, index: number) => {
    const slideSettings = slideToHeroSettings(settings, slide);
    const isActive = index === activeIndex;
    return (
      <div
        key={slide.id}
        className={`hero-slider-slide hero-slider-slide--${sliderSettings.transition}${isActive ? ' is-active' : ''}`}
        aria-hidden={!isActive}
      >
        <HeroSlideFrame
          settings={slideSettings}
          themePrimary={themePrimary}
          resolveHref={resolveHref}
          preview={preview}
          previewViewport={previewViewport}
          absoluteFill
        />
      </div>
    );
  };

  return (
    <div className={shellClass} style={height.style}>
      <div className="hero-slider-track relative w-full min-h-[inherit]">
        {slides.map(renderSlide)}
      </div>

      {sliderSettings.showArrows && slides.length > 1 && (
        <>
          <button
            type="button"
            className="hero-slider-arrow hero-slider-arrow--prev"
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Önceki slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="hero-slider-arrow hero-slider-arrow--next"
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Sonraki slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {sliderSettings.showDots && slides.length > 1 && (
        <div className="hero-slider-dots" role="tablist" aria-label="Hero slaytları">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Slide ${i + 1}`}
              className={`hero-slider-dot${i === activeIndex ? ' is-active' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
