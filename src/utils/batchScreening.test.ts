import { test } from 'node:test';
import assert from 'node:assert';
import {
  parseBatchSequenceInput,
  screenSingleBatchSequence,
  computeBatchScreeningSummary,
  exportBatchToCsv,
  exportBatchToMultiFasta,
} from './batchScreening';

test('parseBatchSequenceInput parses multi-FASTA format accurately', () => {
  const multiFasta = `
>ALEX1_test
AUGCAUGCAUGCAUGC
>Rsm1_test
GGCCGGCCGGCCGGCC
  `;

  const records = parseBatchSequenceInput(multiFasta);
  assert.strictEqual(records.length, 2);
  assert.strictEqual(records[0].name, 'ALEX1_test');
  assert.strictEqual(records[0].rawSequence, 'AUGCAUGCAUGCAUGC');
  assert.strictEqual(records[1].name, 'Rsm1_test');
  assert.strictEqual(records[1].rawSequence, 'GGCCGGCCGGCCGGCC');
});

test('parseBatchSequenceInput parses comma and tab-separated input', () => {
  const csv = 'Candidate_1,AUGCAUGC\nCandidate_2,GCCCGCCC';
  const records = parseBatchSequenceInput(csv);
  assert.strictEqual(records.length, 2);
  assert.strictEqual(records[0].name, 'Candidate_1');
  assert.strictEqual(records[0].rawSequence, 'AUGCAUGC');
});

test('screenSingleBatchSequence computes homology, thermodynamics, and structure', () => {
  const record = {
    id: 'test_1',
    name: 'Rice_Probe',
    rawSequence: 'GGGAUCUCCUGCAUGCGCUAGCUAGCUAGCUAGCUGACUGACUGACUGACUGACUGACUGAACCCUGGAUCAUGCUA',
  };

  const screened = screenSingleBatchSequence(record);
  assert.strictEqual(screened.isValid, true);
  assert(screened.length > 50);
  assert(screened.tmSaltAdjusted > 40);
  assert(screened.freeEnergyDeltaG37 !== 0);
  assert(screened.topHomologyTemplate !== 'None');
  assert(screened.topSimilarityPercent > 0);
  assert(screened.mfeKcal !== 0);
});

test('computeBatchScreeningSummary aggregates batch metrics correctly', () => {
  const items = [
    screenSingleBatchSequence({ id: '1', name: 'Seq1', rawSequence: 'AUGC'.repeat(15) }),
    screenSingleBatchSequence({ id: '2', name: 'Seq2', rawSequence: 'GCCG'.repeat(15) }),
  ];

  const summary = computeBatchScreeningSummary(items);
  assert.strictEqual(summary.totalSequences, 2);
  assert.strictEqual(summary.validSequences, 2);
  assert(summary.averageTm > 0);
  assert(summary.averageGcPercent > 0);
});

test('exportBatchToCsv and exportBatchToMultiFasta produce valid formatted strings', () => {
  const items = [
    screenSingleBatchSequence({ id: '1', name: 'SeqA', rawSequence: 'AUGC'.repeat(10) }),
  ];

  const csv = exportBatchToCsv(items);
  assert(csv.includes('Sequence_Name'));
  assert(csv.includes('SeqA'));

  const fasta = exportBatchToMultiFasta(items);
  assert(fasta.startsWith('>SeqA'));
  assert(fasta.includes('[tm_nn='));
});
