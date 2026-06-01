import type { StorefrontSection } from '../../types/storefrontBuilder.types';

const inputCls =
  'w-full bg-white border border-slate-200 text-slate-900 text-[13px] px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300';

const labelCls = 'block text-[12px] font-medium text-slate-600 mb-1';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      className={`${inputCls} resize-y min-h-[80px]`}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  );
}

interface SectionSettingsPanelProps {
  section: StorefrontSection;
  onChange: (settings: Record<string, unknown>) => void;
}

export default function SectionSettingsPanel({ section, onChange }: SectionSettingsPanelProps) {
  const s = section.settings;

  const set = (key: string, value: unknown) => {
    onChange({ ...s, [key]: value });
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
          <Field label="Başlık">
            <TextInput value={str('title')} onChange={v => set('title', v)} />
          </Field>
          <Field label="Alt başlık">
            <TextInput value={str('subtitle')} onChange={v => set('subtitle', v)} />
          </Field>
          <Field label="Buton metni">
            <TextInput value={str('buttonText')} onChange={v => set('buttonText', v)} />
          </Field>
          <Field label="Buton URL">
            <TextInput value={str('buttonUrl')} onChange={v => set('buttonUrl', v)} />
          </Field>
          <Field label="Görsel URL">
            <TextInput value={str('imageUrl')} onChange={v => set('imageUrl', v)} placeholder="https://..." />
          </Field>
          <Field label="Hizalama">
            <select
              className={inputCls}
              value={str('alignment', 'center')}
              onChange={e => set('alignment', e.target.value)}
            >
              <option value="left">Sol</option>
              <option value="center">Orta</option>
              <option value="right">Sağ</option>
            </select>
          </Field>
        </div>
      );

    case 'categoryGrid':
      return (
        <div className="space-y-3">
          <Field label="Başlık">
            <TextInput value={str('title')} onChange={v => set('title', v)} />
          </Field>
          <Field label="Limit">
            <NumberInput value={num('limit', 8)} onChange={v => set('limit', v)} min={1} max={24} />
          </Field>
          <Field label="Görselleri göster">
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={bool('showImages', true)}
                onChange={e => set('showImages', e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Kategori görselleri
            </label>
          </Field>
        </div>
      );

    case 'featuredProducts':
      return (
        <div className="space-y-3">
          <Field label="Başlık">
            <TextInput value={str('title')} onChange={v => set('title', v)} />
          </Field>
          <Field label="Limit">
            <NumberInput value={num('limit', 8)} onChange={v => set('limit', v)} min={1} max={24} />
          </Field>
          <Field label="Kaynak">
            <select
              className={inputCls}
              value={str('source', 'featured')}
              onChange={e => set('source', e.target.value)}
            >
              <option value="featured">Öne çıkan</option>
              <option value="latest">En yeni</option>
            </select>
          </Field>
        </div>
      );

    case 'campaignBanner':
      return (
        <div className="space-y-3">
          <Field label="Başlık">
            <TextInput value={str('title')} onChange={v => set('title', v)} />
          </Field>
          <Field label="Alt başlık">
            <TextInput value={str('subtitle')} onChange={v => set('subtitle', v)} />
          </Field>
          <Field label="Buton metni">
            <TextInput value={str('buttonText')} onChange={v => set('buttonText', v)} />
          </Field>
          <Field label="Buton URL">
            <TextInput value={str('buttonUrl')} onChange={v => set('buttonUrl', v)} />
          </Field>
          <Field label="Görsel URL">
            <TextInput value={str('imageUrl')} onChange={v => set('imageUrl', v)} placeholder="https://..." />
          </Field>
        </div>
      );

    case 'trustBadges':
      return (
        <div className="space-y-3">
          <Field label="Başlık">
            <TextInput value={str('title')} onChange={v => set('title', v)} />
          </Field>
          <Field label="Rozetler (her satır bir rozet)">
            <TextArea
              value={str('badges')}
              onChange={v => set('badges', v)}
              rows={5}
              placeholder={'Ücretsiz kargo\nGüvenli ödeme\nHızlı teslimat'}
            />
          </Field>
        </div>
      );

    case 'textImage':
      return (
        <div className="space-y-3">
          <Field label="Başlık">
            <TextInput value={str('title')} onChange={v => set('title', v)} />
          </Field>
          <Field label="Metin">
            <TextArea value={str('text')} onChange={v => set('text', v)} rows={4} />
          </Field>
          <Field label="Görsel URL">
            <TextInput value={str('imageUrl')} onChange={v => set('imageUrl', v)} placeholder="https://..." />
          </Field>
          <Field label="Görsel konumu">
            <select
              className={inputCls}
              value={str('imagePosition', 'left')}
              onChange={e => set('imagePosition', e.target.value)}
            >
              <option value="left">Sol</option>
              <option value="right">Sağ</option>
            </select>
          </Field>
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
