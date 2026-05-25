import type { ExcelRow, ImportResult, ImportLog, ProductImportData } from '../types/bulkImport';
import toast from 'react-hot-toast';

class BulkProductImportService {
  private readonly STORAGE_KEY = 'import_logs';

  // Import products
  async importProducts(rows: ExcelRow[]): Promise<ImportResult> {
    const startTime = Date.now();
    let successCount = 0;
    let failedCount = 0;
    let warningCount = 0;

    const processedRows: ExcelRow[] = [];

    for (const row of rows) {
      // Skip rows with errors
      if (row.status === 'error') {
        failedCount++;
        processedRows.push(row);
        continue;
      }

      try {
        // Create product
        const productId = await this.createProduct(row.data as ProductImportData);
        
        // Update row status
        row.status = 'success';
        row.productId = productId;
        successCount++;
        
        if (row.warnings && row.warnings.length > 0) {
          warningCount++;
        }
      } catch (error) {
        // Handle error
        row.status = 'error';
        row.errors = row.errors || [];
        row.errors.push(error instanceof Error ? error.message : 'Ürün oluşturulamadı');
        failedCount++;
      }

      processedRows.push(row);
    }

    const duration = Date.now() - startTime;

    return {
      total: rows.length,
      success: successCount,
      failed: failedCount,
      warnings: warningCount,
      rows: processedRows,
      duration,
    };
  }

  // Create single product
  private async createProduct(data: ProductImportData): Promise<string> {
    // In production: Call API
    // const response = await fetch('/api/products', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });
    // return response.json().id;

    // Mock creation
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate random failure (5% chance)
        if (Math.random() < 0.05) {
          reject(new Error('API hatası'));
          return;
        }

        const productId = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('✅ Product created:', {
          id: productId,
          name: data.name,
          price: data.price,
          stock: data.stock,
        });

        resolve(productId);
      }, 100);
    });
  }

  // Save import log
  saveLog(log: ImportLog): void {
    const logs = this.getLogs();
    logs.unshift(log);
    
    // Keep only last 50 logs
    const trimmed = logs.slice(0, 50);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
  }

  // Get all logs
  getLogs(): ImportLog[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Get log by ID
  getLog(id: string): ImportLog | null {
    const logs = this.getLogs();
    return logs.find(log => log.id === id) || null;
  }

  // Export error report
  exportErrorReport(result: ImportResult): void {
    const errors = result.rows
      .filter(row => row.status === 'error' || row.status === 'warning')
      .map(row => ({
        'Satır': row.rowNumber,
        'Durum': row.status === 'error' ? 'Hata' : 'Uyarı',
        'Ürün Adı': row.data.name || '-',
        'Hatalar': row.errors?.join('; ') || '-',
        'Uyarılar': row.warnings?.join('; ') || '-',
      }));

    if (errors.length === 0) {
      toast.success('Hata bulunamadı!');
      return;
    }

    // Create CSV
    const headers = Object.keys(errors[0]);
    const csv = [
      headers.join(','),
      ...errors.map(row => 
        headers.map(header => `"${row[header as keyof typeof row]}"`).join(',')
      )
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hata-raporu-${Date.now()}.csv`;
    link.click();

    toast.success('Hata raporu indirildi');
  }

  // Get statistics
  getStatistics(): {
    totalImports: number;
    totalProducts: number;
    successRate: number;
    lastImport?: ImportLog;
  } {
    const logs = this.getLogs();
    
    const totalImports = logs.length;
    const totalProducts = logs.reduce((sum, log) => sum + (log.result?.success || 0), 0);
    const totalAttempts = logs.reduce((sum, log) => sum + (log.result?.total || 0), 0);
    const successRate = totalAttempts > 0 ? (totalProducts / totalAttempts) * 100 : 0;
    const lastImport = logs[0];

    return {
      totalImports,
      totalProducts,
      successRate,
      lastImport,
    };
  }
}

export const bulkProductImportService = new BulkProductImportService();
