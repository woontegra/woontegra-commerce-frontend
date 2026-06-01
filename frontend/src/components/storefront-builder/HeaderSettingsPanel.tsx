import { useState } from 'react';
import { ColorField } from './builderSettingsUi';
import { FieldHint, SegmentControl, SettingCard, SliderField, ToggleSwitch } from './heroBuilderControls';
import {
  HEADER_LAYOUT_LABELS,
  HEADER_LOGO_MAX_HEIGHT_MAX,
  HEADER_LOGO_MAX_HEIGHT_MIN,
  HEADER_LOGO_WIDTH_MAX,
  HEADER_LOGO_WIDTH_MIN,
  layoutPresetPatch,
  type HeaderLayout,
  type HeaderMobileLayout,
  type HeaderSettings,
} from '../../utils/headerSettingsHelpers';

const HEADER_TABS = [
  { id: 'general', label: 'Genel' },
  { id: 'logo', label: 'Logo' },
  { id: 'menu', label: 'Menü' },
  { id: 'icons', label: 'İkonlar' },
  { id: 'colors', label: 'Renkler' },
  { id: 'mobile', label: 'Mobil' },
] as const;

type HeaderTabId = (typeof HEADER_TABS)[number]['id'];

type HeaderSettingsPanelProps = {
  settings: HeaderSettings;
  onChange: (patch: Partial<HeaderSettings>) => void;
};

export default function HeaderSettingsPanel({ settings, onChange }: HeaderSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<HeaderTabId>('general');
  const set = <K extends keyof HeaderSettings>(key: K, value: HeaderSettings[K]) => onChange({ [key]: value });

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return (
          <>
            <SettingCard title="Header">
              <ToggleSwitch
                label="Özelleştirmeyi etkinleştir"
                checked={settings.enabled}
                onChange={v => set('enabled', v)}
                hint="Kapalıyken mevcut varsayılan header görünümü korunur."
              />
              <ToggleSwitch label="Sticky header" checked={settings.sticky} onChange={v => set('sticky', v)} />
              <SliderField
                label="Header yüksekliği"
                value={settings.heightPx}
                onChange={v => set('heightPx', v)}
                min={48}
                max={120}
                step={2}
                unit="px"
              />
              <ToggleSwitch label="Alt çizgi (border)" checked={settings.borderEnabled} onChange={v => set('borderEnabled', v)} />
            </SettingCard>
            <SettingCard title="Yerleşim tipi">
              <SegmentControl
                value={settings.layout}
                options={(
                  Object.entries(HEADER_LAYOUT_LABELS) as [HeaderLayout, string][]
                ).map(([id, label]) => ({ id, label: label.split(',')[0] }))}
                onChange={v => onChange(layoutPresetPatch(v as HeaderLayout))}
                columns={1}
              />
              <FieldHint>{HEADER_LAYOUT_LABELS[settings.layout]}</FieldHint>
            </SettingCard>
          </>
        );

      case 'logo':
        return (
          <SettingCard title="Logo">
            {!settings.enabled && (
              <FieldHint>
                Logo boyutu canlı vitrinde varsayılan header’da da uygulanır. Renk, yerleşim ve menü için Genel
                sekmesinden header özelleştirmesini etkinleştirin.
              </FieldHint>
            )}
            <p className="text-[11px] font-medium text-slate-600 mb-1">Logo konumu</p>
            <SegmentControl
              value={settings.logoPosition}
              options={[
                { id: 'left', label: 'Sol' },
                { id: 'center', label: 'Orta' },
              ]}
              onChange={v => set('logoPosition', v as HeaderSettings['logoPosition'])}
            />
            <SliderField
              label="Logo genişliği"
              value={settings.logoWidthPx}
              onChange={v => set('logoWidthPx', v)}
              min={HEADER_LOGO_WIDTH_MIN}
              max={HEADER_LOGO_WIDTH_MAX}
              step={5}
              unit="px"
            />
            <SliderField
              label="Logo max yükseklik"
              value={settings.logoMaxHeightPx}
              onChange={v => set('logoMaxHeightPx', v)}
              min={HEADER_LOGO_MAX_HEIGHT_MIN}
              max={HEADER_LOGO_MAX_HEIGHT_MAX}
              step={2}
              unit="px"
            />
            <FieldHint>
              Logo mağaza ayarlarından gelir; oran korunur (object-fit: contain). Kare kutuya zorlanmaz.
            </FieldHint>
          </SettingCard>
        );

      case 'menu':
        return (
          <SettingCard title="Menü">
            <p className="text-[11px] font-medium text-slate-600 mb-1">Menü konumu</p>
            <SegmentControl
              value={settings.menuPosition}
              options={[
                { id: 'left', label: 'Sol' },
                { id: 'center', label: 'Orta' },
                { id: 'right', label: 'Sağ' },
              ]}
              onChange={v => set('menuPosition', v as HeaderSettings['menuPosition'])}
            />
            <SliderField
              label="Menü yazı boyutu"
              value={settings.menuFontSizePx}
              onChange={v => set('menuFontSizePx', v)}
              min={11}
              max={20}
              step={1}
              unit="px"
            />
            <FieldHint>Minimal yerleşimde menü linkleri gizlenir; yalnızca ikonlar görünür.</FieldHint>
          </SettingCard>
        );

      case 'icons':
        return (
          <SettingCard title="İkonlar ve araçlar">
            <ToggleSwitch label="Arama alanı" checked={settings.showSearch} onChange={v => set('showSearch', v)} />
            <ToggleSwitch label="Sepet ikonu" checked={settings.showCart} onChange={v => set('showCart', v)} />
            <ToggleSwitch label="Favoriler ikonu" checked={settings.showFavorites} onChange={v => set('showFavorites', v)} />
            <ToggleSwitch label="Hesap / giriş linkleri" checked={settings.showAccount} onChange={v => set('showAccount', v)} />
          </SettingCard>
        );

      case 'colors':
        return (
          <SettingCard title="Renkler">
            <ColorField label="Arka plan" value={settings.backgroundColor} onChange={v => set('backgroundColor', v)} />
            <ColorField label="Metin rengi" value={settings.textColor} onChange={v => set('textColor', v)} />
            <ColorField label="Aktif / vurgu rengi" value={settings.activeColor} onChange={v => set('activeColor', v)} />
          </SettingCard>
        );

      case 'mobile':
        return (
          <SettingCard title="Mobil görünüm">
            <p className="text-[11px] font-medium text-slate-600 mb-1">Mobil düzen</p>
            <SegmentControl
              value={settings.mobileLayout}
              options={[
                { id: 'stacked', label: 'Arama altta' },
                { id: 'compact', label: 'Kompakt' },
                { id: 'minimal', label: 'Minimal' },
              ]}
              onChange={v => set('mobileLayout', v as HeaderMobileLayout)}
            />
            <FieldHint>
              Stacked: arama header altında tam genişlik. Kompakt: tek satırda logo + ikonlar. Minimal: logo + sepet odaklı.
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
        {HEADER_TABS.map(tab => (
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
