import { describe, expect, it } from 'vitest';
import {
  STORE_ACCOUNT_REFRESH_COOLDOWN_MS,
  canRunFocusRefresh,
} from './useRefreshOnFocus';

describe('canRunFocusRefresh', () => {
  it('uses 30s default cooldown', () => {
    expect(STORE_ACCOUNT_REFRESH_COOLDOWN_MS).toBe(30_000);
    const t = 1_000_000;
    expect(canRunFocusRefresh(t, t + 29_999)).toBe(false);
    expect(canRunFocusRefresh(t, t + 30_000)).toBe(true);
  });

  it('respects custom cooldown', () => {
    const t = 0;
    expect(canRunFocusRefresh(t, 4_999, 5_000)).toBe(false);
    expect(canRunFocusRefresh(t, 5_000, 5_000)).toBe(true);
  });
});
