import { z } from 'zod';
import type { UserRole } from '@/types';

// Officer types observed in the officer_type enum of the live database.
// `admin` is deliberately absent: the field app has no admin surface, so such
// an account must be rejected rather than shown officer permissions it lacks.
export const ROLE_BY_OFFICER_TYPE: Record<string, UserRole> = {
  'election officer': 'ELECTION_OFFICER',
  'field agent': 'FIELD_AGENT',
  'pu agent': 'POLLING_AGENT',
};

export const LoginRequestSchema = z.object({
  identifierType: z.literal('email'),
  identifierValue: z.email(),
  password: z.string().min(1),
});

// Modelled on a real login response. Unknown keys are dropped by zod, which
// also keeps tenant.db_host / db_name / db_username out of app state.
export const SessionPayloadSchema = z.object({
  sessionId: z.number(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiry: z.string(),
  refreshTokenExpiry: z.string(),
  userInfo: z.object({
    session: z.object({ id: z.number() }),
    logger: z.object({
      id: z.number(),
      email: z.string(),
      phone: z.string().nullable(),
      username: z.string().nullable(),
      status: z.string(),
    }),
    profile: z.object({
      id: z.number(),
      profile_no: z.string(),
      logger: z.number(),
      profile_type: z.number(),
      name: z.string(),
      picture: z.string().nullable(),
    }),
    officer: z.object({
      id: z.number(),
      profile: z.number(),
      tenant: z.number(),
      type: z.string(),
    }),
    type: z.string(),
    tenant: z.object({
      id: z.number(),
      name: z.string(),
      code: z.string(),
      status: z.string(),
    }),
  }),
});

export type SessionPayload = z.infer<typeof SessionPayloadSchema>;

export interface MappedSession {
  sessionId: number;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

export interface MappedProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  avatarUrl?: string;
}

export type LoginMapping =
  | { ok: true; session: MappedSession; profile: MappedProfile }
  | { ok: false; reason: 'unsupported_role'; officerType: string };

export interface MapOptions {
  allowAdmin?: boolean;
}

export function mapSessionPayload(payload: SessionPayload, options: MapOptions = {}): LoginMapping {
  const { officer, logger, profile, tenant } = payload.userInfo;
  const officerType = officer.type.trim().toLowerCase();
  if (officerType === 'admin' && !options.allowAdmin) {
    return { ok: false, reason: 'unsupported_role', officerType: officer.type };
  }
  const role = officerType === 'admin' ? 'ELECTION_OFFICER' : ROLE_BY_OFFICER_TYPE[officerType];
  if (!role) return { ok: false, reason: 'unsupported_role', officerType: officer.type };

  return {
    ok: true,
    session: {
      sessionId: payload.sessionId,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      accessTokenExpiry: payload.accessTokenExpiry,
      refreshTokenExpiry: payload.refreshTokenExpiry,
    },
    profile: {
      id: String(profile.id),
      email: logger.email,
      name: profile.name,
      role,
      organizationId: String(tenant.id),
      organizationName: tenant.name,
      ...(profile.picture ? { avatarUrl: profile.picture } : {}),
    },
  };
}
