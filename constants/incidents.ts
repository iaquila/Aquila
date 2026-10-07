import type { IncidentCategory, IncidentSeverity } from '@/types';

/**
 * Single Source of Truth (SSOT) for incident classifications and severity color tokens.
 */
export const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MEDIUM: '#F59E0B',
  LOW: '#10B981',
};

export const INCIDENT_CATEGORIES: readonly IncidentCategory[] = [
  'VIOLENCE',
  'BALLOT_SNATCHING',
  'VOTE_BUYING',
  'VOTER_INTIMIDATION',
  'BVAS_FAILURE',
  'SECURITY_INCIDENT',
  'PROTEST',
  'OTHER',
] as const;

export const INCIDENT_SEVERITIES: readonly IncidentSeverity[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;
