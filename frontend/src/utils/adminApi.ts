import type { AxiosResponse } from 'axios';

/** `/api/admin/*` yanıtları `{ success, data }` zarfında döner; bazı sayfalar düz `data` bekler. */
export function unwrapAdmin<T>(res: AxiosResponse<any>): T {
  const body = res?.data;
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data as T;
  }
  return body as T;
}
