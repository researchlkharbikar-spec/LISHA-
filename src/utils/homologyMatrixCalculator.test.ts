/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit tests for homologyMatrixCalculator utility
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { calculateHomologySequenceMatrix } from './homologyMatrixCalculator';
import { CURATED_LNCRNAS } from '../data/curatedLncRNAs';

test('calculateHomologySequenceMatrix handles empty sequence gracefully', () => {
  const result = calculateHomologySequenceMatrix('');
  assert.strictEqual(result.queryLength, 0);
  assert.strictEqual(result.columnsCount, 0);
  assert.strictEqual(result.cells.length, 0);
});

test('calculateHomologySequenceMatrix computes sequence matrix with proper dimensions', () => {
  const testQuery = 'GGGAGCCUUGGCUCCGCGCGGCCAUUGGAGCUAGCCUUGGCUAGAGCGUGUACUUGCCCUUGGA';
  const blockSize = 10;
  const result = calculateHomologySequenceMatrix(testQuery, CURATED_LNCRNAS, blockSize);

  assert.strictEqual(result.queryLength, testQuery.length);
  const expectedCols = Math.ceil(testQuery.length / blockSize);
  assert.strictEqual(result.columnsCount, expectedCols);
  assert.strictEqual(result.cells.length, CURATED_LNCRNAS.length);
  assert.strictEqual(result.cells[0].length, expectedCols);

  // Check first cell attributes
  const firstCell = result.cells[0][0];
  assert.strictEqual(firstCell.startPos, 1);
  assert.strictEqual(firstCell.endPos, 10);
  assert.ok(firstCell.identityPercent >= 0 && firstCell.identityPercent <= 100);
  assert.ok(firstCell.homologName.length > 0);

  // Check column summaries
  assert.strictEqual(result.columnSummaries.length, expectedCols);
  assert.ok(result.columnSummaries[0].meanIdentityPercent >= 0);

  // Check row summaries
  assert.strictEqual(result.rowSummaries.length, CURATED_LNCRNAS.length);
  assert.ok(result.rowSummaries[0].globalIdentityPercent >= 0);
});
