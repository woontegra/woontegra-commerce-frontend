import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Table } from '../components/ui/Table';
import MediaImageField from '../components/media/MediaImageField';
import { useSlugAutoLock } from '../hooks/useSlugAutoLock';
import { resolveSlugForSave, SLUG_FIELD_HELP } from '../utils/autoSlugField';
import {
  ContentFieldLabel,
  ContentFormField,
  contentInputCls,
  contentTextareaCls,
} from '../components/forms/ContentFormFields';
import type { ContentPage } from '../types';

type PageForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  status: 'draft' | 'published';
  metaTitle: string;
  metaDescription: string;
  showInHeader: boolean;
  showInFooter: boolean;
  sortOrder: string;
  publishedAt: string;
};

const META_TITLE_MAX = 60;
const META_DESC_MAX = 160;

const emptyForm = (): PageForm => ({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImageUrl: '',
  status: 'draft',
  metaTitle: '',
  metaDescription: '',
  showInHeader: false,
  showInFooter: false,
  sortOrder: '0',
  publishedAt: '',
});

function toForm(page: ContentPage): PageForm {
  return {
    title: page.title,
    slug: page.slug,
    excerpt: page.excerpt ?? '',
    content: page.content,
    coverImageUrl: page.coverImageUrl ?? '',
    status: page.status === 'published' ? 'published' : 'draft',
    metaTitle: page.metaTitle ?? '',
    metaDescription: page.metaDescription ?? '',
    showInHeader: page.showInHeader,
    showInFooter: page.showInFooter,
    sortOrder: String(page.sortOrder ?? 0),
    publishedAt: page.publishedAt ? page.publishedAt.slice(0, 16) : '',
  };
}

function payloadFromForm(form: PageForm) {
  return {
    title: form.title.trim(),
    slug: resolveSlugForSave(form.title, form.slug),
    excerpt: form.excerpt.trim() || null,
    content: form.content,
    coverImageUrl: form.coverImageUrl.trim() || null,
    status: form.status,
    metaTitle: form.metaTitle.trim() || null,
    metaDescription: form.metaDescription.trim() || null,
    showInHeader: form.showInHeader,
    showInFooter: form.showInFooter,
    sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
    publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
  };
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const over = current > max;
  return (
    <span className={`text-[11px] tabular-nums ${over ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
      {current}/{max}
    </span>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <h3 className="text-[13px] font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function GooglePreview({ title, description, slug }: { title: string; description: string; slug: string }) {
  const displayTitle = title.trim() || 'Sayfa başlığı';
  const displayDesc =
    description.trim() ||
    'Meta açıklama burada görünür. Arama sonuçlarında tıklanma oranını artırmak için net ve özgün bir metin yazın.';
  const path = slug.trim() ? `/store/sayfa/${slug.trim()}` : '/store/sayfa/sayfa-slug';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Google önizleme</p>
      <p className="text-[12px] text-emerald-700 truncate font-mono">{path}</p>
      <p className="text-[15px] text-[#1a0dab] font-medium leading-snug mt-0.5 line-clamp-2">{displayTitle}</p>
      <p className="text-[13px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">{displayDesc}</p>
    </div>
  );
}

function StatusOption({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        active
          ? 'border-indigo-300 bg-indigo-50/80 ring-1 ring-indigo-200'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-indigo-500' : 'bg-slate-300'}`}
        />
        <span className="block text-[13px] font-medium text-slate-800">{label}</span>
      </span>
      <span className="block text-[11px] text-slate-500 mt-1 ml-4">{description}</span>
    </button>
  );
}

export default function PagesManagement() {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContentPage | null>(null);
  const [form, setForm] = useState<PageForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const slugAuto = useSlugAutoLock();

  const publishedCount = useMemo(
    () => pages.filter(p => p.status === 'published').length,
    [pages],
  );
  const draftCount = pages.length - publishedCount;

  const seoTitle = useMemo(() => form.metaTitle.trim() || form.title.trim(), [form.metaTitle, form.title]);
  const seoDescription = useMemo(
    () => form.metaDescription.trim() || form.excerpt.trim(),
    [form.metaDescription, form.excerpt],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/content-pages');
      setPages(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Sayfalar yüklenemedi.';
      toast.error(msg);
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    slugAuto.resetForCreate();
    setShowForm(true);
  };

  const openEdit = (page: ContentPage) => {
    setEditing(page);
    setForm(toForm(page));
    slugAuto.resetForEdit();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const setField = (field: keyof PageForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const el = e.target;
    const value =
      field === 'showInHeader' || field === 'showInFooter'
        ? (el as HTMLInputElement).checked
        : el.value;
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'title' && typeof value === 'string') {
        const synced = slugAuto.slugFromSourceIfUnlocked(value);
        if (synced !== null) next.slug = synced;
      }
      if (field === 'slug' && typeof value === 'string') {
        slugAuto.onSlugInputChange(value);
      }
      return next;
    });
  };

  const setStatus = (status: 'draft' | 'published') => {
    setForm(prev => ({ ...prev, status }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Başlık zorunludur.');
      return;
    }
    setSaving(true);
    try {
      const body = payloadFromForm(form);
      if (editing) {
        await api.put(`/content-pages/${editing.id}`, body);
        toast.success('Sayfa güncellendi.');
      } else {
        await api.post('/content-pages', body);
        toast.success('Sayfa oluşturuldu.');
      }
      closeForm();
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Kayıt başarısız.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (page: ContentPage) => {
    if (!confirm(`"${page.title}" silinsin mi?`)) return;
    try {
      await api.delete(`/content-pages/${page.id}`);
      toast.success('Sayfa silindi.');
      await load();
    } catch {
      toast.error('Silme başarısız.');
    }
  };

  if (showForm) {
    const isPublished = form.status === 'published';

    return (
      <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col page-enter -mx-4 sm:-mx-6 lg:-mx-8">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={closeForm}
              className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Sayfa listesi
            </button>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                {editing ? 'Sayfayı düzenle' : 'Yeni sayfa oluştur'}
              </h1>
              <p className="text-[12px] text-slate-500 hidden sm:block">
                İçeriği solda düzenleyin; yayın, görünürlük ve SEO sağ panelde.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="btn btn-secondary text-[13px]" onClick={closeForm}>
              İptal
            </button>
            <button
              type="submit"
              form="content-page-form"
              className="btn btn-primary text-[13px]"
              disabled={saving}
            >
              {saving ? 'Kaydediliyor…' : editing ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </header>

        <form
          id="content-page-form"
          onSubmit={handleSubmit}
          className="flex-1 px-4 sm:px-6 lg:px-8 py-6 bg-slate-50/80"
        >
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-[1600px] mx-auto w-full">
            <div className="xl:col-span-2 space-y-5">
              <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 sm:p-6 space-y-5">
                <h2 className="text-[14px] font-semibold text-slate-800 border-b border-slate-100 pb-3">
                  Sayfa içeriği
                </h2>

                <ContentFormField label="Başlık" required>
                  <input
                    className={contentInputCls}
                    value={form.title}
                    onChange={setField('title')}
                    placeholder="Örn. Hakkımızda"
                    required
                  />
                </ContentFormField>

                <ContentFormField
                  label="Sayfa adresi"
                  hint={`Vitrin: /store/sayfa/... · ${SLUG_FIELD_HELP}`}
                >
                  <input
                    className={`${contentInputCls} font-mono text-[12px]`}
                    value={form.slug}
                    onChange={setField('slug')}
                    placeholder="hakkimizda"
                  />
                </ContentFormField>

                <ContentFormField label="Özet" hint="Üstte görünen kısa tanım (isteğe bağlı)">
                  <textarea
                    className={contentTextareaCls}
                    rows={3}
                    value={form.excerpt}
                    onChange={setField('excerpt')}
                    placeholder="Sayfanın kısa özeti (1–2 cümle)"
                  />
                </ContentFormField>

                <ContentFormField label="İçerik">
                  <textarea
                    className={`${contentTextareaCls} min-h-[480px] leading-relaxed`}
                    value={form.content}
                    onChange={setField('content')}
                    placeholder="Sayfa metnini buraya yazın. Paragraflar arasında boş satır bırakabilirsiniz…"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {form.content.length.toLocaleString('tr-TR')} karakter
                  </p>
                </ContentFormField>
              </section>
            </div>

            <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <SidebarCard title="Yayın ayarları">
                <div className="space-y-2">
                  <ContentFieldLabel>Yayın durumu</ContentFieldLabel>
                  <StatusOption
                    active={form.status === 'draft'}
                    label="Taslak"
                    description="Vitrinde görünmez"
                    onClick={() => setStatus('draft')}
                  />
                  <StatusOption
                    active={form.status === 'published'}
                    label="Yayında"
                    description="Vitrinde /store/sayfa/… adresinde yayınlanır"
                    onClick={() => setStatus('published')}
                  />
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    isPublished
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                      : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-slate-400'}`}
                  />
                  {isPublished ? 'Vitrinde yayınlanacak' : 'Taslak olarak saklanacak'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 items-start">
                  <ContentFormField
                    label="Yayın tarihi"
                    hint="Boş bırakılırsa yayın anı kullanılır"
                    hintInline
                  >
                    <input
                      type="datetime-local"
                      className={contentInputCls}
                      value={form.publishedAt}
                      onChange={setField('publishedAt')}
                    />
                  </ContentFormField>
                  <ContentFormField
                    label="Sıra"
                    hint="Menü sıralaması (küçük numara önce)"
                    hintInline
                  >
                    <input
                      type="number"
                      className={contentInputCls}
                      value={form.sortOrder}
                      onChange={setField('sortOrder')}
                      min={0}
                    />
                  </ContentFormField>
                </div>
              </SidebarCard>

              <SidebarCard title="Görünürlük">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.showInHeader}
                    onChange={setField('showInHeader')}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-[13px] font-medium text-slate-800">Header&apos;da göster</span>
                    <span className="block text-[11px] text-slate-500">Üst menüde listelensin</span>
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.showInFooter}
                    onChange={setField('showInFooter')}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-[13px] font-medium text-slate-800">Footer&apos;da göster</span>
                    <span className="block text-[11px] text-slate-500">Alt menüde listelensin</span>
                  </span>
                </label>
              </SidebarCard>

              <SidebarCard title="Kapak görseli">
                <MediaImageField
                  label=""
                  value={form.coverImageUrl}
                  onChange={url => setForm(f => ({ ...f, coverImageUrl: url }))}
                  pickerTitle="Kapak görseli seç"
                  uploadFolder="banners"
                  emptyHint="Medya kütüphanesinden seçin veya yükleyin"
                  inputClassName={contentInputCls}
                />
              </SidebarCard>

              <SidebarCard title="SEO">
                <ContentFormField
                  label="SEO başlığı"
                  counter={<CharCounter current={form.metaTitle.length} max={META_TITLE_MAX} />}
                >
                  <input
                    className={contentInputCls}
                    value={form.metaTitle}
                    onChange={setField('metaTitle')}
                    placeholder={form.title || 'Boşsa sayfa başlığı kullanılır'}
                  />
                </ContentFormField>
                <ContentFormField
                  label="Meta açıklama"
                  counter={<CharCounter current={form.metaDescription.length} max={META_DESC_MAX} />}
                >
                  <textarea
                    className={contentTextareaCls}
                    rows={4}
                    value={form.metaDescription}
                    onChange={setField('metaDescription')}
                    placeholder={form.excerpt || 'Boşsa özet metin kullanılır'}
                  />
                </ContentFormField>
                <GooglePreview title={seoTitle} description={seoDescription} slug={form.slug} />
              </SidebarCard>
            </div>
          </div>
        </form>
      </div>
    );
  }

  const columns = [
    {
      key: 'title',
      header: 'Sayfa',
      cell: (row: ContentPage) => (
        <div className="flex items-center gap-3 min-w-0 py-1">
          {row.coverImageUrl ? (
            <img
              src={row.coverImageUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <span className="font-medium text-slate-900 block truncate">{row.title}</span>
            <span className="text-[11px] text-slate-400 font-mono truncate block">
              /store/sayfa/{row.slug}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      cell: (row: ContentPage) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
            row.status === 'published'
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
          }`}
        >
          {row.status === 'published' ? 'Yayında' : 'Taslak'}
        </span>
      ),
    },
    {
      key: 'visibility',
      header: 'Menü',
      cell: (row: ContentPage) => (
        <div className="flex flex-wrap gap-1">
          {row.showInHeader && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              Header
            </span>
          )}
          {row.showInFooter && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              Footer
            </span>
          )}
          {!row.showInHeader && !row.showInFooter && (
            <span className="text-[12px] text-slate-400">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'sortOrder',
      header: 'Sıra',
      cell: (row: ContentPage) => (
        <span className="text-[13px] text-slate-600 tabular-nums">{row.sortOrder}</span>
      ),
    },
    {
      key: 'publishedAt',
      header: 'Yayın',
      cell: (row: ContentPage) => (
        <span className="text-[13px] text-slate-600 tabular-nums">
          {row.publishedAt
            ? new Date(row.publishedAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'İşlem',
      align: 'right' as const,
      cell: (row: ContentPage) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-secondary text-[12px] px-3 py-1.5"
            onClick={() => openEdit(row)}
          >
            Düzenle
          </button>
          <button
            type="button"
            className="btn btn-secondary text-[12px] px-3 py-1.5 text-red-600 hover:bg-red-50"
            onClick={() => handleDelete(row)}
          >
            Sil
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6 pb-10 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Sayfalar</h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xl">
            Hakkımızda, iletişim ve özel içerik sayfalarını oluşturun. Vitrin: /store/sayfa/…
          </p>
        </div>
        <button type="button" className="btn btn-primary text-[13px] shrink-0" onClick={openCreate}>
          + Yeni sayfa
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="wn-card px-4 py-3 border border-slate-200/80">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Toplam</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{pages.length}</p>
        </div>
        <div className="wn-card px-4 py-3 border border-slate-200/80">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Yayında</p>
          <p className="text-xl font-semibold text-emerald-700 mt-1">{publishedCount}</p>
        </div>
        <div className="wn-card px-4 py-3 border border-slate-200/80">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Taslak</p>
          <p className="text-xl font-semibold text-amber-700 mt-1">{draftCount}</p>
        </div>
        <div className="wn-card px-4 py-3 hidden sm:block border border-slate-200/80">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Vitrin</p>
          <p className="text-[13px] font-medium text-indigo-600 mt-1.5 font-mono">/store/sayfa/…</p>
        </div>
      </div>

      <div className="wn-card overflow-hidden border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-[13px] font-semibold text-slate-800">Tüm sayfalar</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">{pages.length} kayıt</p>
        </div>
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Table
            data={pages}
            columns={columns}
            keyExtractor={row => row.id}
            stickyHeader
            emptyState={
              <div className="empty-state py-16 px-6">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="empty-state-title">Henüz sayfa yok</p>
                <p className="empty-state-desc mx-auto max-w-md">
                  Hakkımızda, iletişim veya KVKK gibi statik sayfalar oluşturun; vitrinde /store/sayfa/…
                  adresinde yayınlanır.
                </p>
                <button type="button" className="btn btn-primary text-[13px] mt-4" onClick={openCreate}>
                  İlk sayfayı oluştur
                </button>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
