/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit tests for stemLoopPredictor utility
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  isRnaBasePair,
  estimateStemLoopFoldEnergy,
  predictStemLoops,
} from './stemLoopPredictor';

test('isRnaBasePair identifies Watson-Crick and Wobble pairs', () => {
  assert.strictEqual(isRnaBasePair('G', 'C'), 'GC');
  assert.strictEqual(isRnaBasePair('C', 'G'), 'GC');
  assert.strictEqual(isRnaBasePair('A', 'U'), 'AU');
  assert.strictEqual(isRnaBasePair('U', 'A'), 'AU');
  assert.strictEqual(isRnaBasePair('G', 'U'), 'GU');
  assert.strictEqual(isRnaBasePair('U', 'G'), 'GU');
  assert.strictEqual(isRnaBasePair('A', 'C'), null);
  assert.strictEqual(isRnaBasePair('G', 'A'), null);
});

test('estimateStemLoopFoldEnergy computes negative free energy for stable hairpins', () => {
  // GC-rich stem of 4 base pairs with GAAA tetraloop
  const mockBasePairs = [
    { pos5: 1, pos3: 12, base5: 'G', base3: 'C', pairType: 'GC' as const, stackingDeltaG: -2.8 },
    { pos5: 2, pos3: 11, base5: 'G', base3: 'C', pairType: 'GC' as const, stackingDeltaG: -3.3 },
    { pos5: 3, pos3: 10, base5: 'C', base3: 'G', pairType: 'GC' as const, stackingDeltaG: -2.4 },
    { pos5: 4, pos3: 9, base5: 'C', base3: 'G', pairType: 'GC' as const, stackingDeltaG: 0 },
  ];

  const energy = estimateStemLoopFoldEnergy(mockBasePairs, 'GAAA', 'GGCC', 'GGCC');
  assert.ok(energy.stemDeltaG < 0, 'Stem stacking energy should be negative');
  assert.ok(energy.loopPenalty > 0, 'Loop penalty should be positive');
  assert.ok(energy.specialBonus < 0, 'GAAA tetraloop should provide bonus');
  assert.ok(energy.deltaG37 < 0, 'Total deltaG should be negative (stable)');
  assert.ok(energy.meltingTemperatureTm > 50, 'Tm should be elevated for GC-rich tetraloop');
});

test('predictStemLoops extracts hairpins from known plant lncRNA sequence', () => {
  // Sequence containing an engineered GC hairpin with UUCG tetraloop
  // 5' - AAAAA GGCGC UUCG GCGCC UUUUU - 3'
  const testSeq = 'AAAAAGGCGCUUCGGCGCCUUUUU';
  const candidates = predictStemLoops(testSeq, { minStemLength: 3 });

  assert.ok(candidates.length > 0, 'Should find at least one stem-loop');
  const top = candidates[0];
  assert.strictEqual(top.loopSequence, 'UUCG', 'Should identify UUCG loop');
  assert.strictEqual(top.hasTetraloop, true, 'Should detect UNCG tetraloop');
  assert.ok(top.foldEnergy.deltaG37 < 0, 'Fold energy should be negative');
  assert.strictEqual(top.stemLength >= 4, true, 'Stem length should be >= 4');
});

test('predictStemLoops handles realistic rice lncRNA ALEX1 fragment', () => {
  const alex1 = 'GGGAGCCUUGGCUCCGCGCGGCCAUUGGAGCUAGCCUUGGCUAGAGCGUGUACUUGCCCUUGGA';
  const candidates = predictStemLoops(alex1, { minStemLength: 3, maxCandidates: 10 });

  assert.ok(candidates.length > 0, 'Should find stem-loops in ALEX1');
  assert.ok(candidates[0].foldEnergy.deltaG37 <= candidates[1]?.foldEnergy.deltaG37 || candidates.length === 1);
  assert.ok(candidates[0].start >= 1);
  assert.ok(candidates[0].end <= alex1.length);
});
