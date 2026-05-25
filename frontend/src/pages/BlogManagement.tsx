import { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '../components/ui';
import { generateSlug } from '../utils/seo';
import api from '../services/api';
import type { Post } from '../types';

export default function BlogManagement() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    coverImage: '',
    isPublished: false,
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await api.get('/blog');
      setPosts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPost) {
        await api.put(`/blog/${editingPost.id}`, formData);
      } else {
        await api.post('/blog', formData);
      }

      setShowForm(false);
      setEditingPost(null);
      setFormData({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        coverImage: '',
        isPublished: false,
      });
      fetchPosts();
    } catch (error) {
      console.error('Failed to save post:', error);
      alert('Yazı kaydedilemedi');
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || '',
      coverImage: post.coverImage || '',
      isPublished: post.isPublished,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yazıyı silmek istediğinizden emin misiniz?')) return;

    try {
      await api.delete(`/blog/${id}`);
      fetchPosts();
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Yazı silinemedi');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Blog Yönetimi</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'İptal' : 'Yeni Yazı'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {editingPost ? 'Yazıyı Düzenle' : 'Yeni Yazı Ekle'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Başlık *"
              value={formData.title}
              onChange={handleTitleChange}
              required
              placeholder="Yazı başlığı"
            />

            <Input
              label="Slug *"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
              placeholder="yazi-slug"
              helperText="URL'de görünecek kısım"
            />

            <Input
              label="Kapak Görseli URL"
              value={formData.coverImage}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Özet
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Kısa açıklama (opsiyonel)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İçerik *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="HTML içerik..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
                Yayınla
              </label>
            </div>

            <div className="flex gap-3">
              <Button type="submit" fullWidth>
                {editingPost ? 'Güncelle' : 'Kaydet'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingPost(null);
                }}
              >
                İptal
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Başlık</th>
                <th className="text-left py-3 px-4">Durum</th>
                <th className="text-left py-3 px-4">Yazar</th>
                <th className="text-left py-3 px-4">Tarih</th>
                <th className="text-right py-3 px-4">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{post.title}</div>
                    <div className="text-sm text-gray-500">/blog/{post.slug}</div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={post.isPublished ? 'success' : 'gray'}>
                      {post.isPublished ? 'Yayında' : 'Taslak'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {post.author.firstName} {post.author.lastName}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {formatDate(post.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(post)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {posts.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              Henüz blog yazısı yok
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
