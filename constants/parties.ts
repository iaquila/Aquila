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

export const PARTY_CANDIDATE_NAMES: Record<string, string> = {
  CPA: 'Bawa Nassiru',
  DPP: 'Farouk Haruna',
  PL: 'Nassiru Bawa',
  PPNF: 'Ibrahim Shehu',
  ADP: 'Amina Yusuf',
};

const FALLBACK_PARTY_COLORS = ['#059669', '#DC2626', '#16A34A', '#2563EB', '#7C3AED', '#D97706', '#0891B2', '#DB2777'];

// Server parties are open-ended (22 and counting), so brand colours only exist
// for the seeded demo acronyms. Unknown acronyms get a stable hash colour.
export function partyColor(acronym: string): string {
  const known = PARTY_COLORS[acronym.toUpperCase()];
  if (known) return known;
  let hash = 0;
  for (let index = 0; index < acronym.length; index++) {
    hash = (hash * 31 + acronym.charCodeAt(index)) % 997;
  }
  return FALLBACK_PARTY_COLORS[hash % FALLBACK_PARTY_COLORS.length] ?? '#059669';
}
