import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productService, type CreateProductDto, type UpdateProductDto, type ProductListFilters } from '../services/product.service';
import { logger } from '../services/logger.service';

// Query Keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters?: any) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// Queries
export function useProducts() {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: () => productService.getAll(),
  });
}

/** Paginated product list with filters — used by the Products management page */
export function useProductSearch(filters: ProductListFilters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn:  () => productService.search(filters),
    staleTime: 10_000,
    placeholderData: (prev: any) => prev,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productService.getById(id),
    enabled: !!id,
  });
}

// Mutations
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductDto) => productService.create(data),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success('Ürün başarıyla eklendi');
      logger.logAction('product_created', `Ürün oluşturuldu: ${product.name}`, { productId: product.id });
    },
    onError: (error) => {
      logger.logError('product_create_failed', error);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productService.update(id, data),
    onSuccess: (product, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
      toast.success('Ürün başarıyla güncellendi');
      logger.logAction('product_updated', `Ürün güncellendi: ${product.name}`, { productId: product.id });
    },
    onError: (error) => {
      logger.logError('product_update_failed', error);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: async (_, id) => {
      await queryClient.refetchQueries({ queryKey: productKeys.all });
      toast.success('Ürün başarıyla silindi');
      logger.logAction('product_deleted', `Ürün silindi`, { productId: id });
    },
    onError: (error) => {
      logger.logError('product_delete_failed', error);
    },
  });
}

export function useUpdateProductStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      productService.updateStock(id, stock),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
    },
  });
}

/** Quick inline update: price, stock, isActive, status */
export function useQuickUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; price?: number; stock?: number; isActive?: boolean; status?: string }) =>
      productService.quickUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/** Bulk delete multiple products — tek API isteği */
export function useBulkDeleteProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => productService.bulkDelete(ids),
    onSuccess: async (result) => {
      await queryClient.refetchQueries({ queryKey: productKeys.all });
      const { deleted, notFound } = result;
      if (deleted > 0) {
        toast.success(
          notFound > 0
            ? `${deleted} ürün silindi (${notFound} kayıt bulunamadı).`
            : `${deleted} ürün silindi`,
        );
      } else {
        toast.error('Hiçbir ürün silinemedi. Sayfayı yenileyip tekrar deneyin.');
      }
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.error ??
        error.response?.data?.message ??
        'Ürünler silinirken hata oluştu.';
      toast.error(msg);
    },
  });
}
