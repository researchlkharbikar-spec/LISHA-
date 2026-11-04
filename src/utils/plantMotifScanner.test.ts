/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit tests for Plant Regulatory Motif Scanning
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  discoverRegulatoryMotifs,
  PLANT_REGULATORY_MOTIFS,
} from './motifDiscovery';

test('PLANT_REGULATORY_MOTIFS contains common plant-specific immune and stress elements', () => {
  const ids = PLANT_REGULATORY_MOTIFS.map((m) => m.id);
  assert.ok(ids.includes('w_box'), 'Should include W-box for WRKY plant immune defense');
  assert.ok(ids.includes('dre_crt'), 'Should include DRE/CRT for drought/cold acclimation');
  assert.ok(ids.includes('gcc_box'), 'Should include GCC-box for ethylene/pathogen defense');
  assert.ok(ids.includes('abre_core'), 'Should include ABRE core for ABA stress signaling');
  assert.ok(ids.includes('g_box'), 'Should include G-box for light and stress regulon');
});

test('discoverRegulatoryMotifs accurately detects W-box and GCC-box in plant sequence', () => {
  // Test sequence containing:
  // A-U-G-C-A-U (positions 1-6)
  // T-T-G-A-C-C (positions 7-12) - W-box
  // G-G-A-U (positions 13-16)
  // A-G-C-C-G-C-C (positions 17-23) - GCC-box
  // A-A-U-U (positions 24-27)
  const testSeq = 'AUGCAUTTGACCGGAUAGCCGCCAAUU';
  const result = discoverRegulatoryMotifs(testSeq);

  assert.ok(result.totalHitsCount > 0, 'Should find motif matches');
  const wboxHits = result.hits.filter((h) => h.motifId === 'w_box');
  assert.strictEqual(wboxHits.length, 1, 'Should find exactly 1 W-box match');
  assert.strictEqual(wboxHits[0].matchedSequence, 'UUGACC'); // RNA translated
  assert.strictEqual(wboxHits[0].start, 7); // 1-indexed

  const gccHits = result.hits.filter((h) => h.motifId === 'gcc_box');
  assert.strictEqual(gccHits.length, 1, 'Should find exactly 1 GCC-box match');
  assert.strictEqual(gccHits[0].matchedSequence, 'AGCCGCC');
  assert.strictEqual(gccHits[0].start, 17);
});

test('discoverRegulatoryMotifs handles rice lncRNA ALEX1 sequence and returns categorized hits', () => {
  const alex1Fragment = 'AUGACCGACAGCCGCCUUGACCGCAUGCGCAUGC';
  const result = discoverRegulatoryMotifs(alex1Fragment);

  assert.ok(result.hits.length >= 2, 'Should discover multiple plant regulatory motifs');
  assert.ok(result.categoryCounts['Biotic Defense'] >= 1, 'Should categorize biotic defense motifs');
  assert.ok(result.categoryCounts['Abiotic Stress'] >= 1, 'Should categorize abiotic stress motifs');
});

test('discoverRegulatoryMotifs handles empty sequence gracefully', () => {
  const result = discoverRegulatoryMotifs('');
  assert.strictEqual(result.totalHitsCount, 0);
  assert.strictEqual(result.hits.length, 0);
  assert.strictEqual(result.uniqueMotifsFoundCount, 0);
});
