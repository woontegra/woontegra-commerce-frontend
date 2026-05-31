import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient, { extractErrorMessage } from '../services/apiClient';

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

export interface SendTrendyolInvoiceLinkInput {
  invoiceLink:      string;
  invoiceNumber?:   string;
  invoiceDateTime?: string;
}

export function useSendTrendyolInvoiceLink(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: SendTrendyolInvoiceLinkInput) => {
      const res = await apiClient.post<{ success: boolean; message: string; data: TrendyolOrderDetail }>(
        `/trendyol/orders/${orderId}/invoice/link`,
        body,
        { skipErrorToast: true },
      );
      return res.data;
    },
    onSuccess: (result) => {
      qc.setQueryData(['trendyol-order', orderId], result.data);
      qc.invalidateQueries({ queryKey: ['trendyol-order', orderId] });
      toast.success(result.message ?? 'Fatura linki Trendyol\'a gönderildi.');
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, 'Fatura linki gönderilemedi.'));
    },
  });
}
