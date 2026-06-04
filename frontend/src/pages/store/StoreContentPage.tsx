import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStorefrontTenant } from '../../storefront/hooks/useStorefrontTenant';
import { useStorefrontSeo } from '../../storefront/hooks/useStorefrontSeo';
import { storePublicClient } from '../../services/storePublicApi';
import type { ContentPage } from '../../types';

export default function StoreContentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { tenant, storeLink, loading: tenantLoading } = useStorefrontTenant();
  const [page, setPage] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.slug || !slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPage(null);
      try {
        const res = await storePublicClient.get(`/store/sayfa/${encodeURIComponent(slug)}`, {
          params: { tenant: tenant.slug },
        });
        if (cancelled) return;
        const body = res.data as { data?: ContentPage };
        setPage(body.data ?? null);
      } catch {
        if (!cancelled) setPage(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant?.slug, slug]);

  const seoMeta = useMemo(() => {
    if (!page || !tenant) return null;
    return {
      title: `${page.metaTitle?.trim() || page.title} · ${tenant.name}`,
      description: (page.metaDescription?.trim() || page.excerpt || '').slice(0, 160),
      canonicalPath: page.canonicalPath,
      image: page.coverImageUrl,
    };
  }, [page, tenant]);

  useStorefrontSeo({
    title: seoMeta?.title ?? tenant?.name ?? 'Sayfa',
    description: seoMeta?.description ?? '',
    canonicalPath: seoMeta?.canonicalPath,
    image: seoMeta?.image ?? undefined,
    type: 'website',
    tenant: tenant ?? undefined,
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

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Sayfa bulunamadı</h1>
        <Link to={storeLink('/store')} className="mt-4 inline-block text-indigo-600 font-medium">
          Mağazaya dön
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">{page.title}</h1>
        {page.excerpt && (
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">{page.excerpt}</p>
        )}
      </header>

      {page.coverImageUrl && (
        <img
          src={page.coverImageUrl}
          alt={page.title}
          className="w-full rounded-xl mb-8 aspect-video object-cover"
        />
      )}

      <div className="prose prose-slate max-w-none text-slate-800 whitespace-pre-wrap leading-relaxed">
        {page.content}
      </div>
    </article>
  );
}
