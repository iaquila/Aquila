/**
 * Single Source of Truth (SSOT) for election contest status mappings, labels,
 * position filters, and the official national election totals.
 */
export const TOTAL_STATES = 36;
export const TOTAL_STATES_AND_FCT = 37;
export const TOTAL_LGAS = 774;
export const TOTAL_WARDS = 8809;
export const TOTAL_POLLING_UNITS = 176846;

export const ELECTION_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'textMuted',
  SCHEDULED: 'pending',
  ACTIVE: 'verified',
  INACTIVE: 'textMuted',
  COMPLETED: 'primary',
  ARCHIVED: 'textSecondary',
};

export const ELECTION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

// Display order for the position chips, highest office first. The chips
// themselves come from the live position list, so this only decides ordering;
// a type not listed here sorts to the end.
export const ELECTORAL_AREA_TYPE_ORDER: Record<string, number> = {
  country: 0,
  state: 1,
  senatorial_district: 2,
  federal_constituency: 3,
  state_constituency: 4,
  lga: 5,
  ward: 6,
};

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

