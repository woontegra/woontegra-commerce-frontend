import { useState } from 'react';
import { ColorField } from './builderSettingsUi';
import { FieldHint, SegmentControl, SettingCard, SliderField, ToggleSwitch } from './heroBuilderControls';
import {
  THEME_FONT_OPTIONS,
  type ThemeProductCardStyle,
  type ThemeSettings,
} from '../../utils/themeSettingsHelpers';

const THEME_TABS = [
  { id: 'general', label: 'Genel' },
  { id: 'colors', label: 'Renkler' },
  { id: 'shape', label: 'Şekil' },
  { id: 'products', label: 'Ürün kartı' },
] as const;

type ThemeTabId = (typeof THEME_TABS)[number]['id'];

type ThemeSettingsPanelProps = {
  settings: ThemeSettings;
  onChange: (patch: Partial<ThemeSettings>) => void;
};

export default function ThemeSettingsPanel({ settings, onChange }: ThemeSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<ThemeTabId>('general');
  const set = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => onChange({ [key]: value });

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return (
          <SettingCard title="Tema">
            <ToggleSwitch
              label="Global tema etkin"
              checked={settings.enabled}
              onChange={v => set('enabled', v)}
              hint="Kapalıyken mevcut varsayılan vitrin stili korunur."
            />
            <p className="text-[11px] font-medium text-slate-600 mb-1">Yazı tipi</p>
            <SegmentControl
              value={settings.fontFamily}
              options={THEME_FONT_OPTIONS.map(f => ({ id: f.id, label: f.label.split(' ')[0] }))}
              onChange={v => set('fontFamily', v)}
              columns={2}
            />
            <FieldHint>{THEME_FONT_OPTIONS.find(f => f.id === settings.fontFamily)?.label ?? 'Sistem'}</FieldHint>
          </SettingCard>
        );

      case 'colors':
        return (
          <SettingCard title="Renkler">
            <ColorField label="Ana renk" value={settings.primaryColor} onChange={v => set('primaryColor', v)} />
            <ColorField label="İkincil renk" value={settings.secondaryColor} onChange={v => set('secondaryColor', v)} />
            <ColorField label="Arka plan" value={settings.backgroundColor} onChange={v => set('backgroundColor', v)} />
            <ColorField label="Metin rengi" value={settings.textColor} onChange={v => set('textColor', v)} />
            <FieldHint>Bloklardaki özel renk ayarları (hero, kampanya vb.) global rengi geçersiz kılar.</FieldHint>
          </SettingCard>
        );

      case 'shape':
        return (
          <SettingCard title="Şekil ve düzen">
            <SliderField
              label="Buton radius"
              value={settings.buttonRadius}
              onChange={v => set('buttonRadius', v)}
              min={0}
              max={32}
              step={2}
              unit="px"
            />
            <SliderField
              label="Kart radius"
              value={settings.cardRadius}
              onChange={v => set('cardRadius', v)}
              min={0}
              max={32}
              step={2}
              unit="px"
            />
            <SliderField
              label="Container genişliği"
              value={settings.containerMaxWidthPx}
              onChange={v => set('containerMaxWidthPx', v)}
              min={960}
              max={1600}
              step={16}
              unit="px"
            />
            <SliderField
              label="Bölüm aralığı"
              value={settings.sectionSpacingPx}
              onChange={v => set('sectionSpacingPx', v)}
              min={16}
              max={120}
              step={4}
              unit="px"
            />
          </SettingCard>
        );

      case 'products':
        return (
          <SettingCard title="Ürün kartı varsayılanı">
            <SegmentControl
              value={settings.productCardStyle}
              options={[
                { id: 'standard', label: 'Standart' },
                { id: 'plain', label: 'Düz' },
                { id: 'compact', label: 'Kompakt' },
              ]}
              onChange={v => set('productCardStyle', v as ThemeProductCardStyle)}
            />
            <FieldHint>
              Ürün Vitrini bloğunda plain/compact seçilirse blok ayarı global temayı geçersiz kılar.
            </FieldHint>
          </SettingCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex gap-1 p-2 border-b border-slate-200 bg-slate-50/80 overflow-x-auto">
        {THEME_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">{renderTab()}</div>
    </div>
  );
}
