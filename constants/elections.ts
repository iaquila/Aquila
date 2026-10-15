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

export interface AssignedDemoPu {
  id: string;
  code: string;
  name: string;
  lga: string;
  state: string;
  status: 'PUBLISHED' | 'DRAFT' | 'PENDING';
  votes: number;
  accredited: number;
}

export const ASSIGNED_DEMO_PUS: AssignedDemoPu[] = [
  {
    id: 'pu-s25-lga-1-1',
    code: 'PU 24/08/01/001',
    name: 'PU 001 · Alausa Secretariat',
    lga: 'Ikeja',
    state: 'Lagos',
    status: 'PUBLISHED',
    votes: 578,
    accredited: 600,
  },
  {
    id: 'pu-s25-lga-1-2',
    code: 'PU 24/08/01/002',
    name: 'PU 002 · Ojodu Primary School',
    lga: 'Ikeja',
    state: 'Lagos',
    status: 'DRAFT',
    votes: 412,
    accredited: 450,
  },
  {
    id: 'pu-s25-lga-1-3',
    code: 'PU 24/08/01/003',
    name: 'PU 003 · Oregun High School',
    lga: 'Ikeja',
    state: 'Lagos',
    status: 'PENDING',
    votes: 0,
    accredited: 420,
  },
];

