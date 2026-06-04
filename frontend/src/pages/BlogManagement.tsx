import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Table } from '../components/ui/Table';
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

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
    slug: form.slug.trim(),
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

export default function BlogManagement() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState<PostForm>(emptyForm());
  const [saving, setSaving] = useState(false);

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
    setShowForm(true);
  };

  const openEdit = (post: Post) => {
    setEditing(post);
    setForm(toForm(post));
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
      if (field === 'title' && !editing && typeof value === 'string') {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      toast.error('Başlık, slug ve içerik zorunludur.');
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
      <div className="w-full max-w-3xl space-y-6 pb-10 page-enter">
        <div className="flex items-center gap-3">
          <button type="button" onClick={closeForm} className="text-slate-600 hover:text-slate-900">
            ← Geri
          </button>
          <h1 className="text-xl font-semibold text-slate-900">
            {editing ? 'Blog Yazısını Düzenle' : 'Yeni Blog Yazısı'}
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="wn-card p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Başlık *</span>
              <input className="input mt-1 w-full" value={form.title} onChange={setField('title')} required />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Slug *</span>
              <input className="input mt-1 w-full font-mono text-sm" value={form.slug} onChange={setField('slug')} required />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Özet</span>
            <textarea className="input mt-1 w-full" rows={2} value={form.excerpt} onChange={setField('excerpt')} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">İçerik *</span>
            <textarea className="input mt-1 w-full font-mono text-sm" rows={12} value={form.content} onChange={setField('content')} required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Kapak görseli URL</span>
              <input className="input mt-1 w-full" value={form.coverImage} onChange={setField('coverImage')} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Kategori</span>
              <input className="input mt-1 w-full" value={form.category} onChange={setField('category')} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Etiketler (virgülle)</span>
            <input className="input mt-1 w-full" value={form.tags} onChange={setField('tags')} placeholder="e-ticaret, ipucu" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">SEO başlığı</span>
              <input className="input mt-1 w-full" value={form.metaTitle} onChange={setField('metaTitle')} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Meta açıklama</span>
              <input className="input mt-1 w-full" value={form.metaDescription} onChange={setField('metaDescription')} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPublished} onChange={setField('isPublished')} />
              <span>Yayında</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Yayın tarihi</span>
              <input
                type="datetime-local"
                className="input mt-1"
                value={form.publishedAt}
                onChange={setField('publishedAt')}
              />
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Kaydediliyor…' : editing ? 'Güncelle' : 'Oluştur'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={closeForm}>
              İptal
            </button>
          </div>
        </form>
      </div>
    );
  }

  const columns = [
    {
      key: 'title',
      header: 'Başlık',
      cell: (row: Post) => <span className="font-medium text-slate-900">{row.title}</span>,
    },
    {
      key: 'status',
      header: 'Durum',
      cell: (row: Post) => (
        <span className={row.isPublished ? 'text-emerald-700' : 'text-slate-500'}>
          {row.isPublished ? 'Yayında' : 'Taslak'}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Kategori',
      cell: (row: Post) => row.category ?? '—',
    },
    {
      key: 'publishedAt',
      header: 'Yayın',
      cell: (row: Post) =>
        row.publishedAt
          ? new Date(row.publishedAt).toLocaleDateString('tr-TR')
          : '—',
    },
    {
      key: 'actions',
      header: 'İşlem',
      align: 'right' as const,
      cell: (row: Post) => (
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary text-xs" onClick={() => openEdit(row)}>
            Düzenle
          </button>
          <button type="button" className="btn btn-secondary text-xs text-red-600" onClick={() => handleDelete(row)}>
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
          <p className="text-[13px] text-slate-500 mt-1">Mağaza vitrininde yayınlanan blog yazılarını yönetin.</p>
        </div>
        <button type="button" className="btn btn-primary text-[13px] shrink-0" onClick={openCreate}>
          Yeni Blog Yazısı
        </button>
      </div>

      <div className="wn-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-[13px] font-semibold text-slate-800">Blog yazıları</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">{posts.length} kayıt</p>
        </div>
        {loading ? (
          <p className="p-8 text-center text-slate-500 text-sm">Yükleniyor…</p>
        ) : (
          <Table
            data={posts}
            columns={columns}
            keyExtractor={row => row.id}
            stickyHeader
            emptyState={
              <div className="empty-state py-14 px-6">
                <p className="empty-state-title">Henüz blog yazısı yok.</p>
                <p className="empty-state-desc">İlk yazınızı oluşturun; vitrin /store/blog sayfasında listelenir.</p>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
