import * as XLSX from 'xlsx';
import type { ExcelRow, ProductImportData, ImportError } from '../types/bulkImport';

class ExcelParserService {
  // Column mapping (Excel column name -> field name)
  private readonly COLUMN_MAP: Record<string, string> = {
    'Ürün Adı': 'name',
    'Açıklama': 'description',
    'SKU': 'sku',
    'Barkod': 'barcode',
    'Fiyat': 'price',
    'İndirimli Fiyat': 'compareAtPrice',
    'Maliyet': 'costPrice',
    'Stok': 'stock',
    'Düşük Stok Eşiği': 'lowStockThreshold',
    'Kategori': 'categoryName',
    'Etiketler': 'tags',
    'Görsel URL': 'imageUrls',
    'Durum': 'status',
    'Meta Başlık': 'metaTitle',
    'Meta Açıklama': 'metaDescription',
  };

  // Required fields
  private readonly REQUIRED_FIELDS = ['name', 'price', 'stock'];

  // Parse Excel file
  async parseExcel(file: File): Promise<ExcelRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          
          // Parse rows
          const rows = this.parseRows(jsonData);
          
          resolve(rows);
        } catch (error) {
          reject(new Error('Excel dosyası okunamadı'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Dosya okuma hatası'));
      };

      reader.readAsBinaryString(file);
    });
  }

  // Parse rows
  private parseRows(jsonData: any[]): ExcelRow[] {
    return jsonData.map((row, index) => {
      const rowNumber = index + 2; // +2 because Excel rows start at 1 and first row is header
      
      // Map columns
      const mappedData: Record<string, any> = {};
      Object.keys(row).forEach(key => {
        const fieldName = this.COLUMN_MAP[key] || key;
        mappedData[fieldName] = row[key];
      });

      // Validate and transform
      const { data, errors, warnings } = this.validateRow(mappedData, rowNumber);

      return {
        rowNumber,
        data,
        status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'pending',
        errors: errors.map(e => e.message),
        warnings: warnings.map(w => w.message),
      };
    });
  }

  // Validate row
  private validateRow(
    data: Record<string, any>,
    rowNumber: number
  ): {
    data: ProductImportData;
    errors: ImportError[];
    warnings: ImportError[];
  } {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    // Check required fields
    this.REQUIRED_FIELDS.forEach(field => {
      if (!data[field] || data[field] === '') {
        errors.push({
          rowNumber,
          field,
          message: `${this.getFieldLabel(field)} zorunludur`,
          severity: 'error',
          value: data[field],
        });
      }
    });

    // Validate price
    if (data.price) {
      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) {
        errors.push({
          rowNumber,
          field: 'price',
          message: 'Fiyat geçerli bir sayı olmalıdır',
          severity: 'error',
          value: data.price,
        });
      }
      data.price = price;
    }

    // Validate stock
    if (data.stock) {
      const stock = parseInt(data.stock);
      if (isNaN(stock) || stock < 0) {
        errors.push({
          rowNumber,
          field: 'stock',
          message: 'Stok geçerli bir sayı olmalıdır',
          severity: 'error',
          value: data.stock,
        });
      }
      data.stock = stock;
    }

    // Validate compareAtPrice
    if (data.compareAtPrice) {
      const compareAtPrice = parseFloat(data.compareAtPrice);
      if (!isNaN(compareAtPrice)) {
        data.compareAtPrice = compareAtPrice;
        
        if (compareAtPrice <= data.price) {
          warnings.push({
            rowNumber,
            field: 'compareAtPrice',
            message: 'İndirimli fiyat normal fiyattan düşük olmalıdır',
            severity: 'warning',
            value: compareAtPrice,
          });
        }
      }
    }

    // Parse tags
    if (data.tags && typeof data.tags === 'string') {
      data.tags = data.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    // Parse image URLs
    if (data.imageUrls && typeof data.imageUrls === 'string') {
      data.imageUrls = data.imageUrls.split(',').map((url: string) => url.trim()).filter(Boolean);
    }

    // Validate status
    if (data.status) {
      const validStatuses = ['active', 'draft', 'archived'];
      if (!validStatuses.includes(data.status.toLowerCase())) {
        warnings.push({
          rowNumber,
          field: 'status',
          message: `Geçersiz durum: ${data.status}. 'active', 'draft' veya 'archived' olmalıdır`,
          severity: 'warning',
          value: data.status,
        });
        data.status = 'draft';
      }
    } else {
      data.status = 'active';
    }

    // Check name length
    if (data.name && data.name.length < 3) {
      warnings.push({
        rowNumber,
        field: 'name',
        message: 'Ürün adı en az 3 karakter olmalıdır',
        severity: 'warning',
        value: data.name,
      });
    }

    // Check stock threshold
    if (data.stock && data.stock < 10) {
      warnings.push({
        rowNumber,
        field: 'stock',
        message: 'Düşük stok miktarı',
        severity: 'warning',
        value: data.stock,
      });
    }

    return {
      data: data as ProductImportData,
      errors,
      warnings,
    };
  }

  // Get field label
  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      name: 'Ürün Adı',
      price: 'Fiyat',
      stock: 'Stok',
      description: 'Açıklama',
      sku: 'SKU',
      categoryName: 'Kategori',
    };
    return labels[field] || field;
  }

  // Generate template Excel
  generateTemplate(): void {
    const template = [
      {
        'Ürün Adı': 'Örnek Ürün',
        'Açıklama': 'Ürün açıklaması',
        'SKU': 'SKU-001',
        'Barkod': '1234567890',
        'Fiyat': 99.90,
        'İndirimli Fiyat': 79.90,
        'Maliyet': 50.00,
        'Stok': 100,
        'Düşük Stok Eşiği': 10,
        'Kategori': 'Giyim',
        'Etiketler': 'yeni, indirim, trend',
        'Görsel URL': 'https://example.com/image1.jpg,https://example.com/image2.jpg',
        'Durum': 'active',
        'Meta Başlık': 'Örnek Ürün - Mağaza',
        'Meta Açıklama': 'Örnek ürün açıklaması',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ürünler');

    // Download
    XLSX.writeFile(workbook, 'urun-sablonu.xlsx');
  }
}

export const excelParserService = new ExcelParserService();
