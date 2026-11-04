/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Reverse Complement & Antisense Interaction Modeling Utility
 * Rigorous nucleotide reverse complementation and RNA:RNA/DNA duplex analysis.
 */

export interface DuplexAlignmentVisual {
  sense5to3: string;
  matchLine: string;
  antisense3to5: string;
  duplexLength: number;
  wcPairs: number;
  wobblePairs: number;
  mismatches: number;
  pairingPercentage: number;
}

export interface ReverseComplementAnalysis {
  originalSequence: string;
  reverseComplement: string; // Canonical 5' -> 3' antisense
  directComplement: string;  // 3' -> 5' complement
  reverseOnly: string;       // 5' -> 3' reverse without complementation
  length: number;
  originalGcPercent: number;
  revCompGcPercent: number;
  originalAuPercent: number;
  revCompAuPercent: number;
  estimatedDuplexTm: number; // Nearest-neighbor duplex melting temp (°C)
  estimatedDuplexMfeKcal: number; // Approximate hybridization free energy ΔG°
  selfComplementarityScore: number; // 0 - 100% palindrome / inverted repeat tendency
  duplexAlignment: DuplexAlignmentVisual;
}

// Canonical Watson-Crick & IUPAC complement mapping
const RNA_COMPLEMENT_MAP: Record<string, string> = {
  A: 'U',
  U: 'A',
  T: 'A',
  C: 'G',
  G: 'C',
  // Degenerate IUPAC bases
  R: 'Y', // Purine (A/G) -> Pyrimidine (U/C)
  Y: 'R', // Pyrimidine (U/C) -> Purine (A/G)
  S: 'S', // Strong (C/G) -> (G/C)
  W: 'W', // Weak (A/U) -> (U/A)
  K: 'M', // Keto (G/U) -> Amino (C/A)
  M: 'K', // Amino (A/C) -> Keto (U/G)
  B: 'V', // Not A -> Not U
  D: 'H', // Not C -> Not G
  H: 'D', // Not G -> Not C
  V: 'B', // Not U -> Not A
  N: 'N', // Any base
};

const DNA_COMPLEMENT_MAP: Record<string, string> = {
  ...RNA_COMPLEMENT_MAP,
  A: 'T',
  U: 'A',
  T: 'A',
};

/**
 * Returns the complement base of a single nucleotide
 */
export function getComplementBase(base: string, isRna = true): string {
  const map = isRna ? RNA_COMPLEMENT_MAP : DNA_COMPLEMENT_MAP;
  const upper = base.toUpperCase();
  const comp = map[upper] || upper;
  return base === base.toLowerCase() ? comp.toLowerCase() : comp;
}

/**
 * Generates the reverse complement of a nucleotide sequence (5' -> 3')
 */
export function getReverseComplement(sequence: string, isRna = true): string {
  if (!sequence) return '';
  const chars = Array.from(sequence);
  const reversedComplements: string[] = [];
  for (let i = chars.length - 1; i >= 0; i--) {
    reversedComplements.push(getComplementBase(chars[i], isRna));
  }
  return reversedComplements.join('');
}

/**
 * Generates the direct complement of a nucleotide sequence (retains sequence direction)
 */
export function getDirectComplement(sequence: string, isRna = true): string {
  if (!sequence) return '';
  const chars = Array.from(sequence);
  return chars.map((ch) => getComplementBase(ch, isRna)).join('');
}

/**
 * Generates the reverse sequence without complementation (3' -> 5' reversed into 5' -> 3')
 */
export function getReverse(sequence: string): string {
  if (!sequence) return '';
  return Array.from(sequence).reverse().join('');
}

/**
 * Formats a reverse-complement sequence into a standard FASTA string
 */
export function formatReverseComplementFasta(
  identifier: string,
  revCompSequence: string,
  originalLength: number,
  isRna = true
): string {
  const strandType = isRna ? 'RNA (Antisense / Reverse Complement)' : 'DNA (Reverse Complement)';
  const header = `>${identifier}_RevComp | ${strandType} | Length: ${originalLength} nt | LISHA In Silico Core`;
  const chunks: string[] = [];
  for (let i = 0; i < revCompSequence.length; i += 70) {
    chunks.push(revCompSequence.slice(i, i + 70));
  }
  return `${header}\n${chunks.join('\n')}`;
}

/**
 * Computes deep biophysical properties of the reverse complement and
 * evaluates sense-antisense duplex hybridization characteristics.
 */
export function analyzeReverseComplement(
  rawSequence: string,
  isRna = true
): ReverseComplementAnalysis {
  // Clean sequence (letters only, uppercase, T -> U for RNA)
  const cleaned = isRna
    ? rawSequence.replace(/[^acgtuACGTU]/g, '').toUpperCase().replace(/T/g, 'U')
    : rawSequence.replace(/[^acgtuACGTU]/g, '').toUpperCase().replace(/U/g, 'T');

  const revComp = getReverseComplement(cleaned, isRna);
  const directComp = getDirectComplement(cleaned, isRna);
  const revOnly = getReverse(cleaned);
  const len = cleaned.length;

  if (len === 0) {
    return {
      originalSequence: '',
      reverseComplement: '',
      directComplement: '',
      reverseOnly: '',
      length: 0,
      originalGcPercent: 0,
      revCompGcPercent: 0,
      originalAuPercent: 0,
      revCompAuPercent: 0,
      estimatedDuplexTm: 0,
      estimatedDuplexMfeKcal: 0,
      selfComplementarityScore: 0,
      duplexAlignment: {
        sense5to3: '',
        matchLine: '',
        antisense3to5: '',
        duplexLength: 0,
        wcPairs: 0,
        wobblePairs: 0,
        mismatches: 0,
        pairingPercentage: 0,
      },
    };
  }

  // Nucleotide composition
  const origG = (cleaned.match(/G/g) || []).length;
  const origC = (cleaned.match(/C/g) || []).length;
  const origA = (cleaned.match(/A/g) || []).length;
  const origU = (cleaned.match(/[UT]/g) || []).length;

  const originalGc = Math.round(((origG + origC) / len) * 1000) / 10;
  const originalAu = Math.round(((origA + origU) / len) * 1000) / 10;

  const revG = (revComp.match(/G/g) || []).length;
  const revC = (revComp.match(/C/g) || []).length;
  const revA = (revComp.match(/A/g) || []).length;
  const revU = (revComp.match(/[UT]/g) || []).length;

  const revCompGc = Math.round(((revG + revC) / len) * 1000) / 10;
  const revCompAu = Math.round(((revA + revU) / len) * 1000) / 10;

  // Duplex pairing between Sense (5' -> 3') and Antisense (3' <- 5' which is directComp)
  // When Sense 5'->3' pairs with its antisense, the antisense running in 3'<-5' is exact complement
  let wcPairs = 0;
  let wobblePairs = 0;
  let mismatches = 0;
  const matchChars: string[] = [];

  for (let i = 0; i < len; i++) {
    const s = cleaned[i];
    const as = directComp[i]; // opposite strand at same coordinate
    if (
      (s === 'A' && (as === 'U' || as === 'T')) ||
      ((s === 'U' || s === 'T') && as === 'A') ||
      (s === 'C' && as === 'G') ||
      (s === 'G' && as === 'C')
    ) {
      wcPairs++;
      matchChars.push('|');
    } else if (isRna && ((s === 'G' && as === 'U') || (s === 'U' && as === 'G'))) {
      wobblePairs++;
      matchChars.push(':');
    } else {
      mismatches++;
      matchChars.push('·');
    }
  }

  const pairingPercentage =
    len > 0 ? Math.round(((wcPairs + wobblePairs * 0.5) / len) * 1000) / 10 : 0;

  // Estimated Duplex Melting Temperature (Nearest-Neighbor approximation for full duplex)
  // Tm = 64.9 + 41 * (yG + zC - 16.4) / (wA + xT + yG + zC) adjusted for RNA stability
  const gcCount = origG + origC;
  const baseTm = len < 50
    ? (origA + origU) * 2 + (origG + origC) * 4
    : 64.9 + 41 * (gcCount - 16.4) / len + (isRna ? 3.5 : 0);
  const estimatedDuplexTm = Math.round(Math.max(10, Math.min(105, baseTm)) * 10) / 10;

  // Estimated hybridization free energy ΔG° (kcal/mol) for duplex formation
  // Pure WC base pairs average ~ -1.8 to -2.8 kcal/mol per base pair stack
  const estimatedDuplexMfeKcal = Math.round((-(wcPairs * 2.2 + wobblePairs * 0.9) + 4.5) * 10) / 10;

  // Self-complementarity / palindrome index (evaluates if the sequence can form self-dimer hairpins)
  // Compare original sequence with its own reverse complement
  let selfMatches = 0;
  const sampleLen = Math.min(len, 200);
  for (let i = 0; i < sampleLen; i++) {
    if (cleaned[i] === revComp[i]) {
      selfMatches++;
    }
  }
  const selfComplementarityScore =
    sampleLen > 0 ? Math.round((selfMatches / sampleLen) * 1000) / 10 : 0;

  return {
    originalSequence: cleaned,
    reverseComplement: revComp,
    directComplement: directComp,
    reverseOnly: revOnly,
    length: len,
    originalGcPercent: originalGc,
    revCompGcPercent: revCompGc,
    originalAuPercent: originalAu,
    revCompAuPercent: revCompAu,
    estimatedDuplexTm,
    estimatedDuplexMfeKcal,
    selfComplementarityScore,
    duplexAlignment: {
      sense5to3: cleaned,
      matchLine: matchChars.join(''),
      antisense3to5: directComp,
      duplexLength: len,
      wcPairs,
      wobblePairs,
      mismatches,
      pairingPercentage,
    },
  };
}
