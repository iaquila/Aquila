import type { IncidentCategory, IncidentSeverity } from '@/types';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

/**
 * Single Source of Truth (SSOT) for incident classifications and severity color tokens.
 */
export const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  CRITICAL: Colors.light.critical,
  HIGH: Colors.light.disputed,
  MEDIUM: Colors.light.warning,
  LOW: Colors.light.success,
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

export const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  VOTE_BUYING: 'cash-outline',
  BVAS_FAILURE: 'hardware-chip-outline',
  VIOLENCE: 'warning-outline',
  LOGISTICS: 'car-outline',
  BALLOT_SNATCHING: 'hand-left-outline',
  OTHER: 'alert-circle-outline',
};

export const AREA_PRESETS = [
  'Ikeja LGA Collation Center',
  'Highway In-Transit Route',
  'Lagos State Collation HQ',
  'Alimosho LGA Sector',
] as const;

