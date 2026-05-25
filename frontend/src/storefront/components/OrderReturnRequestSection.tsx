import { Link } from 'react-router-dom';
import {
  RETURN_STATUS_LABELS,
  RETURN_TYPE_LABELS,
} from '../constants/returnRequest';
import type { MyOrderDetail } from '../services/storefrontAccountApi';
import type { ReturnRequestType } from '../services/storefrontReturnsApi';
import { getReturnRequestAvailability } from '../utils/returnRequestAvailability';

type Props = {
  order: MyOrderDetail;
  storeLink: (path: string) => string;
  onOpenModal: (type: ReturnRequestType) => void;
};

export function OrderReturnRequestSection({ order, storeLink, onOpenModal }: Props) {
  const active = order.activeReturnRequest;
  const availability = getReturnRequestAvailability({
    status: order.status,
    activeReturnRequest: active ? { id: active.id } : null,
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm">
      <h3 className="font-medium text-slate-900 mb-3">İade / İptal Talebi</h3>

      {active && (
        <div className="space-y-2">
          <p className="font-medium text-amber-900">
            Aktif talep: {RETURN_TYPE_LABELS[active.type]} —{' '}
            {RETURN_STATUS_LABELS[active.status]}
          </p>
          {active.status === 'APPROVED' && active.type === 'CANCEL_REQUEST' && (
            <p className="text-emerald-800 font-medium">
              İptal talebiniz onaylandı; siparişiniz iptal edilmiştir.
            </p>
          )}
          {active.status === 'APPROVED' && active.type === 'RETURN_REQUEST' && (
            <p className="text-emerald-800 font-medium">İade talebiniz onaylandı.</p>
          )}
          {active.status === 'REJECTED' && (
            <p className="text-red-800">Talebiniz reddedildi. Detay için mağaza ile iletişime geçebilirsiniz.</p>
          )}
          <p className="text-slate-600 text-xs">Talep no: {active.requestNumber}</p>
          <Link
            to={storeLink(`/store/hesabim/iade-taleplerim/${active.id}`)}
            className="inline-block text-indigo-600 font-medium hover:underline"
          >
            Talep detayı →
          </Link>
        </div>
      )}

      {!active && availability.shippedInfoMessage && (
        <p className="text-slate-600">{availability.shippedInfoMessage}</p>
      )}

      {!active && !availability.unavailable && (availability.cancelAvailable || availability.returnAvailable) && (
        <div className="flex flex-wrap gap-2 mt-1">
          {availability.cancelAvailable && (
            <button
              type="button"
              onClick={() => onOpenModal('CANCEL_REQUEST')}
              className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50"
            >
              İptal Talebi Oluştur
            </button>
          )}
          {availability.returnAvailable && (
            <button
              type="button"
              onClick={() => onOpenModal('RETURN_REQUEST')}
              className="px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-50"
            >
              İade Talebi Oluştur
            </button>
          )}
        </div>
      )}

      {!active && availability.unavailable && order.status === 'CANCELLED' && (
        <p className="text-slate-500">İptal edilmiş siparişler için talep oluşturulamaz.</p>
      )}
    </div>
  );
}
