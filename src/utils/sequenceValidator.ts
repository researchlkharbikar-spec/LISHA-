/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Sequence Validator
 * Rigorous regex-based nucleotide sequence validation and diagnostic analyzer.
 */

export interface InvalidCharDiagnostic {
  char: string;
  count: number;
  positions: number[]; // 1-indexed positions in cleaned body
}

export interface SequenceValidationResult {
  isValid: boolean;
  rawInput: string;
  cleanedSequence: string; // uppercase, T->U, strictly valid characters
  header: string | null; // Extracted FASTA header if present
  length: number;
  composition: {
    a: number;
    c: number;
    g: number;
    u: number;
    gcPercent: number;
    auPercent: number;
  };
  invalidChars: InvalidCharDiagnostic[];
  totalInvalidCount: number;
  errorMessage: string | null;
  warningMessage: string | null;
}

// Strict regex matching only valid nucleotide characters (case-insensitive A, C, G, T, U)
export const VALID_NUCLEOTIDE_REGEX = /^[ACGUTacgut]+$/;
// Regex to identify invalid non-nucleotide characters
export const INVALID_NUCLEOTIDE_CHARS_REGEX = /[^ACGUTacgut\s]/g;

/**
 * Validates a raw lncRNA sequence string with deep character-level diagnostics.
 */
export function validateLncRnaSequence(input: string): SequenceValidationResult {
  const rawInput = input || '';
  const lines = rawInput.split(/\r?\n/);

  // Extract FASTA header if present
  let header: string | null = null;
  const bodyLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('>')) {
      if (!header) {
        header = trimmed.slice(1).trim();
      }
    } else if (trimmed.length > 0) {
      bodyLines.push(trimmed);
    }
  }

  const rawBody = bodyLines.join('');
  // Sequence without whitespace for character-level inspection
  const nonWhitespaceBody = rawBody.replace(/\s+/g, '');

  if (nonWhitespaceBody.length === 0) {
    return {
      isValid: false,
      rawInput,
      cleanedSequence: '',
      header,
      length: 0,
      composition: { a: 0, c: 0, g: 0, u: 0, gcPercent: 0, auPercent: 0 },
      invalidChars: [],
      totalInvalidCount: 0,
      errorMessage: 'Sequence is empty. Please enter an lncRNA sequence (A, C, G, T, U).',
      warningMessage: null,
    };
  }

  // Find all invalid characters and their exact positions
  const invalidMap = new Map<string, { count: number; positions: number[] }>();
  let totalInvalidCount = 0;

  for (let i = 0; i < nonWhitespaceBody.length; i++) {
    const ch = nonWhitespaceBody[i];
    if (!/[acgutACGTU]/.test(ch)) {
      totalInvalidCount++;
      const existing = invalidMap.get(ch) || { count: 0, positions: [] };
      existing.count++;
      if (existing.positions.length < 10) {
        existing.positions.push(i + 1); // 1-indexed position
      }
      invalidMap.set(ch, existing);
    }
  }

  const invalidChars: InvalidCharDiagnostic[] = Array.from(invalidMap.entries()).map(
    ([char, data]) => ({
      char,
      count: data.count,
      positions: data.positions,
    })
  );

  const isValid = totalInvalidCount === 0;

  // Cleaned RNA sequence (A, C, G, U)
  const cleanedSequence = nonWhitespaceBody
    .replace(/[^acgutACGTU]/g, '')
    .toUpperCase()
    .replace(/T/g, 'U');

  // Nucleotide counts
  const a = (cleanedSequence.match(/A/g) || []).length;
  const c = (cleanedSequence.match(/C/g) || []).length;
  const g = (cleanedSequence.match(/G/g) || []).length;
  const u = (cleanedSequence.match(/U/g) || []).length;
  const len = cleanedSequence.length;

  const gcPercent = len > 0 ? Math.round(((g + c) / len) * 1000) / 10 : 0;
  const auPercent = len > 0 ? Math.round(((a + u) / len) * 1000) / 10 : 0;

  let errorMessage: string | null = null;
  let warningMessage: string | null = null;

  if (!isValid) {
    const formattedChars = invalidChars
      .map((diag) => `'${diag.char}' (${diag.count}x at pos ${diag.positions.join(', ')})`)
      .slice(0, 5)
      .join(', ');
    const moreSuffix = invalidChars.length > 5 ? `, and ${invalidChars.length - 5} more` : '';
    errorMessage = `Invalid nucleotide characters detected: ${formattedChars}${moreSuffix}. Only A, C, G, T, U are permitted.`;
  } else if (cleanedSequence.length < 15) {
    warningMessage = `Sequence is short (${cleanedSequence.length} nt). Optimal screening models recommend &ge; 20 nt.`;
  }

  return {
    isValid,
    rawInput,
    cleanedSequence,
    header,
    length: cleanedSequence.length,
    composition: {
      a,
      c,
      g,
      u,
      gcPercent,
      auPercent,
    },
    invalidChars,
    totalInvalidCount,
    errorMessage,
    warningMessage,
  };
}

/**
 * Strips all invalid characters and headers, returning a canonical RNA sequence.
 */
export function sanitizeToRnaSequence(rawInput: string): string {
  const lines = (rawInput || '').split(/\r?\n/);
  const body = lines.filter((line) => !line.trim().startsWith('>')).join('');
  return body.replace(/[^acgutACGTU]/g, '').toUpperCase().replace(/T/g, 'U');
}
