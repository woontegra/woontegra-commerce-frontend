import { Navigate, useLocation } from 'react-router-dom';

/** `/panel` is an alias for the merchant dashboard (`/dashboard`). */
export default function PanelRouteRedirect() {
  const { pathname, search } = useLocation();
  const suffix = pathname.replace(/^\/panel\/?/, '');
  const to = (suffix ? `/dashboard/${suffix}` : '/dashboard') + search;
  return <Navigate to={to} replace />;
}
