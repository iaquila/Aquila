import type { Candidate } from '@/features/auth/store';

export type SheetCaptureSource = 'LIVE_CAMERA' | 'LIBRARY';

export type SheetScanResult = {
  accredited?: number;
  rejected?: number;
  cancelled?: number;
  candidateVotes: Record<string, number>;
  matchedCandidates: number;
  confidence: number;
  /** The sheet's own printed totals, used as ground truth to catch row mis-mapping. */
  printedValidVotes?: number;
  printedVotesCast?: number;
  candidateSum: number;
  reconciles: boolean;
};

type SheetOcr = {
  extractTextFromImage: (uri: string) => Promise<string[]>;
};

/**
 * The OCR module is native, so Expo Go (and any build made before it was added) can't load it.
 * Resolve it lazily so the screen still renders and falls back to manual entry.
 */
export async function loadSheetOcr(): Promise<SheetOcr | null> {
  try {
    const mod = await import('expo-text-extractor');
    if (!mod?.isSupported) return null;
    return { extractTextFromImage: mod.extractTextFromImage };
  } catch {
    return null;
  }
}

function numbersIn(line: string): number[] {
  return (line.match(/\d[\d,]*/g) ?? [])
    .map((raw) => parseInt(raw.replace(/,/g, ''), 10))
    .filter((n) => Number.isFinite(n));
}

function normalise(lines: string[]): string[] {
  return lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function findLabelValue(lines: string[], labels: string[]): number | undefined {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const upper = line.toUpperCase();
    if (!labels.some((label) => upper.includes(label))) continue;

    const values = numbersIn(line);
    // EC8A prints the figure in the rightmost column of the row.
    if (values.length > 0) return values[values.length - 1];

    // Table cells frequently arrive as their own line: "Accredited Voters" then "100".
    for (let offset = 1; offset <= 2; offset += 1) {
      const nextValues = numbersIn(lines[index + offset] ?? '');
      if (nextValues.length > 0) return nextValues[0];
    }
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function candidateTokens(candidate: Candidate): string[] {
  const surname = candidate.fullName.trim().split(/\s+/).pop() ?? '';
  return [candidate.partyAcronym, candidate.shortName ?? '', surname]
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function lineMatchesCandidate(line: string, tokens: string[]): boolean {
  const upper = line.toUpperCase();
  return tokens.some((token) => {
    const pattern = new RegExp(`\\b${escapeRegExp(token.toUpperCase())}\\b`);
    return pattern.test(upper);
  });
}

/**
 * Native document scanner (VisionKit on iOS, ML Kit Document Scanner on Android).
 * Lazy for the same reason as the OCR module - Expo Go can't load it.
 * Returns cropped, de-skewed page images ready for OCR.
 */
export type DocumentScanOutcome =
  | { status: 'ok'; pages: string[] }
  | { status: 'cancelled' }
  | { status: 'unavailable' };

export async function scanDocumentPages(): Promise<DocumentScanOutcome> {
  let mod: typeof import('react-native-document-scanner-plugin');
  try {
    mod = await import('react-native-document-scanner-plugin');
  } catch {
    return { status: 'unavailable' };
  }

  try {
    const result = await mod.default.scanDocument();
    const pages = result.scannedImages ?? [];
    // The scanner resolves (not rejects) when the user backs out - never report that as a failure.
    if (result.status === 'cancel' || (pages.length === 0 && result.status !== 'success')) {
      return { status: 'cancelled' };
    }
    return { status: 'ok', pages };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Rasterises a PDF into page JPEGs wide enough for digit-level OCR. */
export type PdfRasterOutcome =
  | { status: 'ok'; pages: string[] }
  | { status: 'failed' }
  | { status: 'unavailable' };

export async function rasterisePdf(uri: string): Promise<PdfRasterOutcome> {
  let mod: typeof import('react-native-pdf-thumbnail');
  try {
    mod = await import('react-native-pdf-thumbnail');
  } catch {
    return { status: 'unavailable' };
  }

  try {
    const pages = await mod.default.generateAllPages(uri, { quality: 90, maxWidth: 2400 });
    return { status: 'ok', pages: pages.map((page) => page.uri) };
  } catch {
    return { status: 'failed' };
  }
}

/** OCRs pages sequentially to bound memory on low-end devices. */
export async function extractTextFromPages(pageUris: string[]): Promise<string[]> {
  const ocr = await loadSheetOcr();
  if (!ocr) return [];

  const lines: string[] = [];
  for (const uri of pageUris) {
    try {
      lines.push(...(await ocr.extractTextFromImage(uri)));
    } catch {
      // Skip an unreadable page rather than failing the whole capture.
    }
  }
  return lines;
}

/**
 * Heuristic parse of an OCR'd result sheet. Deliberately conservative: it only reports what it
 * could match, and the caller must let the agent review every figure before publishing.
 */
const NUMERIC_CELL = /^\d[\d,]*$/;

export function parseResultSheet(lines: string[], candidates: Candidate[]): SheetScanResult {
  const cleaned = normalise(lines);
  const candidateVotes: Record<string, number> = {};
  // A figure can only be claimed once - otherwise a shared number line feeds every candidate.
  const consumed = new Set<number>();

  for (const candidate of candidates) {
    const tokens = candidateTokens(candidate);
    if (tokens.length === 0) continue;

    const rowIndex = cleaned.findIndex((line) => lineMatchesCandidate(line, tokens));
    if (rowIndex === -1) continue;

    const values = numbersIn(cleaned[rowIndex]!);
    if (values.length > 0) {
      // Single figure rows (party → votes) are unambiguous; otherwise take the rightmost column.
      candidateVotes[candidate.id] = values[values.length - 1]!;
      continue;
    }

    // OCR frequently splits a row into "APC" then a bare "1,234" cell on the next line.
    // Only accept a numeric-only line, and never the same line twice.
    for (let offset = 1; offset <= 2; offset += 1) {
      const target = rowIndex + offset;
      const line = cleaned[target];
      if (!line || consumed.has(target) || !NUMERIC_CELL.test(line)) continue;
      consumed.add(target);
      candidateVotes[candidate.id] = numbersIn(line)[0]!;
      break;
    }
  }

  const matchedCandidates = Object.keys(candidateVotes).length;
  const accredited = findLabelValue(cleaned, ['ACCREDITED', 'BVAS']);

  // A party cannot out-poll the accredited electorate - that figure was misread.
  if (accredited !== undefined && accredited > 0) {
    for (const [candidateId, votes] of Object.entries(candidateVotes)) {
      if (votes > accredited) delete candidateVotes[candidateId];
    }
  }
  const rejected = findLabelValue(cleaned, ['REJECTED', 'INVALID', 'SPOILED', 'BALLOT PAPERS REJECTED']);
  const cancelled = findLabelValue(cleaned, ['CANCELLED', 'CANCELED', 'ANNULLED']);

  const printedValidVotes = findLabelValue(cleaned, ['VALID VOTES', 'TOTAL VALID']);
  const printedVotesCast = findLabelValue(cleaned, ['TOTAL VOTES CAST', 'TOTAL VOTE CAST']);
  const candidateSum = Object.values(candidateVotes).reduce((acc, votes) => acc + votes, 0);

  const finalMatches = Object.keys(candidateVotes).length;
  return {
    accredited,
    rejected,
    cancelled,
    candidateVotes,
    matchedCandidates: Math.min(matchedCandidates, finalMatches),
    confidence: candidates.length > 0 ? Math.min(matchedCandidates, finalMatches) / candidates.length : 0,
    printedValidVotes,
    printedVotesCast,
    candidateSum,
    // If the sheet prints its own valid total, our per-candidate mapping must agree with it.
    reconciles: printedValidVotes === undefined || printedValidVotes === candidateSum,
  };
}
