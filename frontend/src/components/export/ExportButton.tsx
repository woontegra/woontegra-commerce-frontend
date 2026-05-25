import { useState } from 'react';
import { exportService } from '../../services/export.service';

interface ExportButtonProps {
  data: any[];
  type: 'orders' | 'products';
  variant?: 'button' | 'icon';
}

export default function ExportButton({ data, type, variant = 'button' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExportCSV = () => {
    if (type === 'orders') {
      exportService.exportOrdersToCSV(data);
    } else {
      exportService.exportProductsToCSV(data);
    }
    setIsOpen(false);
  };

  const handleExportExcel = () => {
    if (type === 'orders') {
      exportService.exportOrdersToExcel(data);
    } else {
      exportService.exportProductsToExcel(data);
    }
    setIsOpen(false);
  };

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Export"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <button
              onClick={handleExportCSV}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
            >
              📄 CSV olarak indir
            </button>
            <button
              onClick={handleExportExcel}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
            >
              📊 Excel olarak indir
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-primary flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2">
              {data.length} kayıt export edilecek
            </p>
            <button
              onClick={handleExportCSV}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
            >
              <span>📄</span>
              <div>
                <p className="font-medium">CSV olarak indir</p>
                <p className="text-xs text-gray-500">Excel, Google Sheets uyumlu</p>
              </div>
            </button>
            <button
              onClick={handleExportExcel}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
            >
              <span>📊</span>
              <div>
                <p className="font-medium">Excel olarak indir</p>
                <p className="text-xs text-gray-500">Microsoft Excel (.xlsx)</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
