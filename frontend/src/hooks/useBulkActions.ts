import { useState, useCallback } from 'react';
import apiClient from '../services/apiClient';

export const useBulkActions = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      if (prev.size === ids.length) {
        return new Set();
      } else {
        return new Set(ids);
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const isAllSelected = useCallback((ids: string[]) => {
    return ids.length > 0 && ids.every(id => selectedIds.has(id));
  }, [selectedIds]);

  const bulkUpdatePrice = useCallback(async (action: string, value: number) => {
    setLoading(true);
    try {
      await apiClient.patch('/products/bulk/price', {
        ids: Array.from(selectedIds),
        action,
        value,
      });
      clearSelection();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedIds, clearSelection]);

  const bulkUpdateStock = useCallback(async (action: string, value: number) => {
    setLoading(true);
    try {
      await apiClient.patch('/products/bulk/stock', {
        ids: Array.from(selectedIds),
        action,
        value,
      });
      clearSelection();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedIds, clearSelection]);

  const bulkUpdate = useCallback(async (type: 'price' | 'stock', action: string, value: number) => {
    if (type === 'price') {
      return bulkUpdatePrice(action, value);
    } else {
      return bulkUpdateStock(action, value);
    }
  }, [bulkUpdatePrice, bulkUpdateStock]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    bulkUpdate,
    loading,
  };
};
