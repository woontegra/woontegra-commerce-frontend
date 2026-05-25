import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import apiClient from './apiClient';

class ExportService {
  /**
   * Download file from backend
   */
  private async downloadFromBackend(url: string, filename: string, params?: any): Promise<void> {
    try {
      const response = await apiClient.get(url, {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, filename);
      toast.success('Dosya indirildi');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export işlemi başarısız');
      throw error;
    }
  }

  /**
   * Export orders from backend
   */
  async exportOrdersFromBackend(filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<void> {
    await this.downloadFromBackend('/export/orders', 'orders.csv', filters);
  }

  /**
   * Export products from backend
   */
  async exportProductsFromBackend(filters?: {
    status?: string;
    categoryId?: string;
  }): Promise<void> {
    await this.downloadFromBackend('/export/products', 'products.csv', filters);
  }

  /**
   * Export customers from backend
   */
  async exportCustomersFromBackend(): Promise<void> {
    await this.downloadFromBackend('/export/customers', 'customers.csv');
  }

  /**
   * Export analytics report from backend
   */
  async exportAnalyticsFromBackend(startDate: string, endDate: string): Promise<void> {
    await this.downloadFromBackend('/export/analytics', 'analytics-report.csv', {
      startDate,
      endDate,
    });
  }
  // Export to CSV
  exportToCSV(data: any[], filename: string, headers?: string[]): void {
    if (data.length === 0) {
      toast.error('Export edilecek veri yok');
      return;
    }

    // Get headers
    const csvHeaders = headers || Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...data.map(row => 
        csvHeaders.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value || '');
          return stringValue.includes(',') || stringValue.includes('"')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        }).join(',')
      )
    ].join('\n');

    // Add BOM for Turkish characters
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Download
    this.downloadBlob(blob, `${filename}.csv`);
    toast.success('CSV dosyası indirildi');
  }

  // Export to Excel
  exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1'): void {
    if (data.length === 0) {
      toast.error('Export edilecek veri yok');
      return;
    }

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const columnWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      ) + 2
    }));
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Download
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    toast.success('Excel dosyası indirildi');
  }

  // Export orders to CSV
  exportOrdersToCSV(orders: any[]): void {
    const exportData = orders.map(order => ({
      'Sipariş No': order.orderNumber,
      'Müşteri': order.customerName,
      'Email': order.customerEmail,
      'Telefon': order.customerPhone,
      'Durum': this.getOrderStatusLabel(order.status),
      'Ödeme Durumu': order.isPaid ? 'Ödendi' : 'Bekliyor',
      'Ödeme Yöntemi': order.paymentMethod,
      'Ara Toplam': order.subtotal.toFixed(2),
      'Kargo': order.shippingCost.toFixed(2),
      'İndirim': order.discount.toFixed(2),
      'Toplam': order.total.toFixed(2),
      'Ürün Sayısı': order.items.length,
      'Tarih': new Date(order.createdAt).toLocaleDateString('tr-TR'),
    }));

    this.exportToCSV(exportData, `siparisler-${Date.now()}`);
  }

  // Export orders to Excel
  exportOrdersToExcel(orders: any[]): void {
    const exportData = orders.map(order => ({
      'Sipariş No': order.orderNumber,
      'Müşteri': order.customerName,
      'Email': order.customerEmail,
      'Telefon': order.customerPhone,
      'Durum': this.getOrderStatusLabel(order.status),
      'Ödeme Durumu': order.isPaid ? 'Ödendi' : 'Bekliyor',
      'Ödeme Yöntemi': order.paymentMethod,
      'Ara Toplam': order.subtotal,
      'Kargo': order.shippingCost,
      'İndirim': order.discount,
      'Toplam': order.total,
      'Ürün Sayısı': order.items.length,
      'Tarih': new Date(order.createdAt).toLocaleDateString('tr-TR'),
      'Saat': new Date(order.createdAt).toLocaleTimeString('tr-TR'),
    }));

    this.exportToExcel(exportData, `siparisler-${Date.now()}`, 'Siparişler');
  }

  // Export order details (with items)
  exportOrderDetailsToExcel(order: any): void {
    // Order info sheet
    const orderInfo = [{
      'Sipariş No': order.orderNumber,
      'Müşteri': order.customerName,
      'Email': order.customerEmail,
      'Telefon': order.customerPhone,
      'Durum': this.getOrderStatusLabel(order.status),
      'Ödeme Durumu': order.isPaid ? 'Ödendi' : 'Bekliyor',
      'Ara Toplam': order.subtotal,
      'Kargo': order.shippingCost,
      'İndirim': order.discount,
      'Toplam': order.total,
      'Tarih': new Date(order.createdAt).toLocaleString('tr-TR'),
    }];

    // Items sheet
    const items = order.items.map((item: any) => ({
      'Ürün': item.productName,
      'SKU': item.sku || '-',
      'Varyant': item.variantName || '-',
      'Adet': item.quantity,
      'Birim Fiyat': item.price,
      'Toplam': item.price * item.quantity,
    }));

    // Create workbook with multiple sheets
    const workbook = XLSX.utils.book_new();
    
    const orderSheet = XLSX.utils.json_to_sheet(orderInfo);
    XLSX.utils.book_append_sheet(workbook, orderSheet, 'Sipariş Bilgileri');
    
    const itemsSheet = XLSX.utils.json_to_sheet(items);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Ürünler');

    XLSX.writeFile(workbook, `siparis-${order.orderNumber}.xlsx`);
    toast.success('Sipariş detayı indirildi');
  }

  // Export products to CSV
  exportProductsToCSV(products: any[]): void {
    const exportData = products.map(product => ({
      'Ürün Adı': product.name,
      'SKU': product.sku || '-',
      'Kategori': product.categoryName || '-',
      'Fiyat': product.price.toFixed(2),
      'İndirimli Fiyat': product.compareAtPrice?.toFixed(2) || '-',
      'Stok': product.stock,
      'Durum': product.status === 'active' ? 'Aktif' : product.status === 'draft' ? 'Taslak' : 'Arşiv',
      'Görüntülenme': product.views || 0,
      'Satış': product.sales || 0,
      'Oluşturma Tarihi': new Date(product.createdAt).toLocaleDateString('tr-TR'),
    }));

    this.exportToCSV(exportData, `urunler-${Date.now()}`);
  }

  // Export products to Excel
  exportProductsToExcel(products: any[]): void {
    const exportData = products.map(product => ({
      'Ürün Adı': product.name,
      'SKU': product.sku || '-',
      'Barkod': product.barcode || '-',
      'Kategori': product.categoryName || '-',
      'Fiyat': product.price,
      'İndirimli Fiyat': product.compareAtPrice || null,
      'Maliyet': product.costPrice || null,
      'Stok': product.stock,
      'Düşük Stok Eşiği': product.lowStockThreshold || 10,
      'Durum': product.status === 'active' ? 'Aktif' : product.status === 'draft' ? 'Taslak' : 'Arşiv',
      'Görüntülenme': product.views || 0,
      'Sepete Ekleme': product.addToCart || 0,
      'Satış': product.sales || 0,
      'Oluşturma Tarihi': new Date(product.createdAt).toLocaleDateString('tr-TR'),
    }));

    this.exportToExcel(exportData, `urunler-${Date.now()}`, 'Ürünler');
  }

  // Export product with variants
  exportProductWithVariantsToExcel(product: any): void {
    // Product info
    const productInfo = [{
      'Ürün Adı': product.name,
      'SKU': product.sku || '-',
      'Kategori': product.categoryName || '-',
      'Fiyat': product.price,
      'Stok': product.stock,
      'Durum': product.status,
    }];

    // Variants
    const variants = product.variants?.map((variant: any) => ({
      'Varyant Adı': variant.name,
      'SKU': variant.sku || '-',
      'Renk': variant.color || '-',
      'Beden': variant.size || '-',
      'Fiyat': variant.price || product.price,
      'Stok': variant.stock || 0,
    })) || [];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    const productSheet = XLSX.utils.json_to_sheet(productInfo);
    XLSX.utils.book_append_sheet(workbook, productSheet, 'Ürün Bilgileri');
    
    if (variants.length > 0) {
      const variantsSheet = XLSX.utils.json_to_sheet(variants);
      XLSX.utils.book_append_sheet(workbook, variantsSheet, 'Varyantlar');
    }

    XLSX.writeFile(workbook, `urun-${product.sku || product.id}.xlsx`);
    toast.success('Ürün detayı indirildi');
  }

  // Helper: Download blob
  private downloadBlob(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Helper: Get order status label
  private getOrderStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Bekliyor',
      confirmed: 'Onaylandı',
      processing: 'Hazırlanıyor',
      shipped: 'Kargoda',
      delivered: 'Teslim Edildi',
      cancelled: 'İptal',
      refunded: 'İade',
    };
    return labels[status] || status;
  }
}

export const exportService = new ExportService();
