import { Navigate } from 'react-router-dom';

/** Eski rota — gerçek kupon yönetimi `/coupons` altında. */
export default function CouponManagement() {
  return <Navigate to="/coupons" replace />;
}
