import axios, { type AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { API, API_AUTH_PATHS } from '@/constants/api';
import { clearSession, loadSession, saveSession } from './session';

const EnvelopeSchema = z.object({
  statusCode: z.number(),
  success: z.boolean(),
  messages: z.array(z.string()).default([]),
  data: z.unknown(),
});

const RefreshPayloadSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  sessionId: z.number().optional(),
});

export class ApiError extends Error {
  readonly statusCode: number;
  readonly messages: string[];
  readonly sessionExpired: boolean;

  constructor(messages: string[], statusCode: number, sessionExpired = false) {
    super(messages[0] ?? 'Request failed');
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.messages = messages;
    this.sessionExpired = sessionExpired;
  }
}

// This backend also answers 401 for "not found", "not an admin" and "not
// associated with tenant". Only an explicit token message may end a session.
const SESSION_EXPIRED_PATTERN = /invalid access token|access token (?:has )?expired|session expired/i;

const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };

const http = axios.create({ baseURL: API.BASE_URL, timeout: API.TIMEOUT_MS, headers });
const refreshHttp = axios.create({ baseURL: API.BASE_URL, timeout: API.TIMEOUT_MS, headers });

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const response = error.response;
    if (response) {
      const envelope = EnvelopeSchema.safeParse(response.data);
      if (envelope.success) {
        const expired =
          envelope.data.statusCode === 401 &&
          SESSION_EXPIRED_PATTERN.test(envelope.data.messages.join(' '));
        return new ApiError(envelope.data.messages, envelope.data.statusCode, expired);
      }
      return new ApiError([`Request failed (${response.status})`], response.status);
    }
    if (error.code === 'ECONNABORTED') return new ApiError(['The request timed out.'], 0);
    return new ApiError(['Network unavailable.'], 0);
  }
  return new ApiError([error instanceof Error ? error.message : 'Request failed'], 0);
}

async function request<T>(config: AxiosRequestConfig, allowRefresh = true): Promise<T> {
  const session = await loadSession();
  try {
    const response = await http.request<unknown>({
      ...config,
      headers: {
        ...config.headers,
        ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      },
    });
    const envelope = EnvelopeSchema.safeParse(response.data);
    if (!envelope.success) {
      throw new ApiError(['Unexpected response from server.'], response.status);
    }
    if (!envelope.data.success) {
      const expired =
        envelope.data.statusCode === 401 && SESSION_EXPIRED_PATTERN.test(envelope.data.messages.join(' '));
      throw new ApiError(envelope.data.messages, envelope.data.statusCode, expired);
    }
    return envelope.data.data as T;
  } catch (error) {
    const apiError = toApiError(error);
    if (allowRefresh && apiError.sessionExpired && (await refreshSession())) {
      return request<T>(config, false);
    }
    if (apiError.sessionExpired) await clearSession();
    throw apiError;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  const attempt = (async () => {
    const session = await loadSession();
    if (!session) return false;
    try {
      const response = await refreshHttp.patch<unknown>(API_AUTH_PATHS.refresh(session.sessionId), {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
      const envelope = EnvelopeSchema.safeParse(response.data);
      if (!envelope.success || !envelope.data.success) return false;
      const payload = RefreshPayloadSchema.safeParse(envelope.data.data);
      if (!payload.success) return false;
      await saveSession({
        ...session,
        accessToken: payload.data.accessToken,
        refreshToken: payload.data.refreshToken ?? session.refreshToken,
        sessionId: payload.data.sessionId ?? session.sessionId,
      });
      return true;
    } catch {
      return false;
    }
  })();

  refreshInFlight = attempt;
  try {
    return await attempt;
  } finally {
    refreshInFlight = null;
  }
}

export function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  return request<T>(config);
}

const ACCESS_REFRESH_WINDOW_MS = 2 * 60 * 1000;

// Server timestamps are "YYYY-MM-DD HH:MM:SS" with no zone; parse them as local.
function parseServerDate(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const time = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6])
    ).getTime();
    return Number.isNaN(time) ? null : time;
  }
  const fallback = Date.parse(value);
  return Number.isNaN(fallback) ? null : fallback;
}

export type SessionCheck = 'no-session' | 'valid' | 'invalid';

// Called on foreground/background and on a timer: refreshes shortly before the
// access token expires so screens never have to discover it through a 401.
export async function ensureFreshSession(): Promise<SessionCheck> {
  const session = await loadSession();
  if (!session) return 'no-session';

  const refreshExpiry = parseServerDate(session.refreshTokenExpiry);
  if (refreshExpiry !== null && refreshExpiry <= Date.now()) {
    await clearSession();
    return 'invalid';
  }

  const accessExpiry = parseServerDate(session.accessTokenExpiry);
  if (accessExpiry === null || accessExpiry - Date.now() > ACCESS_REFRESH_WINDOW_MS) return 'valid';

  if (await refreshSession()) return 'valid';

  // A network blip must not sign anyone out; only an already-expired token is unusable.
  if (accessExpiry <= Date.now()) {
    await clearSession();
    return 'invalid';
  }
  return 'valid';
}
