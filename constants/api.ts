export const API = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.iaquila.com.ng/api/v1',
  TIMEOUT_MS: 15_000,
} as const;

export const API_AUTH_PATHS = {
  login: '/auth/login',
  refresh: (sessionId: number) => `/auth/${sessionId}/refresh`,
  logout: (sessionId: number) => `/auth/${sessionId}/logout`,
} as const;

// Lists are path-paginated (`/details/page/N`) and capped at 100 rows per page.
export const API_PATHS = {
  parties: (page: number) => `/party/details/page/${page}`,
  positions: (page: number) => `/position/details/page/${page}`,
  electoralAreas: (page: number) => `/election-area/details/page/${page}`,
  incidentCategories: (page: number) => `/incident-categories/details/page/${page}`,
  elections: (page: number) => `/election/details/page/${page}`,
  candidates: (page: number) => `/candidate/details/page/${page}`,
  incidents: (page: number) => `/incident/details/page/${page}`,
  incidentCreate: '/incident/create',
  // Admits field and polling-unit agents only; status accepts open|close and
  // severity accepts low|medium|high.
  incidentEdit: (incidentId: number | string) => `/incident/edit/${incidentId}`,
  tenantParty: '/tenant/get-party',
  tenantDetail: (tenantId: number) => `/tenant/${tenantId}`,
  // Not paginated: returns { total, data } and ignores the page segment.
  electionCycles: '/election-cycle/details/page/1',
} as const;
