import { useEffect, useMemo, useState } from 'react';
import { resolveStoreLogoUrl } from '../services/storefrontApi';

export function useStoreLogo(rawUrl: string | null | undefined) {
  const resolved = useMemo(() => resolveStoreLogoUrl(rawUrl), [rawUrl]);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [resolved]);

  return {
    logoSrc: resolved && !broken ? resolved : null,
    onLogoError: () => setBroken(true),
  };
}
