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

export const MAX_TRENDYOL_INVOICE_PDF_BYTES = 10 * 1024 * 1024;

export interface UploadTrendyolInvoiceFileInput {
  file:             File;
  invoiceNumber?:   string;
  invoiceDateTime?: string;
}

export function useUploadTrendyolInvoiceFile(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadTrendyolInvoiceFileInput) => {
      const formData = new FormData();
      formData.append('file', input.file);
      if (input.invoiceNumber?.trim()) {
        formData.append('invoiceNumber', input.invoiceNumber.trim());
      }
      if (input.invoiceDateTime?.trim()) {
        formData.append('invoiceDateTime', input.invoiceDateTime.trim());
      }

      const res = await apiClient.post<{ success: boolean; message: string; data: TrendyolOrderDetail }>(
        `/trendyol/orders/${orderId}/invoice/file`,
        formData,
        {
          skipErrorToast: true,
          timeout:        120_000,
          headers:        { 'Content-Type': undefined },
        },
      );
      return res.data;
    },
    onSuccess: (result) => {
      qc.setQueryData(['trendyol-order', orderId], result.data);
      qc.invalidateQueries({ queryKey: ['trendyol-order', orderId] });
      toast.success(result.message ?? 'Fatura PDF Trendyol\'a yüklendi.');
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, 'Fatura PDF yüklenemedi.'));
    },
  });
}

export interface CargoLabelItemResult {
  format:  string;
  content: string;
  url?:    string;
}

export interface CargoLabelResult {
  deliveryType:        'pdf_url' | 'zpl' | 'pdf_base64';
  cargoTrackingNumber: string;
  cargoProviderName?:  string | null;
  labels:              CargoLabelItemResult[];
}

export function useFetchTrendyolCargoLabel(orderId: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: CargoLabelResult }>(
        `/trendyol/orders/${orderId}/cargo-label`,
        {
          skipErrorToast: true,
          timeout:        90_000,
        },
      );
      return res.data.data;
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, 'Kargo etiketi alınamadı.'));
    },
  });
}
