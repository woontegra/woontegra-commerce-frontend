import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { contentInputCls, ContentFormField } from '../components/forms/ContentFormFields';
import {
  fetchNavigationMenuOptions,
  fetchNavigationMenus,
  menuItemFromRecord,
  saveNavigationMenu,
  type MenuItemPayload,
} from '../services/navigationMenu.service';
import {
  buildMenuDisplayRows,
  getMenuSiblings,
  isMenuDescendant,
  newMenuItemId,
  normalizeParentId,
} from '../utils/navigationMenuTree';
import type {
  MenuLinkType,
  NavigationMenuItem,
  NavigationMenuOptions,
  NavigationMenuType,
  TenantNavigationMenu,
} from '../types/navigationMenu';

const LINK_TYPE_LABELS: Record<MenuLinkType, string> = {
  page: 'Sayfa',
  category: 'Kategori',
  blog: 'Blog yazısı',
  product: 'Ürün',
  custom: 'Özel bağlantı',
};

type TabType = NavigationMenuType;
type PanelId = 'pages' | 'categories' | 'blog' | 'custom';

function sortItems(items: NavigationMenuItem[]): NavigationMenuItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

function resolveItemTarget(
  item: MenuItemPayload,
  options: NavigationMenuOptions | null,
): string {
  if (item.linkType === 'custom') return (item.url ?? '').trim() || '—';
  if (!options || !item.targetId) return '—';
  switch (item.linkType as MenuLinkType) {
    case 'page': {
      const p = options.pages.find(x => x.id === item.targetId);
      return p ? `/${p.slug}` : '—';
    }
    case 'blog': {
      const p = options.posts.find(x => x.id === item.targetId);
      return p ? `/blog/${p.slug}` : '—';
    }
    case 'category': {
      const c = options.categories.find(x => x.id === item.targetId);
      return c ? `/${c.slug}` : '—';
    }
    case 'product': {
      const p = options.products.find(x => x.id === item.targetId);
      return p ? `/urun/${p.slug}` : '—';
    }
    default:
      return '—';
  }
}

function validateItem(item: MenuItemPayload): string | null {
  if (!item.label.trim()) return 'Başlık zorunludur.';
  if (item.linkType === 'custom') {
    if (!item.url?.trim()) return 'URL zorunludur.';
    return null;
  }
  if (!item.targetId?.trim()) return 'Hedef seçilmedi.';
  return null;
}

function AccordionSection({
  title,
  open,
  onToggle,
  children,
  footer,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left bg-slate-50 hover:bg-slate-100 border-b border-slate-200 transition-colors"
      >
        <span className="text-[13px] font-semibold text-slate-800">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </button>
      {open && (
        <>
          <div className="p-3">{children}</div>
          {footer && (
            <div className="px-3 pb-3 pt-0 border-t border-slate-100 bg-slate-50/50">{footer}</div>
          )}
        </>
      )}
    </div>
  );
}

export default function MenusManagement() {
  const [tab, setTab] = useState<TabType>('HEADER');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headerMenu, setHeaderMenu] = useState<TenantNavigationMenu | null>(null);
  const [footerMenu, setFooterMenu] = useState<TenantNavigationMenu | null>(null);
  const [options, setOptions] = useState<NavigationMenuOptions | null>(null);
  const [items, setItems] = useState<MenuItemPayload[]>([]);
  const [menuTitle, setMenuTitle] = useState('');

  const [openPanels, setOpenPanels] = useState<Set<PanelId>>(new Set(['pages']));
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [pageSearch, setPageSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [blogSearch, setBlogSearch] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeMenu = tab === 'HEADER' ? headerMenu : footerMenu;
  const tabLabel = tab === 'HEADER' ? 'Üst menü' : 'Footer menü';

  const publishedPages = useMemo(() => {
    if (!options) return [];
    const q = pageSearch.trim().toLowerCase();
    return options.pages.filter(
      p =>
        (p.status === 'published' && p.isPublished !== false) &&
        (!q || `${p.title} ${p.slug}`.toLowerCase().includes(q)),
    );
  }, [options, pageSearch]);

  const filteredCategories = useMemo(() => {
    if (!options) return [];
    const q = categorySearch.trim().toLowerCase();
    return options.categories.filter(
      c => !q || `${c.name} ${c.slug}`.toLowerCase().includes(q),
    );
  }, [options, categorySearch]);

  const publishedPosts = useMemo(() => {
    if (!options) return [];
    const q = blogSearch.trim().toLowerCase();
    return options.posts.filter(
      p => p.isPublished && (!q || `${p.title} ${p.slug}`.toLowerCase().includes(q)),
    );
  }, [options, blogSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [menus, opts] = await Promise.all([
        fetchNavigationMenus(),
        fetchNavigationMenuOptions(),
      ]);
      setHeaderMenu(menus.header);
      setFooterMenu(menus.footer);
      setOptions(opts);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Menüler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const menu = tab === 'HEADER' ? headerMenu : footerMenu;
    if (!menu) return;
    setMenuTitle(menu.title);
    setItems(sortItems(menu.items).map(menuItemFromRecord));
    setExpandedId(null);
    setSelectedPages(new Set());
    setSelectedCategories(new Set());
    setSelectedPosts(new Set());
    setCustomLabel('');
    setCustomUrl('');
  }, [tab, headerMenu, footerMenu]);

  const togglePanel = (id: PanelId) => {
    setOpenPanels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSet = (set: Set<string>, id: string, checked: boolean) => {
    const next = new Set(set);
    if (checked) next.add(id);
    else next.delete(id);
    return next;
  };

  const displayRows = useMemo(() => buildMenuDisplayRows(items), [items]);

  const appendItems = (rows: MenuItemPayload[]) => {
    if (rows.length === 0) {
      toast.error('En az bir öğe seçin.');
      return;
    }
    setItems(prev => [
      ...prev,
      ...rows.map((row, i) => ({
        ...row,
        id: row.id ?? newMenuItemId(),
        parentId: normalizeParentId(row.parentId),
        sortOrder: prev.length + i,
        isActive: row.isActive !== false,
      })),
    ]);
    toast.success(`${rows.length} öğe menüye eklendi. Kaydetmeyi unutmayın.`);
  };

  const addSelectedPages = () => {
    if (!options) return;
    const rows = [...selectedPages]
      .map(id => options.pages.find(p => p.id === id))
      .filter(Boolean)
      .map(p => ({
        label: p!.title,
        linkType: 'page' as const,
        targetId: p!.id,
        url: '',
        parentId: null,
        sortOrder: 0,
        isActive: true,
        openInNewTab: false,
      }));
    appendItems(rows);
    setSelectedPages(new Set());
  };

  const addSelectedCategories = () => {
    if (!options) return;
    const rows = [...selectedCategories]
      .map(id => options.categories.find(c => c.id === id))
      .filter(Boolean)
      .map(c => ({
        label: c!.name,
        linkType: 'category' as const,
        targetId: c!.id,
        url: '',
        parentId: null,
        sortOrder: 0,
        isActive: true,
        openInNewTab: false,
      }));
    appendItems(rows);
    setSelectedCategories(new Set());
  };

  const addSelectedPosts = () => {
    if (!options) return;
    const rows = [...selectedPosts]
      .map(id => options.posts.find(p => p.id === id))
      .filter(Boolean)
      .map(p => ({
        label: p!.title,
        linkType: 'blog' as const,
        targetId: p!.id,
        url: '',
        parentId: null,
        sortOrder: 0,
        isActive: true,
        openInNewTab: false,
      }));
    appendItems(rows);
    setSelectedPosts(new Set());
  };

  const addCustomLink = () => {
    const label = customLabel.trim();
    const url = customUrl.trim();
    if (!label) {
      toast.error('Bağlantı metni girin.');
      return;
    }
    if (!url) {
      toast.error('URL girin.');
      return;
    }
    appendItems([
      {
        label,
        linkType: 'custom',
        targetId: null,
        url,
        parentId: null,
        sortOrder: 0,
        isActive: true,
        openInNewTab: false,
      },
    ]);
    setCustomLabel('');
    setCustomUrl('');
  };

  const updateItemAt = (index: number, patch: Partial<MenuItemPayload>) => {
    setItems(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const moveItem = (itemId: string, dir: -1 | 1) => {
    setItems(prev => {
      const siblings = getMenuSiblings(prev, itemId);
      const idx = siblings.findIndex(s => s.id === itemId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= siblings.length) return prev;
      const a = siblings[idx];
      const b = siblings[target];
      const sortA = a.sortOrder ?? 0;
      const sortB = b.sortOrder ?? 0;
      return prev.map(row => {
        if (row.id === a.id) return { ...row, sortOrder: sortB };
        if (row.id === b.id) return { ...row, sortOrder: sortA };
        return row;
      });
    });
  };

  const toggleExpand = (itemId: string) => {
    setExpandedId(cur => (cur === itemId ? null : itemId));
  };

  const setItemParent = (itemId: string, parentId: string | null) => {
    if (parentId && (parentId === itemId || isMenuDescendant(items, itemId, parentId))) {
      toast.error('Alt öğe üst menü olarak seçilemez.');
      return;
    }
    setItems(prev =>
      prev.map(row => (row.id === itemId ? { ...row, parentId: normalizeParentId(parentId) } : row)),
    );
  };

  const removeItem = (index: number) => {
    const removedId = items[index]?.id;
    setItems(prev => {
      const next = prev
        .filter((_, i) => i !== index)
        .map(row =>
          removedId && normalizeParentId(row.parentId) === removedId
            ? { ...row, parentId: null }
            : row,
        );
      return next.map((row, i) => ({ ...row, sortOrder: i }));
    });
    if (removedId && expandedId === removedId) setExpandedId(null);
  };

  const handleSave = async () => {
    for (const item of items) {
      const err = validateItem(item);
      if (err) {
        toast.error(`${item.label || 'Öğe'}: ${err}`);
        return;
      }
    }
    setSaving(true);
    try {
      const saved = await saveNavigationMenu(tab, {
        title: menuTitle.trim() || tabLabel,
        items: items.map((row, i) => ({
          ...row,
          id: row.id ?? newMenuItemId(),
          sortOrder: row.sortOrder ?? i,
          label: row.label.trim(),
          parentId: normalizeParentId(row.parentId),
        })),
      });
      const nextItems = sortItems(saved.items).map(menuItemFromRecord);
      setItems(nextItems);
      if (tab === 'HEADER') setHeaderMenu(saved);
      else setFooterMenu(saved);
      toast.success(`${tabLabel} kaydedildi.`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err instanceof Error ? err.message : 'Kayıt başarısız.');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const addMenuFooter = (onAdd: () => void, count: number, label = 'Menüye ekle') => (
    <button
      type="button"
      onClick={onAdd}
      disabled={count === 0}
      className="w-full mt-2 px-3 py-2 rounded-md bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {label}
      {count > 0 ? ` (${count})` : ''}
    </button>
  );

  const checkboxList = (
    list: Array<{ id: string; label: string }>,
    selected: Set<string>,
    onChange: (next: Set<string>) => void,
    emptyMsg: string,
  ) => (
    <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-md bg-white">
      {list.length === 0 ? (
        <p className="p-3 text-[12px] text-slate-500 text-center">{emptyMsg}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map(row => (
            <li key={row.id}>
              <label className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-[13px]">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-slate-300 text-indigo-600"
                  checked={selected.has(row.id)}
                  onChange={e =>
                    onChange(toggleSet(selected, row.id, e.target.checked))
                  }
                />
                <span className="text-slate-800 leading-snug">{row.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Menüler yükleniyor…</span>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] flex flex-col -mx-5 md:-mx-6 page-enter">
      {/* Üst başlık */}
      <header className="shrink-0 px-5 md:px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Menüler</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Soldan öğe seçip menüye ekleyin; sağda sıralayıp kaydedin. Boş menüde vitrin varsayılan
              bağlantıları kullanır.
            </p>
          </div>
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
            {(['HEADER', 'FOOTER'] as TabType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  tab === t
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'HEADER' ? 'Üst menü' : 'Footer menü'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* İki kolon — tam genişlik */}
      <div className="flex-1 px-5 md:px-6 py-5 bg-[#f0f0f1]">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-w-[1800px] mx-auto w-full items-start">
          {/* Sol: Menü öğeleri ekle */}
          <div className="xl:col-span-4 space-y-3">
            <h2 className="text-[14px] font-semibold text-slate-800 px-1">Menü öğeleri ekle</h2>

            <AccordionSection
              title="Sayfalar"
              open={openPanels.has('pages')}
              onToggle={() => togglePanel('pages')}
              footer={addMenuFooter(addSelectedPages, selectedPages.size)}
            >
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  className={`${contentInputCls} pl-8 text-[12px] py-1.5`}
                  placeholder="Sayfa ara…"
                  value={pageSearch}
                  onChange={e => setPageSearch(e.target.value)}
                />
              </div>
              {checkboxList(
                publishedPages.map(p => ({ id: p.id, label: p.title })),
                selectedPages,
                setSelectedPages,
                'Yayındaki sayfa yok.',
              )}
              {publishedPages.length > 0 && (
                <label className="flex items-center gap-2 mt-2 text-[12px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      publishedPages.length > 0 &&
                      publishedPages.every(p => selectedPages.has(p.id))
                    }
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedPages(new Set(publishedPages.map(p => p.id)));
                      } else {
                        setSelectedPages(new Set());
                      }
                    }}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  Tümünü seç
                </label>
              )}
            </AccordionSection>

            <AccordionSection
              title="Kategoriler"
              open={openPanels.has('categories')}
              onToggle={() => togglePanel('categories')}
              footer={addMenuFooter(addSelectedCategories, selectedCategories.size)}
            >
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  className={`${contentInputCls} pl-8 text-[12px] py-1.5`}
                  placeholder="Kategori ara…"
                  value={categorySearch}
                  onChange={e => setCategorySearch(e.target.value)}
                />
              </div>
              {checkboxList(
                filteredCategories.map(c => ({ id: c.id, label: c.name })),
                selectedCategories,
                setSelectedCategories,
                'Kategori bulunamadı.',
              )}
            </AccordionSection>

            <AccordionSection
              title="Blog yazıları"
              open={openPanels.has('blog')}
              onToggle={() => togglePanel('blog')}
              footer={addMenuFooter(addSelectedPosts, selectedPosts.size)}
            >
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  className={`${contentInputCls} pl-8 text-[12px] py-1.5`}
                  placeholder="Yazı ara…"
                  value={blogSearch}
                  onChange={e => setBlogSearch(e.target.value)}
                />
              </div>
              {checkboxList(
                publishedPosts.map(p => ({ id: p.id, label: p.title })),
                selectedPosts,
                setSelectedPosts,
                'Yayındaki blog yazısı yok.',
              )}
            </AccordionSection>

            <AccordionSection
              title="Özel bağlantılar"
              open={openPanels.has('custom')}
              onToggle={() => togglePanel('custom')}
              footer={addMenuFooter(addCustomLink, customLabel.trim() && customUrl.trim() ? 1 : 0)}
            >
              <div className="space-y-3">
                <ContentFormField label="Bağlantı metni">
                  <input
                    className={contentInputCls}
                    value={customLabel}
                    onChange={e => setCustomLabel(e.target.value)}
                    placeholder="Örn. Ana Sayfa"
                  />
                </ContentFormField>
                <ContentFormField label="URL" hint="/store/… veya https://…">
                  <input
                    className={contentInputCls}
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    placeholder="/store/urunler"
                  />
                </ContentFormField>
              </div>
            </AccordionSection>
          </div>

          {/* Sağ: Menü yapısı */}
          <div className="xl:col-span-8">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-h-[480px] flex flex-col">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-[15px] font-semibold text-slate-900">Menü yapısı</h2>
                <p className="text-[12px] text-slate-500 mt-1">
                  {tabLabel} — öğeleri sürüklemek yerine yukarı/aşağı ile sıralayın. Değişiklikler
                  vitrine &quot;Menüyü kaydet&quot; ile yansır.
                </p>
              </div>

              <div className="flex-1 p-4 sm:p-5">
                {items.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/80 py-16 px-6 text-center">
                    <p className="text-[14px] font-medium text-slate-700">
                      Soldaki bölümlerden öğe seçerek menünüzü oluşturun.
                    </p>
                    <p className="text-[12px] text-slate-500 mt-2 max-w-md mx-auto">
                      Sayfa, kategori veya blog işaretleyip &quot;Menüye ekle&quot; deyin;
                      özel bağlantı için metin ve URL girin.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayRows.map(({ item, index, depth }) => {
                      const itemId = item.id ?? `row-${index}`;
                      const expanded = expandedId === itemId;
                      const lt = item.linkType as MenuLinkType;
                      const active = item.isActive !== false;
                      const siblings = item.id ? getMenuSiblings(items, item.id) : [];
                      const siblingIdx = siblings.findIndex(s => s.id === item.id);
                      const parentOptions = items.filter(
                        other =>
                          other.id &&
                          item.id &&
                          other.id !== item.id &&
                          !isMenuDescendant(items, item.id, other.id),
                      );
                      return (
                        <div
                          key={itemId}
                          className={`border rounded-md bg-white shadow-sm overflow-hidden ${
                            expanded ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-slate-300'
                          } ${!active ? 'opacity-75' : ''}`}
                          style={{ marginLeft: depth > 0 ? `${depth * 1.25}rem` : undefined }}
                        >
                          <div className="flex items-stretch min-h-[44px]">
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => toggleExpand(itemId)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleExpand(itemId);
                                }
                              }}
                              className="flex-1 flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 min-w-0 cursor-pointer"
                            >
                              {expanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                              )}
                              <span
                                className={`flex-1 font-medium text-[14px] truncate ${
                                  active ? 'text-slate-900' : 'text-slate-500 line-through'
                                }`}
                              >
                                {item.label || 'Başlıksız'}
                              </span>
                              <span className="shrink-0 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {LINK_TYPE_LABELS[lt]}
                              </span>
                              {!active && (
                                <span className="shrink-0 text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                                  Pasif
                                </span>
                              )}
                            </div>
                            <div
                              className="flex items-center border-l border-slate-200"
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                disabled={!item.id || siblingIdx <= 0}
                                onClick={() => item.id && moveItem(item.id, -1)}
                                className="p-2 hover:bg-slate-50 disabled:opacity-30"
                                title="Yukarı (aynı seviye)"
                              >
                                <ArrowUp className="w-4 h-4 text-slate-600" />
                              </button>
                              <button
                                type="button"
                                disabled={!item.id || siblingIdx < 0 || siblingIdx >= siblings.length - 1}
                                onClick={() => item.id && moveItem(item.id, 1)}
                                className="p-2 hover:bg-slate-50 disabled:opacity-30 border-l border-slate-200"
                                title="Aşağı (aynı seviye)"
                              >
                                <ArrowDown className="w-4 h-4 text-slate-600" />
                              </button>
                            </div>
                          </div>

                          {expanded && (
                            <div className="px-4 py-4 border-t border-slate-200 bg-[#f6f7f7] space-y-3">
                              <ContentFormField label="Üst menü öğesi">
                                <select
                                  className={contentInputCls}
                                  value={normalizeParentId(item.parentId) ?? ''}
                                  onChange={e => {
                                    const v = e.target.value.trim();
                                    if (item.id) setItemParent(item.id, v || null);
                                  }}
                                >
                                  <option value="">Yok (üst seviye)</option>
                                  {parentOptions.map(other => (
                                    <option key={other.id} value={other.id}>
                                      {other.label || 'Başlıksız'}
                                    </option>
                                  ))}
                                </select>
                              </ContentFormField>

                              <ContentFormField label="Menüde görünen başlık">
                                <input
                                  className={contentInputCls}
                                  value={item.label}
                                  onChange={e =>
                                    updateItemAt(index, { label: e.target.value })
                                  }
                                />
                              </ContentFormField>

                              {lt === 'custom' ? (
                                <ContentFormField label="Hedef URL">
                                  <input
                                    className={contentInputCls}
                                    value={item.url ?? ''}
                                    onChange={e =>
                                      updateItemAt(index, { url: e.target.value })
                                    }
                                    placeholder="/store/urunler veya https://…"
                                  />
                                </ContentFormField>
                              ) : (
                                <ContentFormField label="Hedef bilgi">
                                  <p className="text-[12px] text-slate-700 bg-white border border-slate-200 rounded-md px-3 py-2">
                                    {resolveItemTarget(item, options)}
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-1">
                                    Hedefi değiştirmek için soldan yeni öğe ekleyip bunu silin.
                                  </p>
                                </ContentFormField>
                              )}

                              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.openInNewTab)}
                                  onChange={e =>
                                    updateItemAt(index, {
                                      openInNewTab: e.target.checked,
                                    })
                                  }
                                  className="rounded border-slate-300 text-indigo-600"
                                />
                                Yeni sekmede aç
                              </label>

                              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.isActive !== false}
                                  onChange={e =>
                                    updateItemAt(index, { isActive: e.target.checked })
                                  }
                                  className="rounded border-slate-300 text-indigo-600"
                                />
                                Menüde göster (aktif)
                              </label>

                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-rose-700 hover:text-rose-900"
                              >
                                <Trash2 className="w-4 h-4" />
                                Öğeyi kaldır
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-[12px] text-slate-600">
                  {items.length} öğe
                  {activeMenu?.updatedAt &&
                    ` · Son kayıt: ${new Date(activeMenu.updatedAt).toLocaleString('tr-TR')}`}
                </p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="btn btn-primary inline-flex items-center justify-center gap-2 text-[14px] font-semibold min-h-[42px] px-8 w-full sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Kaydediliyor…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Menüyü kaydet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
