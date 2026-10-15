/**
 * Single Source of Truth (SSOT) for election contest status mappings, labels, and position filters.
 */
export const ELECTION_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'textMuted',
  SCHEDULED: 'pending',
  ACTIVE: 'verified',
  COMPLETED: 'primary',
  ARCHIVED: 'textSecondary',
};

export const ELECTION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

export const ELECTION_POSITION_FILTERS = [
  { id: 'ALL', label: 'All Contests' },
  { id: 'PRESIDENT', label: 'Presidential' },
  { id: 'GOVERNOR', label: 'Governorship' },
  { id: 'SENATOR', label: 'Senatorial' },
  { id: 'REPRESENTATIVES', label: 'House of Reps' },
  { id: 'LOCAL', label: 'LGA / Local' },
] as const;

export type ElectionPositionFilterId = (typeof ELECTION_POSITION_FILTERS)[number]['id'];
