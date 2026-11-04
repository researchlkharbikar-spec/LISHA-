/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Pairwise Sequence Alignment Engine
 * Implements Needleman-Wunsch global dynamic programming alignment
 * for pairwise lncRNA sequence comparison with detailed identity metrics,
 * alignment chunking, and matrix traceback visualization.
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import { cleanSequence } from './bioCalculations';

export interface AlignmentScoringParameters {
  matchReward: number;      // e.g. +2
  mismatchPenalty: number;  // e.g. -1
  gapPenalty: number;       // e.g. -2
}

export const DEFAULT_ALIGNMENT_PARAMS: AlignmentScoringParameters = {
  matchReward: 2,
  mismatchPenalty: -1,
  gapPenalty: -2,
};

export interface AlignmentBlock {
  blockIndex: number;
  seq1Chunk: string;
  matchChunk: string;
  seq2Chunk: string;
  start1: number; // 1-indexed in original sequence
  end1: number;
  start2: number;
  end2: number;
}

export interface DpMatrixCell {
  row: number;
  col: number;
  score: number;
  isTracebackPath: boolean;
}

export interface PairwiseAlignmentResult {
  seq1Name: string;
  seq2Name: string;
  rawSeq1: string;
  rawSeq2: string;
  cleanSeq1: string;
  cleanSeq2: string;
  len1: number;
  len2: number;
  gc1: number;
  gc2: number;
  alignedSeq1: string;
  alignedSeq2: string;
  matchLine: string;
  score: number;
  identityPercent: number;       // The headline identity score %
  similarityPercent: number;
  matchesCount: number;
  mismatchesCount: number;
  gapsCount: number;
  gapPercent: number;
  alignmentLength: number;
  homologyCategory: 'High Conservation (≥70%)' | 'Moderate Homology (50-69%)' | 'Low Homology (35-49%)' | 'Divergent / Non-homologous (<35%)';
  homologyDescription: string;
  blocks: AlignmentBlock[];
  matrixPreview?: {
    seq1Chars: string[];
    seq2Chars: string[];
    matrix: DpMatrixCell[][];
  };
}

/**
 * Calculates GC% of a nucleotide sequence
 */
export function calculateGcContent(seq: string): number {
  if (!seq.length) return 0;
  const gcCount = (seq.match(/[GCgc]/g) || []).length;
  return Math.round((gcCount / seq.length) * 1000) / 10;
}

/**
 * Performs Needleman-Wunsch Global Alignment between two lncRNA sequences
 */
export function performNeedlemanWunschAlignment(
  seq1: string,
  seq2: string,
  seq1Name = 'Sequence 1 (Query)',
  seq2Name = 'Sequence 2 (Subject)',
  params: AlignmentScoringParameters = DEFAULT_ALIGNMENT_PARAMS,
  chunkSize = 60
): PairwiseAlignmentResult {
  const s1 = cleanSequence(seq1);
  const s2 = cleanSequence(seq2);
  const m = s1.length;
  const n = s2.length;

  const gc1 = calculateGcContent(s1);
  const gc2 = calculateGcContent(s2);

  if (m === 0 || n === 0) {
    return {
      seq1Name,
      seq2Name,
      rawSeq1: seq1,
      rawSeq2: seq2,
      cleanSeq1: s1,
      cleanSeq2: s2,
      len1: m,
      len2: n,
      gc1,
      gc2,
      alignedSeq1: '',
      alignedSeq2: '',
      matchLine: '',
      score: 0,
      identityPercent: 0,
      similarityPercent: 0,
      matchesCount: 0,
      mismatchesCount: 0,
      gapsCount: 0,
      gapPercent: 0,
      alignmentLength: 0,
      homologyCategory: 'Divergent / Non-homologous (<35%)',
      homologyDescription: 'One or both sequences are empty. Enter valid nucleotide sequences to align.',
      blocks: [],
    };
  }

  const { matchReward, mismatchPenalty, gapPenalty } = params;

  // Initialize DP matrix H
  const H: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) H[i][0] = i * gapPenalty;
  for (let j = 0; j <= n; j++) H[0][j] = j * gapPenalty;

  // Fill DP matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const matchScore = s1[i - 1] === s2[j - 1] ? matchReward : mismatchPenalty;
      const diag = H[i - 1][j - 1] + matchScore;
      const up = H[i - 1][j] + gapPenalty;
      const left = H[i][j - 1] + gapPenalty;
      H[i][j] = Math.max(diag, up, left);
    }
  }

  // Traceback to find optimal global alignment
  let currI = m;
  let currJ = n;
  let al1 = '';
  let al2 = '';
  let matches = 0;
  let gaps = 0;

  // Track traceback coordinates for matrix preview
  const tracebackCoords = new Set<string>();
  tracebackCoords.add(`${currI},${currJ}`);

  while (currI > 0 || currJ > 0) {
    if (currI > 0 && currJ > 0) {
      const matchScore = s1[currI - 1] === s2[currJ - 1] ? matchReward : mismatchPenalty;
      if (H[currI][currJ] === H[currI - 1][currJ - 1] + matchScore) {
        al1 = s1[currI - 1] + al1;
        al2 = s2[currJ - 1] + al2;
        if (s1[currI - 1] === s2[currJ - 1]) {
          matches++;
        }
        currI--;
        currJ--;
        tracebackCoords.add(`${currI},${currJ}`);
        continue;
      }
    }

    if (currI > 0 && H[currI][currJ] === H[currI - 1][currJ] + gapPenalty) {
      al1 = s1[currI - 1] + al1;
      al2 = '-' + al2;
      gaps++;
      currI--;
      tracebackCoords.add(`${currI},${currJ}`);
    } else {
      al1 = '-' + al1;
      al2 = s2[currJ - 1] + al2;
      gaps++;
      currJ--;
      tracebackCoords.add(`${currI},${currJ}`);
    }
  }

  // Construct match line: '|' match, ':' transition/conservative, ' ' mismatch or gap
  let matchLine = '';
  for (let k = 0; k < al1.length; k++) {
    const c1 = al1[k];
    const c2 = al2[k];
    if (c1 === c2 && c1 !== '-') {
      matchLine += '|';
    } else if (c1 === '-' || c2 === '-') {
      matchLine += ' ';
    } else if (
      (c1 === 'A' && c2 === 'G') || (c1 === 'G' && c2 === 'A') ||
      (c1 === 'C' && c2 === 'U') || (c1 === 'U' && c2 === 'C')
    ) {
      // Purine-purine or pyrimidine-pyrimidine transition
      matchLine += ':';
    } else {
      matchLine += '.';
    }
  }

  const alignmentLength = al1.length || 1;
  const identityPercent = Math.round((matches / alignmentLength) * 1000) / 10;
  const mismatchesCount = alignmentLength - matches - gaps;
  const similarityCount = matches + (matchLine.match(/:/g) || []).length;
  const similarityPercent = Math.round((similarityCount / alignmentLength) * 1000) / 10;
  const gapPercent = Math.round((gaps / alignmentLength) * 1000) / 10;

  // Determine homology category and physiological interpretation
  let homologyCategory: PairwiseAlignmentResult['homologyCategory'] = 'Divergent / Non-homologous (<35%)';
  let homologyDescription = '';

  if (identityPercent >= 70) {
    homologyCategory = 'High Conservation (≥70%)';
    homologyDescription =
      'Extremely high global nucleotide conservation indicating likely orthology or functional duplication in plant biotic stress defense cascades.';
  } else if (identityPercent >= 50) {
    homologyCategory = 'Moderate Homology (50-69%)';
    homologyDescription =
      'Substantial sequence conservation. Core structural domains, hairpin loops, or miRNA-binding seed blocks are likely preserved between these transcripts.';
  } else if (identityPercent >= 35) {
    homologyCategory = 'Low Homology (35-49%)';
    homologyDescription =
      'Weak global sequence conservation. While global alignment is low, specific localized cis-elements or functional motifs may still be shared.';
  } else {
    homologyCategory = 'Divergent / Non-homologous (<35%)';
    homologyDescription =
      'Low sequence identity below standard homology thresholds. Sequences appear evolutionary divergent or possess independent evolutionary origins.';
  }

  // Construct chunked blocks with position tracking
  const blocks: AlignmentBlock[] = [];
  let pos1 = 1;
  let pos2 = 1;

  for (let offset = 0; offset < alignmentLength; offset += chunkSize) {
    const chunk1 = al1.slice(offset, offset + chunkSize);
    const chunkMatch = matchLine.slice(offset, offset + chunkSize);
    const chunk2 = al2.slice(offset, offset + chunkSize);

    const nonGap1 = (chunk1.match(/[^-]/g) || []).length;
    const nonGap2 = (chunk2.match(/[^-]/g) || []).length;

    const start1 = nonGap1 > 0 ? pos1 : pos1;
    const end1 = nonGap1 > 0 ? pos1 + nonGap1 - 1 : pos1;
    const start2 = nonGap2 > 0 ? pos2 : pos2;
    const end2 = nonGap2 > 0 ? pos2 + nonGap2 - 1 : pos2;

    blocks.push({
      blockIndex: Math.floor(offset / chunkSize) + 1,
      seq1Chunk: chunk1,
      matchChunk: chunkMatch,
      seq2Chunk: chunk2,
      start1,
      end1,
      start2,
      end2,
    });

    pos1 += nonGap1;
    pos2 += nonGap2;
  }

  // Generate a sampled preview of the DP score matrix (up to 12x12 cells)
  const previewMax = 12;
  const pRows = Math.min(m + 1, previewMax);
  const pCols = Math.min(n + 1, previewMax);
  const previewMatrix: DpMatrixCell[][] = [];

  for (let i = 0; i < pRows; i++) {
    const rowCells: DpMatrixCell[] = [];
    for (let j = 0; j < pCols; j++) {
      rowCells.push({
        row: i,
        col: j,
        score: H[i][j],
        isTracebackPath: tracebackCoords.has(`${i},${j}`),
      });
    }
    previewMatrix.push(rowCells);
  }

  const matrixPreview = {
    seq1Chars: ['-', ...s1.slice(0, pRows - 1).split('')],
    seq2Chars: ['-', ...s2.slice(0, pCols - 1).split('')],
    matrix: previewMatrix,
  };

  return {
    seq1Name,
    seq2Name,
    rawSeq1: seq1,
    rawSeq2: seq2,
    cleanSeq1: s1,
    cleanSeq2: s2,
    len1: m,
    len2: n,
    gc1,
    gc2,
    alignedSeq1: al1,
    alignedSeq2: al2,
    matchLine,
    score: H[m][n],
    identityPercent,
    similarityPercent,
    matchesCount: matches,
    mismatchesCount,
    gapsCount: gaps,
    gapPercent,
    alignmentLength,
    homologyCategory,
    homologyDescription,
    blocks,
    matrixPreview,
  };
}

/**
 * Formats pairwise alignment as standard FASTA alignment output
 */
export function formatPairwiseToFasta(result: PairwiseAlignmentResult): string {
  return [
    `>${result.seq1Name} | Length: ${result.len1} nt | GC: ${result.gc1}% | Identity: ${result.identityPercent}%`,
    result.alignedSeq1,
    `>${result.seq2Name} | Length: ${result.len2} nt | GC: ${result.gc2}% | Score: ${result.score}`,
    result.alignedSeq2,
  ].join('\n');
}

/**
 * Formats pairwise alignment as standard Clustal-style text file
 */
export function formatPairwiseToTextReport(result: PairwiseAlignmentResult): string {
  const lines: string[] = [
    '========================================================================',
    'LISHA PAIRWISE GLOBAL SEQUENCE ALIGNMENT REPORT',
    'Algorithm: Needleman-Wunsch Dynamic Programming (Global Alignment)',
    'Lead Investigator: Prof. Lalit Laxman Kharbikar, ICAR-NIBSM, Raipur',
    '========================================================================',
    `Sequence 1: ${result.seq1Name} (${result.len1} nt, GC: ${result.gc1}%)`,
    `Sequence 2: ${result.seq2Name} (${result.len2} nt, GC: ${result.gc2}%)`,
    `Alignment Score : ${result.score}`,
    `Identity Score  : ${result.identityPercent}% (${result.matchesCount}/${result.alignmentLength} matches)`,
    `Similarity Score: ${result.similarityPercent}%`,
    `Gaps            : ${result.gapsCount}/${result.alignmentLength} (${result.gapPercent}%)`,
    `Classification  : ${result.homologyCategory}`,
    '------------------------------------------------------------------------',
    'ALIGNMENT TRACEBACK (5\' -> 3\'):',
    '',
  ];

  result.blocks.forEach((block) => {
    lines.push(`Seq1 [${String(block.start1).padStart(5, ' ')}..${String(block.end1).padEnd(5, ' ')}]  ${block.seq1Chunk}`);
    lines.push(`                    ${block.matchChunk}`);
    lines.push(`Seq2 [${String(block.start2).padStart(5, ' ')}..${String(block.end2).padEnd(5, ' ')}]  ${block.seq2Chunk}`);
    lines.push('');
  });

  lines.push('========================================================================');
  return lines.join('\n');
}
