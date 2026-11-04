/**
 * Single Source of Truth (SSOT) formatters conforming to platform standards.
 * Built with native Intl / ICU runtime capabilities (Hermes zero bundle penalty).
 */

export function formatVotes(votes: number | undefined | null): string {
  if (votes === undefined || votes === null || Number.isNaN(votes)) return '0';
  return votes.toLocaleString();
}

export function formatPercent(pct: number | undefined | null, decimals = 1): string {
  if (pct === undefined || pct === null || Number.isNaN(pct)) return '0.0%';
  return `${pct.toFixed(decimals)}%`;
}

export function formatRatio(count: number, total: number): string {
  return `${formatVotes(count)} / ${formatVotes(total)}`;
}

const MINOR_WORDS = new Set(['of', 'and', 'the', 'for', 'in', 'on', 'at', 'to']);

/**
 * The API stores display names as lowercase or snake_case ("president",
 * "federal Rep", "senatorial_district"). This formats them for display without
 * altering the stored value, so matching against the server stays exact.
 * Words that already carry internal capitals ("Rep", "INEC") are left as-is.
 */
export function formatServerLabel(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return word;
      if (index > 0 && MINOR_WORDS.has(word.toLowerCase())) return word.toLowerCase();
      if (/[A-Z]/.test(word.slice(1))) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
