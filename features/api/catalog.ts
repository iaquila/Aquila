import { API_PATHS } from '@/constants/api';
import { apiRequest } from '@/core/services/http';
import { loadSession } from '@/core/services/session';
import { mockApi } from '@/features/elections/service';
import type { Candidate, Election, ElectionCycle, IncidentReport, PoliticalParty } from '@/features/auth/store';
import {
  CandidatePageSchema,
  ElectionCycleListSchema,
  ElectionPageSchema,
  ElectoralAreaPageSchema,
  IncidentCategoryPageSchema,
  IncidentPageSchema,
  PartyPageSchema,
  PositionPageSchema,
  TenantPartySchema,
  type CandidateRow,
  type ElectionCycleRow,
  type ElectionRow,
  type ElectoralAreaRow,
  type IncidentRow,
  type PartyRow,
  type PositionRow,
} from './schemas';
import {
  toCandidate,
  toElection,
  toElectionCycle,
  toElectoralArea,
  toIncidentReport,
  toMappedIncidentCategory,
  toPoliticalParty,
  toPosition,
  type MappedElectoralArea,
  type MappedIncidentCategory,
  type MappedPosition,
} from './mappers';

const MAX_PAGES = 10;

interface PageResult<T> {
  rows: T[];
  hasMore: boolean;
}

async function collectPages<T>(pageUrl: (page: number) => string, parsePage: (data: unknown) => PageResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await apiRequest<unknown>({ url: pageUrl(page), method: 'GET' });
    const { rows: pageRows, hasMore } = parsePage(data);
    rows.push(...pageRows);
    if (!hasMore) break;
  }
  return rows;
}

const nextPage = (page: { pageNo: number; perPage: number; total: number }, size: number) =>
  page.pageNo * page.perPage < page.total && size > 0;

const partyRows = () =>
  collectPages<PartyRow>(API_PATHS.parties, (data) => {
    const page = PartyPageSchema.parse(data);
    return { rows: page.payload, hasMore: nextPage(page, page.payload.length) };
  });

const positionRows = () =>
  collectPages<PositionRow>(API_PATHS.positions, (data) => {
    const page = PositionPageSchema.parse(data);
    return { rows: page.payload, hasMore: nextPage(page, page.payload.length) };
  });

const electoralAreaRows = () =>
  collectPages<ElectoralAreaRow>(API_PATHS.electoralAreas, (data) => {
    const page = ElectoralAreaPageSchema.parse(data);
    return { rows: page.payload, hasMore: nextPage(page, page.payload.length) };
  });

const incidentCategoryRows = () =>
  collectPages(API_PATHS.incidentCategories, (data) => {
    const page = IncidentCategoryPageSchema.parse(data);
    return { rows: page.payload, hasMore: nextPage(page, page.payload.length) };
  });

const electionRows = () =>
  collectPages<ElectionRow>(API_PATHS.elections, (data) => {
    const page = ElectionPageSchema.parse(data);
    return { rows: page.payload, hasMore: nextPage(page, page.payload.length) };
  });

const candidateRows = () =>
  collectPages<CandidateRow>(API_PATHS.candidates, (data) => {
    const page = CandidatePageSchema.parse(data);
    return { rows: page.payload, hasMore: nextPage(page, page.payload.length) };
  });

const electionCycleRows = async (): Promise<ElectionCycleRow[]> => {
  const data = await apiRequest<unknown>({ url: API_PATHS.electionCycles, method: 'GET' });
  return ElectionCycleListSchema.parse(data).data;
};

const incidentRows = () =>
  collectPages<IncidentRow>(API_PATHS.incidents, (data) => {
    const page = IncidentPageSchema.parse(data);
    return { rows: page.payload, hasMore: nextPage(page, page.payload.length) };
  });

// Incidents resolve category names through the category list, so both are read
// together. Category names are free text server-side; the mapper maps them 1:1.
export async function loadIncidents(): Promise<IncidentReport[]> {
  const session = await loadSession();
  if (!session) return mockApi.getIncidents();
  const [rows, categories] = await Promise.all([incidentRows(), incidentCategoryRows()]);
  const names = new Map(categories.map((category) => [category.id, category.name]));
  return rows.map((row) => toIncidentReport(row, names));
}

export interface CreateIncidentInput {
  electionId: number;
  pollingUnitId: number;
  categoryId: number;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

// Severity is capped at high because the column has no `critical` value.
export async function createIncident(input: CreateIncidentInput): Promise<void> {
  await apiRequest({
    url: API_PATHS.incidentCreate,
    method: 'POST',
    data: {
      electionId: input.electionId,
      pollingUnitId: input.pollingUnitId,
      categoryId: input.categoryId,
      description: input.description,
      severity: input.severity.toLowerCase(),
      status: 'open',
      ...(input.latitude !== undefined ? { gpsLatitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { gpsLongitude: input.longitude } : {}),
      ...(input.accuracy !== undefined ? { gpsAccuracy: input.accuracy } : {}),
    },
  });
}

export interface UpdateIncidentInput {
  id: number;
  status?: 'open' | 'close';
  severity?: 'low' | 'medium' | 'high';
  description?: string;
}

// The endpoint rejects anything outside those two vocabularies with a 401, so
// callers pass the server's own words and no mapping happens here.
export async function updateIncident(input: UpdateIncidentInput): Promise<void> {
  await apiRequest({
    url: API_PATHS.incidentEdit(input.id),
    method: 'PATCH',
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.severity !== undefined ? { severity: input.severity } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  });
}

// The tenant's own party, as assigned by the control plane. Returns null for
// tenants with no party (observers, CSOs).
export async function loadTenantParty(): Promise<PoliticalParty | null> {
  const session = await loadSession();
  if (!session) return null;
  try {
    const data = await apiRequest<unknown>({ url: API_PATHS.tenantParty, method: 'GET' });
    const parsed = TenantPartySchema.safeParse(data);
    return parsed.success ? toPoliticalParty(parsed.data) : null;
  } catch (e) {
    // A tenant without a party answers 401 "not associated"; treat as absent.
    if (__DEV__) console.warn('[api] tenant party unavailable', e);
    return null;
  }
}

export interface Catalogue {
  parties: PoliticalParty[];
  cycles: ElectionCycle[];
  elections: Election[];
  candidates: Candidate[];
  positions: MappedPosition[];
  areas: MappedElectoralArea[];
  incidentCategories: MappedIncidentCategory[];
}

// Demo accounts sign in without an API session. Keeping them on the local seed
// avoids an empty catalogue; delete this once demo mode is retired.
async function loadMockCatalogue(): Promise<Catalogue> {
  const [parties, cycles, elections, candidates, positions] = await Promise.all([
    mockApi.getParties(),
    mockApi.getElectionCycles(),
    mockApi.getElections(),
    mockApi.getCandidates(''),
    mockApi.getPositions(),
  ]);
  return {
    parties,
    cycles,
    elections,
    candidates,
    positions: positions.map((position) => ({
      id: position.id,
      name: position.name,
      electoralAreaType: position.electoralAreaType,
    })),
    areas: [],
    incidentCategories: [],
  };
}

// One round trip set for every screen that needs the catalogue: the API returns
// ids only, so elections and candidates are joined here rather than in the UI.
export async function loadCatalogue(): Promise<Catalogue> {
  if (!(await loadSession())) return loadMockCatalogue();

  const [parties, positions, areas, categories, elections, candidates, cycles] = await Promise.all([
    partyRows(),
    positionRows(),
    electoralAreaRows(),
    incidentCategoryRows(),
    electionRows(),
    candidateRows(),
    electionCycleRows(),
  ]);

  const partyById = new Map(parties.map((row) => [row.id, row]));
  const positionById = new Map(positions.map((row) => [row.id, row]));
  const areaById = new Map(areas.map((row) => [row.id, row]));

  const candidateCount = new Map<number, number>();
  for (const row of candidates) {
    candidateCount.set(row.election_id, (candidateCount.get(row.election_id) ?? 0) + 1);
  }

  return {
    parties: parties.map(toPoliticalParty),
    cycles: cycles.map(toElectionCycle),
    elections: elections.map((row) => toElection(row, { positions: positionById, areas: areaById, candidateCount })),
    candidates: candidates.map((row) => toCandidate(row, partyById)),
    positions: positions.map(toPosition),
    areas: areas.map(toElectoralArea),
    incidentCategories: categories.map(toMappedIncidentCategory),
  };
}
