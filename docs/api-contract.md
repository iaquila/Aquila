# iAquila backend contract (verified against the live API, 2026-11-04)

Evidence: 52 documented endpoints (`docs/api-endpoints.json`), 12 live GET captures, two real logins
(`admin`, `field agent`), and the `iaquila_api` + `db_00001` schema dumps. Where this file and the
Postman documenter disagree, this file is what the server actually did.

`docs/api-requirements-whatsapp.txt` is the requirements we *intended* to send the backend team — it is
not a contract they have agreed to, and parts of it may never have reached them. Treat it as the target,
not as the spec the server was built against.

## Transport

- Base: `https://api.iaquila.com.ng/api/v1` (no trailing slash; `{{BASE_URL}}` in Postman).
- Every response: `{ statusCode, success, messages: string[], data: unknown }`. `success === false` on failure.
- `Authorization: Bearer <accessToken>`.
- **401 does not mean "token expired".** Observed 401s: `Invalid access token`, `Political party not
  found.`, `Electoral area not found.`, `User is not an admin`, `User not associated with tenant`.
  Only the token messages may end a session — implemented in `core/services/http.ts`.

## Auth

`POST /auth/login` → `{ identifierType: "email", identifierValue, password }`.

```
data: {
  sessionId, accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry,
  userInfo: { session, logger, profile, officer: { id, profile, tenant, type }, type: "officer", tenant }
}
```

- `officer.type` ∈ `admin | election officer | field agent | pu agent` (verified against the enum and two logins).
- `userInfo.tenant` carries `db_host`, `db_name`, `db_username` — dropped by `SessionPayloadSchema`.
- `PATCH /auth/{sessionId}/refresh` body `{ accessToken, refreshToken }` (not yet exercised — it rotates the pair).
- `DELETE /auth/{sessionId}/logout`.
- No `/auth/me`; the login payload is the only user source.

## Resource reads (captured)

| Endpoint | `data` shape |
| --- | --- |
| `GET /party/details/page/1` | `{ total, pageNo, perPage, payload: Party[] }` |
| `GET /candidate/details/page/1` | same pagination, `payload: Candidate[]` |
| `GET /election/details/page/1` | same, `payload: Election[]` |
| `GET /election-cycle/details/page/1` | **`{ total, data: Cycle[] }`** — no `pageNo`/`perPage` |
| `GET /election-area/details/page/1` | standard pagination |
| `GET /incident-categories/details/page/1` | standard pagination |
| `GET /position/details/page/1` | standard pagination |
| `GET /incident/details/page/1` | standard pagination (verified with a created incident) |
| `GET /candidate/detail/17` | **array of one object**, not an object |
| `GET /position/detail/1` | array of one object |
| `GET /tenant/get-party` | single object |
| `GET /incident/detail/66` | **single object** — the only detail endpoint that is not `array[1]` |
| `POST /incident/create` | returns the created row (`id`, `reported_by`, `severity`, `status`, …) |

Incident rows (verified with a real create): `election_id`, `polling_unit_id`, `reported_by` (profile id),
`category_id`, `severity` (`low|medium|high`), `status` (`open|close`), `gps_latitude` / `gps_longitude` /
`gps_accuracy` all arrive as **strings**, and `reported_at` is **null** on create even though the column exists.

The 15 live incident categories map 1:1 onto the app's `IncidentCategory` enum by name
(`Violence → VIOLENCE`, `Ballot Box Snatching → BALLOT_SNATCHING`, … `Other → OTHER`), so category
translation is a fixed table, not a guess.

Rows are snake_case. `control_<entity>_id` is the pointer into the control-plane table.

## Schema constraints that change app behaviour

| Field | Database | App model | Consequence |
| --- | --- | --- | --- |
| `results.status` | `draft \| publish` | DRAFT/SUBMITTED/PUBLISHED/CORRECTED | SUBMITTED and CORRECTED do not exist |
| `incidents.status` | `open \| close` | 5 states incl. UNDER_REVIEW/RESOLVED | triage workflow (PRD part 8) is not representable |
| `incidents.severity` | `low \| medium \| high` | LOW..CRITICAL | CRITICAL cannot be stored |
| `incidents.polling_unit_id` | NOT NULL | optional | incidents without a PU cannot be created |
| `elections.status`, `election_cycles.status` | `inactive \| active` | 5 states | no SCHEDULED/COMPLETED/ARCHIVED |
| `electoral_areas.type` | 7 values (adds senatorial / federal / state constituency) | state, lga, ward | picker hierarchy is incomplete |
| `results` unique key | `(election_id, polling_unit_id)` | many submissions per PU | one return per PU per election; resubmission is an update, not a create |
| `result_votes` | `official_votes` NOT NULL, `observed_votes` NULL | observed = primary, INEC secondary | inverse of the app's flow; see open questions |

## Not implemented anywhere (spec → 52 endpoints → schema)

- **Results**: no `/results` read or write endpoint at all, and no summary / live-pulse / candidate-standings endpoints.
- **Polling units + assignments**: no PU endpoints, no `location_assignments` endpoint, no ward hierarchy or `/locations/search`.
- **Media**: no upload or presign endpoint despite `incident_media.file_path`.
- **AI projection**: no endpoint, no table.
- **Incident notes / status history**: no table, no endpoint.
- **Candidate extras**: `candidateNumber`, `runningMate`, `shortName`, party history — no columns and no table.
- **`/auth/me`**, `/users/me/assignments`, `PATCH /users/me`, and `watchCandidateId` persistence — absent.
- Election list returns ids only (no `candidateCount`, no position/area names); the client must join lookups.

## Two-database model

- `iaqutmao_iaquila_api`: control plane — `tenants`, `subscriptions`, `tenant_polling_units`, `session`,
  `admin` (`super admin | admin`), `officer` (`admin | election officer | field agent | pu agent`), and
  control copies of the lookup tables.
- `iaqutmao_db_00001` (one per tenant): `candidates`, `elections`, `election_cycles`, `incidents`,
  `results`, `result_votes`, `result_audit`, `polling_units`, `location_assignments`, plus tenant copies
  of the lookups carrying `control_*_id`.
- `electoral_area_parents` is an explicit parent-child closure, not a nested-set column.

## Write-endpoint verification (2026-11-04, tenant admin)

| Cycle | Result |
| --- | --- |
| `party/create` → `party/details` → `party/delete` | 200, list 22→23→22, row gone |
| `election-cycle/create` → `detail` → `edit` → `delete` | 200 each, gone from list |
| `incident-categories/create` → `edit` → `delete` | 200 each |
| `election-area/create` → `edit` → `delete` | 200 each (ward under an LGA parent) |
| `election/create` → `edit` → `delete` | 200 each |
| `incident/create` | 200, full row returned (fixture id 66) |
| `candidate/create` | **500** — `Failed opening required 'class/Politicalparty.php'`; backend file/case bug |

Also verified:

- `GET tenant/get-party` → the tenant's assigned party (`APC / All Progressives Congress`, `control_political_party_id` 7). Not paginated, not wrapped in an array.
- `GET tenant/{id}` → `data` is **`{ tenant: {...} }`** (nested), unlike every other detail endpoint, and it re-exposes `db_host`, `db_name`, `db_username`.
- `GET tenants/page/1` → 401 `User is not an admin` even as a tenant admin (control-plane only).
- `GET test` → 200 with an empty `text/html` body, not JSON.
- Writes are role-gated: a field agent gets 401 `Must be a tenant's admin`; the tenant admin succeeds.

Validation errors come back as **500**, not 4xx, e.g. an area whose parent type is wrong returns
`A 'country' area cannot be the parent of a 'ward' area under the control hierarchy`.

Two live security findings, both reproducible with any authenticated session:

- `POST /auth/login` with an **unknown** identifier returns a PHP stack trace that exposes absolute
  server paths (`/home/iaqutmao/api.iaquila.com.ng/class/Session.php(96): Authentication->__construct()`).
  A known email with a wrong password correctly returns only `Login failed`.
- `GET /tenant/{id}` returns `db_host`, `db_name`, `db_port` and `db_username` to any authenticated
  client. The password is not exposed, but the database name and user are.

`candidate/create` takes **short** field names — `election`, `party`, `position`, `name` — and
`electionId`/`politicalPartyId` are silently ignored, returning `400 Election is missing`. With the
correct names it returns `500 Failed opening required 'class/Politicalparty.php'`, so candidate
creation is completely blocked while candidate *reads* work.

Every unknown path returns a LiteSpeed HTML 404 (`content-type: text/html`), not the JSON envelope,
including `/results`, `/polling-units`, `/location-assignments` under every spelling tried.

A full, WhatsApp-ready report with verbatim request/response pairs is in
`docs/api-issues-for-backend.txt`.

## As-built vs requested — send these back to the backend team

Ordered by what blocks the app, not by effort.

1. **No result endpoints.** `POST/PATCH/GET /results`, publish, drafts and `GET /results/:id` do not exist, so the app's primary job (recording a PU return) cannot be built. `results`/`result_votes` tables already exist, so it is wiring, not modelling.
2. **One return per PU per election.** `UNIQUE (election_id, polling_unit_id)` means a resubmission or correction has to be a PATCH; confirm that is intended and that `POST` returns the existing row rather than erroring.
3. **Status enums are too narrow for the PRD.** `results.status` is `draft|publish` (no submitted/corrected), `incidents.status` is `open|close` (no review/resolved), `incidents.severity` has no `critical`, `elections`/`election_cycles` are `inactive|active` (no scheduled/completed/archived). Either widen the enums or confirm the app should collapse its states.
4. **INEC vs observed is inverted.** `result_votes.official_votes` is `NOT NULL` while `observed_votes` is nullable, and `results` has no INEC counterparts for accredited/rejected/valid/total. The app records the observer's count first and the INEC column second; confirm which column is which, and how "INEC not uploaded yet" is represented.
5. **`incidents.polling_unit_id` is `NOT NULL`** while the requested create body made it optional; a national-level incident cannot be recorded.
6. **Geography and polling units have no read endpoints**: no states/LGAs/wards/PU listing, no `/locations/search`, no `/users/me/assignments`. `location_assignments` and `polling_units` exist in the tenant DB, so the picker and the dashboard's assigned PUs are blocked on routes only.
7. **Media upload is absent** even though `incident_media.file_path` expects server-side storage; confirm multipart vs presigned, size caps, and the accepted types.
8. **Pagination is path-based** (`/details/page/1`, `perPage` 100) rather than `?page=&limit=`, and `election-cycle` returns `{ total, data }` while every other list returns `{ total, pageNo, perPage, payload }`. One envelope for all lists would remove a special case in the client.
9. **Detail endpoints return an array of one** (`/candidate/detail/17` → `[{...}]`). Please return an object, or document it so clients stop guessing.
10. **401 is overloaded** with `not found`, `not an admin` and `not associated with tenant`, so the client cannot tell "re-authenticate" from "this record does not exist". Distinct status codes (404/403) or an error code field would fix it.
11. **`GET /auth/login` response leaks infrastructure**: `userInfo.tenant` includes `db_host`, `db_name`, `db_username`. Those must not cross the API boundary.
12. **Unknown identity returns a PHP stack trace** with absolute server paths (`/home/iaqutmao/api.iaquila.com.ng/class/Session.php(96)`). Bad credentials should be a flat 401.
