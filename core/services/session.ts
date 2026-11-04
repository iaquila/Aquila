import * as SecureStore from 'expo-secure-store';

export interface ApiSession {
  sessionId: number;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry?: string;
  refreshTokenExpiry?: string;
}

const SESSION_KEY = 'aquila_api_session';

let cached: ApiSession | null = null;
let hydration: Promise<ApiSession | null> | null = null;
let generation = 0;

function readSession(): Promise<ApiSession | null> {
  const current = generation;
  return (async () => {
    let parsed: ApiSession | null = null;
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      parsed = raw ? (JSON.parse(raw) as ApiSession) : null;
    } catch (e) {
      if (__DEV__) console.warn('[session] read failed', e);
    }
    // A save/clear that landed while the read was in flight wins.
    if (current === generation) cached = parsed;
    return cached;
  })();
}

// Concurrent callers share one read. Without this, a second caller can observe
// `cached === null` before the first read resolves and wrongly fall back to mocks.
export function loadSession(): Promise<ApiSession | null> {
  if (!hydration) hydration = readSession();
  return hydration;
}

export function peekSession(): ApiSession | null {
  return cached;
}

export async function saveSession(session: ApiSession): Promise<void> {
  generation += 1;
  cached = session;
  hydration = Promise.resolve(session);
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    if (__DEV__) console.warn('[session] write failed (in-memory only)', e);
  }
}

export async function clearSession(): Promise<void> {
  generation += 1;
  cached = null;
  hydration = Promise.resolve(null);
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch (e) {
    if (__DEV__) console.warn('[session] delete failed (treated as cleared)', e);
  }
}
