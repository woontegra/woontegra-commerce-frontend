import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { BulkImportRow, BulkImportResult } from '../../types/product';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface BulkImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: BulkImportRow[]) => Promise<BulkImportResult>;
}

export default function BulkImport({ isOpen, onClose, onImport }: BulkImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const rows: BulkImportRow[] = jsonData.map(row => ({
        name: row['Ürün Adı'] || row['name'],
        description: row['Açıklama'] || row['description'],
        price: parseFloat(row['Fiyat'] || row['price']) || 0,
        stock: parseInt(row['Stok'] || row['stock']) || 0,
        sku: row['SKU'] || row['sku'],
        category: row['Kategori'] || row['category'],
        unit: row['Birim'] || row['unit'],
        minQuantity: parseInt(row['Min Sipariş'] || row['minQuantity']) || 1,
        maxQuantity: parseInt(row['Max Sipariş'] || row['maxQuantity']),
      }));

      const importResult = await onImport(rows);
      setResult(importResult);
    } catch (error) {
      console.error('Import failed:', error);
      setResult({
        success: 0,
        failed: 0,
        errors: [{ row: 0, message: 'Dosya işlenirken hata oluştu' }],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Ürün Adı': 'Örnek Ürün',
        'Açıklama': 'Ürün açıklaması',
        'Fiyat': 100,
        'Stok': 50,
        'SKU': 'PROD-001',
        'Kategori': 'Elektronik',
        'Birim': 'adet',
        'Min Sipariş': 1,
        'Max Sipariş': 100,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
    XLSX.writeFile(wb, 'urun_import_sablonu.xlsx');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Toplu Ürün İçe Aktarma" size="lg">
      <div className="space-y-6">
        {/* Template Download */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Excel şablonunu indirin
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Ürünlerinizi eklemek için önce şablonu indirin ve doldurun
              </p>
              <button
                onClick={downloadTemplate}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                Şablonu İndir (.xlsx)
              </button>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Excel Dosyası Yükle
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="space-y-2">
                <svg className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Farklı dosya seç
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Excel dosyası seçin
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  .xlsx veya .xls formatında
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-xl p-4 ${
            result.failed === 0 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
          }`}>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              İçe Aktarma Sonucu
            </h4>
            <div className="space-y-1 text-sm">
              <p className="text-green-600 dark:text-green-400">
                ✓ {result.success} ürün başarıyla eklendi
              </p>
              {result.failed > 0 && (
                <p className="text-red-600 dark:text-red-400">
                  ✗ {result.failed} ürün eklenemedi
                </p>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Hatalar:</p>
                {result.errors.slice(0, 5).map((error, idx) => (
                  <p key={idx} className="text-xs text-red-600 dark:text-red-400">
                    Satır {error.row}: {error.message}
                  </p>
                ))}
                {result.errors.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    +{result.errors.length - 5} hata daha...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            disabled={!file || isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'İşleniyor...' : 'İçe Aktar'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}
