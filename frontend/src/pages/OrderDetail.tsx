import { useEffect, useState, useCallback } from 'react';
import { useBranding } from '../context/BrandingContext';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useOrder,
  useOrderHistory,
  useUpdateOrderStatus,
  useUpdateOrderShipping,
  useUpdateOrderInvoice,
  useUploadOrderInvoicePdf,
  INVOICE_PDF_MAX_BYTES,
  useCancelOrder,
  useConfirmOrderPayment,
} from '../hooks/useOrders';
import type {
  UpdateOrderShippingDto,
  OrderStatus,
  OrderItem,
  Order,
  OrderHistoryEntry,
  AdminOrderMeta,
  AdminOrderTotals,
} from '../services/order.service';
import './OrderDetail.print.css';
import { ORDER_PAYMENT_STATUS_LABELS } from '../utils/orderPaymentLabels';
import {
  fetchReturnRequestsByOrder,
  type ReturnRequest,
  type ReturnRequestStatus,
  type ReturnRequestType,
} from '../services/returnRequest.service';
import { normalizeImageUrl } from '../utils/imageUtils';

// ─── Labels & styles ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:    'Bekliyor',
  PROCESSING: 'Hazırlanıyor',
  PAID:       'Ödendi',
  SHIPPED:    'Kargoda',
  DELIVERED:  'Teslim Edildi',
  CANCELLED:  'İptal',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:    'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
  PROCESSING: 'bg-blue-50 text-blue-800 ring-1 ring-blue-100',
  PAID:       'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  SHIPPED:    'bg-violet-50 text-violet-800 ring-1 ring-violet-100',
  DELIVERED:  'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  CANCELLED:  'bg-red-50 text-red-800 ring-1 ring-red-100',
};

const RETURN_TYPE_LABELS: Record<ReturnRequestType, string> = {
  CANCEL_REQUEST: 'İptal talebi',
  RETURN_REQUEST: 'İade talebi',
};

const RETURN_STATUS_LABELS: Record<ReturnRequestStatus, string> = {
  PENDING:   'Beklemede',
  APPROVED:  'Onaylandı',
  REJECTED:  'Reddedildi',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
};

const ALL_STATUSES: OrderStatus[] = [
  'PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED',
];

const SHIPPING_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING:    'Henüz kargoya verilmedi',
  PROCESSING: 'Hazırlanıyor',
  PAID:       'Kargoya hazır',
  SHIPPED:    'Kargoda',
  DELIVERED:  'Teslim edildi',
  CANCELLED:  'İptal',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style:                 'currency',
    currency:              currency || 'TRY',
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

function shippingLocked(status: OrderStatus): boolean {
  return status === 'DELIVERED' || status === 'CANCELLED';
}

function canConfirmBankTransferPayment(order: Order): boolean {
  const provider = String(order.paymentProvider ?? order.payment?.provider ?? '').toUpperCase();
  if (provider !== 'BANK_TRANSFER') return false;
  if (order.status === 'CANCELLED') return false;
  const ps = String(order.paymentStatus ?? order.payment?.status ?? '').toUpperCase();
  return ps === 'PENDING' || ps === 'WAITING_BANK_TRANSFER';
}

const RAW_PAYMENT_LABELS: Record<string, string> = {
  bank_transfer:    'Havale / EFT',
  paytr:            'Kredi Kartı / PayTR',
  cash_on_delivery: 'Kapıda Ödeme',
  iyzico:           'iyzico',
  bank_pos:         'Banka POS',
};

/** [Ödeme yöntemi: bank_transfer] gibi satırları okunabilir etiketlere çevirir. */
function humanizeSystemNote(line: string): Array<{ label: string; value: string }> {
  const bracket = line.match(/^\[(.+)\]$/);
  if (!bracket) return [];

  const inner = bracket[1].trim();
  const lower = inner.toLowerCase();
  const rows: Array<{ label: string; value: string }> = [];

  const paymentMethod = inner.match(/^ödeme yöntemi:\s*(.+)$/i);
  if (paymentMethod) {
    const raw = paymentMethod[1].trim();
    const key = raw.toLowerCase().replace(/\s+/g, '_');
    rows.push({
      label: 'Ödeme yöntemi',
      value: RAW_PAYMENT_LABELS[key] ?? raw.replace(/_/g, ' '),
    });
    return rows;
  }

  const cargo = inner.match(/^kargo:\s*(.+)$/i);
  if (cargo) {
    const val = cargo[1]
      .trim()
      .replace(/\s*-\s*[\d.,]+\s*₺\s*$/i, '')
      .trim();
    rows.push({ label: 'Kargo', value: val || '—' });
    return rows;
  }

  const vitrin = inner.match(/^vitrin siparişi(?:\s*-\s*(.+))?$/i);
  if (vitrin) {
    rows.push({ label: 'Sipariş kaynağı', value: 'Mağaza vitrini' });
    const suffix = vitrin[1]?.trim();
    if (suffix && /bekleniyor|ödeme|onay/i.test(suffix)) {
      rows.push({
        label: 'Ödeme durumu',
        value: suffix.toLowerCase().includes('bekleniyor') ? 'Ödeme bekleniyor' : suffix,
      });
    }
    return rows;
  }

  if (/ödeme bekleniyor/i.test(inner)) {
    rows.push({ label: 'Ödeme durumu', value: 'Ödeme bekleniyor' });
    return rows;
  }

  const dashStatus = inner.match(/^(.+?)\s*-\s*(.+)$/);
  if (dashStatus && /bekleniyor|ödeme|onay|başarısız/i.test(dashStatus[2])) {
    const leftPart = dashStatus[1].trim();
    const statusText = dashStatus[2].trim();
    const leftLower = leftPart.toLowerCase();

    if (/havale|eft/i.test(leftLower)) {
      rows.push({ label: 'Ödeme yöntemi', value: 'Havale / EFT' });
    } else if (!/vitrin/i.test(leftLower)) {
      const key = leftLower.replace(/\s+/g, '_');
      rows.push({
        label: 'Ödeme yöntemi',
        value: RAW_PAYMENT_LABELS[key] ?? leftPart,
      });
    }

    rows.push({
      label: 'Ödeme durumu',
      value: statusText.toLowerCase().includes('bekleniyor') ? 'Ödeme bekleniyor' : statusText,
    });
    return rows;
  }

  if (lower.includes('paytr')) {
    rows.push({
      label: 'Ödeme durumu',
      value: lower.includes('başarısız') ? 'Ödeme başarısız' : lower.includes('bekleniyor') ? 'PayTR ödeme bekleniyor' : inner,
    });
    return rows;
  }

  return [];
}

function parseSystemNotes(lines: string[]): {
  readable: Array<{ label: string; value: string }>;
  technical: string[];
} {
  const readable: Array<{ label: string; value: string }> = [];
  const technical: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const parsed = humanizeSystemNote(line);
    if (parsed.length > 0) {
      for (const row of parsed) {
        const key = `${row.label}::${row.value}`;
        if (!seen.has(key)) {
          seen.add(key);
          readable.push(row);
        }
      }
    } else {
      technical.push(line);
    }
  }

  return { readable, technical };
}

type ItemWithOptionalImage = OrderItem & {
  imageUrl?:     string | null;
  productImage?: string | null;
  variantImage?: string | null;
  product?: OrderItem['product'] & {
    imageUrl?: string | null;
    images?:   Array<{ url: string; isMain?: boolean }>;
  };
  variant?: OrderItem['variant'] & { imageUrl?: string | null };
};

function getOrderItemImageUrl(item: ItemWithOptionalImage): string | null {
  const candidates = [
    item.imageUrl,
    item.productImage,
    item.variantImage,
    item.variant?.imageUrl,
    item.product?.imageUrl,
    item.product?.images?.find(i => i.isMain)?.url,
    item.product?.images?.[0]?.url,
  ];
  for (const c of candidates) {
    const normalized = normalizeImageUrl(c ?? null);
    if (normalized) return normalized;
  }
  return null;
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function Panel({
  title,
  icon,
  children,
  action,
}: {
  title:    string;
  icon?:    React.ReactNode;
  children: React.ReactNode;
  action?:  React.ReactNode;
}) {
  return (
    <div className="wn-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
          <h2 className="text-sm font-medium text-slate-900 tracking-tight truncate">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SummaryMetric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="wn-card px-4 py-3 min-w-[140px] flex-1">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-base font-semibold text-slate-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

function AddressBlock({
  addr,
}: {
  addr: {
    fullName: string;
    phone: string;
    addressLine: string;
    district: string;
    city: string;
    postalCode: string;
  };
}) {
  return (
    <div className="text-[13px] text-slate-600 space-y-1.5 leading-relaxed">
      <p className="font-medium text-slate-900">{addr.fullName}</p>
      {addr.phone && <p>{addr.phone}</p>}
      <p>{addr.addressLine}</p>
      <p>
        {[addr.district, addr.city].filter(Boolean).join(' / ')}
        {addr.postalCode ? ` · ${addr.postalCode}` : ''}
      </p>
    </div>
  );
}

function AddressPrintText({
  addr,
}: {
  addr: {
    fullName: string;
    phone: string;
    addressLine: string;
    district: string;
    city: string;
    postalCode: string;
  };
}) {
  const lines = [
    addr.fullName,
    addr.phone || null,
    addr.addressLine,
    [addr.district, addr.city].filter(Boolean).join(' / ') + (addr.postalCode ? ` · ${addr.postalCode}` : ''),
  ].filter(Boolean) as string[];
  return (
    <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
      {lines.join('\n')}
    </p>
  );
}

function OrderDetailPrintSlip({
  order,
  admin,
  totals,
  methodLabel,
  paymentLabel,
  customerNoteLines,
}: {
  order:            Order;
  admin:            AdminOrderMeta | undefined;
  totals:           AdminOrderTotals;
  methodLabel:      string;
  paymentLabel:     string;
  customerNoteLines: string[];
}) {
  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
    : '—';

  const shippingLines: string[] = [];
  if (order.shippingCarrier) shippingLines.push(`Firma: ${order.shippingCarrier}`);
  if (order.shippingTrackingNumber) shippingLines.push(`Takip no: ${order.shippingTrackingNumber}`);
  if (order.shippingTrackingUrl) shippingLines.push(`Takip linki: ${order.shippingTrackingUrl}`);
  shippingLines.push(`Durum: ${SHIPPING_STATUS_LABEL[order.status] ?? order.status}`);
  if (order.shippedAt) shippingLines.push(`Kargoya verildi: ${fmtDate(order.shippedAt)}`);

  return (
    <div className="order-detail-print-slip--order hidden" aria-hidden="true">
      <header style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '16pt', fontWeight: 700 }}>Sipariş çıktısı</h1>
        <p style={{ margin: 0, fontSize: '10pt', color: '#444' }}>Woontegra · Mağaza siparişi</p>
      </header>

      <dl className="order-print-meta">
        <div>
          <dt>Sipariş no</dt>
          <dd>{order.orderNumber}</dd>
        </div>
        <div>
          <dt>Sipariş tarihi</dt>
          <dd>{fmtDate(order.createdAt)}</dd>
        </div>
        <div>
          <dt>Sipariş durumu</dt>
          <dd>{STATUS_LABELS[order.status] ?? order.status}</dd>
        </div>
        <div>
          <dt>Genel toplam</dt>
          <dd>{fmtCurrency(totals.grandTotal, order.currency)}</dd>
        </div>
      </dl>

      <section className="order-print-section">
        <h2>Müşteri</h2>
        <p style={{ margin: 0 }}><strong>{customerName}</strong></p>
        {order.customer?.phone && <p style={{ margin: '4px 0 0' }}>Tel: {order.customer.phone}</p>}
        {order.customer?.email && <p style={{ margin: '4px 0 0' }}>E-posta: {order.customer.email}</p>}
      </section>

      <section className="order-print-section">
        <h2>Teslimat adresi</h2>
        {admin?.shippingAddress ? (
          <AddressPrintText addr={admin.shippingAddress} />
        ) : (
          <p style={{ margin: 0 }}>—</p>
        )}
      </section>

      <section className="order-print-section">
        <h2>Fatura adresi</h2>
        {admin?.billingAddress?.sameAsShipping ? (
          <p style={{ margin: 0 }}>Teslimat adresi ile aynı.</p>
        ) : admin?.billingAddress ? (
          <div>
            {admin.billingAddress.type === 'corporate' && (
              <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Kurumsal fatura</p>
            )}
            <AddressPrintText addr={admin.billingAddress} />
            {admin.billingAddress.companyName && (
              <p style={{ margin: '6px 0 0' }}>Firma: {admin.billingAddress.companyName}</p>
            )}
            {(admin.billingAddress.taxOffice || admin.billingAddress.taxNumber) && (
              <p style={{ margin: '4px 0 0' }}>
                {admin.billingAddress.taxOffice && `VD: ${admin.billingAddress.taxOffice}`}
                {admin.billingAddress.taxNumber && ` · VKN: ${admin.billingAddress.taxNumber}`}
              </p>
            )}
          </div>
        ) : (
          <p style={{ margin: 0 }}>—</p>
        )}
      </section>

      <section className="order-print-section">
        <h2>Ürün kalemleri</h2>
        {order.items.length === 0 ? (
          <p style={{ margin: 0 }}>Ürün kalemi yok.</p>
        ) : (
          <table className="order-print-table">
            <thead>
              <tr>
                <th>Ürün</th>
                <th className="num">Adet</th>
                <th className="num">Birim fiyat</th>
                <th className="num">Satır toplamı</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.id}>
                  <td>
                    {item.product?.name ?? 'Ürün'}
                    {item.variant?.name ? ` — ${item.variant.name}` : ''}
                  </td>
                  <td className="num">{item.quantity}</td>
                  <td className="num">{fmtCurrency(item.price, order.currency)}</td>
                  <td className="num">
                    {fmtCurrency(item.lineTotal ?? item.price * item.quantity, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="order-print-totals">
          <div className="row">
            <span>Ürün ara toplamı</span>
            <span>{fmtCurrency(totals.itemsSubtotal, order.currency)}</span>
          </div>
          <div className="row">
            <span>Kargo</span>
            <span>
              {totals.shippingPrice > 0
                ? fmtCurrency(totals.shippingPrice, order.currency)
                : '—'}
            </span>
          </div>
          {totals.cashOnDeliveryFee > 0 && (
            <div className="row">
              <span>Kapıda ödeme</span>
              <span>{fmtCurrency(totals.cashOnDeliveryFee, order.currency)}</span>
            </div>
          )}
          {totals.couponDiscount > 0 && (
            <div className="row">
              <span>Kupon indirimi</span>
              <span>−{fmtCurrency(totals.couponDiscount, order.currency)}</span>
            </div>
          )}
          {totals.campaignDiscount > 0 && (
            <div className="row">
              <span>Kampanya indirimi</span>
              <span>−{fmtCurrency(totals.campaignDiscount, order.currency)}</span>
            </div>
          )}
          <div className="row grand">
            <span>Genel toplam</span>
            <span>{fmtCurrency(totals.grandTotal, order.currency)}</span>
          </div>
        </div>
      </section>

      <section className="order-print-section">
        <h2>Ödeme</h2>
        <p style={{ margin: 0 }}>Yöntem: {methodLabel}</p>
        <p style={{ margin: '4px 0 0' }}>Durum: {paymentLabel}</p>
      </section>

      <section className="order-print-section">
        <h2>Kargo</h2>
        <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{shippingLines.join('\n')}</p>
      </section>

      {(customerNoteLines.length > 0 || order.invoiceNumber || order.invoiceUrl) && (
        <section className="order-print-section">
          {customerNoteLines.length > 0 && (
            <>
              <h2>Sipariş notu</h2>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{customerNoteLines.join('\n\n')}</p>
            </>
          )}
          {(order.invoiceNumber || order.invoiceUrl) && (
            <>
              <h2 style={{ marginTop: customerNoteLines.length > 0 ? '12px' : 0 }}>Fatura bilgileri</h2>
              {order.invoiceNumber && (
                <p style={{ margin: '4px 0 0' }}>Fatura no: {order.invoiceNumber}</p>
              )}
              {order.invoiceUrl && (
                <p style={{ margin: '4px 0 0' }}>
                  Fatura linki:{' '}
                  <a href={order.invoiceUrl}>{order.invoiceUrl}</a>
                </p>
              )}
            </>
          )}
        </section>
      )}

      <p style={{ marginTop: '20px', fontSize: '9pt', color: '#666' }}>
        Yazdırma: {fmtDate(new Date().toISOString())}
      </p>
    </div>
  );
}

type OrderPrintMode = 'order' | 'label';

function OrderDetailPackageLabelSlip({
  order,
  admin,
  storeName,
}: {
  order:     Order;
  admin:     AdminOrderMeta | undefined;
  storeName: string;
}) {
  const recipientName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
    : '—';
  const phone = order.customer?.phone?.trim() || '—';
  const addr = admin?.shippingAddress;
  const cityLine = addr
    ? [addr.district, addr.city].filter(Boolean).join(' / ')
    : '—';
  const postal = addr?.postalCode?.trim() || '';
  const carrier = order.shippingCarrier?.trim() || '—';
  const tracking = order.shippingTrackingNumber?.trim() || '—';

  const addressBlock = addr
    ? [addr.addressLine, cityLine + (postal ? `\n${postal}` : '')].filter(Boolean).join('\n')
    : 'Teslimat adresi kayıtlı değil';

  return (
    <div className="order-detail-print-slip--label hidden" aria-hidden="true">
      <p className="package-label-sender">
        Gönderici: <strong>{storeName}</strong>
      </p>

      <dl className="package-label-field">
        <dt>Alıcı</dt>
        <dd className="recipient">{recipientName}</dd>
      </dl>

      <dl className="package-label-field">
        <dt>Telefon</dt>
        <dd>{phone}</dd>
      </dl>

      <dl className="package-label-field">
        <dt>Teslimat adresi</dt>
        <dd className="address">{addressBlock}</dd>
      </dl>

      {addr && (
        <dl className="package-label-field">
          <dt>İl / ilçe{postal ? ' · Posta kodu' : ''}</dt>
          <dd>
            {cityLine}
            {postal ? ` · ${postal}` : ''}
          </dd>
        </dl>
      )}

      <dl className="package-label-meta">
        <div>
          <dt>Sipariş no</dt>
          <dd>{order.orderNumber}</dd>
        </div>
        <div>
          <dt>Kargo firması</dt>
          <dd>{carrier}</dd>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <dt>Takip numarası</dt>
          <dd>{tracking}</dd>
        </div>
      </dl>
    </div>
  );
}

function ProductPlaceholder() {
  return (
    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    </div>
  );
}

function isValidTrackingUrl(url: string | null | undefined): boolean {
  const t = url?.trim() ?? '';
  return t.length > 0 && /^https?:\/\//i.test(t);
}

function OrderShippingTrackingSummary({ order }: { order: Order }) {
  const carrier    = order.shippingCarrier?.trim() || null;
  const trackingNo = order.shippingTrackingNumber?.trim() || null;
  const trackingUrl = isValidTrackingUrl(order.shippingTrackingUrl)
    ? order.shippingTrackingUrl!.trim()
    : null;
  const hasTrackingData = Boolean(carrier || trackingNo || trackingUrl);
  const statusLabel = SHIPPING_STATUS_LABEL[order.status];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Kargo durumu
        </span>
        <span className="text-[13px] font-semibold text-slate-900">{statusLabel}</span>
      </div>

      {!hasTrackingData ? (
        <div className="px-4 py-5 text-center">
          <p className="text-[13px] font-medium text-slate-600">
            Henüz kargo firması veya takip bilgisi kaydedilmedi
          </p>
          <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed">
            Kargo firması, takip numarası ve isteğe bağlı takip linkini aşağıdaki formdan girebilirsiniz.
          </p>
        </div>
      ) : (
        <dl className="px-4 py-3.5 space-y-3.5">
          {carrier && (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-0.5">
                Kargo firması
              </dt>
              <dd className="text-[14px] font-medium text-slate-900">{carrier}</dd>
            </div>
          )}
          {trackingNo && (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-0.5">
                Takip numarası
              </dt>
              <dd className="font-mono text-[14px] font-semibold text-slate-900 break-all tracking-tight">
                {trackingNo}
              </dd>
            </div>
          )}
          {trackingUrl && (
            <div className="pt-0.5">
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary text-[13px] px-4 py-2 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m0 0a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V6a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 7h14" />
                </svg>
                Takip Et
              </a>
            </div>
          )}
        </dl>
      )}

      {(order.shippedAt || order.shippingNotificationSentAt) && (
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 space-y-1">
          {order.shippedAt && (
            <p className="text-[12px] text-slate-600">
              Kargoya verildi: <span className="font-medium">{fmtDate(order.shippedAt)}</span>
            </p>
          )}
          {order.shippingNotificationSentAt && (
            <p className="text-[12px] text-emerald-700 font-medium">
              Müşteriye kargo bildirimi gönderildi
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5 sm:gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[12px] font-medium text-slate-500 shrink-0">{label}</span>
      <span className="text-[13px] text-slate-800 sm:text-right">{value}</span>
    </div>
  );
}

function paymentStatusLabel(code: string | null): string | null {
  if (!code) return null;
  return ORDER_PAYMENT_STATUS_LABELS[code as keyof typeof ORDER_PAYMENT_STATUS_LABELS] ?? code;
}

function statusTransitionLabel(prev: string | null, next: string | null): string | null {
  if (prev && next && prev !== next) {
    const from = STATUS_LABELS[prev as OrderStatus] ?? prev;
    const to   = STATUS_LABELS[next as OrderStatus] ?? next;
    return `${from} → ${to}`;
  }
  if (next) return STATUS_LABELS[next as OrderStatus] ?? next;
  return null;
}

function OrderStatusTimeline({ orderId }: { orderId: string }) {
  const { data: history = [], isLoading } = useOrderHistory(orderId);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((k) => (
          <div key={k} className="flex gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 mt-1 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-slate-100 rounded w-2/5" />
              <div className="h-3 bg-slate-100 rounded w-3/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="text-[13px] text-slate-500 py-2">
        Henüz durum geçmişi yok. Durum değişiklikleri ve ödeme onayları burada listelenir.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0">
      {history.map((entry: OrderHistoryEntry, index: number) => {
        const transition = statusTransitionLabel(entry.previousStatus, entry.newStatus);
        const payNote    = entry.note
          ?? (entry.previousPaymentStatus || entry.newPaymentStatus
            ? [
                entry.previousPaymentStatus ? paymentStatusLabel(entry.previousPaymentStatus) : null,
                entry.newPaymentStatus ? paymentStatusLabel(entry.newPaymentStatus) : null,
              ].filter(Boolean).join(' → ')
            : null);

        return (
          <li key={entry.id} className="relative pl-6 pb-6 last:pb-0">
            {index < history.length - 1 && (
              <span
                className="absolute left-[5px] top-2.5 bottom-0 w-px bg-slate-200"
                aria-hidden
              />
            )}
            <span
              className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white"
              aria-hidden
            />
            <div className="min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                <p className="text-[13px] font-medium text-slate-900">{entry.actionLabel}</p>
                <time className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                  {fmtDate(entry.occurredAt)}
                </time>
              </div>
              {transition && (
                <p className="text-[12px] text-slate-600 mt-1">
                  Durum: <span className="font-medium text-slate-800">{transition}</span>
                </p>
              )}
              {payNote && (
                <p className="text-[12px] text-slate-500 mt-0.5">{payNote}</p>
              )}
              {entry.actorEmail && (
                <p className="text-[11px] text-slate-400 mt-1">
                  İşlem yapan: {entry.actorEmail}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ProductThumbnail({ item }: { item: OrderItem }) {
  const [failed, setFailed] = useState(false);
  const url = getOrderItemImageUrl(item as ItemWithOptionalImage);

  if (!url || failed) return <ProductPlaceholder />;

  return (
    <img
      src={url}
      alt=""
      className="w-12 h-12 rounded-lg object-cover border border-slate-200/80 bg-white shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="h-36 wn-card" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 wn-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="h-64 wn-card" />
          <div className="h-40 wn-card" />
        </div>
        <div className="space-y-6">
          <div className="h-48 wn-card" />
          <div className="h-56 wn-card" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const { branding } = useBranding();
  const { data: order, isLoading, error } = useOrder(orderId ?? '');
  const [printMode, setPrintMode] = useState<OrderPrintMode | null>(null);
  const updateStatus   = useUpdateOrderStatus();
  const updateShipping = useUpdateOrderShipping();
  const updateInvoice  = useUpdateOrderInvoice();
  const uploadInvoicePdf = useUploadOrderInvoicePdf();
  const cancelOrder    = useCancelOrder();
  const confirmPayment = useConfirmOrderPayment();

  const [statusDraft, setStatusDraft]               = useState<OrderStatus | ''>('');
  const [shippingCarrier, setShippingCarrier]       = useState('');
  const [shippingTrackingNumber, setShippingTrackingNumber] = useState('');
  const [shippingTrackingUrl, setShippingTrackingUrl] = useState('');
  const [shippingUrlWarning, setShippingUrlWarning] = useState('');
  const [invoiceNumber, setInvoiceNumber]           = useState('');
  const [invoiceUrl, setInvoiceUrl]                 = useState('');
  const [invoiceUrlWarning, setInvoiceUrlWarning]   = useState('');
  const [invoicePdfFile, setInvoicePdfFile]         = useState<File | null>(null);
  const [invoicePdfError, setInvoicePdfError]       = useState<string | null>(null);
  const [returnRequests, setReturnRequests]         = useState<ReturnRequest[]>([]);

  useEffect(() => {
    if (!order) return;
    setShippingCarrier(order.shippingCarrier ?? '');
    setShippingTrackingNumber(order.shippingTrackingNumber ?? '');
    setShippingTrackingUrl(order.shippingTrackingUrl ?? '');
    setStatusDraft(order.status);
  }, [order?.id, order?.shippingCarrier, order?.shippingTrackingNumber, order?.shippingTrackingUrl, order?.status]);

  useEffect(() => {
    if (!order) return;
    setInvoiceNumber(order.invoiceNumber ?? '');
    setInvoiceUrl(order.invoiceUrl ?? '');
    setInvoiceUrlWarning('');
  }, [order?.id, order?.invoiceNumber, order?.invoiceUrl]);

  useEffect(() => {
    if (!orderId) return;
    fetchReturnRequestsByOrder(orderId)
      .then(setReturnRequests)
      .catch(() => setReturnRequests([]));
  }, [orderId]);

  useEffect(() => {
    if (printMode) {
      document.body.dataset.orderPrint = printMode;
    } else {
      delete document.body.dataset.orderPrint;
    }
  }, [printMode]);

  useEffect(() => {
    const onAfterPrint = () => setPrintMode(null);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('afterprint', onAfterPrint);
      delete document.body.dataset.orderPrint;
    };
  }, []);

  const triggerPrint = useCallback((mode: OrderPrintMode) => {
    setPrintMode(mode);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  }, []);

  if (isLoading) return <LoadingSkeleton />;

  if (error || !order) {
    return (
      <div className="w-full flex items-center justify-center py-24">
        <div className="wn-card px-10 py-12 text-center max-w-md">
          <p className="text-slate-800 font-medium text-lg">Sipariş bulunamadı</p>
          <p className="text-sm text-slate-500 mt-2">
            Sipariş silinmiş, erişim yetkiniz olmayabilir veya veri yüklenemedi.
          </p>
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

  const admin  = order.admin;
  const totals = admin?.totals ?? {
    itemsSubtotal:      order.items.reduce((s, i) => s + i.price * i.quantity, 0),
    shippingPrice:      order.shippingPrice ?? 0,
    cashOnDeliveryFee:  0,
    couponDiscount:     order.discountAmount ?? 0,
    campaignDiscount:   order.campaignDiscount ?? 0,
    grandTotal:         order.totalAmount,
  };

  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const parsedNotes = parseSystemNotes(admin?.systemNoteLines ?? []);
  const hasNotes  = Boolean(
    admin?.customerNote
    || parsedNotes.readable.length > 0
    || parsedNotes.technical.length > 0
    || order.notes,
  );

  const handleStatusSave = () => {
    if (!statusDraft || statusDraft === order.status) return;
    if (statusDraft === 'CANCELLED') {
      if (!window.confirm('Siparişi iptal etmek istediğinize emin misiniz? Stok iadesi yapılır.')) return;
      cancelOrder.mutate(order.id);
      return;
    }
    updateStatus.mutate({ id: order.id, status: statusDraft });
  };

  const validateInvoiceUrl = (url: string): boolean => {
    const t = url.trim();
    if (!t) {
      setInvoiceUrlWarning('');
      return true;
    }
    if (!/^https?:\/\//i.test(t)) {
      setInvoiceUrlWarning('Fatura linki http:// veya https:// ile başlamalıdır.');
      return false;
    }
    setInvoiceUrlWarning('');
    return true;
  };

  const handleSaveInvoice = () => {
    if (!validateInvoiceUrl(invoiceUrl)) return;
    updateInvoice.mutate({
      id: order.id,
      data: {
        invoiceNumber: invoiceNumber.trim() || null,
        invoiceUrl:    invoiceUrl.trim() || null,
      },
    });
  };

  const validateInvoicePdfFile = (file: File | null): string | null => {
    if (!file) return 'PDF dosyası seçin.';
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && file.type !== 'application/pdf') {
      return 'Yalnızca PDF dosyası yüklenebilir.';
    }
    if (file.size > INVOICE_PDF_MAX_BYTES) {
      return 'Dosya boyutu en fazla 5 MB olabilir.';
    }
    return null;
  };

  const handleUploadInvoicePdf = () => {
    const err = validateInvoicePdfFile(invoicePdfFile);
    if (err) {
      setInvoicePdfError(err);
      return;
    }
    setInvoicePdfError(null);
    uploadInvoicePdf.mutate(
      { id: order!.id, file: invoicePdfFile! },
      {
        onSuccess: (updated) => {
          setInvoiceUrl(updated.invoiceUrl ?? '');
          setInvoicePdfFile(null);
        },
      },
    );
  };

  const validateTrackingUrl = (url: string): boolean => {
    const t = url.trim();
    if (!t) {
      setShippingUrlWarning('');
      return true;
    }
    if (!/^https?:\/\//i.test(t)) {
      setShippingUrlWarning('Takip linki http:// veya https:// ile başlamalıdır.');
      return false;
    }
    setShippingUrlWarning('');
    return true;
  };

  const buildShippingPayload = (markAsShipped: boolean): UpdateOrderShippingDto | null => {
    if (!validateTrackingUrl(shippingTrackingUrl)) return null;
    return {
      shippingCarrier:        shippingCarrier.trim() || undefined,
      shippingTrackingNumber: shippingTrackingNumber.trim() || undefined,
      shippingTrackingUrl:    shippingTrackingUrl.trim() || undefined,
      markAsShipped,
    };
  };

  const handleSaveShipping = (markAsShipped: boolean) => {
    const payload = buildShippingPayload(markAsShipped);
    if (!payload) return;
    if (markAsShipped && !shippingCarrier.trim() && !shippingTrackingNumber.trim()) {
      if (!window.confirm(
        'Kargo firması veya takip numarası girilmedi. Yine de kargoya verildi olarak işaretlemek istiyor musunuz?',
      )) {
        return;
      }
    }
    updateShipping.mutate(
      { id: order.id, data: payload },
      {
        onSuccess: () => {
          toast.success(
            markAsShipped
              ? 'Kargo bilgileri kaydedildi ve sipariş kargoya verildi olarak işaretlendi.'
              : 'Kargo bilgileri kaydedildi.',
          );
        },
      },
    );
  };

  const busy           = updateStatus.isPending || cancelOrder.isPending || updateShipping.isPending || updateInvoice.isPending || uploadInvoicePdf.isPending || confirmPayment.isPending;
  const shippingLocked_ = shippingLocked(order.status);
  const showConfirmPayment = canConfirmBankTransferPayment(order);
  const paymentLabel   = admin?.payment.statusLabel ?? '—';
  const methodLabel    = admin?.payment.methodLabel ?? '—';

  const printNoteLines: string[] = [];
  if (admin?.customerNote?.trim()) printNoteLines.push(admin.customerNote.trim());
  for (const row of parsedNotes.readable) {
    printNoteLines.push(`${row.label}: ${row.value}`);
  }

  return (
    <>
      <OrderDetailPrintSlip
        order={order}
        admin={admin}
        totals={totals}
        methodLabel={methodLabel}
        paymentLabel={paymentLabel}
        customerNoteLines={printNoteLines}
      />
      <OrderDetailPackageLabelSlip
        order={order}
        admin={admin}
        storeName={branding.siteName?.trim() || 'Mağaza'}
      />

    <div className="w-full space-y-6 pb-10 page-enter order-detail-screen">

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div className="wn-card overflow-hidden border-indigo-100/80 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50/40">
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100/80">
          <Link
            to="/dashboard/orders"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Siparişler
          </Link>

          <div className="mt-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="min-w-0 flex-1 order-2 lg:order-1">
              <p className="text-[13px] font-medium text-slate-500 mb-2">Sipariş Detayı</p>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight break-all mb-3">
                {order.orderNumber}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  Woontegra · Mağaza vitrini
                </Badge>
                <Badge className={STATUS_STYLE[order.status] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </Badge>
                {methodLabel !== '—' && (
                  <Badge className="bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
                    {methodLabel}
                  </Badge>
                )}
                {paymentLabel !== '—' && (
                  <Badge className="bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
                    {paymentLabel}
                  </Badge>
                )}
              </div>
              <p className="text-[12px] text-slate-500 mt-2.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {fmtDate(order.createdAt)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-end gap-3 shrink-0 order-1 lg:order-2 lg:text-right lg:pl-6 lg:border-l lg:border-slate-200/60">
              <div className="flex flex-col gap-2 w-full sm:w-auto print:hidden">
                <button
                  type="button"
                  onClick={() => triggerPrint('order')}
                  className="btn btn-secondary text-[13px] px-4 py-2 inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
                  </svg>
                  Yazdır
                </button>
                <button
                  type="button"
                  onClick={() => triggerPrint('label')}
                  className="btn btn-ghost text-[13px] px-4 py-2 border border-slate-200 inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Paket Etiketi Yazdır
                </button>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Genel toplam</p>
                <p className="text-2xl font-semibold text-indigo-600 tabular-nums mt-0.5">
                  {fmtCurrency(totals.grandTotal, order.currency)}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Summary metrics ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryMetric label="Genel toplam" value={fmtCurrency(totals.grandTotal, order.currency)} />
        <SummaryMetric label="Ödeme yöntemi" value={methodLabel} />
        <SummaryMetric label="Ödeme durumu" value={paymentLabel} />
        <SummaryMetric label="Sipariş durumu" value={STATUS_LABELS[order.status]} />
        <SummaryMetric
          label="Kargo durumu"
          value={SHIPPING_STATUS_LABEL[order.status]}
          sub={order.shippedAt ? fmtDate(order.shippedAt) : undefined}
        />
      </div>

      {/* ── Main two-column layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* Left — order content */}
        <div className="xl:col-span-2 space-y-6">

          {/* Products */}
          <Panel
            title={`Ürünler (${itemCount} adet)`}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          >
            {order.items.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Bu siparişte ürün kalemi yok.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="wn-table min-w-[560px]">
                  <thead>
                    <tr>
                      <th className="w-14" />
                      <th>Ürün</th>
                      <th className="text-right">Adet</th>
                      <th className="text-right">Birim fiyat</th>
                      <th className="text-right">Satır toplamı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-3">
                          <ProductThumbnail item={item} />
                        </td>
                        <td className="py-3">
                          <p className="font-medium text-slate-900">
                            {item.product?.name ?? 'Ürün'}
                          </p>
                          {item.variant && (
                            <p className="text-[12px] text-slate-500 mt-0.5">
                              Varyant: {item.variant.name}
                              {item.variant.sku ? ` · SKU: ${item.variant.sku}` : ''}
                            </p>
                          )}
                          {item.product?.slug && (
                            <Link
                              to={`/dashboard/products/${item.productId ?? item.product.id}/edit`}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 mt-0.5 inline-block"
                            >
                              Ürüne git →
                            </Link>
                          )}
                        </td>
                        <td className="py-3 text-right tabular-nums">{item.quantity}</td>
                        <td className="py-3 text-right tabular-nums">
                          {fmtCurrency(item.price, order.currency)}
                        </td>
                        <td className="py-3 text-right font-medium text-slate-900 tabular-nums">
                          {fmtCurrency(item.lineTotal ?? item.price * item.quantity, order.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Totals */}
          <Panel title="Tutar dökümü">
            <div className="space-y-2.5 text-[13px] max-w-md">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Ürün ara toplamı</span>
                <span className="tabular-nums text-slate-800">{fmtCurrency(totals.itemsSubtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Kargo ücreti</span>
                <span className="tabular-nums text-slate-800">
                  {totals.shippingPrice > 0
                    ? fmtCurrency(totals.shippingPrice, order.currency)
                    : 'Yok'}
                </span>
              </div>
              {totals.cashOnDeliveryFee > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Kapıda ödeme ücreti</span>
                  <span className="tabular-nums text-slate-800">{fmtCurrency(totals.cashOnDeliveryFee, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Kupon indirimi</span>
                <span className={`tabular-nums ${totals.couponDiscount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {totals.couponDiscount > 0
                    ? `−${fmtCurrency(totals.couponDiscount, order.currency)}`
                    : 'Yok'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Kampanya indirimi</span>
                <span className={`tabular-nums ${totals.campaignDiscount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {totals.campaignDiscount > 0
                    ? `−${fmtCurrency(totals.campaignDiscount, order.currency)}`
                    : 'Yok'}
                </span>
              </div>
              <div className="flex justify-between gap-4 items-start">
                <span className="text-slate-500">Vergi / KDV</span>
                <span className="text-right text-slate-400">
                  <span className="block text-[13px]">Ayrıştırılmamış</span>
                  <span className="block text-[10px] mt-0.5 max-w-[200px]">
                    Sipariş dökümünde KDV ayrı gösterilmiyor
                  </span>
                </span>
              </div>
              <div className="flex justify-between gap-4 font-semibold text-slate-900 pt-3 mt-1 border-t border-slate-100">
                <span>Genel toplam</span>
                <span className="tabular-nums text-indigo-600">{fmtCurrency(totals.grandTotal, order.currency)}</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Genel toplam kargo ve ek ücretler dahildir.
              </p>
            </div>
          </Panel>

          {/* Customer + addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Panel title="Müşteri bilgileri">
              {order.customer ? (
                <dl className="text-[13px] space-y-3">
                  <div>
                    <dt className="text-slate-400 text-[11px] uppercase tracking-wide mb-0.5">Ad soyad</dt>
                    <dd className="font-medium text-slate-900">
                      {order.customer.firstName} {order.customer.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 text-[11px] uppercase tracking-wide mb-0.5">E-posta</dt>
                    <dd>
                      <a href={`mailto:${order.customer.email}`} className="text-indigo-600 hover:underline">
                        {order.customer.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 text-[11px] uppercase tracking-wide mb-0.5">Telefon</dt>
                    <dd>{order.customer.phone || '—'}</dd>
                  </div>
                  {order.customerId && (
                    <Link
                      to={`/dashboard/customers`}
                      className="inline-block text-[12px] text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Müşteriler →
                    </Link>
                  )}
                </dl>
              ) : (
                <p className="text-[13px] text-slate-500">Müşteri bilgisi yok.</p>
              )}
            </Panel>

            <Panel title="Teslimat adresi">
              {admin?.shippingAddress ? (
                <AddressBlock addr={admin.shippingAddress} />
              ) : (
                <p className="text-[13px] text-slate-500">Teslimat adresi bulunamadı.</p>
              )}
            </Panel>
          </div>

          <Panel title="Fatura adresi">
            {admin?.billingAddress?.sameAsShipping ? (
              <p className="text-[13px] text-slate-600">
                Fatura adresi teslimat adresi ile aynı.
              </p>
            ) : admin?.billingAddress ? (
              <div className="space-y-3">
                {admin.billingAddress.type === 'corporate' && (
                  <Badge className="bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                    Kurumsal fatura
                  </Badge>
                )}
                <AddressBlock addr={admin.billingAddress} />
                {admin.billingAddress.companyName && (
                  <p className="text-[13px] text-slate-600">
                    Firma: <span className="font-medium text-slate-800">{admin.billingAddress.companyName}</span>
                  </p>
                )}
                {(admin.billingAddress.taxNumber || admin.billingAddress.taxOffice) && (
                  <p className="text-[13px] text-slate-600">
                    {admin.billingAddress.taxOffice && `VD: ${admin.billingAddress.taxOffice}`}
                    {admin.billingAddress.taxNumber && ` · VKN: ${admin.billingAddress.taxNumber}`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-slate-500">Fatura adresi yok.</p>
            )}
          </Panel>

          {hasNotes && (
            <Panel title="Sipariş notları">
              {admin?.customerNote && (
                <div className="mb-4">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Müşteri notu</p>
                  <p className="text-[13px] text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    {admin.customerNote}
                  </p>
                </div>
              )}
              {admin?.systemNoteLines && admin.systemNoteLines.length > 0 && (
                <div className="mb-4">
                  {parsedNotes.readable.length > 0 && (
                    <>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
                        Sipariş özeti
                      </p>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-1">
                        {parsedNotes.readable.map((row, i) => (
                          <NoteRow key={`${row.label}-${i}`} label={row.label} value={row.value} />
                        ))}
                      </div>
                    </>
                  )}
                  {(parsedNotes.technical.length > 0 || order.notes) && (
                    <details className="mt-3 text-[13px]">
                      <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
                        Teknik notlar
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        {parsedNotes.technical.map((line, i) => (
                          <p key={i} className="font-mono text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            {line}
                          </p>
                        ))}
                        {order.notes && (
                          <pre className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap border border-slate-100">
                            {order.notes}
                          </pre>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              )}
              {!admin?.systemNoteLines?.length && order.notes && (
                <details className="text-[13px]">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
                    Ham not metni
                  </summary>
                  <pre className="mt-2 text-[11px] bg-slate-50 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap border border-slate-100">
                    {order.notes}
                  </pre>
                </details>
              )}
            </Panel>
          )}

          <div className="xl:hidden">
            <Panel
              title="Kargo takibi"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
            >
              <OrderShippingTrackingSummary order={order} />
              <p className="text-[12px] text-slate-500 mt-3">
                Güncellemek için sayfanın altındaki{' '}
                <span className="font-medium text-slate-700">Kargo bilgileri</span> formunu kullanın.
              </p>
            </Panel>
          </div>

          <Panel
            title="Durum geçmişi"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            <OrderStatusTimeline orderId={order.id} />
          </Panel>
        </div>

        {/* Right — operations */}
        <div className="space-y-6 xl:sticky xl:top-4">

          <Panel title="Durum güncelle">
            <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">
              Durum değiştiğinde stok ve bildirim süreçleri mevcut kurallara göre çalışır.
              İptal edildiğinde stok iadesi yapılır; diğer geçişlerde stok tekrar düşülmez.
            </p>
            {showConfirmPayment && (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm('Havale/EFT ödemesini onaylamak istediğinize emin misiniz?')) return;
                  confirmPayment.mutate(order.id);
                }}
                disabled={busy}
                className="btn btn-primary w-full mb-3"
              >
                {confirmPayment.isPending ? 'Onaylanıyor…' : 'Ödemeyi Onayla'}
              </button>
            )}
            <select
              value={statusDraft || order.status}
              onChange={e => setStatusDraft(e.target.value as OrderStatus)}
              disabled={busy}
              className="wn-select w-full mb-3"
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleStatusSave}
              disabled={busy || (statusDraft || order.status) === order.status}
              className="btn btn-primary w-full"
            >
              {busy ? 'Kaydediliyor…' : 'Durumu kaydet'}
            </button>
          </Panel>

          <Panel title="Kargo bilgileri">
            <OrderShippingTrackingSummary order={order} />
            <div className="border-t border-slate-100 pt-4 mt-4">
              <p className="text-[12px] font-medium text-slate-700 mb-1">Bilgileri güncelle</p>
              <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">
                Takip bilgilerini kaydedebilir veya kaydedip siparişi kargoya verildi olarak işaretlemek için kullanın.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="wn-label">Kargo firması</label>
                <input
                  type="text"
                  value={shippingCarrier}
                  onChange={e => setShippingCarrier(e.target.value)}
                  maxLength={200}
                  placeholder="Örn. Yurtiçi Kargo"
                  disabled={shippingLocked_ || busy}
                  className="wn-input"
                />
              </div>
              <div>
                <label className="wn-label">Takip numarası</label>
                <input
                  type="text"
                  value={shippingTrackingNumber}
                  onChange={e => setShippingTrackingNumber(e.target.value)}
                  maxLength={200}
                  placeholder="Kargo takip no"
                  disabled={shippingLocked_ || busy}
                  className="wn-input font-mono text-[13px]"
                />
              </div>
              <div>
                <label className="wn-label">Takip linki (isteğe bağlı)</label>
                <input
                  type="url"
                  value={shippingTrackingUrl}
                  onChange={e => {
                    setShippingTrackingUrl(e.target.value);
                    if (e.target.value.trim()) validateTrackingUrl(e.target.value);
                    else setShippingUrlWarning('');
                  }}
                  maxLength={2048}
                  placeholder="https://..."
                  disabled={shippingLocked_ || busy}
                  className="wn-input"
                />
                {shippingUrlWarning && (
                  <p className="text-[11px] text-amber-700 mt-1">{shippingUrlWarning}</p>
                )}
              </div>

              {shippingLocked_ && (
                <p className="text-[12px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                  {order.status === 'CANCELLED'
                    ? 'İptal edilmiş siparişlerde kargo bilgisi güncellenemez.'
                    : 'Teslim edilmiş siparişlerde kargo bilgisi güncellenemez.'}
                </p>
              )}

              <button
                type="button"
                onClick={() => handleSaveShipping(false)}
                disabled={busy || shippingLocked_}
                className="btn btn-secondary w-full"
              >
                {updateShipping.isPending ? 'Kaydediliyor…' : 'Kargo bilgilerini kaydet'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveShipping(true)}
                disabled={busy || shippingLocked_ || order.status === 'SHIPPED'}
                className="btn btn-primary w-full"
              >
                {updateShipping.isPending ? 'İşleniyor…' : 'Kaydet ve kargoya verildi yap'}
              </button>
            </div>
          </Panel>

          <Panel title="Fatura bilgileri">
            <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">
              Mağaza siparişi için fatura numarası, PDF yükleme veya harici link kaydedin.
            </p>
            <div className="space-y-3">
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 space-y-2">
                <label className="wn-label">PDF fatura yükle</label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={busy}
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    setInvoicePdfFile(file);
                    setInvoicePdfError(file ? validateInvoicePdfFile(file) : null);
                  }}
                  className="block w-full text-[12px] text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-medium file:bg-white file:text-indigo-700 hover:file:bg-indigo-50"
                />
                <p className="text-[11px] text-slate-400">Yalnızca PDF · en fazla 5 MB</p>
                {invoicePdfError && (
                  <p className="text-[11px] text-red-700">{invoicePdfError}</p>
                )}
                <button
                  type="button"
                  onClick={handleUploadInvoicePdf}
                  disabled={busy || !invoicePdfFile}
                  className="btn btn-secondary w-full text-[13px]"
                >
                  {uploadInvoicePdf.isPending ? 'Yükleniyor…' : 'PDF yükle'}
                </button>
                {order.invoiceUrl?.trim() && (
                  <a
                    href={order.invoiceUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Yüklenen faturayı görüntüle →
                  </a>
                )}
              </div>
              <div>
                <label className="wn-label">Fatura numarası</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  maxLength={64}
                  placeholder="Örn. ABC2026000123"
                  disabled={busy}
                  className="wn-input font-mono text-[13px]"
                />
              </div>
              <div>
                <label className="wn-label">Fatura linki (elle gir)</label>
                <input
                  type="url"
                  value={invoiceUrl}
                  onChange={e => {
                    setInvoiceUrl(e.target.value);
                    if (e.target.value.trim()) validateInvoiceUrl(e.target.value);
                    else setInvoiceUrlWarning('');
                  }}
                  maxLength={2048}
                  placeholder="https://..."
                  disabled={busy}
                  className="wn-input"
                />
                {invoiceUrlWarning && (
                  <p className="text-[11px] text-amber-700 mt-1">{invoiceUrlWarning}</p>
                )}
                {invoiceUrl.trim() && /^https?:\/\//i.test(invoiceUrl.trim()) && (
                  <a
                    href={invoiceUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-indigo-600 hover:text-indigo-800 mt-1.5"
                  >
                    Faturayı aç →
                  </a>
                )}
              </div>
              {order.invoiceUploadedAt && (
                <p className="text-[12px] text-slate-500">
                  Link kaydedildi: {fmtDate(order.invoiceUploadedAt)}
                </p>
              )}
              <button
                type="button"
                onClick={handleSaveInvoice}
                disabled={busy}
                className="btn btn-secondary w-full"
              >
                {updateInvoice.isPending ? 'Kaydediliyor…' : 'Fatura bilgilerini kaydet'}
              </button>
            </div>
          </Panel>

          <Panel title="İade / iptal talepleri">
            {returnRequests.length === 0 ? (
              <p className="text-[13px] text-slate-500">
                Bu sipariş için iade veya iptal talebi yok.
              </p>
            ) : (
              <ul className="space-y-2">
                {returnRequests.map(r => (
                  <li
                    key={r.id}
                    className="flex justify-between gap-3 border border-slate-100 rounded-xl px-3 py-2.5 hover:bg-slate-50/80 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="text-[13px] font-medium text-slate-900">{r.requestNumber}</span>
                      <span className="text-slate-500 block text-[11px] mt-0.5">
                        {RETURN_TYPE_LABELS[r.type]} · {RETURN_STATUS_LABELS[r.status]}
                      </span>
                    </span>
                    <Link
                      to={`/dashboard/returns/${r.id}`}
                      className="text-indigo-600 text-[12px] font-medium shrink-0 hover:underline self-center"
                    >
                      Detay
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/dashboard/returns"
              className="inline-block mt-3 text-[13px] text-indigo-600 font-medium hover:underline"
            >
              Tüm talepler →
            </Link>
          </Panel>

          <Panel title="Hızlı aksiyonlar">
            <div className="space-y-2">
              <Link to="/dashboard/orders" className="btn btn-ghost w-full justify-start text-[13px]">
                Sipariş listesine dön
              </Link>
              <Link to="/dashboard/returns" className="btn btn-ghost w-full justify-start text-[13px]">
                İade taleplerini görüntüle
              </Link>
              <Link to="/dashboard/shipping-management" className="btn btn-ghost w-full justify-start text-[13px]">
                Kargo yönetimine git
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
    </>
  );
}
