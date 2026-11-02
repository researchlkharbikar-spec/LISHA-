/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Homology Sequence Matrix Identity Calculator
 * Computes sliding-window and block-based identity percentages across
 * the target lncRNA sequence matrix against retrieved database homologs.
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM.
 */

import { cleanSequence, smithWatermanAlign, needlemanWunschAlign } from './bioCalculations';
import { CURATED_LNCRNAS, type CuratedLncRNA } from '../data/curatedLncRNAs';

export interface SequenceMatrixCell {
  colIndex: number;
  startPos: number; // 1-indexed
  endPos: number; // 1-indexed
  length: number;
  homologId: string;
  homologName: string;
  homologSpecies: string;
  homologDisease: string;
  identityPercent: number; // 0 - 100%
  similarityPercent: number; // 0 - 100%
  matchesCount: number;
  subQuerySeq: string;
  homologMatchSlice: string;
}

export interface SequenceMatrixColumnSummary {
  colIndex: number;
  startPos: number;
  endPos: number;
  length: number;
  meanIdentityPercent: number;
  maxIdentityPercent: number;
  topHomologName: string;
  consensusPattern: string;
}

export interface SequenceMatrixRowSummary {
  homologId: string;
  homologName: string;
  homologSpecies: string;
  homologDisease: string;
  globalIdentityPercent: number;
  globalSimilarityPercent: number;
  alignmentScore: number;
  peakIdentityPercent: number;
  peakIdentityWindow: [number, number];
}

export interface HomologySequenceMatrixResult {
  queryLength: number;
  blockSize: number;
  columnsCount: number;
  cells: SequenceMatrixCell[][]; // rows: homologs, cols: blocks
  columnSummaries: SequenceMatrixColumnSummary[];
  rowSummaries: SequenceMatrixRowSummary[];
  meanGlobalIdentity: number;
  highestIdentityHomolog: string;
}

/**
 * Computes the homology sequence matrix of identity percentages
 * between target lncRNA and database homologs across sequence blocks.
 */
export function calculateHomologySequenceMatrix(
  querySequence: string,
  homologs: CuratedLncRNA[] = CURATED_LNCRNAS,
  blockSize = 10
): HomologySequenceMatrixResult {
  const query = cleanSequence(querySequence);
  const qLen = query.length;

  if (qLen === 0 || homologs.length === 0) {
    return {
      queryLength: 0,
      blockSize,
      columnsCount: 0,
      cells: [],
      columnSummaries: [],
      rowSummaries: [],
      meanGlobalIdentity: 0,
      highestIdentityHomolog: 'None',
    };
  }

  // Adjust block size if query is very short or long
  const bSize = Math.max(4, Math.min(blockSize, qLen));
  const colsCount = Math.ceil(qLen / bSize);

  // Define column segments
  const columns: { colIndex: number; startPos: number; endPos: number; length: number; subSeq: string }[] = [];
  for (let c = 0; c < colsCount; c++) {
    const start = c * bSize;
    const end = Math.min(qLen, start + bSize);
    columns.push({
      colIndex: c,
      startPos: start + 1,
      endPos: end,
      length: end - start,
      subSeq: query.slice(start, end),
    });
  }

  // Matrix rows (each homolog)
  const matrixCells: SequenceMatrixCell[][] = [];
  const rowSummaries: SequenceMatrixRowSummary[] = [];

  let sumGlobalIdentity = 0;
  let maxGlobalId = -1;
  let topHomolog = homologs[0].name;

  for (const homolog of homologs) {
    const hSeq = cleanSequence(homolog.sequence);
    // Global alignment for baseline identity
    const globalAlign = needlemanWunschAlign(query, hSeq);
    const globalId = globalAlign.identityPercent;
    const globalSim = globalAlign.similarityPercent;

    sumGlobalIdentity += globalId;
    if (globalId > maxGlobalId) {
      maxGlobalId = globalId;
      topHomolog = homolog.name;
    }

    const rowCells: SequenceMatrixCell[] = [];
    let peakId = 0;
    let peakWin: [number, number] = [1, bSize];

    for (const col of columns) {
      // Align this block of query against homolog
      // Use local Smith-Waterman alignment of the block
      const localAlign = smithWatermanAlign(col.subSeq, hSeq);
      let localId = 0;
      let localSim = 0;
      let matches = 0;
      let matchSlice = '';

      if (localAlign.length > 0) {
        // Calculate identity percentage relative to the block length
        matches = Math.round((localAlign.identityPercent / 100) * localAlign.length);
        localId = Math.min(100, Math.round((matches / col.length) * 1000) / 10);
        localSim = localAlign.similarityPercent;
        matchSlice = localAlign.alignedSeq2.replace(/-/g, '');
      }

      if (localId > peakId) {
        peakId = localId;
        peakWin = [col.startPos, col.endPos];
      }

      rowCells.push({
        colIndex: col.colIndex,
        startPos: col.startPos,
        endPos: col.endPos,
        length: col.length,
        homologId: homolog.id,
        homologName: homolog.name,
        homologSpecies: homolog.species,
        homologDisease: homolog.diseaseName,
        identityPercent: localId,
        similarityPercent: localSim,
        matchesCount: matches,
        subQuerySeq: col.subSeq,
        homologMatchSlice: matchSlice.slice(0, col.length) || '-',
      });
    }

    matrixCells.push(rowCells);

    rowSummaries.push({
      homologId: homolog.id,
      homologName: homolog.name,
      homologSpecies: homolog.species,
      homologDisease: homolog.diseaseName,
      globalIdentityPercent: globalId,
      globalSimilarityPercent: globalSim,
      alignmentScore: globalAlign.score,
      peakIdentityPercent: peakId,
      peakIdentityWindow: peakWin,
    });
  }

  // Calculate column summaries (conservation profile along query sequence)
  const columnSummaries: SequenceMatrixColumnSummary[] = [];
  for (let c = 0; c < colsCount; c++) {
    const colInfo = columns[c];
    let sumColId = 0;
    let maxColId = 0;
    let topColHomolog = '';

    for (let r = 0; r < homologs.length; r++) {
      const cell = matrixCells[r][c];
      sumColId += cell.identityPercent;
      if (cell.identityPercent >= maxColId) {
        maxColId = cell.identityPercent;
        topColHomolog = cell.homologName;
      }
    }

    const meanId = Math.round((sumColId / homologs.length) * 10) / 10;

    columnSummaries.push({
      colIndex: c,
      startPos: colInfo.startPos,
      endPos: colInfo.endPos,
      length: colInfo.length,
      meanIdentityPercent: meanId,
      maxIdentityPercent: maxColId,
      topHomologName: topColHomolog,
      consensusPattern: colInfo.subSeq,
    });
  }

  const meanGlobal = homologs.length > 0 ? Math.round((sumGlobalIdentity / homologs.length) * 10) / 10 : 0;

  return {
    queryLength: qLen,
    blockSize: bSize,
    columnsCount: colsCount,
    cells: matrixCells,
    columnSummaries,
    rowSummaries,
    meanGlobalIdentity: meanGlobal,
    highestIdentityHomolog: topHomolog,
  };
}
