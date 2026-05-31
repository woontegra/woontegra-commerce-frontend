import type { CargoLabelFormat, CargoLabelResult } from '../hooks/useTrendyolOrder';

const LABELARY_SIZES: Record<CargoLabelFormat, string> = {
  A4:      '10x15',
  STICKER: '4x6',
};

export function getCargoLabelPdfUrl(data: CargoLabelResult): string | null {
  const primary = data.labels[0];
  if (!primary) return null;
  if (data.deliveryType === 'pdf_url') {
    return primary.url ?? (/^https?:\/\//i.test(primary.content) ? primary.content : null);
  }
  return null;
}

export async function buildCargoLabelPreviewUrl(
  data: CargoLabelResult,
  format: CargoLabelFormat,
): Promise<string | null> {
  const pdfUrl = getCargoLabelPdfUrl(data);
  if (pdfUrl) return pdfUrl;

  const primary = data.labels[0];
  if (!primary?.content || data.deliveryType !== 'zpl') return null;

  const labelSize = LABELARY_SIZES[format];
  const response = await fetch(`https://api.labelary.com/v1/printers/8dpmm/labels/${labelSize}/0/`, {
    method:  'POST',
    headers: { Accept: 'image/png' },
    body:    primary.content,
  });

  if (!response.ok) {
    throw new Error('ZPL etiket önizlemesi oluşturulamadı.');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function downloadCargoLabelFiles(data: CargoLabelResult, orderNumber: string) {
  data.labels.forEach((label, index) => {
    const suffix = data.labels.length > 1 ? `-${index + 1}` : '';
    const pdfUrl = label.url ?? (/^https?:\/\//i.test(label.content) ? label.content : null);

    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (label.content.startsWith('%PDF')) {
      const blob = new Blob([label.content], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${orderNumber}-kargo-etiketi${suffix}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const blob = new Blob([label.content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${orderNumber}-kargo-etiketi${suffix}.zpl`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function printCargoLabelPreview(previewUrl: string, isPdfUrl: boolean) {
  if (isPdfUrl) {
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  const printWindow = window.open('');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><title>Kargo Etiketi</title></head>
    <body style="margin:0;display:flex;justify-content:center;">
      <img src="${previewUrl}" style="max-width:100%;height:auto;" onload="window.print();" />
    </body></html>
  `);
  printWindow.document.close();
}
