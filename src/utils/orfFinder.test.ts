/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit tests for ORF Finder and Genetic Code Translation
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  translateRnaToPeptide,
  findOpenReadingFrames,
  calculatePlantKozakContext,
  formatOrfsToFasta,
  RNA_CODON_TABLE,
} from './orfFinder';

test('translateRnaToPeptide translates RNA codons into amino acid sequence accurately', () => {
  // AUG (M), GCU (A), GAU (D), UAA (Stop)
  const rna = 'AUGGCUGAUUAA';
  const peptide = translateRnaToPeptide(rna);
  assert.strictEqual(peptide, 'MAD');

  // Converts DNA T to U automatically
  const dna = 'ATGCCCAAATAG';
  const peptide2 = translateRnaToPeptide(dna);
  assert.strictEqual(peptide2, 'MPK');
});

test('findOpenReadingFrames identifies canonical in-frame ORFs with coordinates and length', () => {
  // Construct a sequence with a 15-aa ORF in Frame +1:
  // Starts with AUG (pos 1), 14 amino acid codons, then UAA stop codon
  // 1 + 14 = 15 aa = 45 nt + 3 nt stop = 48 nt
  const codons = [
    'AUG', // 1: M
    'GCU', 'GCU', 'GCU', 'GCU', 'GCU', // 2-6: AAAAA
    'AAU', 'AAU', 'AAU', 'AAU', 'AAU', // 7-11: NNNNN
    'GAU', 'GAU', 'GAU', 'GAU', // 12-15: DDDD
    'UAA', // Stop
  ];
  const testSeq = codons.join('');

  const result = findOpenReadingFrames(testSeq, { minAaLength: 10 });

  assert.ok(result.totalOrfsCount >= 1, 'Should find at least 1 ORF');
  const orf = result.orfs[0];
  assert.strictEqual(orf.frame, '+1');
  assert.strictEqual(orf.start, 1);
  assert.strictEqual(orf.end, 48);
  assert.strictEqual(orf.aaLength, 15);
  assert.strictEqual(orf.ntLength, 48);
  assert.strictEqual(orf.startCodon, 'AUG');
  assert.strictEqual(orf.stopCodon, 'UAA');
  assert.strictEqual(orf.peptideSequence, 'MAAAAANNNNNDDDD');
  assert.strictEqual(result.longestAaLength, 15);
  assert.strictEqual(result.bonaFideNonCoding, true);
});

test('findOpenReadingFrames detects ORFs in frame +2 and frame +3', () => {
  // Prefix with 1 nucleotide for Frame +2:
  // C + AUG(14 codons)UAA
  const codons = ['AUG', 'GCU', 'GCU', 'GCU', 'GCU', 'GCU', 'AAU', 'AAU', 'AAU', 'AAU', 'AAU', 'GAU', 'GAU', 'GAU', 'GAU', 'UAG'];
  const frame2Seq = 'C' + codons.join('');

  const result = findOpenReadingFrames(frame2Seq, { minAaLength: 10 });
  const f2Orfs = result.orfs.filter((o) => o.frame === '+2');
  assert.ok(f2Orfs.length >= 1, 'Should find frame +2 ORF');
  assert.strictEqual(f2Orfs[0].start, 2); // 1-indexed

  // Prefix with 2 nucleotides for Frame +3:
  const frame3Seq = 'CC' + codons.join('');
  const result3 = findOpenReadingFrames(frame3Seq, { minAaLength: 10 });
  const f3Orfs = result3.orfs.filter((o) => o.frame === '+3');
  assert.ok(f3Orfs.length >= 1, 'Should find frame +3 ORF');
  assert.strictEqual(f3Orfs[0].start, 3);
});

test('calculatePlantKozakContext scores purine at -3 and G at +4', () => {
  // Sequence: A-A-A-AUG-G-C-U
  // Position of AUG start is index 3
  const seq = 'AAAAUGGCU';
  const kozak = calculatePlantKozakContext(seq, 3);
  assert.strictEqual(kozak.scorePercent, 100);
  assert.strictEqual(kozak.context, 'AAAAUGG');
});

test('findOpenReadingFrames handles empty and short sequences gracefully', () => {
  const result = findOpenReadingFrames('');
  assert.strictEqual(result.totalOrfsCount, 0);
  assert.strictEqual(result.longestAaLength, 0);
  assert.strictEqual(result.bonaFideNonCoding, true);
});

test('formatOrfsToFasta produces valid FASTA formatting for identified ORFs', () => {
  const testSeq = 'AUG' + 'GCU'.repeat(15) + 'UGA';
  const result = findOpenReadingFrames(testSeq, { minAaLength: 10 });
  const fasta = formatOrfsToFasta(result.orfs, 'ALEX1', true);
  assert.ok(fasta.startsWith('>ALEX1_ORF1'));
  assert.ok(fasta.includes('Frame: +1'));
  assert.ok(fasta.includes('16 aa'));
});
