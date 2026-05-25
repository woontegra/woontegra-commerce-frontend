export const STORE_ORDER_LIST_STATUSES = [
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type StoreOrderListStatus = typeof STORE_ORDER_LIST_STATUSES[number];

export type StoreOrderListFilterTab =
  | 'ALL'
  | 'WAITING_PAYMENT'
  | StoreOrderListStatus;

export const STORE_ORDER_DEFAULT_PAGE = 1;
export const STORE_ORDER_DEFAULT_LIMIT = 10;

export const STORE_ORDER_FILTER_TABS: Array<{
  id: StoreOrderListFilterTab;
  label: string;
}> = [
  { id: 'ALL',             label: 'Tümü' },
  { id: 'WAITING_PAYMENT', label: 'Ödeme Bekliyor' },
  { id: 'PROCESSING',      label: 'Hazırlanıyor' },
  { id: 'SHIPPED',         label: 'Kargoda' },
  { id: 'DELIVERED',       label: 'Teslim Edildi' },
  { id: 'CANCELLED',       label: 'İptal Edildi' },
];

const VALID_STATUS = new Set<string>(STORE_ORDER_LIST_STATUSES);

function parsePageFromSearchParams(searchParams: URLSearchParams): {
  page: number;
  needsReplace: boolean;
} {
  const raw = searchParams.get('page');
  if (!raw?.trim()) {
    return { page: STORE_ORDER_DEFAULT_PAGE, needsReplace: false };
  }
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1) {
    return { page: STORE_ORDER_DEFAULT_PAGE, needsReplace: true };
  }
  if (n === 1) {
    return { page: 1, needsReplace: true };
  }
  return { page: n, needsReplace: false };
}

export function parseStoreOrderListTab(searchParams: URLSearchParams): {
  tab: StoreOrderListFilterTab;
  needsReplace: boolean;
} {
  const filter = searchParams.get('filter')?.trim();
  const status = searchParams.get('status')?.trim();

  if (filter === 'WAITING_PAYMENT') {
    if (status) return { tab: 'WAITING_PAYMENT', needsReplace: true };
    return { tab: 'WAITING_PAYMENT', needsReplace: false };
  }

  if (filter && filter !== 'WAITING_PAYMENT') {
    return { tab: 'ALL', needsReplace: true };
  }

  if (status && VALID_STATUS.has(status)) {
    return { tab: status as StoreOrderListStatus, needsReplace: false };
  }

  if (status) {
    return { tab: 'ALL', needsReplace: true };
  }

  return { tab: 'ALL', needsReplace: false };
}

export function parseStoreOrdersListState(searchParams: URLSearchParams): {
  tab: StoreOrderListFilterTab;
  page: number;
  needsReplace: boolean;
} {
  const tabResult = parseStoreOrderListTab(searchParams);
  const pageResult = parsePageFromSearchParams(searchParams);
  return {
    tab: tabResult.tab,
    page: pageResult.page,
    needsReplace: tabResult.needsReplace || pageResult.needsReplace,
  };
}

export function buildStoreOrdersSearchParams(
  tab: StoreOrderListFilterTab,
  tenantSlug: string,
  opts?: { page?: number },
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('tenant', tenantSlug);

  if (tab === 'WAITING_PAYMENT') {
    params.set('filter', 'WAITING_PAYMENT');
  } else if (tab !== 'ALL') {
    params.set('status', tab);
  }

  const page = opts?.page ?? STORE_ORDER_DEFAULT_PAGE;
  if (page > 1) {
    params.set('page', String(page));
  }

  return params;
}

export function tabToApiParams(
  tab: StoreOrderListFilterTab,
  page: number,
): {
  status?: string;
  filter?: string;
  page: number;
  limit: number;
} {
  const base = {
    page,
    limit: STORE_ORDER_DEFAULT_LIMIT,
  };
  if (tab === 'ALL') return base;
  if (tab === 'WAITING_PAYMENT') return { ...base, filter: 'WAITING_PAYMENT' };
  return { ...base, status: tab };
}

export type StoreOrderTabSummaryCounts = {
  total:          number;
  waitingPayment: number;
  processing:     number;
  shipped:        number;
  delivered:      number;
  cancelled:      number;
};

export function getTabSummaryCount(
  tab: StoreOrderListFilterTab,
  summary: StoreOrderTabSummaryCounts | null,
): number | null {
  if (!summary) return null;
  switch (tab) {
    case 'ALL':
      return summary.total;
    case 'WAITING_PAYMENT':
      return summary.waitingPayment;
    case 'PROCESSING':
      return summary.processing;
    case 'SHIPPED':
      return summary.shipped;
    case 'DELIVERED':
      return summary.delivered;
    case 'CANCELLED':
      return summary.cancelled;
    default:
      return null;
  }
}

export function emptyMessageForTab(tab: StoreOrderListFilterTab): string {
  switch (tab) {
    case 'WAITING_PAYMENT':
      return 'Ödeme bekleyen siparişiniz bulunmuyor.';
    case 'PROCESSING':
      return 'Şu anda hazırlanan siparişiniz bulunmuyor.';
    case 'SHIPPED':
      return 'Şu anda kargoda olan siparişiniz bulunmuyor.';
    case 'DELIVERED':
      return 'Teslim edilmiş siparişiniz bulunmuyor.';
    case 'CANCELLED':
      return 'İptal edilmiş siparişiniz bulunmuyor.';
    default:
      return 'Henüz siparişiniz bulunmuyor.';
  }
}

export function isPaymentWaitingOrder(order: {
  status: string;
  paymentStatus?: string | null;
}): boolean {
  const ps = order.paymentStatus;
  if (ps === 'PENDING' || ps === 'WAITING_BANK_TRANSFER') return true;
  if (order.status === 'PENDING' && !ps) return true;
  return false;
}
