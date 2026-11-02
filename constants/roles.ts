/**
 * Single Source of Truth (SSOT) for display labels of every application role.
 */
import type { UserRole } from '@/types';

export const ROLE_LABELS: Record<UserRole, string> = {
  ELECTION_OFFICER: 'Election Officer',
  POLLING_AGENT: 'Polling Unit Agent',
  FIELD_AGENT: 'Field Agent',
};
