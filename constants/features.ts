export const FEATURES = {
  ENABLE_LIVE_POLLING: true,
  ENABLE_INCIDENT_MARQUEE: true,
  ENABLE_STEALTH_RECORDING: true,
  ENABLE_CUSTOM_FONTS: false,
  // Situation Room only: switch the snapshot between our field returns and what INEC declared.
  ENABLE_INEC_OBSERVED_TOGGLE: false,
  // Result entry: INEC figures are agent-typed until the INEC feed lands; flip to false for locked fields.
  ENABLE_INEC_MANUAL_ENTRY: true,
  LIVE_POLL_INTERVAL_MS: 15_000,
} as const;

export type FeatureFlag = keyof typeof FEATURES;
