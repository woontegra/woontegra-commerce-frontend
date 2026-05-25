import { useState, useRef } from 'react';
import type { ExcelRow, ImportResult, ImportLog } from '../../types/bulkImport';
import { excelParserService } from '../../services/excelParser.service';
import { bulkProductImportService } from '../../services/bulkProductImport.service';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

export default function BulkProductImport() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Sadece Excel dosyaları (.xlsx, .xls) yükleyebilirsiniz');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      // Parse Excel
      const parsedRows = await excelParserService.parseExcel(selectedFile);
      setRows(parsedRows);
      setCurrentStep('preview');
      
      const errorCount = parsedRows.filter(r => r.status === 'error').length;
      const warningCount = parsedRows.filter(r => r.status === 'warning').length;
      
      toast.success(`${parsedRows.length} satır okundu (${errorCount} hata, ${warningCount} uyarı)`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Excel dosyası okunamadı');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;

    setIsProcessing(true);

    try {
      // Create log
      const log: ImportLog = {
        id: `log-${Date.now()}`,
        filename: file?.name || 'unknown',
        startedAt: new Date().toISOString(),
        status: 'processing',
        errors: [],
      };

      // Import products
      const importResult = await bulkProductImportService.importProducts(rows);
      
      // Update log
      log.completedAt = new Date().toISOString();
      log.status = 'completed';
      log.result = importResult;
      
      // Save log
      bulkProductImportService.saveLog(log);

      setResult(importResult);
      setCurrentStep('result');

      toast.success(`${importResult.success} ürün başarıyla oluşturuldu!`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('İçe aktarma başarısız');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setRows([]);
    setResult(null);
    setCurrentStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    excelParserService.generateTemplate();
    toast.success('Şablon indirildi');
  };

  const handleExportErrors = () => {
    if (result) {
      bulkProductImportService.exportErrorReport(result);
    }
  };

  const errorCount = rows.filter(r => r.status === 'error').length;
  const warningCount = rows.filter(r => r.status === 'warning').length;
  const validCount = rows.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Toplu Ürün İçe Aktarma
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Excel dosyası ile toplu ürün yükleme
          </p>
        </div>
        
        <Button onClick={handleDownloadTemplate} variant="secondary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Şablon İndir
        </Button>
      </div>

      {/* Upload Step */}
      {currentStep === 'upload' && (
        <div className="card">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            className="hidden"
          />
          
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
          >
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
              Excel dosyasını sürükleyin veya tıklayın
            </p>
            <p className="text-sm text-gray-500">
              .xlsx veya .xls formatında
            </p>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {currentStep === 'preview' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{rows.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Toplam</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-600">{validCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Geçerli</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Uyarı</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-red-600">{errorCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Hata</p>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Satır</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün Adı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fiyat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mesaj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.slice(0, 50).map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-4 py-3 text-sm">{row.rowNumber}</td>
                    <td className="px-4 py-3 text-sm">{row.data.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">₺{row.data.price || '-'}</td>
                    <td className="px-4 py-3 text-sm">{row.data.stock || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        row.status === 'error' ? 'bg-red-100 text-red-800' :
                        row.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {row.status === 'error' ? 'Hata' : row.status === 'warning' ? 'Uyarı' : 'Geçerli'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.errors?.join(', ') || row.warnings?.join(', ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={handleReset} variant="secondary">
              İptal
            </Button>
            <Button
              onClick={handleImport}
              disabled={isProcessing || errorCount > 0}
              className="flex-1"
            >
              {isProcessing ? 'İşleniyor...' : `${validCount + warningCount} Ürün İçe Aktar`}
            </Button>
          </div>
        </div>
      )}

      {/* Result Step */}
      {currentStep === 'result' && result && (
        <div className="space-y-4">
          {/* Success Message */}
          <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                  İçe Aktarma Tamamlandı!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {result.success} ürün başarıyla oluşturuldu ({result.duration}ms)
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{result.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Toplam</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-600">{result.success}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Başarılı</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-yellow-600">{result.warnings}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Uyarı</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-red-600">{result.failed}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Başarısız</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={handleReset} variant="secondary" className="flex-1">
              Yeni İçe Aktarma
            </Button>
            {result.failed > 0 && (
              <Button onClick={handleExportErrors} variant="secondary">
                Hata Raporu İndir
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
