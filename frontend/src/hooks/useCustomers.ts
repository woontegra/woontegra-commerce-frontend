import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  customerService,
  type CreateCustomerDto,
  type UpdateCustomerDto,
  type GetCustomersQuery,
} from '../services/customer.service';

export const customerKeys = {
  all:     ['customers']                                        as const,
  lists:   ()                      => [...customerKeys.all, 'list']    as const,
  list:    (q?: GetCustomersQuery) => [...customerKeys.lists(), q]     as const,
  details: ()                      => [...customerKeys.all, 'detail']  as const,
  detail:  (id: string)            => [...customerKeys.details(), id]  as const,
  stats:   ()                      => [...customerKeys.all, 'stats']   as const,
};

export function useCustomers(query: GetCustomersQuery = {}) {
  return useQuery({
    queryKey: customerKeys.list(query),
    queryFn:  () => customerService.getAll(query),
  });
}

export function useCustomerStats() {
  return useQuery({
    queryKey:  customerKeys.stats(),
    queryFn:   () => customerService.getStats(),
    staleTime: 60_000,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn:  () => customerService.getById(id),
    enabled:  !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerDto) => customerService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.lists() });
      qc.invalidateQueries({ queryKey: customerKeys.stats() });
      toast.success('Müşteri başarıyla eklendi');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Müşteri eklenemedi.');
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerDto }) =>
      customerService.update(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: customerKeys.lists() });
      qc.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
      toast.success('Müşteri güncellendi');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Güncelleme başarısız.');
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customerService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.lists() });
      qc.invalidateQueries({ queryKey: customerKeys.stats() });
      toast.success('Müşteri silindi');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Silme başarısız.');
    },
  });
}
