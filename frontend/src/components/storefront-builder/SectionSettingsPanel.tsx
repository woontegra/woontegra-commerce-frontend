import { Plus, Trash2 } from 'lucide-react';
import type { StorefrontSection } from '../../types/storefrontBuilder.types';
import {
  BLOCK_DESCRIPTIONS,
  parseTrustBadges,
  serializeTrustBadges,
  type TrustBadgeItem,
} from '../../pages/storefrontBuilderHelpers';
import { ColorField, inputCls } from './builderSettingsUi';
import HeroSettingsPanel from './HeroSettingsPanel';
import BuilderImageField from './BuilderImageField';

const labelCls = 'block text-[12px] font-medium text-slate-600 mb-1';

function BlockHint({ type }: { type: string }) {
  const text = BLOCK_DESCRIPTIONS[type];
  if (!text) return null;
  return (
    <p className="text-[11px] text-slate-500 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
      {text}
    </p>
  );
}

function NextPhaseOption({ label }: { label: string }) {
  return (
    <option value="" disabled>
      {label} (Sonraki faz)
    </option>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      className={inputCls}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min = 1,
  max = 48,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      className={inputCls}
      value={value}
      min={min}
      max={max}
      onChange={e => onChange(Number(e.target.value) || min)}
    />
  );
}

function TextArea({
  value,
  onChange,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      className={`${inputCls} resize-y min-h-[80px]`}
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  );
}

function ImageFitField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Görsel görünümü">
      <select className={inputCls} value={value || 'cover'} onChange={e => onChange(e.target.value)}>
        <option value="cover">Kapla</option>
        <option value="contain">Sığdır</option>
      </select>
    </Field>
  );
}

function ImagePositionField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Görsel pozisyonu">
      <select className={inputCls} value={value || 'center'} onChange={e => onChange(e.target.value)}>
        <option value="center">Orta</option>
        <option value="top">Üst</option>
        <option value="bottom">Alt</option>
        <option value="left">Sol</option>
        <option value="right">Sağ</option>
      </select>
    </Field>
  );
}

function OverlayOpacityField({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={`Overlay yoğunluğu (${value}%)`}>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </Field>
  );
}

function HeroHeightField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Hero yüksekliği">
      <select className={inputCls} value={value || 'large'} onChange={e => onChange(e.target.value)}>
        <option value="small">Kompakt</option>
        <option value="medium">Standart</option>
        <option value="large">Geniş</option>
        <option value="fullscreen">Tam ekran</option>
      </select>
    </Field>
  );
}

function BackgroundImageControls({
  set,
  patch,
  str,
  bool,
  num,
  showHeight,
  showOverlayColor,
  overlayEnabledDefault = true,
  imagePositionDefault = 'center',
}: {
  set: (key: string, value: unknown) => void;
  patch: (values: Record<string, unknown>) => void;
  str: (key: string, fallback?: string) => string;
  bool: (key: string, fallback?: boolean) => boolean;
  num: (key: string, fallback?: number) => number;
  showHeight?: boolean;
  showOverlayColor?: boolean;
  overlayEnabledDefault?: boolean;
  imagePositionDefault?: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Görsel görünümü</p>
      <ImageFitField value={str('imageFit', 'cover')} onChange={v => set('imageFit', v)} />
      <ImagePositionField value={str('imagePosition', imagePositionDefault)} onChange={v => set('imagePosition', v)} />
      {showHeight && (
        <HeroHeightField
          value={str('heightMode', str('height', 'large'))}
          onChange={v => patch({ heightMode: v, height: v })}
        />
      )}
      <CheckboxField
        label="Overlay açık"
        checked={bool('overlayEnabled', overlayEnabledDefault)}
        onChange={v => set('overlayEnabled', v)}
      />
      {bool('overlayEnabled', overlayEnabledDefault) && (
        <>
          {showOverlayColor && (
            <ColorField
              label="Overlay rengi"
              value={str('overlayColor', '#4f46e5')}
              onChange={v => set('overlayColor', v)}
            />
          )}
          <OverlayOpacityField
            value={num('overlayOpacity', 30)}
            onChange={v => set('overlayOpacity', v)}
          />
        </>
      )}
    </div>
  );
}

function TrustBadgesEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const items = parseTrustBadges(value);

  const updateItems = (next: TrustBadgeItem[]) => {
    onChange(serializeTrustBadges(next));
  };

  const updateItem = (index: number, patch: Partial<TrustBadgeItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    updateItems(next);
  };

  const addItem = () => {
    updateItems([...items, { title: 'Yeni rozet', description: '' }]);
  };

  const removeItem = (index: number) => {
    updateItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-[12px] text-slate-500">Henüz rozet eklenmedi.</p>
      )}
      {items.map((item, index) => (
        <div key={index} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-500">Rozet {index + 1}</span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              aria-label="Rozeti sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <TextInput
            value={item.title}
            onChange={v => updateItem(index, { title: v })}
            placeholder="Başlık"
          />
          <TextInput
            value={item.description}
            onChange={v => updateItem(index, { description: v })}
            placeholder="Kısa açıklama (isteğe bağlı)"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-indigo-600 hover:text-indigo-700"
      >
        <Plus className="w-3.5 h-3.5" />
        Rozet ekle
      </button>
    </div>
  );
}

interface SectionSettingsPanelProps {
  section: StorefrontSection;
  onChange: (patch: Record<string, unknown>) => void;
}

export default function SectionSettingsPanel({ section, onChange }: SectionSettingsPanelProps) {
  const s = section.settings;
  const set = (key: string, value: unknown) => onChange({ [key]: value });
  const patch = (values: Record<string, unknown>) => onChange(values);
  const setImageUrl = (url: string) => {
    if (url.trim()) patch({ imageUrl: url, backgroundType: 'image' });
    else patch({ imageUrl: url });
  };
  const str = (key: string, fallback = '') => String(s[key] ?? fallback);
  const num = (key: string, fallback = 8) => {
    const v = s[key];
    return typeof v === 'number' ? v : Number(v) || fallback;
  };
  const bool = (key: string, fallback = true) => {
    const v = s[key];
    return v === undefined ? fallback : Boolean(v);
  };

  switch (section.type) {
    case 'hero':
      return (
        <div className="space-y-3">
          <BlockHint type="hero" />
          <HeroSettingsPanel section={section} onChange={onChange} />
        </div>
      );

    case 'categoryGrid':
      return (
        <div className="space-y-3">
          <BlockHint type="categoryGrid" />
          <Field label="Başlık"><TextInput value={str('title')} onChange={v => set('title', v)} /></Field>
          <CheckboxField label="Başlık göster" checked={bool('showTitle', true)} onChange={v => set('showTitle', v)} />
          <Field label="Görünüm tipi">
            <select className={inputCls} value={str('displayMode', 'grid')} onChange={e => set('displayMode', e.target.value)}>
              <option value="grid">Grid</option>
              <option value="list">Yatay liste</option>
              <NextPhaseOption label="Carousel" />
            </select>
          </Field>
          <Field label="Maksimum kategori sayısı">
            <NumberInput value={num('limit', 8)} onChange={v => set('limit', v)} min={1} max={24} />
          </Field>
          <CheckboxField label="Kategori görsellerini göster" checked={bool('showImages', true)} onChange={v => set('showImages', v)} />
          <Field label="Kolon sayısı">
            <select className={inputCls} value={String(num('columns', 4))} onChange={e => set('columns', Number(e.target.value))}>
              <option value="2">2 kolon</option>
              <option value="3">3 kolon</option>
              <option value="4">4 kolon</option>
            </select>
          </Field>
          <Field label="Genişlik tipi">
            <select className={inputCls} value={str('widthMode', 'container')} onChange={e => set('widthMode', e.target.value)}>
              <option value="container">Container</option>
              <option value="full">Tam genişlik</option>
            </select>
          </Field>
          <Field label="Tüm kategoriler buton metni">
            <TextInput value={str('viewAllLabel', 'Tüm kategorileri göster')} onChange={v => set('viewAllLabel', v)} />
          </Field>
        </div>
      );

    case 'featuredProducts':
      return (
        <div className="space-y-3">
          <BlockHint type="featuredProducts" />
          <Field label="Başlık"><TextInput value={str('title')} onChange={v => set('title', v)} /></Field>
          <Field label="Görünüm tipi">
            <select className={inputCls} value={str('displayMode', 'grid')} onChange={e => set('displayMode', e.target.value)}>
              <option value="grid">Grid</option>
              <NextPhaseOption label="Carousel" />
            </select>
          </Field>
          <Field label="Kolon sayısı">
            <select className={inputCls} value={String(num('columns', 4))} onChange={e => set('columns', Number(e.target.value))}>
              <option value="2">2 kolon</option>
              <option value="3">3 kolon</option>
              <option value="4">4 kolon</option>
              <option value="5">5 kolon</option>
            </select>
          </Field>
          <Field label="Ürün sayısı">
            <select className={inputCls} value={String(num('limit', 8))} onChange={e => set('limit', Number(e.target.value))}>
              <option value="4">4 ürün</option>
              <option value="8">8 ürün</option>
              <option value="12">12 ürün</option>
            </select>
          </Field>
          <Field label="Genişlik tipi">
            <select className={inputCls} value={str('widthMode', 'container')} onChange={e => set('widthMode', e.target.value)}>
              <option value="container">Container</option>
              <option value="full">Tam genişlik</option>
            </select>
          </Field>
          <Field label="Kaynak">
            <select className={inputCls} value={str('source', 'featured')} onChange={e => set('source', e.target.value)}>
              <option value="featured">Öne çıkan ürünler</option>
              <option value="latest">Yeni ürünler</option>
            </select>
          </Field>
          <Field label="Kart görünümü">
            <select className={inputCls} value={str('cardStyle', 'standard')} onChange={e => set('cardStyle', e.target.value)}>
              <option value="standard">Standart</option>
              <option value="compact">Kompakt</option>
              <option value="imageFocus">Büyük görsel</option>
            </select>
          </Field>
          <CheckboxField label="Fiyat göster" checked={bool('showPrice', true)} onChange={v => set('showPrice', v)} />
          <CheckboxField label="Sepete ekle butonu göster" checked={bool('showAddToCart', true)} onChange={v => set('showAddToCart', v)} />
        </div>
      );

    case 'campaignBanner':
      return (
        <div className="space-y-3">
          <BlockHint type="campaignBanner" />
          <Field label="Başlık"><TextInput value={str('title')} onChange={v => set('title', v)} /></Field>
          <Field label="Alt başlık"><TextInput value={str('subtitle')} onChange={v => set('subtitle', v)} /></Field>
          <Field label="Buton metni"><TextInput value={str('buttonText')} onChange={v => set('buttonText', v)} /></Field>
          <Field label="Buton URL"><TextInput value={str('buttonUrl')} onChange={v => set('buttonUrl', v)} /></Field>
          <Field label="Genişlik tipi">
            <select className={inputCls} value={str('widthMode', 'container')} onChange={e => set('widthMode', e.target.value)}>
              <option value="full">Tam genişlik</option>
              <option value="container">Container</option>
            </select>
          </Field>
          <Field label="Banner yüksekliği">
            <select className={inputCls} value={str('heightMode', 'medium')} onChange={e => set('heightMode', e.target.value)}>
              <option value="small">Küçük</option>
              <option value="medium">Orta</option>
              <option value="large">Büyük</option>
            </select>
          </Field>
          <Field label="Metin konumu">
            <select className={inputCls} value={str('textPosition', 'left')} onChange={e => set('textPosition', e.target.value)}>
              <option value="left">Sol</option>
              <option value="center">Orta</option>
              <option value="right">Sağ</option>
            </select>
          </Field>
          <BuilderImageField
            value={str('imageUrl')}
            onChange={setImageUrl}
            recommendedSize="1920×500 px"
            helperText="Kampanya bandının arka plan görseli. Yükleme sonrası medya kütüphanesine eklenir."
            usageHint="Metin alanı solda kalacak şekilde görselin sağ veya merkez bölgesine odaklanın."
            folder="banners"
          />
          {str('imageUrl') && (
            <BackgroundImageControls
              set={set}
              patch={patch}
              str={str}
              bool={bool}
              num={num}
              overlayEnabledDefault={false}
              imagePositionDefault="right"
            />
          )}
          <ColorField label="Arka plan rengi" value={str('backgroundColor', '#fffbeb')} onChange={v => set('backgroundColor', v)} />
          <ColorField label="Metin rengi" value={str('textColor', '#78350f')} onChange={v => set('textColor', v)} />
        </div>
      );

    case 'trustBadges':
      return (
        <div className="space-y-3">
          <Field label="Başlık"><TextInput value={str('title')} onChange={v => set('title', v)} /></Field>
          <Field label="Rozetler">
            <TrustBadgesEditor value={str('badges')} onChange={v => set('badges', v)} />
          </Field>
        </div>
      );

    case 'textImage':
      return (
        <div className="space-y-3">
          <BlockHint type="textImage" />
          <Field label="Başlık"><TextInput value={str('title')} onChange={v => set('title', v)} /></Field>
          <Field label="Metin"><TextArea value={str('text')} onChange={v => set('text', v)} rows={4} /></Field>
          <BuilderImageField
            value={str('imageUrl')}
            onChange={v => set('imageUrl', v)}
            recommendedSize="900×700 px"
            helperText="Metin bloğunun yanında gösterilen içerik görseli."
            usageHint="Kareye yakın veya 4:3 oranlı görseller en iyi sonucu verir."
            folder="builder"
          />
          <ImageFitField value={str('imageFit', 'cover')} onChange={v => set('imageFit', v)} />
          <Field label="Görsel konumu">
            <select className={inputCls} value={str('imagePosition', 'left')} onChange={e => set('imagePosition', e.target.value)}>
              <option value="left">Sol</option>
              <option value="right">Sağ</option>
            </select>
          </Field>
          <Field label="Buton metni"><TextInput value={str('buttonText')} onChange={v => set('buttonText', v)} placeholder="İsteğe bağlı" /></Field>
          <Field label="Buton URL"><TextInput value={str('buttonUrl')} onChange={v => set('buttonUrl', v)} placeholder="/store/urunler" /></Field>
        </div>
      );

    default:
      return (
        <p className="text-[13px] text-slate-500">
          Bu blok tipi için ayar formu tanımlı değil. Blok silinebilir veya olduğu gibi bırakılabilir.
        </p>
      );
  }
}
