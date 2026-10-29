import { useCallback, useState } from 'react';
import { checkForUpdate, dismissUpdate, type VersionManifest } from '@/core/services/versionService';

export interface UseUpdateCheckReturn {
  shouldShow: boolean;
  manifest: VersionManifest | null;
  checking: boolean;
  check: () => Promise<void>;
  handleDismiss: () => Promise<void>;
}

export function useUpdateCheck(): UseUpdateCheckReturn {
  const [shouldShow, setShouldShow] = useState<boolean>(false);
  const [manifest, setManifest] = useState<VersionManifest | null>(null);
  const [checking, setChecking] = useState<boolean>(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const { shouldShow: s, manifest: m } = await checkForUpdate();
      setShouldShow(s);
      setManifest(m ?? null);
    } finally {
      setChecking(false);
    }
  }, []);

  const handleDismiss = useCallback(async () => {
    if (!manifest) return;
    await dismissUpdate(manifest.minRequiredVersion);
    setShouldShow(false);
    setManifest(null);
  }, [manifest]);

  return { shouldShow, manifest, checking, check, handleDismiss };
}
