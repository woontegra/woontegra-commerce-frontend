import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

export interface TrendyolOrderItemRow {
  id:          string;
  barcode:     string;
  productName: string;
  quantity:    number;
  price:       number;
  merchantSku?: string | null;
  productId?:  string | null;
  variantId?:  string | null;
  imageUrl?:   string | null;
}

export interface TrendyolOrderDetail {
  id:                  string;
  orderNumber:         string;
  status:              string;
  totalPrice:          number;
  orderDate:           string;
  cargoTrackingNumber: string | null;
  customerFirstName:   string | null;
  customerLastName:    string | null;
  customerEmail:       string | null;
  shipmentAddress:     Record<string, unknown> | null;
  invoiceAddress:      Record<string, unknown> | null;
  rawPayload:          Record<string, unknown> | null;
  stockDecremented:    boolean;
  createdAt:           string;
  updatedAt:           string;
  items:               TrendyolOrderItemRow[];
}

export function useTrendyolOrder(id: string) {
  return useQuery({
    queryKey: ['trendyol-order', id],
    queryFn:  async () => {
      const res = await apiClient.get<{ success: boolean; data: TrendyolOrderDetail }>(
        `/trendyol/orders/by-id/${id}`,
        { skipErrorToast: true },
      );
      return res.data.data;
    },
    enabled: !!id,
  });
}
