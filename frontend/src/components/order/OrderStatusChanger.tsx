import { useState } from 'react';
import type { Order, OrderStatus, OrderTracking } from '../../types/orderLifecycle';
import { ORDER_STATUS_LABELS } from '../../types/orderLifecycle';
import { orderLifecycleService } from '../../services/orderLifecycle.service';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface OrderStatusChangerProps {
  order: Order;
  onUpdate: (updatedOrder: Order) => void;
}

export default function OrderStatusChanger({ order, onUpdate }: OrderStatusChangerProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Tracking info
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');

  const allowedStatuses = orderLifecycleService.getAllowedNextStatuses(order.status);

  const handleStatusUpdate = async () => {
    if (!selectedStatus) {
      toast.error('Lütfen bir durum seçin');
      return;
    }

    setIsUpdating(true);

    try {
      const updatedOrder = await orderLifecycleService.updateOrderStatus(
        order,
        selectedStatus as OrderStatus,
        note || undefined,
        'admin'
      );

      onUpdate(updatedOrder);
      setSelectedStatus('');
      setNote('');
      toast.success('Sipariş durumu güncellendi');
    } catch (error: any) {
      toast.error(error.message || 'Durum güncellenemedi');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTrackingSubmit = async () => {
    if (!trackingNumber || !shippingCompany) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    setIsUpdating(true);

    try {
      const tracking: OrderTracking = {
        trackingNumber,
        shippingCompany,
        trackingUrl: `https://kargotakip.com/${trackingNumber}`,
      };

      const updatedOrder = await orderLifecycleService.handleShippingCreated(order, tracking);
      
      onUpdate(updatedOrder);
      setShowTrackingForm(false);
      setTrackingNumber('');
      setShippingCompany('');
      toast.success('Kargo bilgisi eklendi ve durum güncellendi');
    } catch (error: any) {
      toast.error(error.message || 'Kargo bilgisi eklenemedi');
    } finally {
      setIsUpdating(false);
    }
  };

  if (allowedStatuses.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Bu sipariş için durum değişikliği yapılamaz
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white">
        Durum Değiştir
      </h3>

      {/* Status Selector */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Yeni Durum
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
            className="input-standard w-full"
          >
            <option value="">Durum seçin</option>
            {allowedStatuses.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Not (Opsiyonel)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="input-standard w-full"
            placeholder="Durum değişikliği hakkında not..."
          />
        </div>

        <Button
          onClick={handleStatusUpdate}
          disabled={!selectedStatus || isUpdating}
          className="w-full"
        >
          {isUpdating ? 'Güncelleniyor...' : 'Durumu Güncelle'}
        </Button>
      </div>

      {/* Tracking Form */}
      {order.status === 'preparing' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Kargo Bilgisi Ekle
            </h4>
            <button
              onClick={() => setShowTrackingForm(!showTrackingForm)}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              {showTrackingForm ? 'Gizle' : 'Göster'}
            </button>
          </div>

          {showTrackingForm && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kargo Firması
                </label>
                <select
                  value={shippingCompany}
                  onChange={(e) => setShippingCompany(e.target.value)}
                  className="input-standard w-full"
                >
                  <option value="">Seçin</option>
                  <option value="MNG Kargo">MNG Kargo</option>
                  <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
                  <option value="Aras Kargo">Aras Kargo</option>
                  <option value="PTT Kargo">PTT Kargo</option>
                  <option value="Sürat Kargo">Sürat Kargo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Takip Numarası
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="input-standard w-full"
                  placeholder="1234567890"
                />
              </div>

              <Button
                onClick={handleTrackingSubmit}
                disabled={!trackingNumber || !shippingCompany || isUpdating}
                className="w-full"
              >
                {isUpdating ? 'Ekleniyor...' : 'Kargo Bilgisi Ekle ve Kargoya Ver'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
