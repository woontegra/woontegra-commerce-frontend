import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStorefrontTenant } from '../../storefront/hooks/useStorefrontTenant';
import { useStorefrontSeo } from '../../storefront/hooks/useStorefrontSeo';
import { storePublicClient } from '../../services/storePublicApi';
import type { Post } from '../../types';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { tenant, storeLink, loading: tenantLoading } = useStorefrontTenant();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.slug || !slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPost(null);
      try {
        const res = await storePublicClient.get(`/store/blog/${encodeURIComponent(slug)}`, {
          params: { tenant: tenant.slug },
        });
        if (cancelled) return;
        const body = res.data as { data?: Post };
        setPost(body.data ?? null);
      } catch {
        if (!cancelled) setPost(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant?.slug, slug]);

  const seoMeta = useMemo(() => {
    if (!post || !tenant) return null;
    return {
      title: `${post.metaTitle?.trim() || post.title} · ${tenant.name}`,
      description: (post.metaDescription?.trim() || post.excerpt || '').slice(0, 160),
      canonicalPath: post.canonicalPath,
      image: post.coverImage,
    };
  }, [post, tenant]);

  useStorefrontSeo({
    title: seoMeta?.title ?? tenant?.name ?? 'Blog',
    description: seoMeta?.description ?? '',
    canonicalPath: seoMeta?.canonicalPath,
    image: seoMeta?.image,
    type: 'article',
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
      <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="aspect-video bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Yazı bulunamadı</h1>
        <Link to={storeLink('/store/blog')} className="mt-4 inline-block text-indigo-600 font-medium">
          Blog&apos;a dön
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <Link to={storeLink('/store/blog')} className="text-sm text-indigo-600 font-medium hover:underline">
        ← Blog
      </Link>

      <header className="mt-6 mb-8">
        {post.category && (
          <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
            {post.category}
          </span>
        )}
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900">{post.title}</h1>
        <p className="mt-3 text-sm text-slate-500">
          {post.author.firstName} {post.author.lastName} · {formatDate(post.publishedAt || post.createdAt)}
        </p>
        {post.tags && post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {post.coverImage && (
        <img
          src={post.coverImage}
          alt={post.title}
          className="w-full rounded-xl mb-8 aspect-video object-cover"
        />
      )}

      {post.excerpt && (
        <p className="text-lg text-slate-600 mb-6 leading-relaxed">{post.excerpt}</p>
      )}

      <div className="prose prose-slate max-w-none text-slate-800 whitespace-pre-wrap leading-relaxed">
        {post.content}
      </div>
    </article>
  );
}
