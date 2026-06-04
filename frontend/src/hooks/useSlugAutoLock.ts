import { useCallback, useMemo, useRef } from 'react';
import { generateSlug } from '../utils/slugGenerator';

/**
 * Bağlantı/adres alanı için otomatik üretim kilidi.
 * - Yeni kayıt: kilit kapalı → kaynak metin değiştikçe bağlantı güncellenir.
 * - Düzenleme: kilit açık → mevcut bağlantı korunur.
 * - Kullanıcı bağlantı alanına dokununca kilitlenir; alanı tamamen boşaltınca kilit açılır.
 */
export function useSlugAutoLock() {
  const lockedRef = useRef(false);

  const lockSlug = useCallback(() => {
    lockedRef.current = true;
  }, []);

  const unlockSlug = useCallback(() => {
    lockedRef.current = false;
  }, []);

  const resetForCreate = useCallback(() => {
    lockedRef.current = false;
  }, []);

  const resetForEdit = useCallback(() => {
    lockedRef.current = true;
  }, []);

  const isSlugLocked = useCallback(() => lockedRef.current, []);

  const slugFromSourceIfUnlocked = useCallback((source: string): string | null => {
    if (lockedRef.current) return null;
    return generateSlug(source);
  }, []);

  const onSlugInputChange = useCallback(
    (value: string) => {
      if (value.trim()) lockSlug();
      else unlockSlug();
    },
    [lockSlug, unlockSlug],
  );

  return useMemo(
    () => ({
      lockSlug,
      unlockSlug,
      resetForCreate,
      resetForEdit,
      isSlugLocked,
      slugFromSourceIfUnlocked,
      onSlugInputChange,
    }),
    [
      lockSlug,
      unlockSlug,
      resetForCreate,
      resetForEdit,
      isSlugLocked,
      slugFromSourceIfUnlocked,
      onSlugInputChange,
    ],
  );
}
