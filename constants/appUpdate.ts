// App update / mandatory upgrade config.
// Populate REMOTE_MANIFEST_URL with a hosted JSON manifest (Cloudflare Worker,
// Supabase edge function, static S3/Cloudflare Pages JSON, etc.). The manifest
// shape: { minRequiredVersion, forceUpdate, message, iosStoreUrl, androidStoreUrl }.
// Until a remote URL is configured, FALLBACK_* values are used so the check
// still functions off the locally shipped version.
export const APP_UPDATE = {
  REMOTE_MANIFEST_URL:
    'https://aquila-update-manifest.uncs.workers.dev',
  FALLBACK_MIN_VERSION: '1.0.0',
  FALLBACK_MESSAGE:
    'A new version of iAquila is available. Please update to keep using the app.',
  FALLBACK_IOS_STORE_URL: 'https://apps.apple.com/app/aquila',
  FALLBACK_ANDROID_STORE_URL:
    'https://play.google.com/store/apps/details?id=com.alabian.aquila',
} as const;
