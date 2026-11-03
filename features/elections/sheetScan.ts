import type { Candidate } from '@/features/auth/store';

export type SheetCaptureSource = 'LIVE_CAMERA' | 'LIBRARY';

export type SheetScanResult = {
  accredited?: number;
  rejected?: number;
  cancelled?: number;
  candidateVotes: Record<string, number>;
  matchedCandidates: number;
  confidence: number;
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
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (labels.some((label) => upper.includes(label))) {
      const values = numbersIn(line);
      // EC8A prints the figure in the rightmost column of the row.
      if (values.length > 0) return values[values.length - 1];
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
export function parseResultSheet(lines: string[], candidates: Candidate[]): SheetScanResult {
  const cleaned = normalise(lines);
  const candidateVotes: Record<string, number> = {};

  for (const candidate of candidates) {
    const tokens = candidateTokens(candidate);
    if (tokens.length === 0) continue;

    const row = cleaned.find((line) => lineMatchesCandidate(line, tokens));
    if (!row) continue;

    const values = numbersIn(row);
    if (values.length === 0) continue;

    // Single figure rows (party → votes) are unambiguous; otherwise take the rightmost column.
    candidateVotes[candidate.id] = values[values.length - 1]!;
  }

  const matchedCandidates = Object.keys(candidateVotes).length;
  const accredited = findLabelValue(cleaned, ['ACCREDITED', 'BVAS']);
  const rejected = findLabelValue(cleaned, ['REJECTED', 'INVALID', 'SPOILED']);
  const cancelled = findLabelValue(cleaned, ['CANCELLED', 'CANCELED']);

  return {
    accredited,
    rejected,
    cancelled,
    candidateVotes,
    matchedCandidates,
    confidence: candidates.length > 0 ? matchedCandidates / candidates.length : 0,
  };
}
