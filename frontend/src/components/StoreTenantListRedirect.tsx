import { Navigate, useParams } from 'react-router-dom';

type LegacyTarget = 'home' | 'list' | 'category' | 'product';

function tenantQuery(tenant?: string): string {
  const slug = tenant?.trim();
  return slug ? `?tenant=${encodeURIComponent(slug)}` : '';
}

/** Legacy /store/:tenantSlug/** → yeni vitrin (?tenant=) */
export default function StoreTenantLegacyRedirect({ target }: { target: LegacyTarget }) {
  const { tenantSlug, categorySlug, productSlug } = useParams<{
    tenantSlug?: string;
    categorySlug?: string;
    productSlug?: string;
  }>();

  const t = tenantSlug?.trim() ?? '';

  switch (target) {
    case 'list':
      return <Navigate to={`/store/urunler${tenantQuery(t)}`} replace />;
    case 'category': {
      const slug = categorySlug?.trim();
      if (!slug) return <Navigate to={`/store${tenantQuery(t)}`} replace />;
      return <Navigate to={`/store/kategori/${encodeURIComponent(slug)}${tenantQuery(t)}`} replace />;
    }
    case 'product': {
      const slug = productSlug?.trim();
      if (!slug) return <Navigate to={`/store/urunler${tenantQuery(t)}`} replace />;
      return <Navigate to={`/store/urun/${encodeURIComponent(slug)}${tenantQuery(t)}`} replace />;
    }
    case 'home':
    default:
      return <Navigate to={`/store${tenantQuery(t)}`} replace />;
  }
}
