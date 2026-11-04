# Task: Gold-Standard Mobile App UI/UX Redesign & Specification Alignment

## Overview
- Deliver a comprehensive, state-of-the-art 2026/2027 Expo React Native mobile UI/UX redesign.
- Eliminate generic layouts, double paddings, margins, and nested scroll issues.
- Align all domain features with the audio specification (Parts 1-9) & PRD:
  1. Multi-tenancy Organization in Authentication
  2. Candidate Entity vs. Party Modeling & History
  3. AI Projection Engine (0: 2023, 1: 2019, 2: Combined) + Disclaimer
  4. Live Election Pulse Simulation (15-30s periodic polling)
  5. Drafts vs. Published Results Workflow (Live badge, submit, publish)
  6. Field Agent 3 Assigned Polling Units Demo
  7. Strict Live Media Capture (No gallery, covert flash/sound defaults, 2-min auto-save)
  8. Incident Triage Workflow (Reviewing / Resolved) + Category Filters
  9. Electoral Location Hierarchy Autocomplete (Qualified by parent state)
  10. Full Candidate Collation & Detail Results View

## Progress Checklist
- [x] 1. Clean working state based on `9e64bf9` and preserve brand assets
- [x] 2. Audit and enhance Theme & Tokens (`constants/colors.ts`, `constants/tokens.ts`)
- [x] 3. Audit and enhance Data Models & Stores (`features/auth/store.tsx`, `features/elections/service.ts`, `features/elections/hooks.ts`)
- [x] 4. Redesign Auth Screen with Multi-Tenancy (`app/(auth)/login.tsx`)
- [x] 5. Redesign Dashboard (`app/(app)/(tabs)/index.tsx`) with Live Pulse, AI Projection, Drafts alert, Assigned PUs, and Candidate Snapshot
- [x] 6. Redesign Results Screen & Workflows (`results.tsx`, `result-drafts.tsx`, `result-detail.tsx`, `result-submit.tsx`, `result-collation.tsx`)
- [x] 7. Redesign Incident Screen & Live Capture (`incidents.tsx`, `incident-report.tsx`, `incident-search.tsx`)
- [x] 8. Redesign Locations & Picker (`locations.tsx`, `pu-picker.tsx`)
- [x] 9. Polish Parties, Elections, Profile (`parties.tsx`, `elections.tsx`, `election-detail.tsx`, `profile.tsx`)
- [x] 10. Audit double margins/paddings, nested virtualized lists, run `npx tsc --noEmit` and verify invariants.

## Verification Status
- Staff Invariant Audit: INVARIANTS VERIFIED
- `npx tsc --noEmit`: Exited with code 0 (clean, 0 errors).
- Double padding/margin: Eliminated across all `Card` instances, `ScreenView` padding, and outer container styling.
- Virtualized list nesting: Eliminated across all `FlashList` instances by converting parents to `ScreenView scrollable={false} noScrollPadding`.
- Audio specification alignment: Fully integrated across parts 1–9.
- Feedback Corrections (Safe Area, Roles, Gestures, Flash, Audio Crash):
  * Dynamic Island & Tab Bar Safe Area: Fixed in `ScreenView.tsx` to apply `insets.top` on tabs/auth screens and `insets.top + 44` on non-scrollable push screens on iOS, preventing UI from sliding under the Dynamic Island. Added `paddingBottom: 110` to FlashLists and scrollable tab views to prevent items clipping behind the bottom tab bar.
  * Agent Titles & Roles: Strictly aligned with `Aquila PRD.pdf` (Page 12-14) — `Field Agent`, `Polling Unit Agent`, and `Election Officer`. Differentiated dashboard and submission behavior per role (PU Agent restricted to sole PU; Election Officer given supervisory view-only overview).
  * Slide-back Prevention: Set `gestureEnabled: false` on root Stack, `(auth)`, `(app)`, and `(tabs)`.
  * Theme Synchronization & SystemUI: Removed static `SystemUI.setBackgroundColorAsync` to eliminate native window decor interference on push/deep-nested screens. All screens use dynamic `useStatusBar({ barStyle: scheme === 'dark' ? 'light' : 'dark' })`.
  * Incident Report Audio Crash: Fixed `ExpoModulesCore` Swift `NotFoundException` in `incident-report.tsx` by replacing direct `recorderRef.current.isRecording` getter calls with `isRecordingRef` JavaScript boolean synchronization.
  * List Architecture (FlashList -> Built-in FlatList): Fully transitioned from `@shopify/flash-list` to React Native's built-in `FlatList` across `results`, `incidents`, `pu-picker`, `parties`, `election-detail`, and search screens. Solved the screen detach offset reset bug and scroll repositioning on `goBack()`.
  * Native Header & Inset Alignment: Push screens use clean native Stack headers (`headerTransparent: true` on iOS with zero blur effect; native toolbar matching `colors.background` on Android). Duplicate in-screen headings removed from `incident-report` and `pu-picker`.
  * Elections Tab Filter Pills: Replaced oversized `<Button>` elements with sleek, compact horizontal filter chips (`cycleChip`).
  * Android Layout & Elevation Audit (Root Cause Analysis & Fixes):
    - Button Flex Constraints (`Button.tsx`): Resolved multi-button row overflows (Role Simulator & Login demo buttons). Injected `minWidth: 0` and `flexShrink: 1` onto `containerFlexStyle`, `Animated.View`, and `styles.button`. Scaled `sm` font size dynamically when `label.length > 13` and reduced horizontal padding to 6dp to ensure labels like "Election Officer" fit cleanly without truncating or pushing out of cards.
    - Android Elevation on Translucent Surfaces: Fixed muddy/black shadow box artifacts on Android by removing `elevation` from translucent containers (`consoleHeader` in `index.tsx`, `logoBadge` in `login.tsx`) via `Platform.select({ ios: shadows.*, android: { elevation: 0 } })`.
    - Horizontal Row Flex Clamping: Audited all screens (`results.tsx`, `result-detail.tsx`, `result-collation.tsx`, `result-search.tsx`, `parties.tsx`, `locations.tsx`, `elections.tsx`, `incidents.tsx`). Injected `minWidth: 0`, `paddingRight: spacing.xs`, and `numberOfLines={1}` on flex text parents, and pinned badges/indicators with `flexShrink: 0` to prevent margin indicators (+14.8%), status chips, and candidate names from breaking past container boundaries.
    - 2-Line Natural Wrapping Upgrade: Replaced single-line blind truncation (`numberOfLines={1}`) with 2-line natural wrapping (`numberOfLines={2}`) across polling unit names, candidate standings, election positions, and location searches (`result-collation.tsx`, `result-detail.tsx`, `results.tsx`, `elections.tsx`, `index.tsx`, `result-search.tsx`) so long names and civic identifiers are fully readable across compact Android viewports without ellipses.
  * Results Heatmap Redesign & LGA Map Viewport Fix (`results.tsx`):
    - Streamlined view switchers into a single unified tactical control bar (`States` / `LGAs` and `Lead` / `Heat`).
    - Embedded live collation telemetry and a slim progress bar directly into the map card header, eliminating redundant banner cards.
    - Integrated selected territory inspection HUD directly into the map card footer with one-tap drilldowns.
    - Scoped LGA SVG map viewport by state with an interactive state selector chip bar (`Lagos`, `Kano`, `Rivers`, `FCT`, `Kaduna`, `Oyo`, `Enugu`, `Borno`), preventing multi-state polygon and text collisions.
    - Added high-contrast dark badge plates (`<Rect>`) behind all SVG text labels for crisp legibility over colored polygons.
    - Compacted collation breakdown items into sleek leaderboard rows with inline party filter chips.
  * Handwritten Notes Specification Alignment (Pages 1-4):
    - Auth & Organization (`login.tsx`, `profile.tsx`): Replaced all "Tenant" terminology with "Organization". Removed "+ Custom Organization" field. Shifted organization search directly into the main input with real-time suggestion dropdown. Removed category pills (HQ/CSO/POLITICAL PARTY), showing pure organization names. Renamed card title to "Sign In", button label to "Access Situation Room", and footer slogan to "Independent Observer Intelligence System · Secured & Real-time".
    - Political Party & Candidate Masking (`service.ts`, `results.tsx`, `index.tsx`, `parties.tsx`, `election-detail.tsx`, `elections.tsx`, `result-collation.tsx`, `result-detail.tsx`): Masked real political figures with generic names (Bawa Nassiru, Farouk Haruna, Nassiru Bawa, Ibrahim Shehu). Masked real party acronyms with generic party codes (CPA, DPP, PL, PPNF, ADP).
    - Map & Role Views (`results.tsx`, `index.tsx`): Updated SVG map border label to "NIGERIA REPUBLIC". Removed Heat Map view completely for Field Agents (`isFieldAgent`). Restricted Polling Unit Agents (`isPollingAgent`) from candidate snapshot standings and AI simulation models to focus purely on assigned PU ballot recording.
    - Election Officer & Audit Nomenclature (`index.tsx`, `result-submit.tsx`, `result-collation.tsx`, `pu-picker.tsx`): Removed redundant "LIVE PULSE" and "STATUS: ACTIVE" badges from Election Officer header. Rebranded "Certified" to "Uploaded by observer" and "Certified from EC8A" to "Uploaded Record".
  * Gold-Standard Viewport & Typography Parity (Apple HIG & Material 3):
    - Enabled Dynamic Font Autoscaling in `ThemedText.tsx`: Added `adjustsFontSizeToFit` and `minimumFontScale` props. Single-line badges, buttons, and metrics (`numberOfLines === 1`) automatically downscale font size (down to 0.8x / 0.75x) to fit compact viewports (360dp Android to 430pt iOS) smoothly without truncating into ellipses (`"..."`).
    - Enhanced `Button.tsx`: Added `adjustsFontSizeToFit` and `minimumFontScale={0.75}` on button labels, removing hard tail-ellipsizing.
    - Removed Artificial Line Clamping on Content: Stripped arbitrary `numberOfLines={1}` and `numberOfLines={2}` clamps across candidate names, polling unit titles, election positions, LGA/state list items, and descriptions in `results.tsx`, `result-collation.tsx`, `result-detail.tsx`, `result-search.tsx`, `elections.tsx`, `index.tsx`, `VoteShareBar.tsx`, `parties.tsx`, `locations.tsx`, and `incident-detail.tsx`, allowing full natural multi-line wrapping with zero `"..."` truncation across all mobile display sizes.
  * Large Text Scale & Container Overflow Safeguards (Dynamic Type & Display Zoom):
    - Resolved button container escapes in Assigned Polling Units (`app/(app)/(tabs)/index.tsx`): Wrapped vote tally text in `<View style={{ flex: 1, minWidth: 140, paddingRight: spacing.xs }}>`, pinned `puActionBtn` with `flexShrink: 0`, and added `gap: spacing.xs, flexWrap: 'wrap'` to `puBottomRow` and `puTopRow`. Added `overflow: 'hidden'` to `puCard`.
    - Audited & fortified action rows across screens: Added `overflow: 'hidden'`, `flexWrap: 'wrap'`, and `gap: spacing.xs` across `sectionHeaderRow`, `candHeader`, `consoleTopRow` (`index.tsx`), `topControlBar` (`results.tsx`), `puLogItem` (`result-collation.tsx`), `lgaItem` (`locations.tsx`), `historyRow` (`parties.tsx`), and `Button.tsx` (`styles.button` with `overflow: 'hidden'`).
  * Shared Component Alignment (`Button`, `Card`, `Input`, `Badge`):
    - Created and exported shared `<Badge>` component (`core/components/Badge.tsx`): Unified repeated status badges and party pills across `index.tsx`, `elections.tsx`, `result-collation.tsx`, `result-detail.tsx`, and `incident-detail.tsx` with responsive text autoscaling, semantic palettes, and uniform padding.
    - Standardized `<Input>` adoption: Converted hand-rolled search and directive inputs in `elections.tsx`, `index.tsx`, and `incident-detail.tsx` to `<Input>`.
    - Fortified `<Card>` adoption: Standardized `puCard` in `index.tsx` to `<Card pressable>`.
    - Dynamic Polling Unit Simulation & Instant Search Autocomplete:
      - Added realistic prominent polling units (Alausa Secretariat, Ikeja High School, Allen Avenue, Garki Area 1, Sabon Gari Kano, Victoria Island) and LGAs to `service.ts`.
      - Enabled instant suggestions on focus/tap without requiring 2+ characters, with an isolated active scope banner so the input text is never polluted with long qualification strings.
      - Made the "Tie to Specific Polling Unit" demo dynamic: selecting any PU or LGA calculates localized turnout variance (+6% to +14%), precinct margins (+180 to +260 votes), and neural precinct telemetry insights.
  * SSOT Architecture & Gold-Standard Mobile Parity:
    - Extracted Political Parties SSOT (`constants/parties.ts`): Unified `PARTY_COLORS` and `MAJOR_PARTIES` across `index.tsx`, `results.tsx`, `result-collation.tsx`, `parties.tsx`, `elections.tsx`, and `election-detail.tsx`, eliminating color drift and duplicated inline dictionaries.
    - Extracted Incident Classifications SSOT (`constants/incidents.ts`): Unified `SEVERITY_COLORS`, `INCIDENT_CATEGORIES`, and `INCIDENT_SEVERITIES` across `incidents.tsx`, `incident-detail.tsx`, and `incident-report.tsx`.
    - Extracted ICU Number & Percentage Formatters (`core/utils/formatters.ts`): Added `formatVotes`, `formatPercent`, and `formatRatio`.
    - Gold-Standard Field Incident Marquee Ticker (`core/components/IncidentMarquee.tsx`):
      - Eliminated initial blank-delay bug: Starts immediately at position 0 so incident items are visible and readable on mount.
      - Implemented true infinite seamless looping: Uses dual cloned sequence tracking so the animation loops back imperceptibly with zero jerky jumps and zero empty blank gaps.
      - Fixed Loop 2 Text Overlap & Compression Trap:
        * Decoupled `tickerRow` with `position: 'absolute', left: 0, top: 0, bottom: 0` so it is never compressed by `track`'s flexbox parent constraints.
        * Injected `flexShrink: 0` onto `sequenceGroup` and all pill containers so Yoga never clamps the sequence width to the screen boundary (~310px).
        * Enforced `numberOfLines={1}` and `flexShrink: 0` across all `<ThemedText>` children inside pills, eliminating multi-line vertical wrapping and collisions.
        * Stabilized animation loop with `isMountedRef` lifecycle safety and unconstrained sequence layout measurement.
      - Added Touch-and-Hold Pause: Touching down pauses the ticker stream so users can read or tap without items sliding out from under their fingers.
      - Added System Reduce Motion Support: Respects `AccessibilityInfo.isReduceMotionEnabled()`, falling back to an accessible non-auto-scrolling feed.
    - Standardized `result-collation.tsx` and `result-detail.tsx`:
      - Converted `puLogItem` to `<Card pressable>`.
      - Converted `verifiedPill`, `statusPill`, and `matchPill` to `<Badge>`.
      - Removed unused `DebouncedPressable` import.
  * Container Containment & Card De-Nesting Restructure (Apple HIG & Material 3):
    - Eliminated Nested Card Anti-Pattern (Zero nested Cards in the entire app):
      * `index.tsx`: Replaced outer `Card` wrapping Assigned Polling Units with clean unboxed `sectionContainer`, giving PU cards the full viewport width and removing 32dp of double card padding.
      * `result-collation.tsx`: Replaced outer `Card` wrapping Recent Polling Unit Returns with `sectionContainer` and standalone cards.
      * `profile.tsx`: Replaced nested `Card` items inside Operational Modules and Legal & Compliance with standard iOS Grouped List rows (`DebouncedPressable` + `moduleRow` with subtle dividers).
    - Enforced Structural Containment in Core Components:
      * `Card.tsx`: Injected `overflow: 'hidden'` onto `styles.card`, `AnimatedCard`, and the content container, guaranteeing children can never bleed past card boundaries or rounded corners.
      * `Button.tsx`: Added `maxWidth: '100%'` onto `DebouncedPressable` to guarantee buttons never exceed parent container widths.
    - Standardized SectionHeader Architecture:
      * Upgraded `core/components/SectionHeader.tsx` to support `subtitle`, `action`, `indicatorColor`, `showIndicator`, and custom `style` with fluid flex constraints (`minWidth: 0, flexShrink: 1`).
      * Adopted `<SectionHeader>` in `index.tsx` (Assigned Polling Units & Candidate Snapshot) and `result-collation.tsx` (Recent Polling Unit Returns).
    - 100% ThemedText Compliance:
      * Replaced the last remaining raw React Native `<Text>` element in `core/components/ToastProvider.tsx` with `<ThemedText variant="body">`, achieving 100% code-wide adherence to the text token SSOT rule.
    - Semantic Theme Consistency in Polling Unit Cards:
      * Replaced hardcoded `borderTopColor: rgba(0,0,0,0.05)` in `puBottomRow` with semantic `colors.borderSubtle` across light and dark modes.
  * Android Layout & Typography Rectification (Exhaustive Pass):
    - Root Cause 1 (Yoga Zero-Basis Collapse): Blanket `flexWrap: 'wrap'` on rows with `flex: 1, minWidth: 0` children caused Yoga on Android to assign 0% basis to flex items, crushing text horizontally into vertical 1-character word-broken columns. Systematically audited and eliminated `flexWrap: 'wrap'` across ALL metadata, header, and action rows:
      * `parties.tsx`: `historyRow`
      * `locations.tsx`: `lgaItem`
      * `result-collation.tsx`: `puLogItem`
      * `SectionHeader.tsx`: `container`
      * `election-detail.tsx`: `candRow`
      * `result-detail.tsx`: `heroTopRow`, `candHeader`
      * `result-submit.tsx`: candidate section header, `bottomActions`
      * `incident-detail.tsx`: `bottomActions` / `caseStatusActions`
      * `(tabs)/index.tsx`: `consoleTopRow`, `sectionHeaderRow`, `candHeader`, `puTopRow`, `puBottomRow`
      * `(tabs)/incidents.tsx`: `cardHeader`, `cardActionsRow`
      * `(tabs)/elections.tsx`: `cardFooter`, competing party badge row
      * `(tabs)/results.tsx`: `topControlBar`, Row 2 candidate summary
    - Root Cause 2 (Microscopic Text from Implicit Auto-Scaling): `ThemedText.tsx` was implicitly enabling `adjustsFontSizeToFit={true}` for all `numberOfLines === 1` text and defaulting `ellipsizeMode='clip'`. On Android, `adjustsFontSizeToFit` with fixed/computed `lineHeight` or within animated/measured containers aggressively shrivels text to microscopic scale. Reverted `adjustsFontSizeToFit` default to `false` (explicit opt-in only) and restored standard `ellipsizeMode='tail'`.
    - Root Cause 3 (Android Word-Breaking & Forced Uppercase): Injected `textBreakStrategy="simple"` across `ThemedText.tsx` to prevent Android's default `highQuality` hyphenation algorithm from splitting words across line breaks (`obse / rver`). Removed automatic `uppercase` conversion on `variant="label"` so labels no longer inflate character widths unless explicitly requested via `uppercase={true}`.
    - Root Cause 4 (Status Chip Width Blowout & Subtitle Squishing): `results.tsx` had an inflated 20-character badge label (`'UPLOADED BY OBSERVER'`) with `flexShrink: 0` in `itemHeader`, starving the left column of space. Compacted badge to clean status (`'PUBLISHED'`), added `gap` and `numberOfLines={1}` safeguards across `leadStrip` and `itemFooter`.
    - Root Cause 6 (Button Text Disappearance on Android): `Button.tsx` had `adjustsFontSizeToFit` combined with fixed `lineHeight: 16`. In React Native Android, `adjustsFontSizeToFit` inside flex/minHeight containers triggers a native font measurement glitch that collapses font size to 0, rendering buttons completely blank (as seen in `PU Agent` primary button). Removed `adjustsFontSizeToFit` from `Button.tsx`.
    - Root Cause 7 (Historical Tracker Vote Truncation): In `parties.tsx`, cramming the 40-character vote string and 25-character election name into a single horizontal row with `numberOfLines={1}` forced the vote count to truncate to `"8..."`. Restructured into an institutional 2-tier timeline row (Badge + Election Name on Line 1; bold vote tally + percentage on Line 2).
    - Heat Map Synchronization with aquilaweb & Tactical Modal Parity:
      * Full 37-State National Federation Map: Integrated authentic WGS84 Spherical Mercator state geometries (`NIGERIA_STATE_GEOMETRIES`), territorial boundary styling, and Niger & Benue river paths (`NIGERIA_RIVERS`) matching `aquilaweb`'s `NigeriaHeatMap.tsx`.
      * Telemetry Status Strip: Embedded live `#34D399` canvas telemetry bar with `37 HUBS` / `{STATE} LGAS`, pulsating live dot, `Lead Party` / `Progress` choropleth mode indicator, and unclipped `WGS84` badge.
      * Interactive Collation Inspection Modal: Built `<Modal>` bottom sheet in `results.tsx` matching `aquilaweb`'s `inspectModalUnit`:
        - Administrative unit name, state code, zone, and dismiss button.
        - Collation progress track with "Verified Returns" indicator and PU tallies.
        - Projected leader callout with margin of lead and party pill.
        - Candidate & party distribution progress bars for CPA, DPP, PL, PPNF.
        - Direct action button: "Explore [State] LGAs" / "Audit Polling Units".
      * Scoped LGA Quick Selection: Horizontal scrolling LGA chip bar with localized leading party standings, updating both the interactive SVG canvas and telemetry.
      * Role-Gated AI Projections: Gated AI Projection Engine on Dashboard (`index.tsx`) to `ELECTION_OFFICER`, completely hidden for `FIELD_AGENT` and `POLLING_AGENT`.
      * Live Waydroid ADB Verification: Tested and screencapped every state on Waydroid (`192.168.240.112:5555`) — confirmed zero clipping, clean typography, responsive layout, and smooth inspection modal workflow.
    - Invariants: Verified complete clean build with `npx tsc --noEmit`.
  * Typography Architecture (System Platform Fonts SSOT & Inter Feature Flag):
    - 2026/2027 Mobile App Standards: Configured native platform system fonts (San Francisco on iOS, Roboto on Android) as ground-truth default, eliminating Flash of Unstyled Text (FOUT), cold-start Splash Screen font resolution delays, and multi-megabyte TTF asset overhead while providing automatic OS Dynamic Type & optical accessibility scaling.
    - Feature Flag Isolation: Added `FEATURES.ENABLE_CUSTOM_FONTS: false` in `constants/features.ts`.
    - Surgical Font Style Resolver: Created `getFontStyle(weight)` in `constants/fonts.ts`. When disabled, applies `Platform.select({ ios: 'System', default: 'sans-serif' })` alongside native `fontWeight: '400' | '500' | '700'`. When enabled, resolves custom Inter postscript names (`Inter-Regular`, `Inter-Medium`, `Inter-Bold`) with `fontWeight: undefined` to avoid Android faux bolding artifacts.
    - Zero-Delay Splash Screen: Root layout `app/_layout.tsx` gates `useFonts` behind `FEATURES.ENABLE_CUSTOM_FONTS ? fontMap : {}`, skipping custom font loading on launch when using system fonts.
    - Component Adoption: Centralized in `core/components/ThemedText.tsx`.



  * Field & Polling Unit Agent Dashboard Separation (pre-presentation pass):
    - Situation Room Identity Removed From Agent Header: `index.tsx` first card now renders the agent's own role as its identity line (`Field Agent` / `Polling Unit Agent`) via the new SSOT `ROLE_LABELS` (`constants/roles.ts`). `ELECTION_OFFICER` keeps the organization name. `profile.tsx` now consumes the same constant instead of a local duplicate map.
    - Reporting PU / Votes Tallied Ticker: The second row of the first card (`REPORTING PUS` / `TOTAL VOTES TALLIED` / `STATUS`) is now rendered for `ELECTION_OFFICER` only. Its dead `STATUS: ACTIVE` branch (only ever shown to non-officers) was deleted.
    - Live Value Simulation Disabled For Agents: The 12s `pulseBonusVotes` / `livePulsePUs` interval now early-returns unless the viewer is an Election Officer, so agent dashboards no longer drift on their own. The animated `LIVE PULSE` badge was removed (it was officer-hidden and would have advertised live data on a now-static screen). `Animated`/`useRef` imports and `pulseBadge`/`pulseDot` styles dropped.
    - Snapshot Performance: Removed the header `Leading` trophy badge (duplicated by the per-row `LEADING` pill and `#1` rank tag). Subtitle drops the word "Live" for agents since their tally is static.
    - Quick Actions: `Collation Room` and `Locations` cards are gated to `ELECTION_OFFICER`; agents keep only `Enter Results` + `Report Incident`.
    - Assigned Polling Units Status Badge: Removed the ambiguous `PENDING` badge for units with no return. Only `PUBLISHED` / `DRAFT` badges render; the caption now reads "No ballot return submitted yet". Demo set still carries 3 PUs (Published / Draft / Unreported).
    - Polling Unit Agent Station Lock: `result-submit.tsx` resolves the agent's station from `assignedLocations[0]` against `ASSIGNED_DEMO_PUS` and derives `effectivePuId`, which now drives validation and both save/publish payloads. `Change` is hidden for `POLLING_AGENT`, the transient picker result is consumed but ignored for that role, and the PU code renders the real unit code instead of a raw id or hardcoded fallback.
    - Invariants: `npx tsc --noEmit` clean, `npx eslint .` clean (zero warnings), `npx expo export --platform android` bundles successfully.
  * Dashboard Copy & Situation Room Toggle Scaffolding:
    - Header Rename: Dashboard hero changed from `Presidential Collation` to `Presidential Election`. Other "Collation Room" surfaces left intact (domain term, not a typo).
    - `FEATURES.ENABLE_INEC_OBSERVED_TOGGLE` (default `false`): Officer-only segmented control in Snapshot Performance switching aggregation between `candidateVotes` (our returns) and `candidateVotesInec` (INEC declared). Verified live on Waydroid with the flag on, then restored to `false` for the demo.
    - Pulse Isolation Hardening: `candidateScores` now applies `pulseBonusVotes` only when `isElectionOfficer`, so switching officer → agent mid-session no longer leaves inherited live increments frozen on the agent dashboard.
    - Demo Safety: `useDeviceLocation` fallback path downgraded `console.warn` → `console.log`; the yellow LogBox banner was covering UI on Waydroid where GPS is unavailable.
    - Runtime Verified on Waydroid (`192.168.240.112:5555`): Field Agent, Polling Unit Agent, and Election Officer dashboards + the locked submit screen all screencapped clean.
  * Ballot Accounting: Observed vs INEC (result entry):
    - `ResultSubmission` gained `accreditedVotersInec`, `cancelledVotes`, `cancelledVotesInec` (optional, so seeded/legacy returns stay valid).
    - `result-submit.tsx` accreditation card rebuilt as a paired ledger: Accredited / Rejected / Cancelled each entered twice under `OBSERVED` and `INEC RECORD` column headers. Long "(Observed)/(INEC)" suffixes dropped because they wrapped and knocked the input boxes out of alignment.
    - Valid votes are now derived (`Σ candidate observed` / `Σ candidate INEC`) instead of being a loose typed number, and total ballots cast is derived as valid + rejected. A read-only DERIVED panel shows Valid, Total cast, and "Accredited, no ballot cast" (accredited − valid − rejected − cancelled). This is the arithmetic the recording flagged: 100 accredited, 81 valid, 5 rejected → 86 cast, 14 never voted.
    - Integrity banner now distinguishes over-voting (cast > accredited) from an accreditation mismatch (valid + rejected + cancelled > accredited) and otherwise prints the cast/valid/rejected/cancelled breakdown.
    - `Match INEC` now mirrors accredited and cancelled as well as rejected and per-candidate counts.
    - PU code resolves from `ASSIGNED_DEMO_PUS` for every role, not just polling agents (was falling back to the raw id `pu-s25-lga-1-1`).
    - `result-detail.tsx`: rejected row shows observed · INEC, and a cancelled row renders when the return carries cancellation data.
    - Invariants: `npx tsc --noEmit` + `npx eslint .` clean; verified live on Waydroid by entering 100/5/81 and confirming 86 cast / 14 unaccounted.
  * INEC Field Provenance Flag:
    - Added `FEATURES.ENABLE_INEC_MANUAL_ENTRY` (default `true`). While true the agent types INEC figures (no feed exists yet). Flipping to `false` locks every INEC input — accredited, rejected, cancelled and per-candidate — and hides `Match INEC`, so the column can only be populated from the uploaded INEC record.
    - `core/components/Input.tsx` gained a `readOnly` prop: `editable: false`, muted background/text, and a lock glyph. Reusable across any future system-populated field.
    - Rationale: an audit comparison is worthless if one agent types both sides.
    - Verified both states on Waydroid (locked inputs + hidden Match button, then restored to editable).
  * INEC Column Sourcing (record-backed, not zeros):
    - `result-submit.tsx` now looks up the published record for the active polling unit (`useResultsQuery` → match on `pollingUnitId`). When `ENABLE_INEC_MANUAL_ENTRY` is `false`, the whole INEC side — accredited, rejected, cancelled and every candidate — is read from that record instead of the agent's keystrokes, and those sourced figures flow into the derived totals and the saved payload.
    - Card shows provenance: "INEC column sourced from the uploaded record for this unit", or "Awaiting INEC upload for this unit" when no record exists. Untouched cells stay blank rather than reading as 0-vs-N discrepancies.
    - Verified on Waydroid against seeded record `r1` (Alausa): accredited 600, rejected 10, candidates 230/190/100/44 → derived INEC valid 564, cast 574, all locked.
  * Live Feed: Incidents + Incoming Returns (Situation Room parity):
    - `IncidentMarquee.tsx` generalized to a typed stream: new `MarqueeItem` (`kind: 'incident' | 'result'`), `LiveStreamMarquee`, and `LiveStreamMarqueeScrollable`. Animation contract unchanged (40pt/s, duplicated seamless track, press-to-pause, reduce-motion fallback, 8-item cap). `IncidentMarquee` remains as a thin incidents-only wrapper, so agent dashboards are untouched.
    - Dashboard feed is now role-aware: `ELECTION_OFFICER` gets `Live Situation Feed` with incidents and published returns merged and sorted by recency (incident → red pill, return → green pill, tap routes to the matching detail screen). Field/Polling Unit Agents keep the incidents-only `Field Incident Stream`, since the national returns feed isn't theirs.
    - Verified: `npx tsc --noEmit` + `npx eslint . --max-warnings 0` clean, `npx expo export --platform android` bundles.
  * Result Sheet OCR Capture (flagged, native):
    - Added `expo-text-extractor` ^2.0.0 (on-device ML Kit on Android, Apple Vision on iOS). Resolved lazily via `loadSheetOcr()` so Expo Go / pre-rebuild binaries fall through to manual entry instead of crashing.
    - New `features/elections/sheetScan.ts`: `loadSheetOcr()` + `parseResultSheet(lines, candidates)` — word-boundary candidate matching on acronym/short name/surname, rightmost-figure extraction for ACCREDITED / REJECTED / CANCELLED. Validated with a tsx harness against a synthetic EC8A (accredited 100, rejected 5, candidates 81/4/0/0 → PASS).
    - `result-submit.tsx`: "Scan Result Sheet" card with Camera and Choose Photo. Extracted figures fill the observed column only, and an alert forces review before publishing (never auto-publishes).
    - Provenance: `ResultSubmission.sheetCaptureSource` (`LIVE_CAMERA` | `LIBRARY`) persisted on save/publish and surfaced in `result-detail` as "Live camera" or "Imported image (flagged)".
    - Flags: `ENABLE_RESULT_SHEET_SCAN` (default `false`, hides the whole card) and `ENABLE_SHEET_LIBRARY_IMPORT` (default `true`, removes the import path without a refactor).
    - Verified: `tsc` + `eslint --max-warnings 0` clean, Android bundle exports.
  * Native Document Scanner + PDF Import (same build as OCR):
    - Added `react-native-document-scanner-plugin` ^2.0.4 — VisionKit on iOS, ML Kit Document Scanner on Android. It ships `app.plugin.js`, so `expo install` registered it in `app.json` plugins; no permission changes needed (iOS camera copy already present, Android scanner needs none).
    - `sheetScan.ts`: `scanDocumentPages()` (lazy import, edge-detected/de-skewed page URIs), `rasterisePdf()` (react-native-pdf-thumbnail `generateAllPages`, quality 90 / maxWidth 2400 ≈ OCR-legible), `extractTextFromPages()` (sequential per-page OCR so memory stays bounded on cheap devices).
    - `result-submit.tsx`: "Scan with camera" now runs the native scanner instead of a plain photo; "Photo" (library import) and "PDF" (document picker → rasterise → OCR) sit beneath it, both gated by `ENABLE_SHEET_LIBRARY_IMPORT`. Everything still behind `ENABLE_RESULT_SHEET_SCAN`.
    - Refactor: `applyParsedSheet()` is the single write path, so camera / photo / PDF all converge on the same review-first behaviour.
    - Verified: `tsc` + `eslint --max-warnings 0` clean, `expo config --type introspect` shows the plugin applied with unchanged permissions, Android bundle exports.
  * Sheet Scan Hardening (audit pass):
    - `scanDocumentPages()` now returns `ok | cancelled | unavailable`. The native scanner *resolves* with `status: 'cancel'` when the user backs out, so treating an empty array as failure was reporting "Scanner unavailable" for a plain cancel.
    - `rasterisePdf()` now distinguishes module-missing (`unavailable`) from render failure (`failed`), so the PDF path can say "needs a build" instead of "unreadable".
    - Photo-library permission + `launchImageLibraryAsync` and `DocumentPicker.getDocumentAsync` are now inside try/catch. They ran outside it, and an event-handler rejection is not caught by the ErrorBoundary.
    - Existing guards confirmed: lazy native imports (Expo Go safe), `isSupported` check, per-page OCR isolation, `applyParsedSheet()` refuses an empty parse, `loading` disables the buttons, and every entry point sits behind `ENABLE_RESULT_SHEET_SCAN` (default off).
  * Real 774-LGA Boundary Geometry (`constants/nigeriaLgaGeometries.ts`):
    - Replaced the 21 hand-drawn `LGA_MAP_POLYGONS` and the rectangle "district matrix" fallback with authentic boundaries for all 774 LGAs. The grid stays only as a fallback if a state's geometry fails to resolve.
    - `scripts/build-lga-geometry.cjs` (`npm run build:lga`): downloads geoBoundaries `gbOpen NGA ADM1/ADM2` (upstream GRID3, CC BY 4.0), spatial-joins ADM2 to states by interior point, name-matches to `NIGERIA_OFFICIAL_LGAS`, projects Web Mercator, fits each state into a 680x460 viewBox, and emits simplified SVG paths with an `area` for label LOD. Deterministic; fails loudly on any unmatched LGA.
    - Source data fix: full-resolution ADM2 is used and simplified locally — the pre-simplified variant carries topology gaps. Also emits `NIGERIA_LGA_STATE_OUTLINES` (ADM1 base) drawn beneath the LGAs so source enclave/hole mismatches fill with territory colour instead of the canvas background.
    - Canonical list corrections in `nigeriaLgasData.ts`: added missing `Zurmi` (774 total) and fixed truncated/misspelled names across Delta, Kogi, Niger, Jigawa, Ogun, Rivers, Imo, Kebbi, Cross River, Abia, Enugu, Ondo, Osun, Ebonyi, Edo, Sokoto, Yobe, Katsina, Kano, Benue, Adamawa, Bauchi, Lagos, Nasarawa, Ekiti, Gombe.
    - `results.tsx`: LGA layer renders real polygons (nonzero fill, per-state viewBox), selection resets when the state changes, and labels use area/zoom level-of-detail so dense states stay readable.
    - Verified: `tsc` + `eslint --max-warnings 0` clean, `expo export --platform android` bundles; standalone harness confirmed 774/774 geometry entries, every label point inside its polygon, all coordinates in-viewBox, and 37 state outlines. No ADB device was attached for on-device verification.
  * Results Map Pan / Pinch / Clamp / Reset (parity with aquilaweb `3e565df`):
    - Replaced the `zoomLevel` + `mapFocusPoint` camera with a single `viewBoxOverride` rectangle. Zoom buttons, drag and pinch all mutate the same box, so clamping lives in one function (`clampViewBox`) and the aspect ratio is preserved on both map scopes.
    - Drag-to-pan: `PanResponder` claims after a 6px move; pinch: claims immediately on the second touch, scales around the gesture midpoint, and re-anchors so the focal point stays under the fingers.
    - Bounds clamping: width is limited to `[base/8, base]`; `x`/`y` are clamped so the camera can never leave the map canvas. Zoom controls disable at both limits.
    - Tap suppression: any pan/pinch stamps `lastGestureAt`; LGA, state and grid-fallback `onPress` handlers ignore taps within 300ms, so a drag never selects a unit.
    - Auto-reset: the camera clears whenever `geoLevel` or the active state changes, so drilling into a state always starts unzoomed; the Reset control clears it manually.
    - Scroll handoff: the collation `FlatList` sets `scrollEnabled={!mapTouching}` while a finger is on the map, because the map lives in its header and would otherwise lose vertical drags to the list. Zoom HUD touches are excluded from pan capture via `controlsTouchRef`.
    - Copy fix: leader margins are percentage-point differences, so `+X%` became `+X pts` in the leaderboard row, both map HUDs and the inspect modal.
    - Verified: `tsc` + `eslint --max-warnings 0` clean, Android bundle exports. No ADB device attached, so drag/pinch feel is not yet device-verified.
  * Election Totals & Coverage Parity (rest of aquilaweb `3e565df`):
    - Added national totals SSOT to `constants/elections.ts` (`TOTAL_STATES` 36, `TOTAL_STATES_AND_FCT` 37, `TOTAL_LGAS` 774, `TOTAL_WARDS` 8,809, `TOTAL_POLLING_UNITS` 176,846). `locations.tsx` and the results map copy now read from it; `TOTAL_OFFICIAL_LGAS_COUNT` derives from `TOTAL_LGAS` instead of duplicating 774.
    - Apportioned the synthetic per-LGA unit counts onto the official 176,846 total, preserving each LGA's collated ratio. Rounding overshoot is reclaimed from the largest units, so the 774 totals reconcile exactly (harness: sum 176,846, min 142, max 502, 90.3% collated).
    - Heat mode is now a real coverage ramp: renamed `density` → `coverage`, fill is a min→max sequential ramp across the current scope instead of absolute threshold bands that painted high coverage red. Legend shows the ramp with scope min/max; pill and telemetry copy read "Coverage".
    - Still divergent from web: the map folds published returns by PU-name substring rather than exact `pollingUnitId → state/LGA` lookup; the web's `React.lazy` code-split has no Metro equivalent (`EXPO_NO_METRO_LAZY=1`); RN uses automatic label LOD instead of a "Show labels" toggle.
  * Dashboard Tick Tally Trim:
    - Removed the `REPORTING PUS` stat (and its divider/style) from the station console. The ticker was already gated to `ELECTION_OFFICER`, so agent dashboards are unaffected; `TOTAL VOTES TALLIED` remains.
    - Dropped the now-dead `livePulsePUs` state and its 12s interval increment. `pulseBonusVotes` still drives the officer-only projection/pulse.
  * Sheet Scan Diagnostics + Parser Tolerance:
    - `result-submit.tsx` gains an on-device diagnostic panel under the scan card (flag-gated): prints "OCR OUTPUT · N LINES" with the raw recognised text plus "Candidates expected: CPA, DPP, PL, PPNF". Removes the need for console access when diagnosing on TestFlight.
    - Parser: both candidate rows *and* totals rows now look ahead 1–2 lines when a line carries no figure — ML Kit commonly emits table cells as separate lines ("Accredited Voters" then "100", "CPA" then "81"). Broader label vocabulary (BALLOT PAPERS REJECTED, ANNULLED).
    - Validated with tsx harness against two synthetic OCR shapes (split-cell and single-line): both return accredited 100, rejected 5, cancelled 0, candidates 81/4/0/0, confidence 1.
    - `docs/mock-ec8a-demo-sheet.html`: printable A4 mock EC8A using the app's seeded parties, internally consistent (valid 85, rejected 5, cast 90, accredited 100) for end-to-end pipeline testing.
  * INEC Terminology Alignment (ballot accounting):
    - Row labels now use the EC8A wording: "Accredited Voters", "Rejected Ballot Papers", "Cancelled Votes" (were Accredited / Rejected / Cancelled).
    - Restructured each pair to a full-width row label with two unlabelled inputs beneath it. Long INEC terms previously wrapped inside half-width columns and pushed the observed/INEC inputs out of horizontal alignment (same failure as the earlier "(Observed)/(INEC)" suffixes).
    - Derived block renamed: "Total Valid Votes", "Total Votes Cast", and "Unaccounted (accredited − cast − cancelled)" — the old "Accredited, no ballot cast" asserted a cause the residual can't prove. Added a "Cancelled Votes" derived row for both columns so the residual is auditable.
    - Mock sheet copy aligned ("Rejected Ballot Papers", "Votes Scored") and republished as v2.
    - Verified: parser still returns 100/5/0 + 81/4/0/0 on split-cell input, `tsc` + `eslint --max-warnings 0` clean, Android bundle exports.
  * Cancelled Votes Removed From Agent Entry:
    - A polling unit officer cannot cancel votes (cancellation is a collation-level action), so the Cancelled pair was wrong on `result-submit`. Removed both inputs, the `Match INEC` mirroring, and the scan handler's write-back for that field; the card now states "Cancellations are applied at collation, not at the polling unit."
    - `cancelledVotes` is no longer persisted by agent returns; `cancelledVotesInec` is only written when the sourced INEC record actually carries one. The derived "Cancelled Votes" row renders only when a value exists, so it can't read as a stuck 0.
    - Kept `cancelledVotes` / `cancelledVotesInec` on `ResultSubmission` and the parser's cancelled detection for the collation side.
  * Reconciliation UX + Scan Figure Leak Fix:
    - Root cause of "205 cast exceeds 100 accredited": the parser's next-line fallback accepted any line containing a number, so a shared or neighbouring cell fed figures across rows (205 implies 200 valid + 5 rejected, which the mock sheet cannot produce). Hardened: a fallback figure must come from a numeric-only cell, each cell can be claimed once, and any candidate total exceeding the accredited count is discarded as a misread.
    - Validation wording: "Over-voting" asserted fraud from our own derived sums. Now "Figures don't reconcile: X cast vs Y accredited — check the counts". Publishing still asks for confirmation.
    - `Unaccounted (accredited − cast − cancelled)` renders only when non-zero; it's a reconciliation check, not a required field.
    - Added "Clear figures" (top-right of Ballot Accounting) so a bad scan can be reset in one tap instead of editing six fields.
    - Verified with column-wise and split-cell OCR shapes; `tsc`, `eslint --max-warnings 0`, Android export all clean.
  * Scan Cross-Check (why photo and PDF disagree):
    - `parseResultSheet` now reports `candidateSum`, `printedValidVotes`, `printedVotesCast` and `reconciles` — the sheet's own "Total Valid Votes" is treated as ground truth for the per-candidate mapping.
    - Success alert branches: "Sheet captured" when the candidate sum matches the printed total, otherwise "Check the scan" naming both figures. Diagnostic panel also prints "Candidate sum X · printed valid Y".
    - Cause of photo-vs-PDF divergence: the PDF path rasterises at 2400px from clean vector text, while a screenshot re-encodes to JPEG at lower effective resolution and can carry UI chrome (clock, page indicator) as extra numeric lines. Same parser, materially different line grouping.
  * Scan Source Flags Split:
    - `ENABLE_SHEET_LIBRARY_IMPORT` replaced by two independent flags: `ENABLE_SHEET_PHOTO_IMPORT` (default `false`) and `ENABLE_SHEET_PDF_IMPORT` (default `true`).
    - Rationale: PDF renders from vector text at 2400px and reconciles against the sheet's printed total; a gallery screenshot is re-compressed at lower effective resolution and can include UI chrome, so it is the least reliable and weakest-evidence path. It is now opt-in rather than shipped alongside PDF.
    - Live scanner remains the primary path (paper is the real field workflow); both import paths stay provenance-tagged as `LIBRARY`.
  * Keyboard Dismissal on iOS Form Screens:
    - `ScreenView`'s ScrollView set no `keyboardDismissMode`, so iOS fell back to its `'none'` default and dragging could never dismiss the keyboard. Added a prop with an `'interactive'` (iOS) / `'on-drag'` (Android) default, plus opt-in `automaticallyAdjustKeyboardInsets`.
    - `listPerf` (SSOT spread onto every FlatList) now carries `keyboardDismissMode: 'on-drag'`, so search/list screens dismiss on drag too.
    - Root cause of the "black canvas over the screen while typing" was `KeyboardAvoidingView behavior="padding"`, not iOS secure capture: the padded container consumes the viewport, the `flex: 1` child collapses, and the native header/keyboard stay because they sit outside that subtree. Removed from `result-submit`, `incident-report` and `login` (all now use the ScrollView's native `automaticallyAdjustKeyboardInsets`); no `KeyboardAvoidingView` remains in the app.
    - New `core/components/KeyboardDoneAccessory.tsx` (`KEYBOARD_DONE_ACCESSORY_ID` + `KeyboardDoneAccessory`) mounts an iOS `InputAccessoryView` whose Done button calls `Keyboard.dismiss()`. It is mounted once in `app/_layout.tsx`, and the shared `Input` claims its id only for keyboards that lack a return key (`number-pad`, `decimal-pad`, `phone-pad`, `numeric`) or for `multiline` fields — text keyboards keep the native return key as the sole affordance. Overridable per usage via `inputAccessoryViewID`.
    - Login focus chain: email gets `returnKeyType="next"` + `submitBehavior="submit"` and focuses the password field; password gets `returnKeyType="done"` and submits. Both carry `autoComplete`/`textContentType` (`emailAddress`, `password`) so iOS AutoFill works — set `textContentType="none"` to suppress the Passwords bar if it is noise on demo devices.
    - `app.json` `softwareKeyboardLayoutMode` changed `pan` → `resize`, aligning Android with the 15+ edge-to-edge expectation that the window resizes for the IME. Native config change: ships with the next build, not over the air.
    - Verified: `tsc --noEmit` + `eslint . --max-warnings 0` clean, `expo config` validates, iOS bundle exports. No device attached, so the accessory bar, focus chain and Android resize behaviour still need an on-device pass.

## API Integration (live iAquila backend)
- Source of truth: public documenter collection `https://documenter.getpostman.com/api/collections/6734990/2sBYHXSKAY` (52 endpoints). Imported to Postman workspace `Aquila` / collection `iAquila API` (`137cbba9-e483-42a4-b1e9-c7b372c4d072`), env `Aquila — Live` with `BASE_URL=https://api.iaquila.com.ng/api/v1`.
- Export gaps: no saved responses, no descriptions, and the collection's URLs/auth token arrive stripped — `BASE_URL`/`ACCESS_TOKEN` were reconstructed during import.
- `scripts/api-sync.cjs` (`npm run api:check` / `npm run api:capture`) diffs the documented surface against `docs/api-endpoints.json` and captures live response shapes into gitignored `.api-samples/`.
- Known-doc bugs: `Edit Election Cycle` was documented as `incident/edit/6` (corrected); `Tenant Details` / `All Tenants` carry the officer-verification body; login's `identifierType: "email"` currently 401s with a PHP trace.
- Blocked on: one real login/token before any resource type can be written against actual `data` payloads.
- Client built and verified against real payloads: `constants/api.ts`, `core/services/session.ts`, `core/services/http.ts` (envelope, deduped refresh, 401-is-not-expiry guard), `features/auth/{schemas,api}.ts`. `mapSessionPayload` verified with the live login JSON; `db_*` fields are stripped by the schema.
- Role mapping: `election officer|field agent|pu agent` → the three app roles. Backend `admin` is refused while `FEATURES.ENABLE_ADMIN_ACCOUNT` is `false`; flipping it maps admin → `ELECTION_OFFICER`. Control-plane `admin` table (`super admin|admin`) is a separate surface, not modelled.
- Full backend reality (envelopes, pagination quirks, enum mismatches, two-database model, missing endpoints) is in `docs/api-contract.md`.
- Verified gap: no `/results`, `/polling-units`, `/location_assignments`, media-upload or AI-projection endpoints exist, so result capture and assigned-PU features cannot be wired yet. Incidents can only express `open|close` and `low|medium|high`.
- Test accounts (default password known to the owner, do not commit): `barka@gmail.com` = admin, `olusanwolu@gmail.com` = field agent. Both confirm the same `userInfo` shape.
- Live catalogue layer: `features/api/{schemas,mappers,catalog,hooks}.ts`. One shared `['catalogue']` query fetches 6 path-paginated lists plus the un-paginated cycle list, joins ids into names, and derives `candidateCount` client-side.
- Election status reports the server's own vocabulary: `active` → `ACTIVE`, `inactive` → `INACTIVE` (added to `ElectionStatusSchema`, `ELECTION_STATUS_LABELS`, `ELECTION_STATUS_COLORS`). No date-based SCHEDULED/COMPLETED guessing; `SCHEDULED`/`COMPLETED`/`ARCHIVED` remain only for seeded mock data.
- Real login wired through the store: `features/auth/service.ts` calls the live API (`login`), the one-tap demo buttons use `loginDemo` on mocks, and logout calls the server then clears state. Login errors are mapped: `UnsupportedOfficerError` shows its message, `ApiError` 401 shows "Invalid email or password.", everything else stays generic. Without a real session the catalogue falls back to the local seed so demo logins still render.
- Read-verified against the live API: 8 list endpoints (7 resources + incidents, empty) and 8 detail endpoints (all `/detail/:id` return `array[1]`; `tenant/get-party` returns an object). Not sampled: the 32 write endpoints (they would mutate live data) and `tenant/9`, `tenants/page/1`, `/test`, `incident/detail`.
- Wired screens: Elections tab (`app/(app)/(tabs)/elections.tsx`), election detail (`app/(app)/election-detail.tsx`) and the Parties directory (`app/(app)/parties.tsx`). Everything else still reads mocks because those screens pass hard-coded ids (`useCandidatesQuery('e1')`) and depend on synthetic results/heatmap data.
- Parties directory now uses `useLivePartiesQuery` + `useLiveAllCandidatesQuery` (all elections, not `'e1'`). Status pills render the server's `ACTIVE`/`INACTIVE` instead of a hardcoded "Operational"; the "Running Mate: N/A" line is hidden because the API has no such column; party history renders only when `partyHistory` exists, which the API never provides.
- Remaining `PARTY_COLORS` consumers are mock-only surfaces: `results.tsx` (map/collation legends, `PARTY_CANDIDATE_NAMES`), `result-detail`, `result-collation`, and the dashboard candidate snapshot. They disappear when `/results` is wired; `partyColor()` is already the server-safe replacement.
- Live seed volume today: 22 parties, 7 positions, 6 electoral areas, 15 incident categories, 1 cycle, 2 elections, 2 candidates.
- Verified: schema + mapper harness against the captured payloads (real ids, real party join, `active`/`inactive` mapping), `tsc --noEmit` clean, `eslint . --max-warnings 0` clean.
- Device-verified on Waydroid (`192.168.240.112:5555`, Expo Go + Metro): real login as `olusanwolu@gmail.com` → `[auth] login ... FIELD_AGENT`; Elections tab renders the live cycle (`Test Election Cycle 2027`, 2027-01-01 → 2027-12-31, 2 contests) and election (`governor / Tenant Lagos State / 2027-01-17 / ACTIVE`); election detail opens with `Contesting Candidates (0)`. No JS errors and no Android crashes in logcat. UI dumps fail with `could not get idle state` while the marquee animates, so navigation has to be coordinate-based.
- Parties contesting chips are now server-derived (`useLiveElectionPartiesQuery`): unique `partyAcronym` from the candidates of that election, capped at 4. No `MAJOR_PARTIES` on the Elections tab. A zero-candidate election renders no chips, only `0 Candidates`.
- `partyColor(acronym)` in `constants/parties.ts`: brand colour for the five seeded acronyms, stable hash colour for anything else (the API has 22 parties). Used by the Elections tab and by election detail, which previously collapsed every unknown acronym to one colour.
- Device-verified after the change: governor card shows `0 Candidates` and no chips; president card shows `NDM · APC · 2 Candidates`; election detail lists `Peter Obi (NDM)` and `Ahmed Bola Tinubu (APC)` in different colours. `tsc` and `eslint --max-warnings 0` clean.
- Real names are acceptable (owner decision, 2026-11-04): the live flow shows `Peter Obi` / `Ahmed Bola Tinubu`, so the mock seed's masked names are no longer a requirement to preserve.
- Incident *creation* is wired to `POST /incident/create` (`useCreateIncidentMutation` → invalidates `['incidents','live']`). Severity is rejected for `CRITICAL` (not a storable value), category is resolved from the live category list, and the polling unit must be a numeric id — mock picker ids are refused with an explicit alert because the database requires a real `polling_unit_id` and no polling-units endpoint exists. Verified end-to-end: an empty picker value (which coerced to `0`) reached the server and returned `Failed to create incident: Polling unit not found.`, which the screen surfaced through `ApiError`.
- Media attachments are **not** uploaded: there is no media endpoint, so photos/video/audio stay on the device and the success alert says so.
- Dashboard `Field Incident Stream` now uses `useLiveIncidentsQuery` (30s poll when live polling is enabled), so the marquee reflects server incidents instead of the seed.
- Session refresh is now proactive as well as reactive: `ensureFreshSession()` refreshes ~2 minutes before `accessTokenExpiry`, runs on `AppState` active/background and on a 60s tick from the root layout, clears the session only when the refresh token has expired, and signs the store out on `invalid`. Demo logins have no session and are ignored. The 401 path remains the backstop for any missed window.
- Incidents are wired read-only: `loadIncidents()` reads `/incident/details/page/N` plus the category list, maps category names 1:1, coerces GPS strings to numbers, and uses `created_at` when `reported_at` is null. List + detail screens now use it.
- `IncidentStatusSchema` gained `OPEN`; `open` → `OPEN`, `close` → `CLOSED`, and the badge/filter/triage copy uses those words. Severity maps LOW/MEDIUM/HIGH only (`critical` is not a storable value).
- Two bugs found by runtime verification and fixed:
  1. `loadSession()` set its hydration flag before awaiting SecureStore, so a concurrent caller saw `null` and wrongly took the mock branch (catalogue and incidents could both fall back on a cold start). Now a shared in-flight promise plus a generation counter so a save/clear during a read wins.
  2. `app/_layout.tsx` seeded every store from `mockApi` on login, overwriting live data with demo rows. It now returns early when a real API session exists, and clears the seeded incidents store.
- Device-verified (Waydroid, Expo Go) with a real session: Incidents shows `1 total logged incident` — `VIOLENCE`, `MEDIUM SEVERITY`, `OPEN`, `PU 991101`, `6.602, 3.352`, `Agent #9`; detail shows category, priority, GPS map link, dispatch summary, reporter and "Unavailable until polling units are exposed" for the electoral area. No JS errors, no crashes. Incident `66` is intentionally left as a live fixture.
- Incident shape verified by creating one on the live tenant (`POST /incident/create` → id 66): create returns the full row, `GET /incident/detail/:id` returns an **object** (not `array[1]` like every other detail endpoint), GPS values are strings, `reported_at` is null, and the list now returns `total: 1`.
- Live incident categories map 1:1 by name onto `IncidentCategory` (15 of 15). Severity can only be LOW/MEDIUM/HIGH (`critical` has no column value). Status can only be OPEN/CLOSED, which the triage UI's `UNDER_REVIEW`/`RESOLVED` cannot be stored as.
- Incident rows carry `reported_by` (profile id) and `polling_unit_id` but no reporter name and no electoral-area name; without a polling-units endpoint those two fields can only render as ids.
- Incident triage is now a real write: `PATCH /incident/edit/:id` via `useUpdateIncidentMutation` (invalidates `['incidents','live']`). The station was previously local-only Zustand state while the copy claimed updates "synchronize in real time" — that claim is now true.
- Triage vocabulary follows the server: `status` accepts only `open|close` and `severity` only `low|medium|high`. `UNDER_REVIEW`, `RESOLVED`, `CRITICAL` and capitalised values all return 401 `Invalid incident status|severity.`, so the Start Review / Resolve buttons collapsed into a single Close/Reopen toggle and the CRITICAL chip was dropped.
- The triage card is gated on `FIELD_AGENT | POLLING_AGENT`, matching the endpoint's own allowlist. It is **not** gated on `ELECTION_OFFICER`: the server inverts the gate here — a field agent gets 200 and a tenant admin gets 401 `Must be a tenant's field agent or pu agent`, unlike every other write endpoint. Tenant admin can see the incident but not triage it; the card explains this instead of hiding silently.
- `description` is also patchable (verified) but deliberately not wired — no screen has an edit-description affordance yet.
- `PATCH /incident/edit` replies `"Incident category updated successfully"` for every field; wrong message, harmless, reported in `docs/api-contract.md`.
- Device-verified end-to-end (Waydroid, field agent): tap HIGH → server `severity: high`; tap Close → server `status: close` and the timeline flips to "Official Case Resolution"; tap Reopen → server `status: open`. Fixture 66 restored to `open` / `medium` afterwards. `tsc` and `eslint --max-warnings 0` clean, no logcat errors.
- **Hardcoded-vocabulary bug, found in three places.** Each filter compared a client constant against live server strings, so a chip could silently match nothing:
  1. *Elections position chips.* `ELECTION_POSITION_FILTERS` hardcoded `PRESIDENT|GOVERNOR|SENATOR|REPRESENTATIVES|LOCAL` and matched by substring. The server's seven positions are `president, governor, senator, federal Rep, state Rep, chairman, councillor`, so "House of Reps" matched nothing and the other four guessed at spelling. Chips now derive from `useLivePositionsQuery()` with exact (lowercased) name matching, ordered by `ELECTORAL_AREA_TYPE_ORDER` (country → ward, highest office first); label text is title-cased for display only. A position added server-side appears with no code change.
  2. *Incident category chips.* `CATEGORY_FILTERS` was a 5-item hardcoded list. Now built from `useLiveIncidentCategoriesQuery()` and translated through `incidentCategoryForName`, the mapper that already owns that translation.
  3. *Incident list triage.* The list card had its own local-only `Reviewing`/`Resolve` buttons writing `UNDER_REVIEW`/`RESOLVED` to Zustand — values the server rejects outright. Now a single Close/Reopen `Button` calling the same `useUpdateIncidentMutation`, gated on `FIELD_AGENT|POLLING_AGENT` (matching the endpoint's allowlist), with a local fallback for sessionless demo accounts.
- `ELECTION_POSITION_FILTERS` / `ElectionPositionFilterId` removed from `constants/elections.ts`; nothing else referenced them. The dashboard's `PARTY_COLORS` use is untouched because that surface is still mock results data.
- Device-verified: Elections chips read `President / Governor / Senator` from the live position list, tapping President filters to the `president · Tenant Nigeria · country · 2027-02-20 · NDM · APC · 2 Candidates` card (which was always present, just below the fold); incident chips read real category names (`Weather Disruption`, `Protest`, `Security Incident`); tapping Close on a list card wrote `status: close` to the server. Fixture restored. `tsc` + `eslint --max-warnings 0` clean, no logcat errors.
