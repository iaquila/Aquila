import type { Candidate, Election, ElectionCycle, IncidentReport, PoliticalParty } from '@/features/auth/store';
import type { ElectionStatus, IncidentCategory, IncidentSeverity, IncidentStatus } from '@/types';
import type { CandidateRow, ElectionCycleRow, ElectionRow, ElectoralAreaRow, IncidentRow, PartyRow, PositionRow } from './schemas';

export interface MappedPosition {
  id: string;
  name: string;
  electoralAreaType: string;
}

export interface MappedElectoralArea {
  id: string;
  name: string;
  code?: string;
  type: string;
  parentId?: string;
}

export interface MappedIncidentCategory {
  id: string;
  name: string;
  description?: string;
}

// The server only says active|inactive, so the app reports exactly that. No
// SCHEDULED/COMPLETED guessing from dates, and ARCHIVED is never produced.
export function toElectionStatus(status: string): ElectionStatus {
  return status.toLowerCase() === 'active' ? 'ACTIVE' : 'INACTIVE';
}

export function toPoliticalParty(row: PartyRow): PoliticalParty {
  return {
    id: String(row.id),
    name: row.name,
    acronym: row.acronym,
    code: row.code,
    status: row.status.toLowerCase() === 'active' ? 'ACTIVE' : 'INACTIVE',
    ...(row.logo ? { logoUrl: row.logo } : {}),
  };
}

export function toElectionCycle(row: ElectionCycleRow): ElectionCycle {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? '',
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    status: row.status.toLowerCase() === 'active' ? 'ACTIVE' : 'INACTIVE',
  };
}

export function toPosition(row: PositionRow): MappedPosition {
  return { id: String(row.id), name: row.name, electoralAreaType: row.electoral_area_type };
}

export function toElectoralArea(row: ElectoralAreaRow): MappedElectoralArea {
  return {
    id: String(row.id),
    name: row.name,
    type: row.type,
    ...(row.code ? { code: row.code } : {}),
    ...(row.control_electoral_area_id ? { parentId: String(row.control_electoral_area_id) } : {}),
  };
}

export function toMappedIncidentCategory(row: {
  id: number;
  name: string;
  description?: string | null;
}): MappedIncidentCategory {
  return {
    id: String(row.id),
    name: row.name,
    ...(row.description ? { description: row.description } : {}),
  };
}

// Severity and status report exactly what the server stores: severity has no
// `critical`, status has no review/resolved, only open/close.
const SEVERITY_BY_DB: Record<string, IncidentSeverity> = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH' };

const CATEGORY_BY_NAME: Record<string, IncidentCategory> = {
  violence: 'VIOLENCE',
  'ballot box snatching': 'BALLOT_SNATCHING',
  'vote buying': 'VOTE_BUYING',
  'voter intimidation': 'VOTER_INTIMIDATION',
  'over voting': 'OVER_VOTING',
  'under age voting': 'UNDER_AGE_VOTING',
  'polling unit not open': 'PU_NOT_OPEN',
  'late arrival of officials': 'LATE_OFFICIALS',
  'late arrival of election materials': 'LATE_MATERIALS',
  'equipment failure': 'EQUIPMENT_FAILURE',
  'bvas failure': 'BVAS_FAILURE',
  'security incident': 'SECURITY_INCIDENT',
  protest: 'PROTEST',
  'weather disruption': 'WEATHER_DISRUPTION',
  other: 'OTHER',
};

// Server category names are free text; this is the one place that turns a name
// into the app enum (and back, for create requests).
export function incidentCategoryForName(name: string): IncidentCategory | undefined {
  return CATEGORY_BY_NAME[name.toLowerCase().trim()];
}

function toDecimal(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toIncidentReport(row: IncidentRow, categoryNames: Map<number, string>): IncidentReport {
  const categoryName = (categoryNames.get(row.category_id) ?? '').toLowerCase().trim();
  const latitude = toDecimal(row.gps_latitude);
  const longitude = toDecimal(row.gps_longitude);
  const status: IncidentStatus = row.status.toLowerCase() === 'close' ? 'CLOSED' : 'OPEN';
  return {
    id: String(row.id),
    electionId: String(row.election_id),
    pollingUnitId: String(row.polling_unit_id),
    // No polling-unit endpoint exists, so the area is genuinely unknown here.
    electoralArea: '',
    category: CATEGORY_BY_NAME[categoryName] ?? 'OTHER',
    severity: SEVERITY_BY_DB[row.severity.toLowerCase()] ?? 'MEDIUM',
    status,
    description: row.description ?? '',
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
    mediaUrls: [],
    // No profile lookup endpoint exists either, so the reporter is an id.
    reportedBy: `Agent #${row.reported_by}`,
    reportedAt: row.reported_at ?? row.created_at,
  };
}

export interface ElectionLookups {
  positions: Map<number, PositionRow>;
  areas: Map<number, ElectoralAreaRow>;
  candidateCount: Map<number, number>;
}

export function toElection(row: ElectionRow, lookups: ElectionLookups): Election {
  const position = lookups.positions.get(row.position_id);
  const area = lookups.areas.get(row.electoral_area_id);
  return {
    id: String(row.id),
    cycleId: String(row.cycle_id),
    position: position?.name ?? '',
    electoralArea: area?.name ?? '',
    electoralAreaType: area?.type ?? position?.electoral_area_type ?? '',
    electionDate: row.election_date ?? '',
    status: toElectionStatus(row.status),
    candidateCount: lookups.candidateCount.get(row.id) ?? 0,
  };
}

// The server only knows active|inactive for a candidacy; report that directly.
export function toCandidate(row: CandidateRow, parties: Map<number, PartyRow>): Candidate {
  const party = parties.get(row.political_party_id);
  return {
    id: String(row.id),
    electionId: String(row.election_id),
    partyId: String(row.political_party_id),
    partyName: party?.name ?? '',
    partyAcronym: party?.acronym ?? '',
    fullName: row.name,
    status: row.status.toLowerCase() === 'active' ? 'ACTIVE' : 'INACTIVE',
    ...(party?.logo ? { partyLogoUrl: party.logo } : {}),
    ...(row.picture ? { photoUrl: row.picture } : {}),
  };
}
