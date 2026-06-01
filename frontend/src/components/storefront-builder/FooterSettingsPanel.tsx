import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ColorField, ImageUrlField } from './builderSettingsUi';
import { FieldHint, SegmentControl, SettingCard, TextField, ToggleSwitch } from './heroBuilderControls';
import {
  DEFAULT_LEGAL_LINKS,
  newFooterColumn,
  newFooterLink,
  type FooterColumn,
  type FooterLink,
  type FooterSettings,
} from '../../utils/footerSettingsHelpers';

const FOOTER_TABS = [
  { id: 'general', label: 'Genel' },
  { id: 'columns', label: 'Kolonlar' },
  { id: 'contact', label: 'İletişim' },
  { id: 'legal', label: 'Yasal' },
  { id: 'colors', label: 'Renkler' },
] as const;

type FooterTabId = (typeof FOOTER_TABS)[number]['id'];

type FooterSettingsPanelProps = {
  settings: FooterSettings;
  onChange: (patch: Partial<FooterSettings>) => void;
};

function LinkEditor({
  links,
  onChange,
  emptyLabel,
}: {
  links: FooterLink[];
  onChange: (links: FooterLink[]) => void;
  emptyLabel: string;
}) {
  const update = (id: string, patch: Partial<FooterLink>) => {
    onChange(links.map(l => (l.id === id ? { ...l, ...patch } : l)));
  };

  return (
    <div className="space-y-2">
      {links.length === 0 && (
        <p className="text-[11px] text-slate-400 py-2 text-center border border-dashed border-slate-200 rounded-lg">
          {emptyLabel}
        </p>
      )}
      {links.map(link => (
        <div key={link.id} className="rounded-lg border border-slate-200 p-2.5 space-y-2 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-slate-500 uppercase">Link</span>
            <button
              type="button"
              onClick={() => onChange(links.filter(l => l.id !== link.id))}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              aria-label="Linki sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <TextField label="Etiket" value={link.label} onChange={v => update(link.id, { label: v })} />
          <TextField label="URL" value={link.url} onChange={v => update(link.id, { url: v })} placeholder="/store/urunler veya https://..." />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...links, newFooterLink()])}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-300 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
      >
        <Plus className="w-3.5 h-3.5" />
        Link ekle
      </button>
    </div>
  );
}

function ColumnEditor({
  columns,
  onChange,
}: {
  columns: FooterColumn[];
  onChange: (columns: FooterColumn[]) => void;
}) {
  const updateColumn = (id: string, patch: Partial<FooterColumn>) => {
    onChange(columns.map(c => (c.id === id ? { ...c, ...patch } : c)));
  };

  return (
    <div className="space-y-3">
      {columns.length === 0 && (
        <p className="text-[11px] text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-lg">
          Henüz kolon yok. Menü kolonları ekleyerek footer link gruplarını oluşturun.
        </p>
      )}
      {columns.map(col => (
        <div key={col.id} className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
            <span className="text-[11px] font-semibold text-slate-700">Kolon</span>
            <button
              type="button"
              onClick={() => onChange(columns.filter(c => c.id !== col.id))}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              aria-label="Kolonu sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 space-y-3">
            <TextField label="Kolon başlığı" value={col.title} onChange={v => updateColumn(col.id, { title: v })} />
            <LinkEditor
              links={col.links}
              onChange={links => updateColumn(col.id, { links })}
              emptyLabel="Bu kolonda henüz link yok."
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...columns, newFooterColumn()])}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-indigo-600 text-white text-[11px] font-medium hover:bg-indigo-500"
      >
        <Plus className="w-3.5 h-3.5" />
        Kolon ekle
      </button>
    </div>
  );
}

export default function FooterSettingsPanel({ settings, onChange }: FooterSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<FooterTabId>('general');
  const set = <K extends keyof FooterSettings>(key: K, value: FooterSettings[K]) => onChange({ [key]: value });

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return (
          <>
            <SettingCard title="Footer">
              <ToggleSwitch
                label="Özelleştirmeyi etkinleştir"
                checked={settings.enabled}
                onChange={v => set('enabled', v)}
                hint="Kapalıyken mevcut varsayılan footer görünümü korunur."
              />
              <p className="text-[11px] font-medium text-slate-600 mb-1">Yerleşim</p>
              <SegmentControl
                value={settings.layout}
                options={[
                  { id: 'simple', label: 'Basit' },
                  { id: 'columns', label: 'Kolonlu' },
                  { id: 'centered', label: 'Ortalı' },
                ]}
                onChange={v => set('layout', v as FooterSettings['layout'])}
              />
            </SettingCard>
            <SettingCard title="Marka">
              <ImageUrlField label="Footer logo URL" value={settings.logoUrl} onChange={v => set('logoUrl', v)} />
              <FieldHint>Boş bırakılırsa mağaza logosu kullanılır.</FieldHint>
              <TextField
                label="Açıklama"
                value={settings.description}
                onChange={v => set('description', v)}
                placeholder="Mağazanız hakkında kısa metin"
              />
            </SettingCard>
          </>
        );

      case 'columns':
        return (
          <SettingCard title="Menü kolonları" hint="Her kolon bir başlık ve link listesi içerir.">
            <ColumnEditor columns={settings.columns} onChange={cols => set('columns', cols)} />
          </SettingCard>
        );

      case 'contact':
        return (
          <>
            <SettingCard title="Sosyal medya">
              <ToggleSwitch label="Sosyal linkleri göster" checked={settings.showSocialLinks} onChange={v => set('showSocialLinks', v)} />
              {settings.showSocialLinks && (
                <LinkEditor
                  links={settings.socialLinks}
                  onChange={links => set('socialLinks', links)}
                  emptyLabel="Sosyal medya linki ekleyin (Instagram, Facebook vb.)."
                />
              )}
            </SettingCard>
            <SettingCard title="WhatsApp">
              <ToggleSwitch label="WhatsApp butonu göster" checked={settings.showWhatsapp} onChange={v => set('showWhatsapp', v)} />
              {settings.showWhatsapp && (
                <TextField
                  label="WhatsApp numarası"
                  value={settings.whatsappNumber}
                  onChange={v => set('whatsappNumber', v)}
                  placeholder="05xx xxx xx xx"
                />
              )}
            </SettingCard>
            <SettingCard title="E-bülten">
              <ToggleSwitch label="E-bülten alanı göster" checked={settings.showNewsletter} onChange={v => set('showNewsletter', v)} />
              {settings.showNewsletter && (
                <>
                  <TextField label="Başlık" value={settings.newsletterTitle} onChange={v => set('newsletterTitle', v)} />
                  <TextField
                    label="Açıklama"
                    value={settings.newsletterDescription}
                    onChange={v => set('newsletterDescription', v)}
                  />
                  <FieldHint>Abonelik formu görsel olarak gösterilir; entegrasyon sonraki fazda eklenecek.</FieldHint>
                </>
              )}
            </SettingCard>
          </>
        );

      case 'legal':
        return (
          <SettingCard title="Yasal linkler">
            <ToggleSwitch
              label="Yasal linkleri göster"
              checked={settings.legalLinksEnabled}
              onChange={v => set('legalLinksEnabled', v)}
            />
            <FieldHint>
              Etkin olduğunda KVKK, Gizlilik Politikası ve Kullanım Şartları linkleri gösterilir:
            </FieldHint>
            <ul className="text-[11px] text-slate-500 space-y-1 pl-1">
              {DEFAULT_LEGAL_LINKS.map(l => (
                <li key={l.id}>
                  {l.label} — <code className="text-[10px] bg-slate-100 px-1 rounded">{l.url}</code>
                </li>
              ))}
            </ul>
          </SettingCard>
        );

      case 'colors':
        return (
          <SettingCard title="Renkler">
            <ColorField label="Arka plan" value={settings.backgroundColor} onChange={v => set('backgroundColor', v)} />
            <ColorField label="Metin rengi" value={settings.textColor} onChange={v => set('textColor', v)} />
            <ColorField label="Başlık rengi" value={settings.headingColor} onChange={v => set('headingColor', v)} />
          </SettingCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex gap-1 p-2 border-b border-slate-200 bg-slate-50/80 overflow-x-auto">
        {FOOTER_TABS.map(tab => (
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
