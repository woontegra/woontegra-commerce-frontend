import { useState } from 'react';
import type { StorefrontSection } from '../../types/storefrontBuilder.types';
import { ColorField } from './builderSettingsUi';
import BuilderImageField from './BuilderImageField';
import HeroBlockView from './HeroBlockView';
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
  FieldHint,
  PlacementGrid,
  SegmentControl,
  SettingCard,
  SliderField,
  TextField,
  ToggleSwitch,
} from './heroBuilderControls';

const HERO_TABS = [
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
  const [activeTab, setActiveTab] = useState<HeroTabId>('layout');
  const s = section.settings;
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
  const heightPreset = resolveHeightPreset(s);
  const heightCustom = bool('heightCustomEnabled', false) || heightPreset === 'custom';
  const overlayPreset = (str('overlayPreset', 'none') || 'none') as HeroOverlayPreset;

  const setImageUrl = (url: string) => {
    if (url.trim()) {
      patch({ imageUrl: url, backgroundType: 'image', imageTone: 'original', overlayPreset: 'none', overlayEnabled: false });
    } else patch({ imageUrl: url });
  };

  const setPrimaryText = (v: string) => patch({ primaryButtonText: v, buttonText: v });
  const setPrimaryUrl = (v: string) => patch({ primaryButtonUrl: v, buttonUrl: v });

  const applyHeightPreset = (preset: HeroHeightPreset) => {
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
    patch({ contentPlacement: placement, ...legacy, alignment: legacy.contentAlign });
  };

  const setFocal = (point: HeroFocalPoint) => {
    patch({ imageFocalPoint: point, imagePosition: point });
  };

  const setOverlayPreset = (preset: HeroOverlayPreset) => {
    const opt = OVERLAY_PRESET_OPTIONS.find(o => o.id === preset);
    if (!opt) return;
    if (preset === 'none') {
      patch({ overlayPreset: preset, overlayEnabled: false, overlayOpacity: 0, imageTone: 'original' });
      return;
    }
    patch({
      overlayPreset: preset,
      overlayEnabled: true,
      overlayColor: opt.color,
      overlayOpacity: opt.opacity,
      imageTone: preset === 'custom' ? 'customOverlay' : str('imageTone', 'original'),
    });
  };

  const setImageTone = (tone: string) => {
    if (tone === 'original') {
      patch({ imageTone: tone, overlayPreset: 'none', overlayEnabled: false, overlayOpacity: 0 });
    } else if (tone === 'dimmed') {
      patch({ imageTone: tone, overlayPreset: 'softDark', overlayEnabled: true, overlayOpacity: 20, overlayColor: '#000000' });
    } else {
      patch({ imageTone: tone, overlayPreset: 'custom', overlayEnabled: true, overlayOpacity: num('overlayOpacity') || 30 });
    }
  };

  const layoutTab = (
    <div className="space-y-3">
      <SettingCard
        title="Hero yüksekliği"
        hint="Tam genişlik hero için 1920×700 veya 1920×800 WEBP önerilir."
      >
        <SegmentControl<HeroHeightPreset | 'fullscreen'>
          value={
            heightPreset === 'fullscreen'
              ? 'fullscreen'
              : heightCustom
                ? 'wide'
                : (heightPreset as HeroHeightPreset)
          }
          options={[
            ...Object.entries(HERO_HEIGHT_PRESETS).map(([id, p]) => ({ id: id as HeroHeightPreset, label: p.label })),
            { id: 'fullscreen' as const, label: 'Tam ekran' },
          ]}
          onChange={v => {
            if (v === 'custom') applyHeightPreset('custom');
            else applyHeightPreset(v);
          }}
          columns={2}
        />
        <ToggleSwitch
          label="Özel yükseklik kullan"
          checked={heightCustom}
          onChange={v => {
            if (v) patch({ heightCustomEnabled: true, heightPreset: 'custom' });
            else applyHeightPreset(heightPreset === 'custom' ? 'wide' : (heightPreset as HeroHeightPreset));
          }}
          hint="320–1000 px arası desktop, tablet ve mobil için ayrı değer girin."
        />
        {heightCustom && heightPreset !== 'fullscreen' && (
          <>
            <SliderField label="Desktop" value={num('heightDesktopPx', 700)} onChange={v => patch({ heightDesktopPx: v, heightPx: v })} min={320} max={1000} step={10} />
            <SliderField label="Tablet" value={num('heightTabletPx', 560)} onChange={v => set('heightTabletPx', v)} min={320} max={1000} step={10} />
            <SliderField label="Mobil" value={num('heightMobilePx', 460)} onChange={v => set('heightMobilePx', v)} min={320} max={1000} step={10} />
            <FieldHint>Mobilde çok yüksek hero kullanıcıyı ürünlerden uzaklaştırabilir.</FieldHint>
          </>
        )}
        {num('heightDesktopPx', 700) > 800 && (
          <FieldHint>800px üzeri yükseklikte ana ürünler aşağıda kalabilir.</FieldHint>
        )}
      </SettingCard>

      <SettingCard title="İçerik konumu" hint="Başlık ve butonların hero içindeki yerleşimi.">
        <PlacementGrid<HeroContentPlacement>
          value={(str('contentPlacement', 'center') || 'center') as HeroContentPlacement}
          points={PLACEMENT_GRID_POINTS}
          onChange={setPlacement}
        />
      </SettingCard>

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

  const visualTab = (
    <div className="space-y-3">
      <SettingCard title="Hero görseli" hint="Yükleme sonrası görsel orijinal tonunda başlar.">
        <BuilderImageField
          value={str('imageUrl')}
          onChange={setImageUrl}
          recommendedSize="1920×700 px · 1920×800 px WEBP"
          helperText="Tam genişlik hero için yüksek çözünürlüklü WEBP kullanın."
          usageHint="Mobilde odak noktasını merkezde tutmanız önerilir."
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
        <p className="text-[11px] font-medium text-slate-600 mb-1 mt-2">Netlik / ton</p>
        <SegmentControl
          value={str('imageTone', 'original')}
          options={[
            { id: 'original', label: 'Orijinal' },
            { id: 'dimmed', label: 'Hafif karart' },
            { id: 'customOverlay', label: 'Özel overlay' },
          ]}
          onChange={setImageTone}
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

  const contentTab = (
    <div className="space-y-3">
      <SettingCard title="Metinler">
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
          ]}
          onChange={v => set('secondaryButtonVariant', v)}
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

  const previewTab = (
    <SettingCard title="Hero önizleme" hint="Vitrin ile aynı render helper kullanılır.">
      <HeroBlockView settings={s} imageUrl={imageUrl} themePrimary={null} preview className="rounded-lg overflow-hidden border border-slate-200" />
    </SettingCard>
  );

  const tabPanels: Record<HeroTabId, React.ReactNode> = {
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
