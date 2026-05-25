import type {
  GetOrdersQuery,
  OrderPaymentProviderFilter,
  OrderPaymentStatusFilter,
  OrderStatus,
} from '../services/order.service';

export const VALID_ORDER_STATUSES = [
  'PENDING',
  'PROCESSING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const satisfies readonly OrderStatus[];

export const VALID_PAYMENT_PROVIDERS = [
  'PAYTR',
  'BANK_TRANSFER',
  'CASH_ON_DELIVERY',
  'IYZICO',
  'BANK_POS',
] as const satisfies readonly OrderPaymentProviderFilter[];

export const VALID_PAYMENT_STATUSES = [
  'PENDING',
  'WAITING_BANK_TRANSFER',
  'PAID',
  'APPROVED',
  'FAILED',
  'CANCELLED',
] as const satisfies readonly OrderPaymentStatusFilter[];

export const ORDER_LIST_DEFAULT_PAGE = 1;
export const ORDER_LIST_DEFAULT_LIMIT = 20;
export const ORDER_LIST_PAGE_SIZES = [10, 20, 50] as const;

export type OrderListUrlState = {
  page:            number;
  limit:           number;
  status:          OrderStatus | '';
  search:          string;
  paymentProvider: OrderPaymentProviderFilter | '';
  paymentStatus:   OrderPaymentStatusFilter | '';
};

export const ORDER_LIST_DEFAULT_STATE: OrderListUrlState = {
  page:            ORDER_LIST_DEFAULT_PAGE,
  limit:           ORDER_LIST_DEFAULT_LIMIT,
  status:          '',
  search:          '',
  paymentProvider: '',
  paymentStatus:   '',
};

export function isValidOrderStatus(v: string): v is OrderStatus {
  return (VALID_ORDER_STATUSES as readonly string[]).includes(v);
}

export function isValidPaymentProvider(v: string): v is OrderPaymentProviderFilter {
  return (VALID_PAYMENT_PROVIDERS as readonly string[]).includes(v);
}

export function isValidPaymentStatus(v: string): v is OrderPaymentStatusFilter {
  return (VALID_PAYMENT_STATUSES as readonly string[]).includes(v);
}

function parsePositiveInt(raw: string | null, fallback: number, allowed?: readonly number[]): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  if (allowed && !(allowed as readonly number[]).includes(n)) return fallback;
  return n;
}

/** URLSearchParams → filtre state; geçersiz anahtarlar atılır. */
export function parseOrderListSearchParams(searchParams: URLSearchParams): {
  state: OrderListUrlState;
  cleaned: URLSearchParams;
  needsReplace: boolean;
} {
  let needsReplace = false;
  const state: OrderListUrlState = { ...ORDER_LIST_DEFAULT_STATE };

  const pageRaw = searchParams.get('page');
  const limitRaw = searchParams.get('limit');
  const statusRaw = searchParams.get('status');
  const searchRaw = searchParams.get('search');
  const providerRaw = searchParams.get('paymentProvider');
  const paymentStatusRaw = searchParams.get('paymentStatus');

  if (pageRaw != null) {
    const page = parsePositiveInt(pageRaw, ORDER_LIST_DEFAULT_PAGE);
    if (pageRaw.trim() && String(page) !== pageRaw.trim()) needsReplace = true;
    state.page = page;
  }

  if (limitRaw != null) {
    const limit = parsePositiveInt(limitRaw, ORDER_LIST_DEFAULT_LIMIT, ORDER_LIST_PAGE_SIZES);
    if (limitRaw.trim() && String(limit) !== limitRaw.trim()) needsReplace = true;
    state.limit = limit;
  }

  if (statusRaw != null && statusRaw !== '') {
    if (isValidOrderStatus(statusRaw)) {
      state.status = statusRaw;
    } else {
      needsReplace = true;
    }
  }

  if (searchRaw != null) {
    state.search = searchRaw.trim();
    if (searchRaw !== state.search) needsReplace = true;
  }

  if (providerRaw != null && providerRaw !== '') {
    if (isValidPaymentProvider(providerRaw)) {
      state.paymentProvider = providerRaw;
    } else {
      needsReplace = true;
    }
  }

  if (paymentStatusRaw != null && paymentStatusRaw !== '') {
    if (isValidPaymentStatus(paymentStatusRaw)) {
      state.paymentStatus = paymentStatusRaw;
    } else {
      needsReplace = true;
    }
  }

  const cleaned = buildOrderListSearchParams(state);
  const current = searchParams.toString();
  const cleanedStr = cleaned.toString();
  if (!needsReplace && current !== cleanedStr) {
    needsReplace = current.length > 0 || cleanedStr.length > 0;
  }

  return { state, cleaned, needsReplace: needsReplace || current !== cleanedStr };
}

/** Filtre state → URL (boş / varsayılan değerler yazılmaz). */
export function buildOrderListSearchParams(state: OrderListUrlState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.page > ORDER_LIST_DEFAULT_PAGE) {
    params.set('page', String(state.page));
  }
  if (state.limit !== ORDER_LIST_DEFAULT_LIMIT && (ORDER_LIST_PAGE_SIZES as readonly number[]).includes(state.limit)) {
    params.set('limit', String(state.limit));
  }
  if (state.status) params.set('status', state.status);
  if (state.search.trim()) params.set('search', state.search.trim());
  if (state.paymentProvider) params.set('paymentProvider', state.paymentProvider);
  if (state.paymentStatus) params.set('paymentStatus', state.paymentStatus);

  return params;
}

export function orderListStateToApiQuery(state: OrderListUrlState): GetOrdersQuery {
  return {
    page:  state.page,
    limit: state.limit,
    ...(state.status ? { status: state.status } : {}),
    ...(state.search.trim() ? { search: state.search.trim() } : {}),
    ...(state.paymentProvider ? { paymentProvider: state.paymentProvider } : {}),
    ...(state.paymentStatus ? { paymentStatus: state.paymentStatus } : {}),
  };
}

const ORDERS_BASE_PATH = '/dashboard/orders';

/** Dashboard ödeme özeti → sipariş listesi deep link. */
export function buildOrdersListPath(
  patch: Partial<Pick<OrderListUrlState, 'paymentProvider' | 'paymentStatus' | 'status'>>,
): string | null {
  if (patch.paymentProvider === 'UNKNOWN' as string) return null;
  if (patch.paymentStatus === 'UNKNOWN' as string) return null;

  if (patch.paymentProvider != null && patch.paymentProvider !== '' && !isValidPaymentProvider(patch.paymentProvider)) {
    return null;
  }
  if (patch.paymentStatus != null && patch.paymentStatus !== '' && !isValidPaymentStatus(patch.paymentStatus)) {
    return null;
  }

  const params = buildOrderListSearchParams({
    ...ORDER_LIST_DEFAULT_STATE,
    ...patch,
    page: ORDER_LIST_DEFAULT_PAGE,
  });
  const qs = params.toString();
  return qs ? `${ORDERS_BASE_PATH}?${qs}` : ORDERS_BASE_PATH;
}

export function ordersFilterLinkForProvider(key: string): string | null {
  if (key === 'UNKNOWN') return null;
  if (!isValidPaymentProvider(key)) return null;
  return buildOrdersListPath({ paymentProvider: key });
}

export function ordersFilterLinkForStatus(key: string): string | null {
  if (key === 'UNKNOWN') return null;
  if (!isValidPaymentStatus(key)) return null;
  return buildOrdersListPath({ paymentStatus: key });
}
