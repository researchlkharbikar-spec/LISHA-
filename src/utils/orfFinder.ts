/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Open Reading Frame (ORF) Finder & Genetic Code Translation Engine
 * Scans plant lncRNA sequences across all reading frames to identify potential ORFs,
 * micropeptides (sORFs), and assess bona fide non-coding potential (< 100 aa cutoff).
 */

export type ReadingFrame = '+1' | '+2' | '+3';

export type CodingPotentialClassification =
  | 'Strict Non-Coding (<30 aa)'
  | 'Putative sORF / Micropeptide (30–99 aa)'
  | 'Atypical Long ORF (≥100 aa / Potential Coding)';

export interface OpenReadingFrame {
  id: string;
  frame: ReadingFrame;
  frameIndex: number; // 0, 1, 2
  start: number; // 1-indexed in transcript
  end: number;   // 1-indexed in transcript
  ntLength: number;
  aaLength: number; // excluding stop codon
  startCodon: string; // usually "AUG"
  stopCodon: string;  // "UAA", "UAG", "UGA"
  nucleotideSequence: string;
  peptideSequence: string;
  kozakScorePercent: number; // 0 - 100% plant Kozak context match
  kozakContext: string; // e.g. "AACAUGG"
  classification: CodingPotentialClassification;
  color: {
    bg: string;
    text: string;
    border: string;
    track: string;
  };
}

export interface OrfAnalysisResult {
  querySequence: string;
  sequenceLength: number;
  totalOrfsCount: number;
  longestOrf: OpenReadingFrame | null;
  longestAaLength: number;
  bonaFideNonCoding: boolean; // true if longest ORF < 100 aa
  codingPotentialAssessment: string;
  frameCounts: Record<ReadingFrame, number>;
  orfs: OpenReadingFrame[];
}

export interface OrfFinderOptions {
  minAaLength?: number; // default 15 aa
  includeNonCanonicalStart?: boolean; // default false
  allowOverlapping?: boolean; // default true
}

// Canonical Standard Plant RNA Genetic Code Translation Table
export const RNA_CODON_TABLE: Record<string, string> = {
  // Phenylalanine & Leucine
  UUU: 'F', UUC: 'F', UUA: 'L', UUG: 'L',
  // Leucine
  CUU: 'L', CUC: 'L', CUA: 'L', CUG: 'L',
  // Isoleucine & Methionine (Start)
  AUU: 'I', AUC: 'I', AUA: 'I', AUG: 'M',
  // Valine
  GUU: 'V', GUC: 'V', GUA: 'V', GUG: 'V',
  // Serine
  UCU: 'S', UCC: 'S', UCA: 'S', UCG: 'S',
  // Proline
  CCU: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
  // Threonine
  ACU: 'T', ACC: 'T', ACA: 'T', ACG: 'T',
  // Alanine
  GCU: 'A', GCC: 'A', GCA: 'A', GCG: 'A',
  // Tyrosine & Stop (Ochre / Amber)
  UAU: 'Y', UAC: 'Y', UAA: '*', UAG: '*',
  // Histidine & Glutamine
  CAU: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q',
  // Asparagine & Lysine
  AAU: 'N', AAC: 'N', AAA: 'K', AAG: 'K',
  // Aspartate & Glutamate
  GAU: 'D', GAC: 'D', GAA: 'E', GAG: 'E',
  // Cysteine, Stop (Opal) & Tryptophan
  UGU: 'C', UGC: 'C', UGA: '*', UGG: 'W',
  // Arginine
  CGU: 'R', CGC: 'R', CGA: 'R', CGG: 'R',
  // Serine & Arginine
  AGU: 'S', AGC: 'S', AGA: 'R', AGG: 'R',
  // Glycine
  GGU: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
};

const STOP_CODONS = new Set(['UAA', 'UAG', 'UGA']);

export const FRAME_COLORS: Record<ReadingFrame, { bg: string; text: string; border: string; track: string }> = {
  '+1': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-300',
    track: '#6366F1', // Indigo-500
  },
  '+2': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    track: '#10B981', // Emerald-500
  },
  '+3': {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-300',
    track: '#A855F7', // Purple-500
  },
};

/**
 * Translates an RNA coding sequence into single-letter amino acid sequence.
 */
export function translateRnaToPeptide(rnaSeq: string): string {
  const clean = rnaSeq.toUpperCase().replace(/T/g, 'U');
  const peptide: string[] = [];
  for (let i = 0; i <= clean.length - 3; i += 3) {
    const codon = clean.slice(i, i + 3);
    const aa = RNA_CODON_TABLE[codon] || 'X';
    if (aa === '*') break;
    peptide.push(aa);
  }
  return peptide.join('');
}

/**
 * Evaluates plant translation initiation context (Kozak consensus).
 * Ideal plant motif: [A/G] at -3, AUG, [G] at +4 (e.g. RNNaugG or A/GaaAUGG).
 */
export function calculatePlantKozakContext(
  fullSeq: string,
  startZeroIndex: number
): { scorePercent: number; context: string } {
  const pMinus3 = startZeroIndex >= 3 ? fullSeq[startZeroIndex - 3] : '';
  const pMinus2 = startZeroIndex >= 2 ? fullSeq[startZeroIndex - 2] : '';
  const pMinus1 = startZeroIndex >= 1 ? fullSeq[startZeroIndex - 1] : '';
  const pPlus4 = startZeroIndex + 3 < fullSeq.length ? fullSeq[startZeroIndex + 3] : '';

  let matches = 0;
  let totalCriteria = 2;

  // Criterion 1: Purine (A or G) at position -3
  if (pMinus3 === 'A' || pMinus3 === 'G') {
    matches++;
  }

  // Criterion 2: Guanine (G) at position +4
  if (pPlus4 === 'G') {
    matches++;
  }

  const scorePercent = Math.round((matches / totalCriteria) * 100);
  const context = `${pMinus3 || '-'}${pMinus2 || '-'}${pMinus1 || '-'}AUG${pPlus4 || '-'}`;

  return { scorePercent, context };
}

/**
 * Scans RNA sequence across all 3 forward reading frames (+1, +2, +3)
 * for Open Reading Frames (ORFs) from start codon (AUG) to stop codon (UAA, UAG, UGA).
 */
export function findOpenReadingFrames(
  rawSequence: string,
  options: OrfFinderOptions = {}
): OrfAnalysisResult {
  const minAaLength = options.minAaLength ?? 15;
  const allowOverlapping = options.allowOverlapping ?? true;

  const cleanSeq = (rawSequence || '')
    .toUpperCase()
    .replace(/[^ACGUTacgut]/g, '')
    .replace(/T/g, 'U');

  const len = cleanSeq.length;

  if (len < 9) {
    return {
      querySequence: cleanSeq,
      sequenceLength: len,
      totalOrfsCount: 0,
      longestOrf: null,
      longestAaLength: 0,
      bonaFideNonCoding: true,
      codingPotentialAssessment: 'Sequence length is too short to encode a functional reading frame (<9 nt).',
      frameCounts: { '+1': 0, '+2': 0, '+3': 0 },
      orfs: [],
    };
  }

  const orfs: OpenReadingFrame[] = [];
  const frameCounts: Record<ReadingFrame, number> = { '+1': 0, '+2': 0, '+3': 0 };

  const frames: { name: ReadingFrame; index: number }[] = [
    { name: '+1', index: 0 },
    { name: '+2', index: 1 },
    { name: '+3', index: 2 },
  ];

  let orfCounter = 1;

  for (const { name: frameName, index: frameOffset } of frames) {
    // Scan triplets along this reading frame
    for (let i = frameOffset; i <= len - 3; i += 3) {
      const codon = cleanSeq.slice(i, i + 3);

      if (codon === 'AUG') {
        // Start codon found at 0-indexed position i (1-indexed: i + 1)
        const startPos = i + 1;

        // Traverse downstream in triplets to find nearest in-frame stop codon
        for (let j = i + 3; j <= len - 3; j += 3) {
          const stopCodon = cleanSeq.slice(j, j + 3);

          if (STOP_CODONS.has(stopCodon)) {
            const endPos = j + 3;
            const ntLength = endPos - startPos + 1;
            const aaLength = (ntLength - 3) / 3; // excluding stop codon

            if (aaLength >= minAaLength) {
              const ntSequence = cleanSeq.slice(i, j + 3);
              const peptide = translateRnaToPeptide(ntSequence);
              const kozak = calculatePlantKozakContext(cleanSeq, i);

              let classification: CodingPotentialClassification;
              if (aaLength < 30) {
                classification = 'Strict Non-Coding (<30 aa)';
              } else if (aaLength < 100) {
                classification = 'Putative sORF / Micropeptide (30–99 aa)';
              } else {
                classification = 'Atypical Long ORF (≥100 aa / Potential Coding)';
              }

              orfs.push({
                id: `orf_${orfCounter++}_${frameName}_${startPos}`,
                frame: frameName,
                frameIndex: frameOffset,
                start: startPos,
                end: endPos,
                ntLength,
                aaLength,
                startCodon: 'AUG',
                stopCodon,
                nucleotideSequence: ntSequence,
                peptideSequence: peptide,
                kozakScorePercent: kozak.scorePercent,
                kozakContext: kozak.context,
                classification,
                color: FRAME_COLORS[frameName],
              });

              frameCounts[frameName]++;
            }

            // If not allowing overlapping starts within the same ORF, jump i forward
            if (!allowOverlapping) {
              i = j;
            }
            break; // Stop codon handled for this start
          }
        }
      }
    }
  }

  // Sort ORFs by coordinate and length
  orfs.sort((a, b) => a.start - b.start || b.aaLength - a.aaLength);

  const longestOrf = orfs.length > 0
    ? orfs.reduce((max, cur) => (cur.aaLength > max.aaLength ? cur : max), orfs[0])
    : null;

  const longestAaLength = longestOrf ? longestOrf.aaLength : 0;
  const bonaFideNonCoding = longestAaLength < 100;

  let codingPotentialAssessment = '';
  if (longestAaLength === 0) {
    codingPotentialAssessment =
      'No canonical open reading frames detected (no in-frame AUG to Stop codon units). High non-coding confidence.';
  } else if (longestAaLength < 30) {
    codingPotentialAssessment =
      `Longest ORF is ${longestAaLength} aa (<30 aa). Meets strict non-coding criteria (CPC2/CPAT standards).`;
  } else if (longestAaLength < 100) {
    codingPotentialAssessment =
      `Longest ORF is ${longestAaLength} aa (30–99 aa). Transcript qualifies as a bona fide plant lncRNA (<100 aa cutoff) with potential regulatory small ORF / micropeptide (sORF) activity.`;
  } else {
    codingPotentialAssessment =
      `Contains an atypical long ORF of ${longestAaLength} aa (≥100 aa / ${longestOrf?.ntLength} nt). This transcript may possess dual-function coding/non-coding properties or require checking for protein-coding overlap.`;
  }

  return {
    querySequence: cleanSeq,
    sequenceLength: len,
    totalOrfsCount: orfs.length,
    longestOrf,
    longestAaLength,
    bonaFideNonCoding,
    codingPotentialAssessment,
    frameCounts,
    orfs,
  };
}

/**
 * Formats identified ORFs into a standard FASTA file (Peptide or Nucleotide).
 */
export function formatOrfsToFasta(
  orfs: OpenReadingFrame[],
  lncRnaName: string,
  asPeptide = true
): string {
  if (orfs.length === 0) {
    return `>No_ORFs_Identified | ${lncRnaName}\n`;
  }

  const lines: string[] = [];
  orfs.forEach((orf, idx) => {
    const header = `>${lncRnaName}_ORF${idx + 1} | Frame: ${orf.frame} | Pos: ${orf.start}..${orf.end} | ${orf.aaLength} aa (${orf.ntLength} nt) | ${orf.classification}`;
    const seq = asPeptide ? orf.peptideSequence : orf.nucleotideSequence;

    // Line wrap at 70 characters
    const chunks: string[] = [];
    for (let i = 0; i < seq.length; i += 70) {
      chunks.push(seq.slice(i, i + 70));
    }
    lines.push(header);
    lines.push(chunks.join('\n'));
  });

  return lines.join('\n');
}
