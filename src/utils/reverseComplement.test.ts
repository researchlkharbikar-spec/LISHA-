/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit tests for Reverse Complement Utility
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  getComplementBase,
  getReverseComplement,
  getDirectComplement,
  getReverse,
  formatReverseComplementFasta,
  analyzeReverseComplement,
} from './reverseComplement';

test('getComplementBase correctly complements canonical and degenerate RNA and DNA bases', () => {
  // RNA
  assert.strictEqual(getComplementBase('A', true), 'U');
  assert.strictEqual(getComplementBase('U', true), 'A');
  assert.strictEqual(getComplementBase('T', true), 'A');
  assert.strictEqual(getComplementBase('C', true), 'G');
  assert.strictEqual(getComplementBase('G', true), 'C');
  assert.strictEqual(getComplementBase('r', true), 'y'); // lowercase preservation
  assert.strictEqual(getComplementBase('N', true), 'N');

  // DNA
  assert.strictEqual(getComplementBase('A', false), 'T');
  assert.strictEqual(getComplementBase('T', false), 'A');
  assert.strictEqual(getComplementBase('C', false), 'G');
  assert.strictEqual(getComplementBase('G', false), 'C');
});

test('getReverseComplement correctly inverts and complements RNA sequences', () => {
  // 5'-AUGCCG-3' -> complement is 3'-UACGGC-5' -> reverse complement (5'->3') is 5'-CGGCAU-3'
  const rnaSeq = 'AUGCCG';
  const revComp = getReverseComplement(rnaSeq, true);
  assert.strictEqual(revComp, 'CGGCAU');

  // Palindromic sequence in RNA: 5'-UUAAGCGUAA-3'
  const seq2 = 'AACCGGUU';
  // Comp: UUGGCAAA -> rev: AAACCGGU
  assert.strictEqual(getReverseComplement(seq2, true), 'AACCGGUU');
});

test('getDirectComplement and getReverse work as expected', () => {
  const seq = 'AUCG';
  assert.strictEqual(getDirectComplement(seq, true), 'UAGC');
  assert.strictEqual(getReverse(seq), 'GCUA');
});

test('analyzeReverseComplement computes accurate duplex pairing and biophysical metrics', () => {
  const seq = 'AUGCAUGC';
  const analysis = analyzeReverseComplement(seq, true);

  assert.strictEqual(analysis.length, 8);
  assert.strictEqual(analysis.originalSequence, 'AUGCAUGC');
  assert.strictEqual(analysis.reverseComplement, 'GCAUGCAU');
  assert.strictEqual(analysis.directComplement, 'UACGUACG');
  assert.strictEqual(analysis.reverseOnly, 'CGUACGUA');

  // 100% Watson-Crick pairing against direct complement in duplex
  assert.strictEqual(analysis.duplexAlignment.wcPairs, 8);
  assert.strictEqual(analysis.duplexAlignment.mismatches, 0);
  assert.strictEqual(analysis.duplexAlignment.pairingPercentage, 100);
  assert.strictEqual(analysis.originalGcPercent, 50);
  assert.strictEqual(analysis.revCompGcPercent, 50);
  assert.ok(analysis.estimatedDuplexTm > 0);
  assert.ok(analysis.estimatedDuplexMfeKcal < 0);
});

test('analyzeReverseComplement handles empty input gracefully', () => {
  const emptyAnalysis = analyzeReverseComplement('', true);
  assert.strictEqual(emptyAnalysis.length, 0);
  assert.strictEqual(emptyAnalysis.reverseComplement, '');
  assert.strictEqual(emptyAnalysis.duplexAlignment.pairingPercentage, 0);
});

test('formatReverseComplementFasta produces valid FASTA with metadata header', () => {
  const fasta = formatReverseComplementFasta('ALEX1', 'CGGCAUAGCG', 10, true);
  assert.ok(fasta.startsWith('>ALEX1_RevComp'));
  assert.ok(fasta.includes('Length: 10 nt'));
  assert.ok(fasta.includes('CGGCAUAGCG'));
});
