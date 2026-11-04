import { API_AUTH_PATHS } from '@/constants/api';
import { FEATURES } from '@/constants/features';
import { apiRequest } from '@/core/services/http';
import { clearSession, loadSession, saveSession } from '@/core/services/session';
import {
  LoginRequestSchema,
  SessionPayloadSchema,
  mapSessionPayload,
  type MappedProfile,
} from './schemas';

export class UnsupportedOfficerError extends Error {
  readonly officerType: string;

  constructor(officerType: string) {
    super(`This account type (${officerType}) is not supported in the field app.`);
    this.name = 'UnsupportedOfficerError';
    this.officerType = officerType;
  }
}

export async function login(email: string, password: string): Promise<MappedProfile> {
  const body = LoginRequestSchema.parse({ identifierType: 'email', identifierValue: email, password });
  const data = await apiRequest<unknown>({ url: API_AUTH_PATHS.login, method: 'POST', data: body });

  const parsed = SessionPayloadSchema.safeParse(data);
  if (!parsed.success) throw new Error('Unexpected login response from the server.');

  const mapped = mapSessionPayload(parsed.data, { allowAdmin: FEATURES.ENABLE_ADMIN_ACCOUNT });
  if (!mapped.ok) throw new UnsupportedOfficerError(mapped.officerType);

  await saveSession(mapped.session);
  return mapped.profile;
}

export async function logout(): Promise<void> {
  const session = await loadSession();
  if (session) {
    try {
      await apiRequest({ url: API_AUTH_PATHS.logout(session.sessionId), method: 'DELETE' });
    } catch (e) {
      if (__DEV__) console.warn('[auth] logout call failed (clearing locally)', e);
    }
  }
  await clearSession();
}
