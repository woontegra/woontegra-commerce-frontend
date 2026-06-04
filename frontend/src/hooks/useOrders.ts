import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient from '../services/apiClient';
import {
  orderService,
  type OrderStatus,
  type CreateOrderDto,
  type GetOrdersQuery,
  type UpdateOrderShippingDto,
  type UpdateOrderInvoiceDto,
} from '../services/order.service';

export const orderKeys = {
  all:      ['orders']                                      as const,
  lists:    ()                   => [...orderKeys.all, 'list']   as const,
  list:     (q?: GetOrdersQuery) => [...orderKeys.lists(), q]    as const,
  details:  ()                   => [...orderKeys.all, 'detail'] as const,
  detail:   (id: string)         => [...orderKeys.details(), id] as const,
  history:  (id: string)        => [...orderKeys.all, 'history', id] as const,
  stats:    ()                   => [...orderKeys.all, 'stats']  as const,
  customer: (cid: string)        => [...orderKeys.all, 'customer', cid] as const,
};

export function useOrders(query: GetOrdersQuery = {}) {
  return useQuery({
    queryKey: orderKeys.list(query),
    queryFn:  () => orderService.getAll(query),
  });
}

export function useOrderStats() {
  return useQuery({
    queryKey:       orderKeys.stats(),
    queryFn:        () => orderService.getStats(),
    staleTime:      30_000,
    refetchInterval: 60_000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn:  () => orderService.getById(id),
    enabled:  !!id,
  });
}

export function useOrderHistory(id: string) {
  return useQuery({
    queryKey: orderKeys.history(id),
    queryFn:  () => orderService.getHistory(id),
    enabled:  !!id,
  });
}

export function useCustomerOrders(customerId: string) {
  return useQuery({
    queryKey: orderKeys.customer(customerId),
    queryFn:  () => orderService.getByCustomer(customerId),
    enabled:  !!customerId,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderDto) => orderService.create(data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.stats() });
      toast.success('Sipariş başarıyla oluşturuldu');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Sipariş oluşturulamadı.');
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateStatus(id, status),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      qc.invalidateQueries({ queryKey: orderKeys.history(order.id) });
      qc.invalidateQueries({ queryKey: orderKeys.stats() });
      toast.success('Sipariş durumu güncellendi');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Durum güncellenemedi.');
    },
  });
}

export function useConfirmOrderPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.confirmPayment(id),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      qc.invalidateQueries({ queryKey: orderKeys.history(order.id) });
      qc.invalidateQueries({ queryKey: orderKeys.stats() });
      toast.success('Havale/EFT ödemesi onaylandı.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Ödeme onaylanamadı.');
    },
  });
}

export function useUpdateOrderShipping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderShippingDto }) =>
      orderService.updateShipping(id, data),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      qc.invalidateQueries({ queryKey: orderKeys.history(order.id) });
      qc.invalidateQueries({ queryKey: orderKeys.stats() });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Kargo bilgileri kaydedilemedi.');
    },
  });
}

export function useUpdateOrderInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderInvoiceDto }) =>
      orderService.updateInvoice(id, data),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      qc.invalidateQueries({ queryKey: orderKeys.history(order.id) });
      toast.success('Fatura bilgileri kaydedildi.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Fatura bilgileri kaydedilemedi.');
    },
  });
}

const INVOICE_PDF_MAX_BYTES = 5 * 1024 * 1024;

export function useUploadOrderInvoicePdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      orderService.uploadInvoicePdf(id, file),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      qc.invalidateQueries({ queryKey: orderKeys.history(order.id) });
      toast.success('Fatura PDF yüklendi.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Fatura PDF yüklenemedi.');
    },
  });
}

export { INVOICE_PDF_MAX_BYTES };

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.cancel(id),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      qc.invalidateQueries({ queryKey: orderKeys.history(order.id) });
      qc.invalidateQueries({ queryKey: orderKeys.stats() });
      toast.success('Sipariş iptal edildi');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'İptal işlemi başarısız.');
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.stats() });
      toast.success('Sipariş silindi');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Silme işlemi başarısız.');
    },
  });
}

/** Trendyol siparişlerini manuel çeker (POST /api/trendyol/orders/sync). */
export function useSyncTrendyolOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ success: boolean; message?: string; error?: string }>(
        '/trendyol/orders/sync',
        {},
        { skipErrorToast: true },
      );
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.stats() });
      toast.success(data.message ?? 'Trendyol siparişleri güncellendi');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error
        ?? err.response?.data?.message
        ?? 'Trendyol siparişleri çekilemedi.';
      toast.error(msg);
    },
  });
}

// ── Legacy alias (backward compat) ────────────────────────────────────────
export function useUpdateOrder() {
  return useUpdateOrderStatus();
}
