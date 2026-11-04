import { z } from 'zod';

// Row shapes as returned by the live API (snake_case, control_* pointers into
// the control-plane tables). Unknown keys are dropped by zod.

export const PartyRowSchema = z.object({
  id: z.number(),
  control_political_party_id: z.number().nullable().optional(),
  code: z.string(),
  name: z.string(),
  acronym: z.string(),
  logo: z.string().nullable().optional(),
  status: z.string(),
  tenant: z.number().nullable().optional(),
});

export const PositionRowSchema = z.object({
  id: z.number(),
  control_position_id: z.number().nullable().optional(),
  name: z.string(),
  electoral_area_type: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
});

export const ElectoralAreaRowSchema = z.object({
  id: z.number(),
  control_electoral_area_id: z.number().nullable().optional(),
  name: z.string(),
  code: z.string().nullable().optional(),
  type: z.string(),
});

export const IncidentCategoryRowSchema = z.object({
  id: z.number(),
  control_incident_category_id: z.number().nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
});

export const ElectionCycleRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  status: z.string(),
});

export const ElectionRowSchema = z.object({
  id: z.number(),
  cycle_id: z.number(),
  position_id: z.number(),
  electoral_area_id: z.number(),
  election_date: z.string().nullable().optional(),
  status: z.string(),
});

export const CandidateRowSchema = z.object({
  id: z.number(),
  election_id: z.number(),
  political_party_id: z.number(),
  position_id: z.number(),
  name: z.string(),
  picture: z.string().nullable().optional(),
  status: z.string(),
});

// GPS values arrive as strings ("6.6018000") even though the columns are decimals.
export const IncidentRowSchema = z.object({
  id: z.number(),
  election_id: z.number(),
  polling_unit_id: z.number(),
  reported_by: z.number(),
  category_id: z.number(),
  severity: z.string(),
  status: z.string(),
  gps_latitude: z.union([z.string(), z.number()]).nullable().optional(),
  gps_longitude: z.union([z.string(), z.number()]).nullable().optional(),
  gps_accuracy: z.union([z.string(), z.number()]).nullable().optional(),
  description: z.string().nullable().optional(),
  reported_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

// GET tenant/get-party returns a single party (not paginated, not an array).
export const TenantPartySchema = PartyRowSchema;

const pageFields = {
  total: z.number(),
  pageNo: z.number(),
  perPage: z.number(),
};

export const PartyPageSchema = z.object({ ...pageFields, payload: z.array(PartyRowSchema) });
export const PositionPageSchema = z.object({ ...pageFields, payload: z.array(PositionRowSchema) });
export const ElectoralAreaPageSchema = z.object({ ...pageFields, payload: z.array(ElectoralAreaRowSchema) });
export const IncidentCategoryPageSchema = z.object({ ...pageFields, payload: z.array(IncidentCategoryRowSchema) });
export const ElectionPageSchema = z.object({ ...pageFields, payload: z.array(ElectionRowSchema) });
export const CandidatePageSchema = z.object({ ...pageFields, payload: z.array(CandidateRowSchema) });
export const IncidentPageSchema = z.object({ ...pageFields, payload: z.array(IncidentRowSchema) });

// Election cycles are the one list that does not follow the paginated envelope.
export const ElectionCycleListSchema = z.object({ total: z.number(), data: z.array(ElectionCycleRowSchema) });

export type PartyRow = z.infer<typeof PartyRowSchema>;
export type PositionRow = z.infer<typeof PositionRowSchema>;
export type ElectoralAreaRow = z.infer<typeof ElectoralAreaRowSchema>;
export type IncidentCategoryRow = z.infer<typeof IncidentCategoryRowSchema>;
export type ElectionCycleRow = z.infer<typeof ElectionCycleRowSchema>;
export type ElectionRow = z.infer<typeof ElectionRowSchema>;
export type CandidateRow = z.infer<typeof CandidateRowSchema>;
export type IncidentRow = z.infer<typeof IncidentRowSchema>;
