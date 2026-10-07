/**
 * Single Source of Truth (SSOT) for political parties, acronyms, and branding colors.
 */
export const PARTY_COLORS: Record<string, string> = {
  CPA: '#059669', // Coalition for Progressive Action (Forest Green)
  DPP: '#DC2626', // Democratic Peoples Party (Crimson Red)
  PL: '#16A34A',  // Progressive Labour (Emerald)
  PPNF: '#2563EB', // Peoples Progressive National Front (Royal Blue)
  ADP: '#7C3AED', // Allied Democratic Party (Violet)
};

export const MAJOR_PARTIES = [
  { acronym: 'CPA', name: 'Coalition for Progressive Action', bg: '#059669' },
  { acronym: 'DPP', name: 'Democratic Peoples Party', bg: '#DC2626' },
  { acronym: 'PL', name: 'Progressive Labour', bg: '#16A34A' },
  { acronym: 'PPNF', name: 'Peoples Progressive National Front', bg: '#2563EB' },
  { acronym: 'ADP', name: 'Allied Democratic Party', bg: '#7C3AED' },
] as const;
