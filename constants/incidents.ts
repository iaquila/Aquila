import type { IncidentCategory, IncidentSeverity } from '@/types';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

/**
 * Single Source of Truth (SSOT) for incident classifications and severity color tokens.
 * Calibrated for WCAG AA text contrast (>= 4.5:1) in both Light and Dark themes.
 */
export const SEVERITY_COLORS = {
  light: {
    CRITICAL: '#B91C1C', // Red-700 (6.47:1 on #FFFFFF)
    HIGH: '#C2410C',     // Orange-700 (5.18:1 on #FFFFFF)
    MEDIUM: '#B45309',   // Amber-700 (5.02:1 on #FFFFFF)
    LOW: '#047857',      // Emerald-700 (5.48:1 on #FFFFFF)
  },
  dark: {
    CRITICAL: Colors.dark.critical, // Red-400 (4.85:1 on #0E1712)
    HIGH: Colors.dark.disputed,     // Orange-400 (8.07:1 on #0E1712)
    MEDIUM: Colors.dark.warning,    // Amber-300 (10.94:1 on #0E1712)
    LOW: Colors.dark.success,       // Emerald-400 (9.50:1 on #0E1712)
  },
} as const;

export function getSeverityColor(severity: IncidentSeverity, scheme: 'light' | 'dark' = 'light'): string {
  return SEVERITY_COLORS[scheme]?.[severity] ?? (scheme === 'dark' ? Colors.dark.warning : '#B45309');
}

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

