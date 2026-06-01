import { describe, expect, it } from 'vitest';
import {
  copyHeroSlide,
  createSlideFromRootSettings,
  getSlidesForEditor,
  mergeHeroSliderSettings,
  newHeroSlide,
  resolveHeroMode,
  resolveHeroSlides,
  resolveSliderSettings,
  shouldRenderHeroSection,
  slideToHeroSettings,
  syncSlideToRoot,
} from './heroSliderHelpers';

describe('heroSliderHelpers', () => {
  it('defaults to single mode for legacy hero', () => {
    const settings = {
      title: 'Legacy',
      imageUrl: 'https://example.com/hero.jpg',
      buttonText: 'Shop',
    };
    expect(resolveHeroMode(settings)).toBe('single');
    expect(resolveHeroSlides(settings)).toHaveLength(1);
    expect(resolveHeroSlides(settings)[0].title).toBe('Legacy');
  });

  it('resolves slider slides from settings.slides', () => {
    const settings = {
      heroMode: 'slider',
      slides: [
        { id: 'a', title: 'A', imageUrl: 'https://example.com/a.jpg' },
        { id: 'b', title: 'B', imageUrl: 'https://example.com/b.jpg' },
        { id: 'c', title: 'C', imageUrl: 'https://example.com/c.jpg' },
      ],
    };
    expect(resolveHeroMode(settings)).toBe('slider');
    expect(resolveHeroSlides(settings)).toHaveLength(3);
  });

  it('merges slider defaults without breaking legacy fields', () => {
    const raw = { title: 'Old hero', imageUrl: 'https://example.com/old.jpg' };
    const merged = { ...raw };
    mergeHeroSliderSettings(raw, merged);
    expect(merged.heroMode).toBe('single');
    expect(Array.isArray(merged.slides)).toBe(true);
    expect(merged.sliderSettings).toMatchObject({ autoplay: true, showDots: true, showArrows: true });
  });

  it('maps slide fields into render settings', () => {
    const slide = newHeroSlide({
      id: 's1',
      title: 'Slide title',
      mobileImageUrl: 'https://example.com/mobile.jpg',
      primaryButtonText: 'CTA',
    });
    const mapped = slideToHeroSettings({ heightPreset: 'wide' }, slide);
    expect(mapped.title).toBe('Slide title');
    expect(mapped.mobileImageUrl).toBe('https://example.com/mobile.jpg');
    expect(mapped.primaryButtonText).toBe('CTA');
    expect(mapped.heightPreset).toBe('wide');
  });

  it('syncs active slide back to root for single mode', () => {
    const slide = createSlideFromRootSettings({
      title: 'Root',
      imageUrl: 'https://example.com/root.jpg',
      buttonText: 'Go',
    });
    const synced = syncSlideToRoot(slide);
    expect(synced.title).toBe('Root');
    expect(synced.imageUrl).toBe('https://example.com/root.jpg');
    expect(synced.buttonText).toBe('Go');
  });

  it('hides empty slider on storefront but keeps legacy fallback', () => {
    expect(shouldRenderHeroSection({ heroMode: 'slider', slides: [] })).toBe(false);
    expect(
      shouldRenderHeroSection({
        heroMode: 'slider',
        slides: [],
        imageUrl: 'https://example.com/legacy.jpg',
      }),
    ).toBe(true);
    expect(shouldRenderHeroSection({ heroMode: 'single', imageUrl: '' })).toBe(true);
  });

  it('clamps slider interval and copies slides with new ids', () => {
    const settings = {
      sliderSettings: { intervalMs: 1500, transition: 'slide' },
    };
    const slider = resolveSliderSettings(settings);
    expect(slider.intervalMs).toBe(3000);
    expect(slider.transition).toBe('slide');

    const original = newHeroSlide({ id: 'x', title: 'Copy me' });
    const copied = copyHeroSlide(original);
    expect(copied.id).not.toBe('x');
    expect(copied.title).toContain('Copy me');
  });

  it('seeds editor slides from root settings when slider mode has empty slides array', () => {
    const settings = {
      heroMode: 'slider',
      slides: [],
      title: 'Seed title',
      imageUrl: 'https://example.com/seed.jpg',
    };
    expect(getSlidesForEditor(settings)).toHaveLength(1);
    expect(getSlidesForEditor(settings)[0].title).toBe('Seed title');
  });
});
