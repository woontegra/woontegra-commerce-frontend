import { ColorField } from './builderSettingsUi';
import { FieldHint, SegmentControl, SettingCard, SliderField, TextField, ToggleSwitch } from './heroBuilderControls';
import type { AnnouncementBarSettings } from '../../utils/announcementBarHelpers';

type AnnouncementBarSettingsPanelProps = {
  settings: AnnouncementBarSettings;
  onChange: (patch: Partial<AnnouncementBarSettings>) => void;
};

export default function AnnouncementBarSettingsPanel({ settings, onChange }: AnnouncementBarSettingsPanelProps) {
  const set = <K extends keyof AnnouncementBarSettings>(key: K, value: AnnouncementBarSettings[K]) =>
    onChange({ [key]: value });

  const isMarquee = settings.mode === 'marquee';

  return (
    <div className="space-y-3">
      <SettingCard title="Genel">
        <ToggleSwitch label="Duyuru barı aktif" checked={settings.enabled} onChange={v => set('enabled', v)} />
        <ToggleSwitch label="Masaüstünde göster" checked={settings.showOnDesktop} onChange={v => set('showOnDesktop', v)} />
        <ToggleSwitch label="Mobilde göster" checked={settings.showOnMobile} onChange={v => set('showOnMobile', v)} />
        <SliderField
          label="Bar yüksekliği"
          value={settings.heightPx}
          onChange={v => set('heightPx', v)}
          min={24}
          max={80}
          step={2}
          unit="px"
        />
      </SettingCard>

      <SettingCard title="İçerik">
        <TextField label="Ana metin" value={settings.text} onChange={v => set('text', v)} />
        <TextField
          label="İkinci metin"
          value={settings.secondaryText}
          onChange={v => set('secondaryText', v)}
          placeholder="Split layout için sağ metin"
        />
        <TextField
          label="Mobil özel metin"
          value={settings.mobileText}
          onChange={v => set('mobileText', v)}
          placeholder="Boş bırakılırsa ana metin kullanılır"
        />
        <FieldHint>Split düzeninde sol ana metin, sağ ikinci metin gösterilir.</FieldHint>
        <ToggleSwitch label="Link ekle" checked={settings.linkEnabled} onChange={v => set('linkEnabled', v)} />
        {settings.linkEnabled && (
          <>
            <TextField label="Link URL" value={settings.linkUrl} onChange={v => set('linkUrl', v)} placeholder="/store/urunler veya https://..." />
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={settings.linkTarget === '_blank'}
                onChange={e => set('linkTarget', e.target.checked ? '_blank' : '_self')}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Yeni sekmede aç
            </label>
          </>
        )}
      </SettingCard>

      <SettingCard title="Görünüm">
        <p className="text-[11px] font-medium text-slate-600 mb-1">Yerleşim tipi</p>
        <SegmentControl
          value={isMarquee ? 'marquee' : settings.layout === 'split' ? 'split' : 'centered'}
          options={[
            { id: 'centered', label: 'Ortalı' },
            { id: 'split', label: 'Sol / Sağ' },
            { id: 'marquee', label: 'Kayan yazı' },
          ]}
          onChange={v => {
            if (v === 'marquee') {
              onChange({ mode: 'marquee', layout: 'centered' });
            } else {
              onChange({ mode: 'static', layout: v === 'split' ? 'split' : 'centered' });
            }
          }}
        />
        <p className="text-[11px] font-medium text-slate-600 mb-1 mt-2">Hizalama</p>
        <SegmentControl
          value={settings.align}
          options={[
            { id: 'left', label: 'Sol' },
            { id: 'center', label: 'Orta' },
            { id: 'right', label: 'Sağ' },
          ]}
          onChange={v => set('align', v as AnnouncementBarSettings['align'])}
        />
        <ColorField label="Arka plan rengi" value={settings.backgroundColor} onChange={v => set('backgroundColor', v)} />
        <ColorField label="Yazı rengi" value={settings.textColor} onChange={v => set('textColor', v)} />
        <SliderField
          label="Yazı boyutu"
          value={settings.fontSizePx}
          onChange={v => set('fontSizePx', v)}
          min={10}
          max={24}
          step={1}
          unit="px"
        />
        <p className="text-[11px] font-medium text-slate-600 mb-1">Yazı kalınlığı</p>
        <SegmentControl
          value={settings.fontWeight}
          options={[
            { id: 'normal', label: 'Normal' },
            { id: 'medium', label: 'Medium' },
            { id: 'semibold', label: 'Semi' },
            { id: 'bold', label: 'Bold' },
          ]}
          onChange={v => set('fontWeight', v as AnnouncementBarSettings['fontWeight'])}
        />
      </SettingCard>

      {isMarquee && (
        <SettingCard title="Kayan yazı">
          <SliderField
            label="Hız (saniye / tur)"
            value={settings.marqueeSpeed}
            onChange={v => set('marqueeSpeed', v)}
            min={8}
            max={60}
            step={1}
            unit="sn"
          />
          <ToggleSwitch label="Metin tekrar etsin" checked={settings.marqueeRepeat} onChange={v => set('marqueeRepeat', v)} />
          <ToggleSwitch label="Mobilde kayan yazı" checked={settings.marqueeOnMobile} onChange={v => set('marqueeOnMobile', v)} />
          <FieldHint>Düşük değer daha hızlı kaydırma demektir.</FieldHint>
        </SettingCard>
      )}
    </div>
  );
}
