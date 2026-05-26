import { Navigate, useParams } from 'react-router-dom';

/** Legacy slug URL → yeni vitrin ürün listesi (?tenant=) */
export default function StoreTenantListRedirect() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  if (!tenantSlug?.trim()) {
    return <Navigate to="/store/urunler" replace />;
  }
  return (
    <Navigate
      to={`/store/urunler?tenant=${encodeURIComponent(tenantSlug.trim())}`}
      replace
    />
  );
}
