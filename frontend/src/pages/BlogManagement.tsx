import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Table } from '../components/ui/Table';
import MediaImageField from '../components/media/MediaImageField';
import { useSlugAutoLock } from '../hooks/useSlugAutoLock';
import { resolveSlugForSave, SLUG_FIELD_HELP } from '../utils/autoSlugField';
import {
  ContentFormField,
  contentInputCls,
  contentTextareaCls,
} from '../components/forms/ContentFormFields';
import type { Post } from '../types';

type PostForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
  publishedAt: string;
};

const META_TITLE_MAX = 60;
const META_DESC_MAX = 160;

const emptyForm = (): PostForm => ({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  category: '',
  tags: '',
  metaTitle: '',
  metaDescription: '',
  isPublished: false,
  publishedAt: '',
});

function toForm(post: Post): PostForm {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    content: post.content,
    coverImage: post.coverImage ?? '',
    category: post.category ?? '',
    tags: (post.tags ?? []).join(', '),
    metaTitle: post.metaTitle ?? '',
    metaDescription: post.metaDescription ?? '',
    isPublished: post.isPublished,
    publishedAt: post.publishedAt ? post.publishedAt.slice(0, 16) : '',
  };
}

function payloadFromForm(form: PostForm) {
  return {
    title: form.title.trim(),
    slug: resolveSlugForSave(form.title, form.slug),
    excerpt: form.excerpt.trim() || null,
    content: form.content,
    coverImage: form.coverImage.trim() || null,
    category: form.category.trim() || null,
    tags: form.tags,
    metaTitle: form.metaTitle.trim() || null,
    metaDescription: form.metaDescription.trim() || null,
    isPublished: form.isPublished,
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

function GooglePreview({
  title,
  description,
  slug,
}: {
  title: string;
  description: string;
  slug: string;
}) {
  const displayTitle = title.trim() || 'Blog yazısı başlığı';
  const displayDesc =
    description.trim() ||
    'Meta açıklama burada görünür. Arama sonuçlarında tıklanma oranını artırmak için net ve özgün bir metin yazın.';
  const displayUrl = slug.trim() ? `magazaniz.com › blog › ${slug.trim()}` : 'magazaniz.com › blog › yazi-slug';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Google önizleme</p>
      <p className="text-[12px] text-emerald-700 truncate">{displayUrl}</p>
      <p className="text-[15px] text-[#1a0dab] font-medium leading-snug mt-0.5 line-clamp-2">{displayTitle}</p>
      <p className="text-[13px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">{displayDesc}</p>
    </div>
  );
}

export default function BlogManagement() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState<PostForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const slugAuto = useSlugAutoLock();

  const seoTitle = useMemo(
    () => form.metaTitle.trim() || form.title.trim(),
    [form.metaTitle, form.title],
  );
  const seoDescription = useMemo(
    () => form.metaDescription.trim() || form.excerpt.trim(),
    [form.metaDescription, form.excerpt],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/blog');
      setPosts(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      toast.error('Blog yazıları yüklenemedi.');
      setPosts([]);
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

  const openEdit = (post: Post) => {
    setEditing(post);
    setForm(toForm(post));
    slugAuto.resetForEdit();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const setField = (field: keyof PostForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const value = field === 'isPublished' ? (e.target as HTMLInputElement).checked : e.target.value;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Başlık ve içerik zorunludur.');
      return;
    }
    setSaving(true);
    try {
      const body = payloadFromForm(form);
      if (editing) {
        await api.put(`/blog/${editing.id}`, body);
        toast.success('Blog yazısı güncellendi.');
      } else {
        await api.post('/blog', body);
        toast.success('Blog yazısı oluşturuldu.');
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

  const handleDelete = async (post: Post) => {
    if (!confirm(`"${post.title}" silinsin mi?`)) return;
    try {
      await api.delete(`/blog/${post.id}`);
      toast.success('Blog yazısı silindi.');
      await load();
    } catch {
      toast.error('Silme başarısız.');
    }
  };

  if (showForm) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col page-enter -mx-4 sm:-mx-6 lg:-mx-8">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={closeForm}
              className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Blog listesi
            </button>
            <span className="text-slate-300">|</span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                {editing ? 'Yazıyı düzenle' : 'Yeni blog yazısı'}
              </h1>
              <p className="text-[12px] text-slate-500 hidden sm:block">
                İçeriği solda yazın; yayın ve SEO ayarları sağ panelde.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="btn btn-secondary text-[13px]" onClick={closeForm}>
              İptal
            </button>
            <button
              type="submit"
              form="blog-post-form"
              className="btn btn-primary text-[13px]"
              disabled={saving}
            >
              {saving ? 'Kaydediliyor…' : editing ? 'Güncelle' : 'Yayınla / Kaydet'}
            </button>
          </div>
        </header>

        <form
          id="blog-post-form"
          onSubmit={handleSubmit}
          className="flex-1 px-4 sm:px-6 lg:px-8 py-6 bg-slate-50/80"
        >
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-[1600px] mx-auto w-full">
            {/* Sol: içerik */}
            <div className="xl:col-span-2 space-y-5">
              <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 sm:p-6 space-y-5">
                <h2 className="text-[14px] font-semibold text-slate-800 border-b border-slate-100 pb-3">
                  İçerik
                </h2>

                <ContentFormField label="Başlık" required>
                  <input
                    className={contentInputCls}
                    value={form.title}
                    onChange={setField('title')}
                    placeholder="Örn. 2026 e-ticaret trendleri"
                    required
                  />
                </ContentFormField>

                <ContentFormField
                  label="Yazı bağlantısı"
                  hint={`Vitrin: /store/blog/... · ${SLUG_FIELD_HELP}`}
                >
                  <input
                    className={`${contentInputCls} font-mono text-[12px]`}
                    value={form.slug}
                    onChange={setField('slug')}
                    placeholder="2026-e-ticaret-trendleri"
                  />
                </ContentFormField>

                <ContentFormField label="Özet" hint="Liste ve arama sonuçlarında kısa tanım">
                  <textarea
                    className={contentTextareaCls}
                    rows={3}
                    value={form.excerpt}
                    onChange={setField('excerpt')}
                    placeholder="Yazının kısa özeti (1–2 cümle)"
                  />
                </ContentFormField>

                <ContentFormField label="İçerik" required>
                  <textarea
                    className={`${contentTextareaCls} min-h-[420px] leading-relaxed`}
                    value={form.content}
                    onChange={setField('content')}
                    placeholder="Blog yazısının tam metnini buraya yazın…"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {form.content.length.toLocaleString('tr-TR')} karakter
                  </p>
                </ContentFormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 items-start">
                  <ContentFormField label="Kategori">
                    <input
                      className={contentInputCls}
                      value={form.category}
                      onChange={setField('category')}
                      placeholder="Örn. E-ticaret"
                    />
                  </ContentFormField>
                  <ContentFormField label="Etiketler" hint="Virgülle ayırın" hintInline>
                    <input
                      className={contentInputCls}
                      value={form.tags}
                      onChange={setField('tags')}
                      placeholder="trend, ipucu, rehber"
                    />
                  </ContentFormField>
                </div>
              </section>
            </div>

            {/* Sağ: yayın + görsel + SEO */}
            <div className="space-y-5">
              <SidebarCard title="Yayın ayarları">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={setField('isPublished')}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <span className="block text-[13px] font-medium text-slate-800">Yayında</span>
                      <span className="block text-[11px] text-slate-500">
                        İşaretliyse vitrinde görünür
                      </span>
                    </span>
                  </label>
                </div>
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
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    form.isPublished
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                      : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${form.isPublished ? 'bg-emerald-500' : 'bg-slate-400'}`}
                  />
                  {form.isPublished ? 'Vitrinde yayınlanacak' : 'Taslak'}
                </div>
              </SidebarCard>

              <SidebarCard title="Kapak görseli">
                <MediaImageField
                  label=""
                  value={form.coverImage}
                  onChange={url => setForm(f => ({ ...f, coverImage: url }))}
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
                    placeholder={form.title || 'Boşsa yazı başlığı kullanılır'}
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
      header: 'Başlık',
      cell: (row: Post) => (
        <div className="flex items-center gap-3 min-w-0 py-1">
          {row.coverImage ? (
            <img
              src={row.coverImage}
              alt=""
              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <span className="font-medium text-slate-900 block truncate">{row.title}</span>
            <span className="text-[11px] text-slate-400 font-mono truncate block">/blog/{row.slug}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      cell: (row: Post) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
            row.isPublished
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
          }`}
        >
          {row.isPublished ? 'Yayında' : 'Taslak'}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Kategori',
      cell: (row: Post) => (
        <span className="text-[13px] text-slate-600">{row.category ?? '—'}</span>
      ),
    },
    {
      key: 'publishedAt',
      header: 'Yayın',
      cell: (row: Post) => (
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
      cell: (row: Post) => (
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
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Blog Yönetimi</h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xl">
            Mağaza vitrininde yayınlanan blog yazılarını oluşturun ve düzenleyin.
          </p>
        </div>
        <button type="button" className="btn btn-primary text-[13px] shrink-0" onClick={openCreate}>
          + Yeni blog yazısı
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="wn-card px-4 py-3">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Toplam</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{posts.length}</p>
        </div>
        <div className="wn-card px-4 py-3">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Yayında</p>
          <p className="text-xl font-semibold text-emerald-700 mt-1">
            {posts.filter(p => p.isPublished).length}
          </p>
        </div>
        <div className="wn-card px-4 py-3">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Taslak</p>
          <p className="text-xl font-semibold text-amber-700 mt-1">
            {posts.filter(p => !p.isPublished).length}
          </p>
        </div>
        <div className="wn-card px-4 py-3 hidden sm:block">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Vitrin</p>
          <p className="text-[13px] font-medium text-indigo-600 mt-1.5">/store/blog</p>
        </div>
      </div>

      <div className="wn-card overflow-hidden border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-semibold text-slate-800">Tüm yazılar</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">{posts.length} kayıt</p>
          </div>
        </div>
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Table
            data={posts}
            columns={columns}
            keyExtractor={row => row.id}
            stickyHeader
            emptyState={
              <div className="empty-state py-16 px-6">
                <p className="empty-state-title">Henüz blog yazısı yok</p>
                <p className="empty-state-desc mx-auto max-w-md">
                  İlk profesyonel içeriğinizi oluşturun; vitrin blog sayfasında listelenir.
                </p>
                <button type="button" className="btn btn-primary text-[13px] mt-4" onClick={openCreate}>
                  İlk yazıyı oluştur
                </button>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
