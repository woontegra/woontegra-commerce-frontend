import { useEffect, useMemo, useState } from 'react';
import type { StorefrontSection } from '../../types/storefrontBuilder.types';
import { categoryService, type FlatCategoryNode } from '../../services/category.service';
import { inputCls } from './builderSettingsUi';
import { FieldHint, SegmentControl, SettingCard, TextField, ToggleSwitch } from './heroBuilderControls';
import { resolveFeaturedSourceType } from '../../utils/featuredProductsBlockHelpers';

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

type FeaturedProductsSettingsProps = {
  section: StorefrontSection;
  onChange: (patch: Record<string, unknown>) => void;
};

export default function FeaturedProductsSettings({ section, onChange }: FeaturedProductsSettingsProps) {
  const s = section.settings;
  const set = (key: string, value: unknown) => onChange({ [key]: value });
  const patch = (values: Record<string, unknown>) => onChange(values);
  const str = (key: string, fallback = '') => String(s[key] ?? fallback);
  const num = (key: string, fallback = 8) => {
    const v = s[key];
    return typeof v === 'number' ? v : Number(v) || fallback;
  };
  const bool = (key: string, fallback = true) => {
    const v = s[key];
    return v === undefined ? fallback : Boolean(v);
  };

  const [categories, setCategories] = useState<FlatCategoryNode[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catSearch, setCatSearch] = useState('');

  const sourceType = resolveFeaturedSourceType(s);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatLoading(true);
      try {
        const list = await categoryService.getFlat();
        if (!cancelled) setCategories(Array.isArray(list) ? list.filter(c => c.isActive !== false) : []);
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setCatLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [categories, catSearch]);

  const selectCategory = (cat: FlatCategoryNode) => {
    patch({
      categoryId: cat.id,
      categorySlug: cat.slug,
      categoryName: cat.name,
      sourceType: 'category',
      source: 'category',
    });
  };

  return (
    <div className="space-y-3">
      <SettingCard title="Bölüm başlığı">
        <TextField label="Başlık" value={str('title', 'Öne Çıkan Ürünler')} onChange={v => set('title', v)} />
        <ToggleSwitch label="Başlığı göster" checked={bool('showTitle', true)} onChange={v => set('showTitle', v)} />
        <ToggleSwitch label="Tümünü Gör linki" checked={bool('showViewAll', true)} onChange={v => set('showViewAll', v)} />
        {bool('showViewAll', true) && (
          <TextField label="Link metni" value={str('viewAllLabel', 'Tümünü gör')} onChange={v => set('viewAllLabel', v)} />
        )}
      </SettingCard>

      <SettingCard title="Ürün kaynağı" hint="Kategori seçerek vitrinde o kategorinin ürünlerini gösterin.">
        <SegmentControl
          value={sourceType === 'category' ? 'category' : 'featured'}
          options={[
            { id: 'featured', label: 'Genel vitrin' },
            { id: 'category', label: 'Kategori' },
          ]}
          onChange={v => patch({ sourceType: v, source: v })}
        />
        <FieldHint>Yeni gelenler, öne çıkanlar ve indirimli filtreler sonraki fazda eklenecek.</FieldHint>

        {sourceType === 'category' && (
          <div className="space-y-2">
            <label className="block text-[11px] font-medium text-slate-600">Kategori seçin</label>
            <input
              type="search"
              className={inputCls}
              placeholder="Kategori ara…"
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
            />
            {catLoading ? (
              <p className="text-[11px] text-slate-400">Kategoriler yükleniyor…</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {filteredCategories.length === 0 ? (
                  <p className="text-[11px] text-slate-400 p-3">Kategori bulunamadı.</p>
                ) : (
                  filteredCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selectCategory(cat)}
                      className={`w-full text-left px-3 py-2 text-[12px] hover:bg-indigo-50 transition-colors ${
                        str('categoryId') === cat.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      {'\u00A0'.repeat(Math.min(cat.depth ?? 0, 4) * 2)}
                      {cat.name}
                    </button>
                  ))
                )}
              </div>
            )}
            {str('categoryName') && (
              <p className="text-[11px] text-slate-600">
                Seçili: <span className="font-medium">{str('categoryName')}</span>
              </p>
            )}
            {!str('categoryId') && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Ürün göstermek için bir kategori seçin.
              </p>
            )}
          </div>
        )}
      </SettingCard>

      <SettingCard title="Görünüm">
        <p className="text-[11px] font-medium text-slate-600 mb-1">Görünüm tipi</p>
        <SegmentControl
          value={str('displayMode', 'grid')}
          options={[
            { id: 'grid', label: 'Grid' },
            { id: 'list', label: 'Liste' },
            { id: 'carousel', label: 'Carousel' },
          ]}
          onChange={v => set('displayMode', v)}
        />

        <p className="text-[11px] font-medium text-slate-600 mb-1 mt-2">Ürün sayısı</p>
        <SegmentControl
          value={String(num('limit', 8))}
          options={[
            { id: '4', label: '4' },
            { id: '8', label: '8' },
            { id: '12', label: '12' },
            { id: '16', label: '16' },
          ]}
          onChange={v => set('limit', Number(v))}
        />

        {str('displayMode', 'grid') === 'grid' && (
          <>
            <p className="text-[11px] font-medium text-slate-600 mb-1 mt-2">Desktop kolon</p>
            <SegmentControl
              value={String(num('columnsDesktop', num('columns', 4)))}
              options={[
                { id: '2', label: '2' },
                { id: '3', label: '3' },
                { id: '4', label: '4' },
                { id: '5', label: '5' },
              ]}
              onChange={v => patch({ columnsDesktop: Number(v), columns: Number(v) })}
            />
            <p className="text-[11px] font-medium text-slate-600 mb-1 mt-2">Tablet kolon</p>
            <SegmentControl
              value={String(num('columnsTablet', 2))}
              options={[
                { id: '2', label: '2' },
                { id: '3', label: '3' },
              ]}
              onChange={v => set('columnsTablet', Number(v))}
            />
            <p className="text-[11px] font-medium text-slate-600 mb-1 mt-2">Mobil kolon</p>
            <SegmentControl
              value={String(num('columnsMobile', 2))}
              options={[
                { id: '1', label: '1' },
                { id: '2', label: '2' },
              ]}
              onChange={v => set('columnsMobile', Number(v))}
            />
          </>
        )}

        <p className="text-[11px] font-medium text-slate-600 mb-1 mt-2">Genişlik</p>
        <SegmentControl
          value={str('widthMode', 'container')}
          options={[
            { id: 'container', label: 'Container' },
            { id: 'full', label: 'Tam genişlik' },
          ]}
          onChange={v => set('widthMode', v)}
        />

        <p className="text-[11px] font-medium text-slate-600 mb-1 mt-2">Kart stili</p>
        <SegmentControl
          value={str('cardStyle', 'standard')}
          options={[
            { id: 'standard', label: 'Standart' },
            { id: 'compact', label: 'Kompakt' },
            { id: 'imageFocus', label: 'Büyük görsel' },
          ]}
          onChange={v => set('cardStyle', v)}
        />

        <CheckboxField label="Fiyat göster" checked={bool('showPrice', true)} onChange={v => set('showPrice', v)} />
        <CheckboxField label="Sepete ekle göster" checked={bool('showAddToCart', true)} onChange={v => set('showAddToCart', v)} />
      </SettingCard>
    </div>
  );
}
