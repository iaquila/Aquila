/**
 * Single Source of Truth (SSOT) for nationwide collation baselines,
 * primary hub overrides, and geopolitical zone vote distributions.
 */

export type MajorPartyCode = 'CPA' | 'DPP' | 'PL' | 'PPNF';

export interface HubOverride {
  totalPus: number;
  baseCollated: number;
  baseVotes: Record<MajorPartyCode, number>;
}

export const PRIMARY_HUB_OVERRIDES: Record<string, HubOverride> = {
  ikeja: { totalPus: 450, baseCollated: 412, baseVotes: { CPA: 42350, DPP: 28140, PL: 21980, PPNF: 3200 } },
  'lagos mainland': { totalPus: 380, baseCollated: 345, baseVotes: { CPA: 27800, DPP: 35900, PL: 18450, PPNF: 2800 } },
  alimosho: { totalPus: 620, baseCollated: 540, baseVotes: { CPA: 41200, DPP: 22400, PL: 53100, PPNF: 4600 } },
  'eti-osa': { totalPus: 340, baseCollated: 298, baseVotes: { CPA: 24600, DPP: 14200, PL: 39800, PPNF: 2100 } },
  surulere: { totalPus: 395, baseCollated: 360, baseVotes: { CPA: 36400, DPP: 19800, PL: 31200, PPNF: 3100 } },
  kosofe: { totalPus: 310, baseCollated: 275, baseVotes: { CPA: 30100, DPP: 24500, PL: 19400, PPNF: 2950 } },
  fagge: { totalPus: 320, baseCollated: 292, baseVotes: { CPA: 18400, DPP: 9600, PL: 3100, PPNF: 58700 } },
  tarauni: { totalPus: 280, baseCollated: 241, baseVotes: { CPA: 15200, DPP: 8100, PL: 2600, PPNF: 46300 } },
  nasarawa: { totalPus: 350, baseCollated: 305, baseVotes: { CPA: 22100, DPP: 11400, PL: 3900, PPNF: 54200 } },
  'obio-akpor': { totalPus: 420, baseCollated: 381, baseVotes: { CPA: 19800, DPP: 47200, PL: 24600, PPNF: 1800 } },
  'port harcourt': { totalPus: 300, baseCollated: 256, baseVotes: { CPA: 16400, DPP: 28900, PL: 24700, PPNF: 1400 } },
  municipal: { totalPus: 380, baseCollated: 340, baseVotes: { CPA: 22100, DPP: 18400, PL: 34900, PPNF: 3200 } },
  bwari: { totalPus: 220, baseCollated: 186, baseVotes: { CPA: 9800, DPP: 11200, PL: 28600, PPNF: 1100 } },
  'kaduna north': { totalPus: 340, baseCollated: 295, baseVotes: { CPA: 38200, DPP: 29400, PL: 12100, PPNF: 11200 } },
  'kaduna south': { totalPus: 310, baseCollated: 260, baseVotes: { CPA: 31500, DPP: 33800, PL: 15400, PPNF: 8900 } },
  'ibadan north': { totalPus: 410, baseCollated: 375, baseVotes: { CPA: 39100, DPP: 36200, PL: 18700, PPNF: 2400 } },
  'ibadan south-west': { totalPus: 360, baseCollated: 318, baseVotes: { CPA: 34800, DPP: 31200, PL: 16900, PPNF: 1900 } },
  'enugu north': { totalPus: 290, baseCollated: 270, baseVotes: { CPA: 4200, DPP: 12800, PL: 58400, PPNF: 800 } },
  nsukka: { totalPus: 320, baseCollated: 285, baseVotes: { CPA: 5100, DPP: 14200, PL: 61200, PPNF: 950 } },
  maiduguri: { totalPus: 380, baseCollated: 340, baseVotes: { CPA: 54200, DPP: 19800, PL: 4100, PPNF: 8300 } },
  jere: { totalPus: 290, baseCollated: 245, baseVotes: { CPA: 41800, DPP: 16200, PL: 3200, PPNF: 6400 } },
};

export const ZONE_DEFAULT_RATIOS: Record<string, Record<MajorPartyCode, number>> = {
  'North West': { CPA: 0.44, DPP: 0.28, PL: 0.08, PPNF: 0.20 },
  'North East': { CPA: 0.48, DPP: 0.38, PL: 0.06, PPNF: 0.08 },
  'North Central': { CPA: 0.36, DPP: 0.34, PL: 0.25, PPNF: 0.05 },
  'South West': { CPA: 0.46, DPP: 0.24, PL: 0.27, PPNF: 0.03 },
  'South East': { CPA: 0.08, DPP: 0.22, PL: 0.68, PPNF: 0.02 },
  'South South': { CPA: 0.28, DPP: 0.42, PL: 0.27, PPNF: 0.03 },
};

export function getZoneDefaultRatio(zone: string): Record<MajorPartyCode, number> {
  return ZONE_DEFAULT_RATIOS[zone] ?? { CPA: 0.28, DPP: 0.42, PL: 0.27, PPNF: 0.03 };
}
