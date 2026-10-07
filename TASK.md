# Task: Gold-Standard Mobile App UI/UX Redesign & Specification Alignment

## Overview
- Ground all work on local base `9e64bf9` (discarding broken AI Studio artifacts from `23de3de`).
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
      - Added Touch-and-Hold Pause: Touching down pauses the ticker stream so users can read or tap without items sliding out from under their fingers.
      - Added System Reduce Motion Support: Respects `AccessibilityInfo.isReduceMotionEnabled()`, falling back to an accessible non-auto-scrolling feed.
    - Standardized `result-collation.tsx` and `result-detail.tsx`:
      - Converted `puLogItem` to `<Card pressable>`.
      - Converted `verifiedPill`, `statusPill`, and `matchPill` to `<Badge>`.
      - Removed unused `DebouncedPressable` import.
