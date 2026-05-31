export interface TrendyolInvoiceView {
  status:          string | null;
  number:          string | null;
  link:            string | null;
  rejectedReasons: string[];
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  NotRequired: 'Gerekli değil',
  Waiting:     'Bekleniyor',
  Uploaded:    'Yüklendi',
  Approved:    'Onaylandı',
  Rejected:    'Reddedildi',
};

export function invoiceStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return INVOICE_STATUS_LABELS[status] ?? status;
}

/** rawPayload içinden fatura alanlarını güvenli çıkarır. */
export function extractTrendyolInvoice(raw: Record<string, unknown> | null | undefined): TrendyolInvoiceView {
  if (!raw) {
    return { status: null, number: null, link: null, rejectedReasons: [] };
  }

  const rejected = raw.invoiceRejectedReasonKeys ?? raw.invoiceRejectedReasons;
  let rejectedReasons: string[] = [];
  if (Array.isArray(rejected)) {
    rejectedReasons = rejected.map(String);
  } else if (rejected != null && String(rejected).trim()) {
    rejectedReasons = [String(rejected)];
  }

  return {
    status:          raw.invoiceStatus != null ? String(raw.invoiceStatus) : null,
    number:          raw.invoiceNumber != null ? String(raw.invoiceNumber) : null,
    link:            raw.invoiceLink != null ? String(raw.invoiceLink) : null,
    rejectedReasons,
  };
}
