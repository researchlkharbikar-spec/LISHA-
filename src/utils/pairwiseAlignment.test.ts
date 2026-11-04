/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit tests for Pairwise Alignment Needleman-Wunsch Engine
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  performNeedlemanWunschAlignment,
  formatPairwiseToFasta,
  formatPairwiseToTextReport,
  calculateGcContent,
  DEFAULT_ALIGNMENT_PARAMS,
} from './pairwiseAlignment';

test('calculateGcContent computes correct GC percent', () => {
  assert.equal(calculateGcContent('GGCC'), 100);
  assert.equal(calculateGcContent('AAUU'), 0);
  assert.equal(calculateGcContent('GAUC'), 50);
  assert.equal(calculateGcContent(''), 0);
});

test('performNeedlemanWunschAlignment correctly handles identical sequences (100% identity)', () => {
  const seq = 'GGGAUCUCCUGCAUGCGCUA';
  const result = performNeedlemanWunschAlignment(seq, seq, 'ALEX1_A', 'ALEX1_B');

  assert.equal(result.identityPercent, 100);
  assert.equal(result.similarityPercent, 100);
  assert.equal(result.gapsCount, 0);
  assert.equal(result.matchesCount, seq.length);
  assert.equal(result.homologyCategory, 'High Conservation (≥70%)');
  assert.equal(result.alignedSeq1, seq);
  assert.equal(result.alignedSeq2, seq);
  assert.ok(result.score > 0);
});

test('performNeedlemanWunschAlignment handles single nucleotide mismatches and gaps', () => {
  const seq1 = 'AUGCAUGC';
  const seq2 = 'AUGGAUGC'; // C -> G mismatch
  const result = performNeedlemanWunschAlignment(seq1, seq2);

  assert.ok(result.identityPercent < 100);
  assert.equal(result.matchesCount, 7);
  assert.equal(result.mismatchesCount, 1);
  assert.equal(result.gapsCount, 0);
  assert.equal(result.alignmentLength, 8);
});

test('performNeedlemanWunschAlignment generates valid chunked blocks and DP matrix preview', () => {
  const seq1 = 'AUGCAUGCAUGCAUGC';
  const seq2 = 'AUGCAUGGAUGCAUGC';
  const result = performNeedlemanWunschAlignment(seq1, seq2, 'Query', 'Subject', DEFAULT_ALIGNMENT_PARAMS, 8);

  assert.ok(result.blocks.length >= 2, 'Should create chunked blocks with size 8');
  assert.equal(result.blocks[0].seq1Chunk.length, 8);
  assert.ok(result.matrixPreview);
  assert.ok(result.matrixPreview.matrix.length > 0);
  assert.ok(result.matrixPreview.matrix[0][0].isTracebackPath);
});

test('performNeedlemanWunschAlignment handles empty sequences gracefully', () => {
  const result = performNeedlemanWunschAlignment('', 'AUGCAUGC');
  assert.equal(result.identityPercent, 0);
  assert.equal(result.alignmentLength, 0);
  assert.equal(result.blocks.length, 0);
});

test('formatPairwiseToFasta and formatPairwiseToTextReport produce valid outputs', () => {
  const seq1 = 'AUGCAUGC';
  const seq2 = 'AUGCAUGC';
  const result = performNeedlemanWunschAlignment(seq1, seq2, 'Transcript_A', 'Transcript_B');

  const fasta = formatPairwiseToFasta(result);
  assert.ok(fasta.includes('>Transcript_A'));
  assert.ok(fasta.includes('>Transcript_B'));

  const text = formatPairwiseToTextReport(result);
  assert.ok(text.includes('Identity Score'));
  assert.ok(text.includes('100%'));
  assert.ok(text.includes('Needleman-Wunsch'));
});
