import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTrendyolOrder,
  useSendTrendyolInvoiceLink,
  useUploadTrendyolInvoiceFile,
  useFetchTrendyolCargoLabel,
  MAX_TRENDYOL_INVOICE_PDF_BYTES,
  type CargoLabelFormat,
  type CargoLabelResult,
} from '../hooks/useTrendyolOrder';
import { useSyncTrendyolOrders } from '../hooks/useOrders';
import { extractTrendyolInvoice, invoiceStatusLabel } from '../utils/trendyolOrderInvoice';
import { normalizeImageUrl } from '../utils/imageUtils';
import {
  buildCargoLabelPreviewUrl,
  downloadCargoLabelFiles,
  getCargoLabelPdfUrl,
  printCargoLabelPreview,
} from '../utils/trendyolCargoLabelPreview';

function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

function CargoLabelPreviewModal({
  data,
  format,
  orderNumber,
  onClose,
}: {
  data:        CargoLabelResult;
  format:      CargoLabelFormat;
  orderNumber: string;
  onClose:     () => void;
}) {
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [loading, setLoading]         = useState(true);

  const pdfUrl = getCargoLabelPdfUrl(data);
  const isPdf    = Boolean(pdfUrl);

  useEffect(() => {
    let objectUrl: string | null = null;

    async function loadPreview() {
      setLoading(true);
      setPreviewError('');
      try {
        const url = await buildCargoLabelPreviewUrl(data, format);
        if (!url) {
          setPreviewError('Etiket önizlemesi oluşturulamadı.');
          return;
        }
        objectUrl = isPdf ? null : url;
        setPreviewUrl(url);
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : 'Önizleme yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }

    loadPreview();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data, format, isPdf]);

  const formatLabel = format === 'A4' ? 'A4 Etiket' : 'Sticker Etiket';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-bold text-slate-900">{formatLabel} Önizleme</h3>
          <p className="text-sm text-slate-500 mt-1">
            Sipariş <span className="font-medium text-slate-700">{orderNumber}</span>
            {' · '}Takip: <span className="font-mono text-xs">{data.cargoTrackingNumber}</span>
          </p>
        </div>

        <div className="px-6 py-4 overflow-auto flex-1 min-h-[280px] bg-slate-50">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {!loading && previewError && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-6 text-center">
              <p className="text-sm text-red-700">{previewError}</p>
            </div>
          )}

          {!loading && previewUrl && isPdf && (
            <iframe
              title="Kargo etiketi PDF"
              src={previewUrl}
              className="w-full h-[480px] rounded-xl border border-slate-200 bg-white"
            />
          )}

          {!loading && previewUrl && !isPdf && (
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="Kargo etiketi önizleme"
                className="max-w-full max-h-[480px] rounded-xl border border-slate-200 bg-white shadow-sm"
              />
            </div>
          )}

          {!loading && !previewError && data.labels.length > 1 && (
            <p className="text-xs text-slate-500 mt-3 text-center">
              {data.labels.length} koli etiketi alındı. İlk etiket önizleniyor.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Kapat
          </button>
          <button
            type="button"
            disabled={!previewUrl}
            onClick={() => previewUrl && printCargoLabelPreview(previewUrl, isPdf)}
            className="flex-1 min-w-[120px] px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Yazdır
          </button>
          <button
            type="button"
            onClick={() => downloadCargoLabelFiles(data, orderNumber)}
            className="flex-1 min-w-[120px] px-4 py-2.5 rounded-xl bg-slate-800 text-sm font-semibold text-white hover:bg-slate-900"
          >
            İndir
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  Created:     'Yeni',
  Picking:     'Hazırlanıyor',
  Invoiced:    'Faturalandı',
  Shipped:     'Kargoda',
  Delivered:   'Teslim',
  Cancelled:   'İptal',
  UnDelivered: 'Teslim Edilemedi',
  Returned:    'İade',
};

const STATUS_STYLE: Record<string, string> = {
  Created:     'bg-blue-50 text-blue-700 border-blue-200',
  Picking:     'bg-amber-50 text-amber-700 border-amber-200',
  Invoiced:    'bg-purple-50 text-purple-700 border-purple-200',
  Shipped:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  Delivered:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled:   'bg-red-50 text-red-700 border-red-200',
  UnDelivered: 'bg-red-50 text-red-600 border-red-200',
  Returned:    'bg-orange-50 text-orange-700 border-orange-200',
};

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style:                 'currency',
    currency:              'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day:    '2-digit',
    month:  'long',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function fmtShortDate(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  }).format(new Date(iso));
}

function Panel({
  title,
  icon,
  children,
  className = '',
}: {
  title:     string;
  icon?:     React.ReactNode;
  children:  React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
        {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
        <h2 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,140px)_1fr] gap-1 sm:gap-4 py-3 border-b border-slate-50 last:border-0">
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-slate-900 break-words">{value ?? '—'}</dd>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?:  string;
}) {
  return (
    <div className="rounded-xl bg-white/80 backdrop-blur border border-white/60 px-5 py-4 min-w-[140px]">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1 leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function ItemThumbnail({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  const src = normalizeImageUrl(imageUrl);
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
        loading="lazy"
      />
    );
  }
  return (
    <div
      className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0"
      title="Görsel yok"
    >
      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

function AddressBlock({ addr }: { addr: Record<string, unknown> | null | undefined }) {
  if (!addr) {
    return <p className="text-sm text-slate-400 italic">Adres bilgisi yok</p>;
  }

  const name = [addr.firstName, addr.lastName].filter(Boolean).join(' ');
  const line1 = String(addr.address1 ?? addr.addressLine ?? '').trim();
  const line2 = String(addr.address2 ?? '').trim();
  const district = String(addr.district ?? '').trim();
  const city = String(addr.city ?? '').trim();
  const postal = String(addr.postalCode ?? '').trim();
  const phone = String(addr.phone ?? '').trim();
  const company = String(addr.company ?? '').trim();

  return (
    <div className="text-sm text-slate-600 space-y-2 leading-relaxed">
      {name && <p className="font-semibold text-slate-900 text-base">{name}</p>}
      {company && <p className="text-slate-700">{company}</p>}
      {line1 && <p>{line1}</p>}
      {line2 && <p>{line2}</p>}
      {(district || city || postal) && (
        <p>
          {[district, city].filter(Boolean).join(' / ')}
          {postal ? ` · ${postal}` : ''}
        </p>
      )}
      {phone && (
        <p className="flex items-center gap-1.5 pt-1 text-slate-700">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {phone}
        </p>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="h-44 rounded-2xl bg-slate-100" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="h-56 rounded-2xl bg-slate-100" />
          <div className="h-40 rounded-2xl bg-slate-100" />
        </div>
        <div className="space-y-6">
          <div className="h-48 rounded-2xl bg-slate-100" />
          <div className="h-56 rounded-2xl bg-slate-100" />
        </div>
      </div>
      <div className="h-64 rounded-2xl bg-slate-100" />
    </div>
  );
}

function InvoiceLinkModal({
  orderNumber,
  onClose,
  onSubmit,
  loading,
}: {
  orderNumber: string;
  onClose:     () => void;
  onSubmit:    (data: { invoiceLink: string; invoiceNumber?: string; invoiceDateTime?: string }) => void;
  loading:     boolean;
}) {
  const [invoiceLink, setInvoiceLink] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDateTime, setInvoiceDateTime] = useState('');
  const [linkError, setLinkError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const link = invoiceLink.trim();
    if (!link) {
      setLinkError('Fatura linki zorunludur.');
      return;
    }
    if (!isHttpsUrl(link)) {
      setLinkError('Fatura linki HTTPS olmalıdır (https:// ile başlamalı).');
      return;
    }
    setLinkError('');
    onSubmit({
      invoiceLink: link,
      invoiceNumber:   invoiceNumber.trim() || undefined,
      invoiceDateTime: invoiceDateTime.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Fatura Linki Gönder</h3>
          <p className="text-sm text-slate-500 mt-1">
            Sipariş <span className="font-medium text-slate-700">{orderNumber}</span> için fatura linkini Trendyol&apos;a iletin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="invoiceLink" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Fatura Linki <span className="text-red-500">*</span>
            </label>
            <input
              id="invoiceLink"
              type="url"
              value={invoiceLink}
              onChange={(e) => {
                setInvoiceLink(e.target.value);
                if (linkError) setLinkError('');
              }}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
              disabled={loading}
              autoFocus
            />
            {linkError && <p className="text-xs text-red-600 mt-1.5">{linkError}</p>}
          </div>

          <div>
            <label htmlFor="invoiceNumber" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Fatura No <span className="text-slate-400 font-normal normal-case">(opsiyonel)</span>
            </label>
            <input
              id="invoiceNumber"
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Örn. ABC2026001"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
              disabled={loading}
            />
            <p className="text-xs text-slate-400 mt-1">Mikro ihracat / yurt dışı paketlerde gerekebilir.</p>
          </div>

          <div>
            <label htmlFor="invoiceDateTime" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Fatura Tarihi <span className="text-slate-400 font-normal normal-case">(opsiyonel)</span>
            </label>
            <input
              id="invoiceDateTime"
              type="datetime-local"
              value={invoiceDateTime}
              onChange={(e) => setInvoiceDateTime(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Gönder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvoiceFileModal({
  orderNumber,
  onClose,
  onSubmit,
  loading,
}: {
  orderNumber: string;
  onClose:     () => void;
  onSubmit:    (data: { file: File; invoiceNumber?: string; invoiceDateTime?: string }) => void;
  loading:     boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDateTime, setInvoiceDateTime] = useState('');
  const [fileError, setFileError] = useState('');

  const validateFile = (selected: File | null): string | null => {
    if (!selected) return 'PDF fatura dosyası zorunludur.';
    const isPdf = selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return 'Sadece PDF dosyası seçebilirsiniz.';
    if (selected.size > MAX_TRENDYOL_INVOICE_PDF_BYTES) {
      return 'Fatura dosyası en fazla 10 MB olabilir.';
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setFileError(validateFile(selected) ?? '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError('');
    onSubmit({
      file: file!,
      invoiceNumber:   invoiceNumber.trim() || undefined,
      invoiceDateTime: invoiceDateTime.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">PDF Fatura Yükle</h3>
          <p className="text-sm text-slate-500 mt-1">
            Sipariş <span className="font-medium text-slate-700">{orderNumber}</span> için PDF faturayı Trendyol&apos;a yükleyin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="invoicePdf" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              PDF Dosyası <span className="text-red-500">*</span>
            </label>
            <input
              id="invoicePdf"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              disabled={loading}
            />
            {file && !fileError && (
              <p className="text-xs text-slate-500 mt-1.5">
                {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
            {fileError && <p className="text-xs text-red-600 mt-1.5">{fileError}</p>}
            <p className="text-xs text-slate-400 mt-1">Maksimum 10 MB, yalnızca PDF.</p>
          </div>

          <div>
            <label htmlFor="invoiceFileNumber" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Fatura No <span className="text-slate-400 font-normal normal-case">(opsiyonel)</span>
            </label>
            <input
              id="invoiceFileNumber"
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Örn. ABC2026001"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
              disabled={loading}
            />
            <p className="text-xs text-slate-400 mt-1">Mikro ihracat / yurt dışı paketlerde gerekebilir.</p>
          </div>

          <div>
            <label htmlFor="invoiceFileDateTime" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Fatura Tarihi <span className="text-slate-400 font-normal normal-case">(opsiyonel)</span>
            </label>
            <input
              id="invoiceFileDateTime"
              type="datetime-local"
              value={invoiceDateTime}
              onChange={(e) => setInvoiceDateTime(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Yükle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TrendyolOrderDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: order, isLoading, isError } = useTrendyolOrder(id);
  const sendInvoiceLink = useSendTrendyolInvoiceLink(id);
  const uploadInvoiceFile = useUploadTrendyolInvoiceFile(id);
  const fetchCargoLabel = useFetchTrendyolCargoLabel(id);
  const syncTrendyolOrders = useSyncTrendyolOrders();
  const [rawOpen, setRawOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceFileModalOpen, setInvoiceFileModalOpen] = useState(false);
  const [labelFormatLoading, setLabelFormatLoading] = useState<CargoLabelFormat | null>(null);
  const [cargoLabelPreview, setCargoLabelPreview] = useState<{
    data:   CargoLabelResult;
    format: CargoLabelFormat;
  } | null>(null);

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !order) {
    return (
      <div className="w-full flex items-center justify-center py-24">
        <div className="rounded-2xl border border-red-100 bg-red-50 px-10 py-12 text-center max-w-md">
          <p className="text-red-700 font-semibold text-lg">Trendyol siparişi bulunamadı</p>
          <p className="text-sm text-red-600/80 mt-2">Sipariş silinmiş veya erişim yetkiniz olmayabilir.</p>
          <Link
            to="/dashboard/orders"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            ← Sipariş listesine dön
          </Link>
        </div>
      </div>
    );
  }

  const customerName = [order.customerFirstName, order.customerLastName]
    .filter(Boolean)
    .join(' ')
    .trim() || '—';
  const invoice = extractTrendyolInvoice(order.rawPayload);
  const statusLabel = STATUS_LABEL[order.status] ?? order.status;
  const statusStyle = STATUS_STYLE[order.status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const lineTotal = order.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const hasCargoTracking = Boolean(order.cargoTrackingNumber?.trim());

  const handleCargoLabel = (format: CargoLabelFormat) => {
    setLabelFormatLoading(format);
    fetchCargoLabel.mutate(format, {
      onSuccess: (data) => {
        setCargoLabelPreview({ data, format });
      },
      onSettled: () => setLabelFormatLoading(null),
    });
  };

  const handleResyncOrder = () => {
    syncTrendyolOrders.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['trendyol-order', id] });
      },
    });
  };

  return (
    <div className="w-full space-y-6 pb-10">

      {/* ── Hero header ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50/40 shadow-sm overflow-hidden">
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-orange-100/60">
          <Link
            to="/dashboard/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Siparişler
          </Link>

          <div className="mt-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  Trendyol
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusStyle}`}>
                  {statusLabel}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                  Salt okunur
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-all">
                {order.orderNumber}
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">
                Trendyol pazaryeri siparişi · {fmtDate(order.orderDate)}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <SummaryMetric
                label="Toplam Tutar"
                value={fmtCurrency(Number(order.totalPrice))}
              />
              <SummaryMetric
                label="Ürün Adedi"
                value={itemCount}
                sub={`${order.items.length} kalem`}
              />
              <SummaryMetric
                label="Son Senkron"
                value={order.updatedAt ? fmtShortDate(order.updatedAt) : '—'}
                sub={order.updatedAt ? fmtDate(order.updatedAt).split(',')[1]?.trim() : undefined}
              />
            </div>
          </div>
        </div>

        {order.cargoTrackingNumber && (
          <div className="px-6 sm:px-8 py-3 bg-white/60 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500 font-medium">Kargo Takip:</span>
            <span className="font-mono font-semibold text-slate-900">{order.cargoTrackingNumber}</span>
          </div>
        )}
      </div>

      {/* ── Two-column body ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Left column */}
        <div className="space-y-6">
          <Panel
            title="Sipariş Bilgileri"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          >
            <dl>
              <InfoRow label="Kaynak" value="Trendyol Pazaryeri" />
              <InfoRow label="Sipariş No" value={
                <span className="font-mono font-medium">{order.orderNumber}</span>
              } />
              <InfoRow label="Sipariş Tarihi" value={fmtDate(order.orderDate)} />
              <InfoRow label="Toplam Tutar" value={
                <span className="font-semibold">{fmtCurrency(Number(order.totalPrice))}</span>
              } />
              <InfoRow label="Kalem Toplamı" value={fmtCurrency(lineTotal)} />
            </dl>
          </Panel>

          <Panel
            title="Müşteri Bilgileri"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          >
            <dl>
              <InfoRow label="Ad Soyad" value={customerName} />
              <InfoRow label="E-posta" value={
                order.customerEmail
                  ? (
                    <a href={`mailto:${order.customerEmail}`} className="text-indigo-600 hover:underline">
                      {order.customerEmail}
                    </a>
                  )
                  : '—'
              } />
            </dl>
          </Panel>

          <Panel
            title="Teslimat Adresi"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          >
            <AddressBlock addr={order.shipmentAddress} />
          </Panel>

          <Panel
            title="Fatura Adresi"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            <AddressBlock addr={order.invoiceAddress} />
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Panel
            title="Trendyol Bilgileri"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          >
            <dl>
              <InfoRow label="Trendyol Sipariş No" value={
                <span className="font-mono font-medium">{order.orderNumber}</span>
              } />
              <InfoRow label="Trendyol Durumu" value={
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle}`}>
                  {statusLabel}
                </span>
              } />
              <InfoRow label="Ham Durum Kodu" value={
                <span className="font-mono text-xs text-slate-500">{order.status}</span>
              } />
              <InfoRow label="Son Senkron" value={
                order.updatedAt ? fmtDate(order.updatedAt) : '—'
              } />
              <InfoRow label="Stok Düşüldü" value={
                order.stockDecremented
                  ? <span className="text-emerald-600 font-medium">Evet</span>
                  : <span className="text-slate-400">Hayır</span>
              } />
            </dl>
          </Panel>

          <Panel
            title="Kargo Bilgileri"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
          >
            <dl>
              <InfoRow label="Kargo Takip No" value={
                order.cargoTrackingNumber
                  ? <span className="font-mono font-semibold text-indigo-700">{order.cargoTrackingNumber}</span>
                  : <span className="text-slate-400 italic">Henüz atanmadı</span>
              } />
              <InfoRow label="Durum" value={statusLabel} />
            </dl>
            {!order.cargoTrackingNumber && (
              <p className="mt-3 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                Kargo takip numarası Trendyol senkronizasyonu ile güncellenir.
              </p>
            )}
          </Panel>

          <Panel
            title="Fatura Bilgileri"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            }
          >
            <dl>
              <InfoRow label="Fatura Durumu" value={
                <span className={
                  invoice.status === 'Rejected'
                    ? 'text-red-600 font-medium'
                    : invoice.status === 'Approved' || invoice.status === 'Uploaded'
                      ? 'text-emerald-600 font-medium'
                      : ''
                }>
                  {invoiceStatusLabel(invoice.status)}
                </span>
              } />
              <InfoRow label="Fatura No" value={
                invoice.number
                  ? <span className="font-mono">{invoice.number}</span>
                  : '—'
              } />
              <InfoRow label="Fatura Linki" value={
                invoice.link
                  ? (
                    <a
                      href={invoice.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline break-all"
                    >
                      Faturayı görüntüle
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )
                  : '—'
              } />
              <InfoRow label="Red Nedenleri" value={
                invoice.rejectedReasons.length
                  ? (
                    <ul className="space-y-1">
                      {invoice.rejectedReasons.map((r) => (
                        <li key={r} className="flex items-start gap-1.5 text-red-600">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )
                  : '—'
              } />
            </dl>
          </Panel>

          <Panel
            title="Operasyon"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          >
            <div className="space-y-5">
              {/* 1. Kargo etiketi */}
              <div className="space-y-3">
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                  <p className="text-sm text-indigo-800 font-medium">Kargo etiketi</p>
                  <p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">
                    Trendyol akışında önce kargo etiketi yazdırılır. Etiket alındıktan sonra fatura gönderimi yapılabilir.
                  </p>
                </div>

                {!hasCargoTracking && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Kargo takip numarası bulunamadı. Siparişi yeniden senkronize edin.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!hasCargoTracking || labelFormatLoading !== null}
                    onClick={() => handleCargoLabel('A4')}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold
                               text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl
                               hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {labelFormatLoading === 'A4' ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    )}
                    A4 Etiket Yazdır
                  </button>

                  <button
                    type="button"
                    disabled={!hasCargoTracking || labelFormatLoading !== null}
                    onClick={() => handleCargoLabel('STICKER')}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold
                               text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl
                               hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {labelFormatLoading === 'STICKER' ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    )}
                    Sticker Etiket Yazdır
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* 2. Fatura gönderimi */}
              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                  <p className="text-sm text-emerald-800 font-medium">Fatura gönderimi</p>
                  <p className="text-xs text-emerald-700/80 mt-1 leading-relaxed">
                    Trendyol akışında kargo etiketi işleminden sonra fatura gönderimi yapılabilir.
                    PDF yükleyebilir veya HTTPS fatura linki gönderebilirsiniz.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setInvoiceFileModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold
                             text-orange-700 bg-orange-50 border border-orange-200 rounded-xl
                             hover:bg-orange-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  PDF Fatura Yükle
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold
                             text-orange-700 bg-orange-50 border border-orange-200 rounded-xl
                             hover:bg-orange-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Fatura Linki Gönder
                </button>
              </div>

              <div className="border-t border-slate-100" />

              {/* 3. Yeniden senkronize */}
              <button
                type="button"
                onClick={handleResyncOrder}
                disabled={syncTrendyolOrders.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium
                           text-slate-700 bg-slate-50 border border-slate-200 rounded-xl
                           hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                {syncTrendyolOrders.isPending ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Siparişi Yeniden Senkronize Et
              </button>

              <Link
                to="/dashboard/trendyol-orders"
                className="flex items-center justify-center gap-1.5 w-full px-4 py-2 text-xs font-medium
                           text-slate-500 hover:text-orange-700 transition-colors"
              >
                Teknik sync ekranı
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      {/* ── Full-width items ──────────────────────────────────────────── */}
      <Panel
        title={`Ürün Kalemleri (${order.items.length})`}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
        className="overflow-hidden"
      >
        {order.items.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-4 text-center">Kalem bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50/80 border-y border-slate-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ürün
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Barkod / SKU
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Adet
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Birim Fiyat
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Satır Toplam
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => {
                  const rowTotal = Number(item.price) * item.quantity;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <ItemThumbnail imageUrl={item.imageUrl} name={item.productName} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{item.productName}</p>
                            {(item.productId || item.variantId) && (
                              <p className="text-xs text-emerald-600 mt-0.5 font-medium">Woontegra ürünü eşleşti</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-mono text-slate-600">{item.barcode}</p>
                        {item.merchantSku && (
                          <p className="text-xs text-slate-400 mt-0.5">SKU: {item.merchantSku}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full
                                         bg-slate-100 text-sm font-semibold text-slate-700">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-700">
                        {fmtCurrency(Number(item.price))}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                        {fmtCurrency(rowTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/60 border-t border-slate-200">
                  <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-slate-500">
                    Sipariş Toplamı
                  </td>
                  <td className="px-6 py-4 text-right text-base font-bold text-slate-900">
                    {fmtCurrency(Number(order.totalPrice))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>

      {/* ── Raw payload accordion ───────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setRawOpen(v => !v)}
          className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left
                     hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold text-slate-700">Teknik Veri (Ham Payload)</span>
            <span className="text-xs text-slate-400 font-normal hidden sm:inline">
              Geliştirici / debug
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${rawOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {rawOpen && (
          <div className="border-t border-slate-100 px-6 py-4 bg-slate-950">
            <pre className="text-xs text-emerald-400/90 overflow-x-auto leading-relaxed max-h-[480px] overflow-y-auto font-mono">
              {JSON.stringify(order.rawPayload ?? {}, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {invoiceModalOpen && (
        <InvoiceLinkModal
          orderNumber={order.orderNumber}
          onClose={() => setInvoiceModalOpen(false)}
          onSubmit={(data) => {
            sendInvoiceLink.mutate(data, {
              onSuccess: () => setInvoiceModalOpen(false),
            });
          }}
          loading={sendInvoiceLink.isPending}
        />
      )}

      {invoiceFileModalOpen && (
        <InvoiceFileModal
          orderNumber={order.orderNumber}
          onClose={() => setInvoiceFileModalOpen(false)}
          onSubmit={(data) => {
            uploadInvoiceFile.mutate(data, {
              onSuccess: () => setInvoiceFileModalOpen(false),
            });
          }}
          loading={uploadInvoiceFile.isPending}
        />
      )}

      {cargoLabelPreview && (
        <CargoLabelPreviewModal
          data={cargoLabelPreview.data}
          format={cargoLabelPreview.format}
          orderNumber={order.orderNumber}
          onClose={() => setCargoLabelPreview(null)}
        />
      )}
    </div>
  );
}
