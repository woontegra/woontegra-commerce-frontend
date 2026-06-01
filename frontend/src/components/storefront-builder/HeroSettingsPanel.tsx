import { useMemo, useState } from 'react';
import type { StorefrontSection } from '../../types/storefrontBuilder.types';
import { ColorField } from './builderSettingsUi';
import BuilderImageField from './BuilderImageField';
import HeroBlockView from './HeroBlockView';
import HeroSlidesEditor from './HeroSlidesEditor';
import { normalizeImageUrl } from '../../utils/imageUtils';
import {
  FOCAL_GRID_POINTS,
  HERO_HEIGHT_PRESETS,
  OVERLAY_PRESET_OPTIONS,
  PLACEMENT_GRID_POINTS,
  type HeroContentPlacement,
  type HeroFocalPoint,
  type HeroHeightPreset,
  type HeroOverlayPreset,
} from '../../utils/heroBuilderConstants';
import { placementToLegacyAlign, resolveHeightPreset } from '../../utils/heroBlockHelpers';
import {
  getSlidesForEditor,
  heroSlidesToJson,
  resolveHeroMode,
  type HeroSlide,
} from '../../utils/heroSliderHelpers';
import {
  FieldHint,
  PlacementGrid,
  SegmentControl,
  SettingCard,
  SliderField,
  TextField,
  ToggleSwitch,
} from './heroBuilderControls';

const HERO_TABS = [
  { id: 'mod', label: 'Mod' },
  { id: 'content', label: 'İçerik' },
  { id: 'visual', label: 'Görsel' },
  { id: 'layout', label: 'Yerleşim' },
  { id: 'style', label: 'Stil' },
  { id: 'preview', label: 'Önizleme' },
] as const;

type HeroTabId = (typeof HERO_TABS)[number]['id'];

type HeroSettingsPanelProps = {
  section: StorefrontSection;
  onChange: (patch: Record<string, unknown>) => void;
  tabbed?: boolean;
};

export default function HeroSettingsPanel({ section, onChange, tabbed = false }: HeroSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<HeroTabId>('mod');
  const s = section.settings;
  const isSlider = resolveHeroMode(s) === 'slider';
  const slides = useMemo(() => getSlidesForEditor(s), [s]);
  const activeSlideId = String(s.activeSlideId ?? slides[0]?.id ?? '');
  const activeSlide = slides.find(sl => sl.id === activeSlideId) ?? slides[0] ?? null;
  const patch = (values: Record<string, unknown>) => onChange(values);
  const set = (key: string, value: unknown) => onChange({ [key]: value });
  const str = (key: string, fallback = '') => String(s[key] ?? fallback);
  const num = (key: string, fallback = 0) => {
    const v = s[key];
    return typeof v === 'number' ? v : Number(v) || fallback;
  };
  const bool = (key: string, fallback = false) => {
    const v = s[key];
    return v === undefined ? fallback : Boolean(v);
  };

  const primaryText = str('primaryButtonText') || str('buttonText');
  const primaryUrl = str('primaryButtonUrl') || str('buttonUrl', '/store/urunler');
  const imageUrl = normalizeImageUrl(str('imageUrl')) || null;
  const mobileImageUrl = normalizeImageUrl(str('mobileImageUrl')) || null;
  const heightPreset = resolveHeightPreset(s);
  const heightSegmentValue: HeroHeightPreset | 'fullscreen' =
    heightPreset === 'fullscreen'
      ? 'fullscreen'
      : bool('heightCustomEnabled', false) || heightPreset === 'custom'
        ? 'custom'
        : (heightPreset as HeroHeightPreset);
  const heightCustom = heightSegmentValue === 'custom';
  const overlayPreset = (str('overlayPreset', 'none') || 'none') as HeroOverlayPreset;
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');

  const setImageUrl = (url: string) => {
    if (url.trim()) {
      patch({ imageUrl: url, backgroundType: 'image', imageTone: 'original', overlayPreset: 'none', overlayEnabled: false });
    } else patch({ imageUrl: url });
  };

  const setMobileImageUrl = (url: string) => {
    patch({ mobileImageUrl: url });
  };

  const updateActiveSlide = (patchSlide: Partial<HeroSlide>) => {
    if (!activeSlide) return;
    const next = slides.map(sl => (sl.id === activeSlide.id ? { ...sl, ...patchSlide } : sl));
    onChange({ slides: heroSlidesToJson(next), activeSlideId: activeSlide.id });
  };

  const slideImageUrl = activeSlide ? normalizeImageUrl(activeSlide.imageUrl) || null : null;
  const slideMobileImageUrl = activeSlide ? normalizeImageUrl(activeSlide.mobileImageUrl) || null : null;

  const setPrimaryText = (v: string) => patch({ primaryButtonText: v, buttonText: v });
  const setPrimaryUrl = (v: string) => patch({ primaryButtonUrl: v, buttonUrl: v });

  const applyHeightPreset = (preset: HeroHeightPreset | 'fullscreen' | 'custom') => {
    if (preset === 'custom') {
      patch({ heightPreset: 'custom', heightCustomEnabled: true });
      return;
    }
    if (preset === 'fullscreen') {
      patch({ heightPreset: 'fullscreen', heightCustomEnabled: false, heightMode: 'fullscreen', height: 'fullscreen' });
      return;
    }
    const p = HERO_HEIGHT_PRESETS[preset as keyof typeof HERO_HEIGHT_PRESETS];
    patch({
      heightPreset: preset,
      heightCustomEnabled: false,
      heightDesktopPx: p.desktop,
      heightTabletPx: p.tablet,
      heightMobilePx: p.mobile,
      heightPx: p.desktop,
      heightMode: preset,
      height: preset,
    });
  };

  const setPlacement = (placement: HeroContentPlacement) => {
    const legacy = placementToLegacyAlign(placement);
    if (isSlider && activeSlide) {
      updateActiveSlide({ contentPlacement: placement });
      return;
    }
    patch({ contentPlacement: placement, ...legacy, alignment: legacy.contentAlign });
  };

  const setFocal = (point: HeroFocalPoint) => {
    if (isSlider && activeSlide) {
      updateActiveSlide({ imageFocalPoint: point });
      return;
    }
    patch({ imageFocalPoint: point, imagePosition: point });
  };

  const setOverlayPreset = (preset: HeroOverlayPreset) => {
    const opt = OVERLAY_PRESET_OPTIONS.find(o => o.id === preset);
    if (!opt) return;
    const apply = (values: Record<string, unknown>) => {
      if (isSlider && activeSlide) {
        updateActiveSlide(values as Partial<HeroSlide>);
        return;
      }
      patch(values);
    };
    if (preset === 'none') {
      apply({ overlayPreset: preset, overlayEnabled: false, overlayOpacity: 0, imageTone: 'original' });
      return;
    }
    apply({
      overlayPreset: preset,
      overlayEnabled: true,
      overlayColor: opt.color,
      overlayOpacity: opt.opacity,
      imageTone: 'original',
    });
  };

  const setCustomHeight = (key: 'heightDesktopPx' | 'heightTabletPx' | 'heightMobilePx', value: number) => {
    patch({
      [key]: value,
      heightPreset: 'custom',
      heightCustomEnabled: true,
      ...(key === 'heightDesktopPx' ? { heightPx: value } : {}),
    });
  };

  const layoutTab = (
    <div className="space-y-3">
      <SettingCard
        title="Hero yüksekliği"
        hint="Tam genişlik hero için 1920×700 veya 1920×800 WEBP önerilir."
      >
        <SegmentControl<HeroHeightPreset | 'fullscreen' | 'custom'>
          value={heightSegmentValue}
          options={[
            ...Object.entries(HERO_HEIGHT_PRESETS).map(([id, p]) => ({
              id: id as HeroHeightPreset,
              label: `${p.label} · ${p.desktop}px`,
            })),
            { id: 'fullscreen' as const, label: 'Tam ekran' },
            { id: 'custom' as const, label: 'Özel px' },
          ]}
          onChange={v => applyHeightPreset(v)}
          columns={2}
        />
        {heightCustom && heightPreset !== 'fullscreen' && (
          <>
            <SliderField label="Desktop" value={num('heightDesktopPx', 700)} onChange={v => setCustomHeight('heightDesktopPx', v)} min={320} max={1000} step={10} />
            <SliderField label="Tablet" value={num('heightTabletPx', 560)} onChange={v => setCustomHeight('heightTabletPx', v)} min={320} max={1000} step={10} />
            <SliderField label="Mobil" value={num('heightMobilePx', 460)} onChange={v => setCustomHeight('heightMobilePx', v)} min={320} max={1000} step={10} />
            <FieldHint>Mobilde çok yüksek hero kullanıcıyı ürünlerden uzaklaştırabilir.</FieldHint>
          </>
        )}
        {num('heightDesktopPx', 700) > 800 && (
          <FieldHint>800px üzeri yükseklikte ana ürünler aşağıda kalabilir.</FieldHint>
        )}
      </SettingCard>

      {isSlider && activeSlide && (
        <SettingCard title="Aktif slide içerik konumu" hint="Seçili slide için başlık ve buton yerleşimi.">
          <PlacementGrid<HeroContentPlacement>
            value={(activeSlide.contentPlacement || 'center') as HeroContentPlacement}
            points={PLACEMENT_GRID_POINTS}
            onChange={setPlacement}
          />
        </SettingCard>
      )}

      {!isSlider && (
        <SettingCard title="İçerik konumu" hint="Başlık ve butonların hero içindeki yerleşimi.">
          <PlacementGrid<HeroContentPlacement>
            value={(str('contentPlacement', 'center') || 'center') as HeroContentPlacement}
            points={PLACEMENT_GRID_POINTS}
            onChange={setPlacement}
          />
        </SettingCard>
      )}

      <SettingCard title="Genişlik & kutu">
        <SegmentControl
          value={str('contentWidthPreset', str('contentWidth', 'medium'))}
          options={[
            { id: 'narrow', label: 'Dar' },
            { id: 'medium', label: 'Orta' },
            { id: 'wide', label: 'Geniş' },
            { id: 'full', label: 'Tam' },
            { id: 'custom', label: 'Özel' },
          ]}
          onChange={v => set('contentWidthPreset', v)}
          columns={3}
        />
        {str('contentWidthPreset') === 'custom' && (
          <SliderField
            label="Maks. genişlik"
            value={num('contentMaxWidthPx', 720)}
            onChange={v => set('contentMaxWidthPx', v)}
            min={280}
            max={1200}
            step={10}
          />
        )}
        <SegmentControl
          value={str('widthMode', 'full')}
          options={[
            { id: 'full', label: 'Tam genişlik' },
            { id: 'container', label: 'Container' },
            { id: 'narrow', label: 'Dar' },
          ]}
          onChange={v => set('widthMode', v)}
        />
        <ToggleSwitch
          label="İçerik kutusu arka planı"
          checked={bool('contentBoxEnabled', false)}
          onChange={v => set('contentBoxEnabled', v)}
        />
        {bool('contentBoxEnabled', false) && (
          <>
            <SegmentControl
              value={str('contentBoxStyle', 'solid')}
              options={[
                { id: 'solid', label: 'Yarı saydam' },
                { id: 'glass', label: 'Blur' },
              ]}
              onChange={v => set('contentBoxStyle', v)}
            />
            <ColorField label="Kutu rengi" value={str('contentBoxColor', '#000000')} onChange={v => set('contentBoxColor', v)} />
            <SliderField label="Kutu opaklığı" value={num('contentBoxOpacity', 40)} onChange={v => set('contentBoxOpacity', v)} min={0} max={100} step={5} unit="%" />
          </>
        )}
      </SettingCard>
    </div>
  );

  const visualTab = isSlider ? (
    <div className="space-y-3">
      {!activeSlide ? (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Slider için en az bir slide ekleyin.
        </p>
      ) : (
        <>
          <SettingCard title={`Slide görseli · ${activeSlide.title?.trim() || 'Başlıksız'}`}>
            <BuilderImageField
              value={activeSlide.imageUrl}
              onChange={url => {
                if (url.trim()) {
                  updateActiveSlide({
                    imageUrl: url,
                    imageTone: 'original',
                    overlayPreset: 'none',
                    overlayEnabled: false,
                  });
                } else {
                  updateActiveSlide({ imageUrl: url });
                }
              }}
              recommendedSize="1920×700 px · 1920×800 px · WEBP, JPG, PNG"
              helperText="Masaüstü ve tablet ekranlarda kullanılır."
              folder="banners"
            />
            <BuilderImageField
              value={activeSlide.mobileImageUrl}
              onChange={url => updateActiveSlide({ mobileImageUrl: url })}
              recommendedSize="1080×1350 px · 1080×1600 px · WEBP"
              helperText="Mobilde öncelikli kullanılır. Boşsa desktop görseli gösterilir."
              folder="banners"
            />
          </SettingCard>

          <SettingCard title="Görsel odak noktası">
            <PlacementGrid<HeroFocalPoint>
              value={(activeSlide.imageFocalPoint || 'center') as HeroFocalPoint}
              points={FOCAL_GRID_POINTS}
              onChange={setFocal}
            />
          </SettingCard>

          <SettingCard title="Overlay katmanı">
            <SegmentControl<HeroOverlayPreset>
              value={(activeSlide.overlayPreset || 'none') as HeroOverlayPreset}
              options={OVERLAY_PRESET_OPTIONS.map(o => ({ id: o.id, label: o.label }))}
              onChange={setOverlayPreset}
              columns={2}
            />
            {(activeSlide.overlayPreset === 'custom' || activeSlide.overlayEnabled) &&
              activeSlide.overlayPreset !== 'none' && (
                <>
                  <ColorField
                    label="Overlay rengi"
                    value={activeSlide.overlayColor || '#000000'}
                    onChange={v => updateActiveSlide({ overlayColor: v })}
                  />
                  <SliderField
                    label="Yoğunluk"
                    value={activeSlide.overlayOpacity ?? 0}
                    onChange={v => updateActiveSlide({ overlayOpacity: v, overlayEnabled: v > 0 })}
                    min={0}
                    max={100}
                    step={5}
                    unit="%"
                  />
                </>
              )}
          </SettingCard>
        </>
      )}
    </div>
  ) : (
    <div className="space-y-3">
      <SettingCard title="Desktop banner görseli" hint="Masaüstü ve tablet ekranlarda kullanılır.">
        <BuilderImageField
          value={str('imageUrl')}
          onChange={setImageUrl}
          recommendedSize="1920×700 px · 1920×800 px · WEBP, JPG, PNG"
          helperText="Yatay banner için yüksek çözünürlüklü görsel yükleyin veya URL girin."
          usageHint="Tam genişlik hero için WEBP tercih edilir."
          folder="banners"
        />
      </SettingCard>

      <SettingCard title="Mobil banner görseli" hint="Mobil viewport’ta öncelikli kullanılır.">
        <BuilderImageField
          value={str('mobileImageUrl')}
          onChange={setMobileImageUrl}
          recommendedSize="1080×1350 px · 1080×1600 px · WEBP"
          helperText="Mobilde dikey görsel kullanmanız önerilir. Mobil görsel yüklenmezse desktop görseli kullanılacaktır."
          usageHint="Dikey kompozisyon (1080×1600) mobilde en iyi sonucu verir."
          folder="banners"
        />
      </SettingCard>

      <SettingCard title="Görsel odak noktası" hint="Görselin hangi bölgesinin hero alanında öne çıkacağını seçin.">
        <PlacementGrid<HeroFocalPoint>
          value={(str('imageFocalPoint', str('imagePosition', 'center')) || 'center') as HeroFocalPoint}
          points={FOCAL_GRID_POINTS}
          onChange={setFocal}
        />
      </SettingCard>

      <SettingCard title="Görsel davranışı">
        <p className="text-[11px] font-medium text-slate-600 mb-1">Kaplama</p>
        <SegmentControl
          value={str('imageFit', 'cover')}
          options={[
            { id: 'cover', label: 'Kapla' },
            { id: 'contain', label: 'Sığdır' },
          ]}
          onChange={v => set('imageFit', v)}
        />
        {!str('imageUrl') && (
          <>
            <SegmentControl
              value={str('backgroundType', 'gradient')}
              options={[
                { id: 'gradient', label: 'Gradient' },
                { id: 'solid', label: 'Düz renk' },
              ]}
              onChange={v => set('backgroundType', v)}
            />
            <ColorField label="Arka plan" value={str('backgroundColor', '#4f46e5')} onChange={v => set('backgroundColor', v)} />
          </>
        )}
      </SettingCard>

      <SettingCard title="Overlay katmanı" hint="Görselin üzerine renk katmanı — görsel opacity düşmez.">
        <SegmentControl<HeroOverlayPreset>
          value={overlayPreset}
          options={OVERLAY_PRESET_OPTIONS.map(o => ({ id: o.id, label: o.label }))}
          onChange={setOverlayPreset}
          columns={2}
        />
        {(overlayPreset === 'custom' || bool('overlayEnabled', false)) && overlayPreset !== 'none' && (
          <>
            <ColorField label="Overlay rengi" value={str('overlayColor', '#000000')} onChange={v => set('overlayColor', v)} />
            <SliderField
              label="Yoğunluk"
              value={num('overlayOpacity', 0)}
              onChange={v => patch({ overlayOpacity: v, overlayEnabled: v > 0 })}
              min={0}
              max={100}
              step={5}
              unit="%"
            />
          </>
        )}
      </SettingCard>
    </div>
  );

  const contentTab = isSlider ? (
    <div className="space-y-3">
      {!activeSlide ? (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Slider için en az bir slide ekleyin.
        </p>
      ) : (
        <>
          <SettingCard title={`Slide metinleri · ${activeSlide.title?.trim() || 'Başlıksız'}`}>
            <TextField
              label="Üst etiket"
              value={activeSlide.eyebrowText}
              onChange={v => updateActiveSlide({ eyebrowText: v })}
            />
            <TextField label="Başlık" value={activeSlide.title} onChange={v => updateActiveSlide({ title: v })} />
            <TextField
              label="Alt başlık"
              value={activeSlide.subtitle}
              onChange={v => updateActiveSlide({ subtitle: v })}
            />
          </SettingCard>

          <SettingCard title="Ana buton (CTA)">
            <ToggleSwitch
              label="Göster"
              checked={activeSlide.primaryButtonEnabled}
              onChange={v => updateActiveSlide({ primaryButtonEnabled: v })}
            />
            {activeSlide.primaryButtonEnabled && (
              <>
                <TextField
                  label="Metin"
                  value={activeSlide.primaryButtonText}
                  onChange={v => updateActiveSlide({ primaryButtonText: v })}
                />
                <TextField
                  label="URL"
                  value={activeSlide.primaryButtonUrl}
                  onChange={v => updateActiveSlide({ primaryButtonUrl: v })}
                  placeholder="/store/urunler"
                />
              </>
            )}
          </SettingCard>

          <SettingCard title="İkinci buton">
            <ToggleSwitch
              label="Göster"
              checked={activeSlide.secondaryButtonEnabled}
              onChange={v => updateActiveSlide({ secondaryButtonEnabled: v })}
            />
            {activeSlide.secondaryButtonEnabled && (
              <>
                <TextField
                  label="Metin"
                  value={activeSlide.secondaryButtonText}
                  onChange={v => updateActiveSlide({ secondaryButtonText: v })}
                />
                <TextField
                  label="URL"
                  value={activeSlide.secondaryButtonUrl}
                  onChange={v => updateActiveSlide({ secondaryButtonUrl: v })}
                />
              </>
            )}
          </SettingCard>
        </>
      )}
    </div>
  ) : (
    <div className="space-y-3">
      <SettingCard title="Metinler">
        <TextField label="Üst etiket" value={str('eyebrowText')} onChange={v => set('eyebrowText', v)} />
        <TextField label="Başlık" value={str('title')} onChange={v => set('title', v)} />
        <TextField label="Alt başlık" value={str('subtitle')} onChange={v => set('subtitle', v)} />
      </SettingCard>

      <SettingCard title="Ana buton (CTA)">
        <ToggleSwitch label="Göster" checked={bool('primaryButtonEnabled', true)} onChange={v => set('primaryButtonEnabled', v)} />
        {bool('primaryButtonEnabled', true) && (
          <>
            <TextField label="Metin" value={primaryText} onChange={setPrimaryText} />
            <TextField label="URL" value={primaryUrl} onChange={setPrimaryUrl} placeholder="/store/urunler" />
          </>
        )}
      </SettingCard>

      <SettingCard title="İkinci buton">
        <ToggleSwitch label="Göster" checked={bool('secondaryButtonEnabled', false)} onChange={v => set('secondaryButtonEnabled', v)} />
        {bool('secondaryButtonEnabled', false) && (
          <>
            <TextField label="Metin" value={str('secondaryButtonText')} onChange={v => set('secondaryButtonText', v)} />
            <TextField label="URL" value={str('secondaryButtonUrl')} onChange={v => set('secondaryButtonUrl', v)} />
          </>
        )}
      </SettingCard>
    </div>
  );

  const styleTab = (
    <div className="space-y-3">
      <SettingCard title="Başlık stili">
        <ColorField label="Renk" value={str('titleColor', str('textColor', '#ffffff'))} onChange={v => set('titleColor', v)} />
        <SegmentControl
          value={str('titleSizePreset', str('titleSize', 'md'))}
          options={[
            { id: 'sm', label: 'Küçük' },
            { id: 'md', label: 'Orta' },
            { id: 'lg', label: 'Büyük' },
            { id: 'hero', label: 'Vurucu' },
            { id: 'custom', label: 'Özel px' },
          ]}
          onChange={v => set('titleSizePreset', v)}
          columns={3}
        />
        {str('titleSizePreset') === 'custom' && (
          <SliderField label="Font boyutu" value={num('titleFontSizePx', 36)} onChange={v => set('titleFontSizePx', v)} min={16} max={96} step={1} />
        )}
        <SegmentControl
          value={str('titleWeight', 'bold')}
          options={[
            { id: 'normal', label: 'Normal' },
            { id: 'semibold', label: 'Yarı kalın' },
            { id: 'bold', label: 'Kalın' },
          ]}
          onChange={v => set('titleWeight', v)}
        />
        <SliderField label="Satır yüksekliği" value={num('titleLineHeight', 1.15)} onChange={v => set('titleLineHeight', v)} min={1} max={2} step={0.05} unit="" />
        <SliderField label="Harf aralığı" value={num('titleLetterSpacing', 0)} onChange={v => set('titleLetterSpacing', v)} min={-2} max={8} step={0.5} unit="px" />
      </SettingCard>

      <SettingCard title="Alt başlık stili">
        <ColorField label="Renk" value={str('subtitleColor', str('textColor', '#ffffff'))} onChange={v => set('subtitleColor', v)} />
        <SegmentControl
          value={str('subtitleSizePreset', str('subtitleSize', 'md'))}
          options={[
            { id: 'sm', label: 'Küçük' },
            { id: 'md', label: 'Orta' },
            { id: 'lg', label: 'Büyük' },
            { id: 'custom', label: 'Özel px' },
          ]}
          onChange={v => set('subtitleSizePreset', v)}
        />
        {str('subtitleSizePreset') === 'custom' && (
          <SliderField label="Font boyutu" value={num('subtitleFontSizePx', 16)} onChange={v => set('subtitleFontSizePx', v)} min={12} max={48} step={1} />
        )}
      </SettingCard>

      <SettingCard title="Ana buton stili">
        <SegmentControl
          value={str('primaryButtonVariant', 'solid')}
          options={[
            { id: 'solid', label: 'Dolu' },
            { id: 'outline', label: 'Çerçeveli' },
            { id: 'minimal', label: 'Minimal' },
            { id: 'link', label: 'Link' },
          ]}
          onChange={v => set('primaryButtonVariant', v)}
          columns={2}
        />
        <SegmentControl
          value={str('primaryButtonSize', 'md')}
          options={[
            { id: 'sm', label: 'Küçük' },
            { id: 'md', label: 'Orta' },
            { id: 'lg', label: 'Büyük' },
          ]}
          onChange={v => set('primaryButtonSize', v)}
        />
        <SegmentControl
          value={str('primaryButtonRadius', 'soft')}
          options={[
            { id: 'sharp', label: 'Keskin' },
            { id: 'soft', label: 'Yumuşak' },
            { id: 'pill', label: 'Yuvarlak' },
          ]}
          onChange={v => set('primaryButtonRadius', v)}
        />
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Arka plan" value={str('primaryButtonBgColor', '#ffffff')} onChange={v => set('primaryButtonBgColor', v)} />
          <ColorField label="Yazı" value={str('primaryButtonTextColor', '#4f46e5')} onChange={v => set('primaryButtonTextColor', v)} />
        </div>
      </SettingCard>

      <SettingCard title="İkinci buton stili">
        <SegmentControl
          value={str('secondaryButtonVariant', 'outline')}
          options={[
            { id: 'solid', label: 'Dolu' },
            { id: 'outline', label: 'Çerçeveli' },
            { id: 'minimal', label: 'Minimal' },
            { id: 'link', label: 'Link' },
          ]}
          onChange={v => set('secondaryButtonVariant', v)}
          columns={2}
        />
        <SegmentControl
          value={str('secondaryButtonSize', 'md')}
          options={[
            { id: 'sm', label: 'Küçük' },
            { id: 'md', label: 'Orta' },
            { id: 'lg', label: 'Büyük' },
          ]}
          onChange={v => set('secondaryButtonSize', v)}
        />
        <SegmentControl
          value={str('secondaryButtonRadius', 'soft')}
          options={[
            { id: 'sharp', label: 'Keskin' },
            { id: 'soft', label: 'Yumuşak' },
            { id: 'pill', label: 'Yuvarlak' },
          ]}
          onChange={v => set('secondaryButtonRadius', v)}
        />
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Arka plan" value={str('secondaryButtonBgColor', 'transparent')} onChange={v => set('secondaryButtonBgColor', v)} />
          <ColorField label="Yazı" value={str('secondaryButtonTextColor', '#ffffff')} onChange={v => set('secondaryButtonTextColor', v)} />
        </div>
      </SettingCard>

      <SettingCard title="Buton hizası">
        <SegmentControl
          value={str('buttonGroupAlign', 'center')}
          options={[
            { id: 'left', label: 'Sol' },
            { id: 'center', label: 'Orta' },
            { id: 'right', label: 'Sağ' },
          ]}
          onChange={v => set('buttonGroupAlign', v)}
        />
      </SettingCard>
    </div>
  );

  const modTab = <HeroSlidesEditor settings={s} onChange={onChange} />;

  const previewTab = (
    <SettingCard title="Hero önizleme" hint="Vitrin ile aynı render helper kullanılır.">
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 w-fit mb-3">
        {(['desktop', 'mobile'] as const).map(vp => (
          <button
            key={vp}
            type="button"
            onClick={() => setPreviewViewport(vp)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              previewViewport === vp ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {vp === 'desktop' ? 'Desktop' : 'Mobil'}
          </button>
        ))}
      </div>
      <HeroBlockView
        settings={s}
        imageUrl={isSlider ? slideImageUrl : imageUrl}
        mobileImageUrl={isSlider ? slideMobileImageUrl : mobileImageUrl}
        themePrimary={null}
        preview
        previewViewport={previewViewport}
        previewActiveSlideId={activeSlideId || null}
        className="rounded-lg overflow-hidden border border-slate-200"
      />
    </SettingCard>
  );

  const tabPanels: Record<HeroTabId, React.ReactNode> = {
    mod: modTab,
    content: contentTab,
    visual: visualTab,
    layout: layoutTab,
    style: styleTab,
    preview: previewTab,
  };

  if (!tabbed) {
    return <div className="space-y-3">{Object.values(tabPanels)}</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 sticky top-0 z-10 bg-white border-b border-slate-200 px-2 pt-2">
        <div className="flex gap-0.5 overflow-x-auto pb-2">
          {HERO_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">{tabPanels[activeTab]}</div>
    </div>
  );
}
