import { describe, expect, it } from 'vitest';
import {
  featuredHeaderTextAlignClass,
  resolveFeaturedHeaderSettings,
} from './featuredProductsBlockHelpers';
import { headerLogoImageStyle } from './headerSettingsHelpers';

describe('headerSettingsHelpers', () => {
  it('maps logo slider values to inline image styles', () => {
    const style = headerLogoImageStyle({ logoWidthPx: 200, logoMaxHeightPx: 64 });
    expect(style.width).toBe('200px');
    expect(style.maxHeight).toBe('64px');
    expect(style.objectFit).toBe('contain');
  });
});

describe('featuredProductsBlockHelpers header', () => {
  it('resolves builder-managed section header fields', () => {
    const header = resolveFeaturedHeaderSettings({
      eyebrowText: 'Yeni Sezon',
      title: 'Vitrin Başlığı',
      description: 'Açıklama metni',
      headerAlign: 'center',
      showEyebrow: false,
      showDescription: true,
      showTitle: true,
      showViewAllLink: false,
    });

    expect(header.eyebrowText).toBe('Yeni Sezon');
    expect(header.title).toBe('Vitrin Başlığı');
    expect(header.description).toBe('Açıklama metni');
    expect(header.headerAlign).toBe('center');
    expect(header.showEyebrow).toBe(false);
    expect(header.showViewAll).toBe(false);
    expect(featuredHeaderTextAlignClass('center')).toContain('text-center');
  });
});
