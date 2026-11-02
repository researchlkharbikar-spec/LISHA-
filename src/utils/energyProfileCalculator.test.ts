/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit tests for energyProfileCalculator utility
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { calculateEnergyProfile } from './energyProfileCalculator';

test('calculateEnergyProfile handles empty sequence gracefully', () => {
  const result = calculateEnergyProfile('');
  assert.strictEqual(result.dataPoints.length, 0);
  assert.strictEqual(result.summary.sequenceLength, 0);
});

test('calculateEnergyProfile computes valid data points across RNA sequence', () => {
  // A test sequence with GC-rich hairpin and AU-rich loop
  const seq = 'GGGAGCCUUGGCUCCGCGCGGCCAUUGGAGCUAGCCUUGGCUAGAGCGUGUACUUGCCCUUGGA';
  const result = calculateEnergyProfile(seq, 20);

  assert.strictEqual(result.dataPoints.length, seq.length);
  assert.strictEqual(result.summary.sequenceLength, seq.length);
  assert.ok(result.summary.minDeltaG <= 0, 'Min deltaG should be negative or zero');
  assert.ok(result.summary.meanDeltaG <= 0, 'Mean deltaG should be negative');

  const firstPt = result.dataPoints[0];
  assert.strictEqual(firstPt.position, 1);
  assert.strictEqual(firstPt.base, 'G');
  assert.ok(firstPt.windowStart >= 1);
  assert.ok(firstPt.windowEnd <= seq.length);
  assert.ok(firstPt.gcPercent >= 0 && firstPt.gcPercent <= 100);
});

test('calculateEnergyProfile identifies stable domains and flexible pockets', () => {
  // Strongly structured sequence with alternating GC and AU blocks
  const seq = 'GCGCGCGCGCGCGCGCUUUUUUUUUUUUUUUUGCGCGCGCGCGCGCGC';
  const result = calculateEnergyProfile(seq, 16);

  assert.ok(result.summary.minDeltaG < 0, 'Should find stable negative free energy in GC regions');
  assert.ok(result.summary.maxDeltaG >= result.summary.minDeltaG);
});
