import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStorefrontTenant } from '../../storefront/hooks/useStorefrontTenant';
import { useStorefrontSeo } from '../../storefront/hooks/useStorefrontSeo';
import { storePublicClient } from '../../services/storePublicApi';
import type { Post } from '../../types';

export default function Blog() {
  const { tenant, storeLink, loading: tenantLoading } = useStorefrontTenant();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [listCanonical, setListCanonical] = useState<string | undefined>();

  useEffect(() => {
    if (!tenant?.slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await storePublicClient.get('/store/blog', {
          params: { tenant: tenant.slug },
        });
        if (cancelled) return;
        const body = res.data as { data?: Post[]; listCanonicalPath?: string };
        setPosts(Array.isArray(body.data) ? body.data : []);
        setListCanonical(body.listCanonicalPath);
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant?.slug]);

  const seoMeta = useMemo(() => {
    if (!tenant) return null;
    return {
      title: `Blog · ${tenant.name}`,
      description:
        tenant.siteDescription?.trim() ||
        `${tenant.name} blog — haberler, ipuçları ve güncel içerikler.`,
      canonicalPath: listCanonical ?? storeLink('/store/blog'),
    };
  }, [tenant, listCanonical, storeLink]);

  useStorefrontSeo({
    title: seoMeta?.title ?? 'Blog',
    description: seoMeta?.description ?? '',
    canonicalPath: seoMeta?.canonicalPath,
    tenant: tenant ?? undefined,
  });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  if (tenantLoading || !tenant) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
      <header className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Blog</h1>
        <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
          {tenant.name} — güncel yazılar ve ipuçları
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse h-64" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-center text-slate-500 py-12">Henüz yayınlanmış blog yazısı yok.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <Link
              key={post.id}
              to={storeLink(`/store/blog/${post.slug}`)}
              className="group rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              {post.coverImage ? (
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="aspect-video w-full object-cover group-hover:scale-[1.02] transition-transform"
                />
              ) : (
                <div className="aspect-video bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white/60 text-sm">
                  Blog
                </div>
              )}
              <div className="p-5">
                <p className="text-xs text-slate-500 mb-2">
                  {post.author.firstName} {post.author.lastName} ·{' '}
                  {formatDate(post.publishedAt || post.createdAt)}
                </p>
                {post.category && (
                  <span className="inline-block text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded mb-2">
                    {post.category}
                  </span>
                )}
                <h2 className="text-lg font-semibold text-slate-900 line-clamp-2">{post.title}</h2>
                {post.excerpt && (
                  <p className="mt-2 text-sm text-slate-600 line-clamp-3">{post.excerpt}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
