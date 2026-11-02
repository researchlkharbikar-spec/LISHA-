/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Multi-Sequence Alignment (MSA) Engine
 * Implements progressive multiple sequence alignment with guide-tree clustering,
 * column conservation scoring, consensus calculation, and Clustal-compliant formatting.
 */

import { needlemanWunschAlign } from './bioCalculations';

export interface MsaInputSequence {
  id: string;
  name: string;
  sequence: string;
  species?: string;
  category?: string;
}

export interface MsaColumnAnalysis {
  index: number; // 0-indexed column
  position: number; // 1-indexed column
  consensusBase: string; // 'A', 'C', 'G', 'U', or '-'
  conservationScore: number; // 0.0 - 1.0
  conservationPercent: number; // 0 - 100%
  identitySymbol: '*' | ':' | '.' | ' '; // Clustal format symbol
  baseCounts: Record<string, number>;
  gapCount: number;
  gapFraction: number;
}

export interface MsaResult {
  alignedSequences: {
    id: string;
    name: string;
    alignedSeq: string;
    originalLength: number;
    gapCount: number;
  }[];
  alignmentLength: number;
  consensusSequence: string;
  identityLine: string; // Clustal consensus line (* for identical, : for conserved)
  columns: MsaColumnAnalysis[];
  meanConservationPercent: number;
  identicalColumnsCount: number;
  gapFractionTotal: number;
}

/**
 * Normalizes input RNA sequence (uppercase, T->U, strictly valid ACGU)
 */
function cleanRna(seq: string): string {
  return (seq || '').toUpperCase().replace(/[^ACGTU]/g, '').replace(/T/g, 'U');
}

/**
 * Calculates pairwise Needleman-Wunsch distance matrix between N sequences.
 * Distance = 1 - (identity / alignment_length)
 */
export function calculatePairwiseDistanceMatrix(sequences: { sequence: string }[]): number[][] {
  const n = sequences.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const align = needlemanWunschAlign(sequences[i].sequence, sequences[j].sequence);
      const similarity = align.length > 0 ? (align.identityPercent / 100) : 0;
      const distance = Math.max(0, 1 - similarity);
      matrix[i][j] = distance;
      matrix[j][i] = distance;
    }
  }

  return matrix;
}

/**
 * Center-Star Progressive Alignment:
 * Finds the sequence with the minimum sum of distances to all other sequences (the "center star"),
 * and progressively aligns all sequences to the center star, maintaining consistent gap placement.
 */
export function performMultiSequenceAlignment(inputSequences: MsaInputSequence[]): MsaResult {
  const validInputs = inputSequences
    .map((s) => ({
      ...s,
      cleanSeq: cleanRna(s.sequence),
    }))
    .filter((s) => s.cleanSeq.length > 0);

  if (validInputs.length === 0) {
    return {
      alignedSequences: [],
      alignmentLength: 0,
      consensusSequence: '',
      identityLine: '',
      columns: [],
      meanConservationPercent: 0,
      identicalColumnsCount: 0,
      gapFractionTotal: 0,
    };
  }

  if (validInputs.length === 1) {
    const s = validInputs[0];
    const columns: MsaColumnAnalysis[] = s.cleanSeq.split('').map((base, idx) => ({
      index: idx,
      position: idx + 1,
      consensusBase: base,
      conservationScore: 1.0,
      conservationPercent: 100,
      identitySymbol: '*',
      baseCounts: { [base]: 1 },
      gapCount: 0,
      gapFraction: 0,
    }));

    return {
      alignedSequences: [
        {
          id: s.id,
          name: s.name,
          alignedSeq: s.cleanSeq,
          originalLength: s.cleanSeq.length,
          gapCount: 0,
        },
      ],
      alignmentLength: s.cleanSeq.length,
      consensusSequence: s.cleanSeq,
      identityLine: '*'.repeat(s.cleanSeq.length),
      columns,
      meanConservationPercent: 100,
      identicalColumnsCount: s.cleanSeq.length,
      gapFractionTotal: 0,
    };
  }

  const n = validInputs.length;
  const distMatrix = calculatePairwiseDistanceMatrix(validInputs.map((s) => ({ sequence: s.cleanSeq })));

  // Find center sequence (minimum sum of distances to all other sequences)
  let centerIdx = 0;
  let minSumDist = Infinity;
  for (let i = 0; i < n; i++) {
    const sumDist = distMatrix[i].reduce((a, b) => a + b, 0);
    if (sumDist < minSumDist) {
      minSumDist = sumDist;
      centerIdx = i;
    }
  }

  // Align each sequence to the center sequence
  const centerSeq = validInputs[centerIdx].cleanSeq;
  const pairwiseWithCenter: { alignedCenter: string; alignedOther: string }[] = [];

  for (let i = 0; i < n; i++) {
    if (i === centerIdx) {
      pairwiseWithCenter.push({
        alignedCenter: centerSeq,
        alignedOther: centerSeq,
      });
    } else {
      const align = needlemanWunschAlign(centerSeq, validInputs[i].cleanSeq);
      pairwiseWithCenter.push({
        alignedCenter: align.alignedSeq1,
        alignedOther: align.alignedSeq2,
      });
    }
  }

  // Merge pairwise alignments by inserting gaps into center sequence
  // where any other alignment introduced a gap into center
  let mergedCenter = centerSeq;
  for (let i = 0; i < n; i++) {
    if (i === centerIdx) continue;
    const { alignedCenter } = pairwiseWithCenter[i];

    // Merge gaps from alignedCenter into mergedCenter
    let mergedIdx = 0;
    let newMerged = '';
    for (let c = 0; c < alignedCenter.length; c++) {
      const ch = alignedCenter[c];
      if (ch === '-') {
        newMerged += '-';
      } else {
        while (mergedIdx < mergedCenter.length && mergedCenter[mergedIdx] === '-') {
          newMerged += '-';
          mergedIdx++;
        }
        newMerged += mergedCenter[mergedIdx] || ch;
        mergedIdx++;
      }
    }
    while (mergedIdx < mergedCenter.length) {
      newMerged += mergedCenter[mergedIdx];
      mergedIdx++;
    }
    mergedCenter = newMerged;
  }

  // Now project all other sequences onto the mergedCenter coordinate system
  const finalAligned: string[] = [];

  for (let i = 0; i < n; i++) {
    const { alignedCenter, alignedOther } = pairwiseWithCenter[i];
    let otherIdx = 0;
    let result = '';

    for (let m = 0; m < mergedCenter.length; m++) {
      const mcChar = mergedCenter[m];
      if (otherIdx < alignedCenter.length && alignedCenter[otherIdx] === mcChar) {
        result += alignedOther[otherIdx];
        otherIdx++;
      } else {
        result += '-';
      }
    }
    finalAligned.push(result);
  }

  // Pad any trailing gaps to ensure identical alignment length
  const maxLen = Math.max(...finalAligned.map((s) => s.length));
  const uniformAligned = finalAligned.map((s) => s.padEnd(maxLen, '-'));

  // Analyze columns
  const columns: MsaColumnAnalysis[] = [];
  let consensusStr = '';
  let identityLineStr = '';
  let identicalColCount = 0;
  let totalConservation = 0;
  let totalGaps = 0;

  for (let c = 0; c < maxLen; c++) {
    const counts: Record<string, number> = {};
    let colGaps = 0;

    for (let i = 0; i < n; i++) {
      const b = uniformAligned[i][c] || '-';
      if (b === '-') {
        colGaps++;
      } else {
        counts[b] = (counts[b] || 0) + 1;
      }
    }

    totalGaps += colGaps;
    const nonGapCount = n - colGaps;

    // Determine highest frequency base
    let maxBase = '-';
    let maxCount = 0;
    Object.entries(counts).forEach(([base, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        maxBase = base;
      }
    });

    const colScore = n > 0 ? (maxCount / n) : 0;
    const colScorePct = Math.round(colScore * 1000) / 10;
    totalConservation += colScorePct;

    let symbol: '*' | ':' | '.' | ' ' = ' ';
    if (nonGapCount === n && maxCount === n) {
      symbol = '*';
      identicalColCount++;
    } else if (colScore >= 0.75) {
      symbol = ':';
    } else if (colScore >= 0.5) {
      symbol = '.';
    }

    consensusStr += maxBase;
    identityLineStr += symbol;

    columns.push({
      index: c,
      position: c + 1,
      consensusBase: maxBase,
      conservationScore: colScore,
      conservationPercent: colScorePct,
      identitySymbol: symbol,
      baseCounts: counts,
      gapCount: colGaps,
      gapFraction: n > 0 ? colGaps / n : 0,
    });
  }

  const alignedSequences = validInputs.map((s, idx) => ({
    id: s.id,
    name: s.name,
    alignedSeq: uniformAligned[idx],
    originalLength: s.cleanSeq.length,
    gapCount: (uniformAligned[idx].match(/-/g) || []).length,
  }));

  const meanConservation = maxLen > 0 ? Math.round((totalConservation / maxLen) * 10) / 10 : 0;
  const gapFractionTotal = (maxLen * n) > 0 ? Math.round((totalGaps / (maxLen * n)) * 1000) / 10 : 0;

  return {
    alignedSequences,
    alignmentLength: maxLen,
    consensusSequence: consensusStr,
    identityLine: identityLineStr,
    columns,
    meanConservationPercent: meanConservation,
    identicalColumnsCount: identicalColCount,
    gapFractionTotal,
  };
}

/**
 * Formats MSA result into standard Clustal (.aln) format blocks (e.g. 60 nt blocks).
 */
export function formatToClustalAln(msa: MsaResult, blockWidth = 60): string {
  const lines: string[] = ['CLUSTAL W (1.83) multiple sequence alignment\n'];
  const n = msa.alignedSequences.length;
  if (n === 0) return '';

  const maxNameLen = Math.min(24, Math.max(...msa.alignedSequences.map((s) => s.name.length)));

  for (let start = 0; start < msa.alignmentLength; start += blockWidth) {
    const end = Math.min(msa.alignmentLength, start + blockWidth);

    for (let i = 0; i < n; i++) {
      const seq = msa.alignedSequences[i];
      const chunk = seq.alignedSeq.slice(start, end);
      const paddedName = seq.name.slice(0, 24).padEnd(maxNameLen + 4, ' ');
      lines.push(`${paddedName}${chunk}   ${end}`);
    }

    // Identity line
    const identChunk = msa.identityLine.slice(start, end);
    const spacePrefix = ' '.repeat(maxNameLen + 4);
    lines.push(`${spacePrefix}${identChunk}\n`);
  }

  return lines.join('\n');
}

/**
 * Formats MSA result into standard aligned FASTA format.
 */
export function formatToAlignedFasta(msa: MsaResult): string {
  return msa.alignedSequences
    .map((s) => `>${s.name} | length=${s.originalLength}nt | gaps=${s.gapCount}\n${s.alignedSeq}`)
    .join('\n\n');
}
