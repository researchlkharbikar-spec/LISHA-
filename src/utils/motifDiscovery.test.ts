import { test } from 'node:test';
import assert from 'node:assert';
import {
  convertIupacToRegex,
  findMotifHitsInSequence,
  calculateKmerFrequencies,
  discoverRegulatoryMotifs,
  PLANT_REGULATORY_MOTIFS,
} from './motifDiscovery';

test('convertIupacToRegex converts IUPAC codes into correct RNA regex', () => {
  // R = [AG], Y = [CU]
  const regexR = convertIupacToRegex('RCCGAC');
  assert(regexR.test('ACCGAC'));
  assert(regexR.test('GCCGAC'));
  assert(!regexR.test('CCCCAC'));

  // Y = [CU]
  const regexY = convertIupacToRegex('UUGACY');
  assert(regexY.test('UUGACU'));
  assert(regexY.test('UUGACC'));
  assert(!regexY.test('UUGACA'));

  // Conversion of DNA T to RNA U
  const regexT = convertIupacToRegex('TTGAC');
  assert(regexT.test('UUGAC'));
});

test('findMotifHitsInSequence finds exact matches with 1-indexed coordinates', () => {
  const seq = 'GGGAACCGACAAAUUGA';
  const dreMotif = PLANT_REGULATORY_MOTIFS.find((m) => m.id === 'dre_crt')!;

  const hits = findMotifHitsInSequence(seq, dreMotif);
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].start, 5); // GGG[A]CCGAC => pos 5
  assert.strictEqual(hits[0].end, 10);
  assert.strictEqual(hits[0].matchedSequence, 'ACCGAC');
});

test('findMotifHitsInSequence detects overlapping motif matches correctly', () => {
  // ARE element is AUUUA. In AUUUAUUUA, there are 2 matches: pos 1-5 and pos 5-9
  const seq = 'AUUUAUUUA';
  const areMotif = PLANT_REGULATORY_MOTIFS.find((m) => m.id === 'are_instability')!;

  const hits = findMotifHitsInSequence(seq, areMotif);
  assert.strictEqual(hits.length, 2);
  assert.strictEqual(hits[0].start, 1);
  assert.strictEqual(hits[0].end, 5);
  assert.strictEqual(hits[1].start, 5);
  assert.strictEqual(hits[1].end, 9);
});

test('calculateKmerFrequencies identifies overrepresented short words', () => {
  const seq = 'AUCGAUCGAUCGAUCGAUCG'; // 5x repeats of AUCG
  const kmers = calculateKmerFrequencies(seq, 4, 5);
  assert(kmers.length > 0);
  assert.strictEqual(kmers[0].kmer, 'AUCG');
  assert.strictEqual(kmers[0].count, 5);
});

test('discoverRegulatoryMotifs identifies multiple functional motif classes', () => {
  // Sequence containing DRE (ACCGAC), W-box (UUGACC), and PAS (AAUAAA)
  const testSeq = 'AUGCCACCGACUUUUGACCAAAGCAAUAAAGCC';
  const result = discoverRegulatoryMotifs(testSeq);

  assert(result.totalHitsCount >= 3);
  assert(result.categoryCounts['Abiotic Stress'] >= 1);
  assert(result.categoryCounts['Biotic Defense'] >= 1);
  assert(result.categoryCounts['RNA Processing & Stability'] >= 1);

  const matchedNames = result.hits.map((h) => h.motifName);
  assert(matchedNames.includes('DRE / CRT Core'));
  assert(matchedNames.includes('W-box (WRKY Binding)'));
  assert(matchedNames.includes('PAS (Polyadenylation Signal)'));
});
