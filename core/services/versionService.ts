import Constants from 'expo-constants';
import { createMMKVStorage } from '@/core/utils/mmkvStorage';
import { APP_UPDATE } from '@/constants/appUpdate';

export interface VersionManifest {
  minRequiredVersion: string;
  forceUpdate: boolean;
  message: string;
  iosStoreUrl: string;
  androidStoreUrl: string;
}

const storage = createMMKVStorage();
const DISMISSED_VERSION_KEY = 'aquila_update_dismissed_version';
const DISMISS_TTL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days before re-showing after dismiss
const FETCH_TIMEOUT_MS = 8000;

type DismissRecord = { version: string; dismissedAt: number };

function parseDismissedRecord(raw: string | null): DismissRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.version === 'string' && typeof parsed.dismissedAt === 'number') {
      return parsed;
    }
    if (typeof parsed === 'string') {
      return { version: parsed, dismissedAt: Date.now() };
    }
    return null;
  } catch {
    return null;
  }
}

export function compareVersions(a: string, b: string): number {
  const pa = (a || '0').split('.').map((s) => Number(s) || 0);
  const pb = (b || '0').split('.').map((s) => Number(s) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

function fallbackManifest(): VersionManifest {
  return {
    minRequiredVersion: APP_UPDATE.FALLBACK_MIN_VERSION,
    forceUpdate: false,
    message: APP_UPDATE.FALLBACK_MESSAGE,
    iosStoreUrl: APP_UPDATE.FALLBACK_IOS_STORE_URL,
    androidStoreUrl: APP_UPDATE.FALLBACK_ANDROID_STORE_URL,
  };
}

async function fetchRawManifest(): Promise<VersionManifest> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await globalThis.fetch(APP_UPDATE.REMOTE_MANIFEST_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`manifest ${response.status}`);
    const data = (await response.json()) as Partial<VersionManifest>;
    return {
      minRequiredVersion: data.minRequiredVersion ?? fallbackManifest().minRequiredVersion,
      forceUpdate: Boolean(data.forceUpdate),
      message: data.message ?? fallbackManifest().message,
      iosStoreUrl: data.iosStoreUrl ?? fallbackManifest().iosStoreUrl,
      androidStoreUrl: data.androidStoreUrl ?? fallbackManifest().androidStoreUrl,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchManifestWithRetries(): Promise<VersionManifest> {
  const maxAttempts = 3;
  const baseDelayMs = 1000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchRawManifest();
    } catch {
      if (attempt === maxAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }
  return fallbackManifest();
}

export async function checkForUpdate(): Promise<{
  shouldShow: boolean;
  manifest: VersionManifest | null;
}> {
  const currentVersion = Constants.expoConfig?.version;
  if (!currentVersion) return { shouldShow: false, manifest: null };

  const dismissed = parseDismissedRecord(await storage.getItem(DISMISSED_VERSION_KEY));
  if (dismissed?.version === currentVersion && Date.now() - dismissed.dismissedAt < DISMISS_TTL_MS) {
    return { shouldShow: false, manifest: null };
  }

  const manifest = await fetchManifestWithRetries();
  const shouldShow = compareVersions(currentVersion, manifest.minRequiredVersion) < 0;
  return { shouldShow, manifest: shouldShow ? manifest : null };
}

export async function dismissUpdate(version: string): Promise<void> {
  await storage.setItem(DISMISSED_VERSION_KEY, JSON.stringify({ version, dismissedAt: Date.now() }));
}
