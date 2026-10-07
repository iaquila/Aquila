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
