import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIncident,
  loadCatalogue,
  loadIncidents,
  loadTenantParty,
  updateIncident,
  type CreateIncidentInput,
  type UpdateIncidentInput,
} from './catalog';

export const CATALOGUE_QUERY_KEY = ['catalogue'] as const;
export const INCIDENTS_QUERY_KEY = ['incidents', 'live'] as const;
export const TENANT_PARTY_QUERY_KEY = ['tenant', 'party'] as const;

const catalogueOptions = {
  queryKey: CATALOGUE_QUERY_KEY,
  queryFn: loadCatalogue,
  staleTime: 5 * 60 * 1000,
} as const;

const incidentsOptions = {
  queryKey: INCIDENTS_QUERY_KEY,
  queryFn: loadIncidents,
  staleTime: 30 * 1000,
} as const;

export function useLiveCatalogueQuery() {
  return useQuery(catalogueOptions);
}

export function useLiveElectionCyclesQuery() {
  return useQuery({ ...catalogueOptions, select: (catalogue) => catalogue.cycles });
}

export function useLiveElectionsQuery() {
  return useQuery({ ...catalogueOptions, select: (catalogue) => catalogue.elections });
}

export function useLiveElectionDetailQuery(electionId?: string) {
  return useQuery({
    ...catalogueOptions,
    enabled: !!electionId,
    select: (catalogue) => (electionId ? catalogue.elections.find((election) => election.id === electionId) : undefined),
  });
}

export function useLiveCandidatesQuery(electionId?: string) {
  return useQuery({
    ...catalogueOptions,
    enabled: !!electionId,
    select: (catalogue) =>
      electionId ? catalogue.candidates.filter((candidate) => candidate.electionId === electionId) : catalogue.candidates,
  });
}

export function useLiveAllCandidatesQuery() {
  return useQuery({ ...catalogueOptions, select: (catalogue) => catalogue.candidates });
}

export function useLivePartiesQuery() {
  return useQuery({ ...catalogueOptions, select: (catalogue) => catalogue.parties });
}

// Parties contesting each election, derived from its candidates rather than a
// hardcoded list. Empty when the server has no candidates for that election.
export function useLiveElectionPartiesQuery() {
  return useQuery({
    ...catalogueOptions,
    select: (catalogue) => {
      const byElection = new Map<string, string[]>();
      for (const candidate of catalogue.candidates) {
        if (!candidate.partyAcronym) continue;
        const acronyms = byElection.get(candidate.electionId) ?? [];
        if (!acronyms.includes(candidate.partyAcronym)) acronyms.push(candidate.partyAcronym);
        byElection.set(candidate.electionId, acronyms);
      }
      return byElection;
    },
  });
}

export function useLivePositionsQuery() {
  return useQuery({ ...catalogueOptions, select: (catalogue) => catalogue.positions });
}

export function useLiveElectoralAreasQuery() {
  return useQuery({ ...catalogueOptions, select: (catalogue) => catalogue.areas });
}

export function useLiveIncidentCategoriesQuery() {
  return useQuery({ ...catalogueOptions, select: (catalogue) => catalogue.incidentCategories });
}

export function useLiveTenantPartyQuery() {
  return useQuery({
    queryKey: TENANT_PARTY_QUERY_KEY,
    queryFn: loadTenantParty,
    staleTime: 30 * 60 * 1000,
  });
}

export function useLiveIncidentsQuery(refetchIntervalMs?: number) {
  return useQuery({
    ...incidentsOptions,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: false,
  });
}

export function useLiveIncidentDetailQuery(incidentId?: string) {
  return useQuery({
    ...incidentsOptions,
    enabled: !!incidentId,
    select: (incidents) => (incidentId ? incidents.find((incident) => incident.id === incidentId) ?? null : null),
  });
}

export function useCreateIncidentMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, CreateIncidentInput>({
    mutationFn: createIncident,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENTS_QUERY_KEY });
    },
  });
}

export function useUpdateIncidentMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, UpdateIncidentInput>({
    mutationFn: updateIncident,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENTS_QUERY_KEY });
    },
  });
}
