import { test } from 'node:test';
import assert from 'node:assert';
import {
  performMultiSequenceAlignment,
  formatToClustalAln,
  formatToAlignedFasta,
  type MsaInputSequence,
} from './msaAlignment';

test('performMultiSequenceAlignment aligns multiple sequences to equal length', () => {
  const sequences: MsaInputSequence[] = [
    { id: '1', name: 'SeqA', sequence: 'AUGCAUGCAUGC' },
    { id: '2', name: 'SeqB', sequence: 'AUGCAUGCAUGC' },
    { id: '3', name: 'SeqC', sequence: 'AUGCAUGCAUGC' },
  ];

  const result = performMultiSequenceAlignment(sequences);
  assert.strictEqual(result.alignedSequences.length, 3);
  assert.strictEqual(result.alignedSequences[0].alignedSeq.length, result.alignedSequences[1].alignedSeq.length);
  assert.strictEqual(result.identicalColumnsCount, 12);
  assert.strictEqual(result.meanConservationPercent, 100);
});

test('performMultiSequenceAlignment handles variable-length sequences with gaps', () => {
  const sequences: MsaInputSequence[] = [
    { id: '1', name: 'Short', sequence: 'AUGC' },
    { id: '2', name: 'Long', sequence: 'AUGCAAUGC' },
  ];

  const result = performMultiSequenceAlignment(sequences);
  assert.strictEqual(result.alignedSequences[0].alignedSeq.length, result.alignedSequences[1].alignedSeq.length);
  assert(result.alignedSequences[0].gapCount > 0);
  assert(result.columns.length > 0);
});

test('formatToClustalAln generates standard Clustal block format', () => {
  const sequences: MsaInputSequence[] = [
    { id: '1', name: 'ALEX1', sequence: 'AUGC'.repeat(20) }, // 80 nt
    { id: '2', name: 'Rsm1', sequence: 'AUGC'.repeat(20) },
  ];

  const result = performMultiSequenceAlignment(sequences);
  const clustal = formatToClustalAln(result, 60);

  assert(clustal.includes('CLUSTAL W (1.83) multiple sequence alignment'));
  assert(clustal.includes('ALEX1'));
  assert(clustal.includes('Rsm1'));
  assert(clustal.includes('*'));
});

test('formatToAlignedFasta generates valid FASTA with aligned sequences', () => {
  const sequences: MsaInputSequence[] = [
    { id: '1', name: 'Seq1', sequence: 'AUGCAUGC' },
    { id: '2', name: 'Seq2', sequence: 'AUGCAUGC' },
  ];

  const result = performMultiSequenceAlignment(sequences);
  const fasta = formatToAlignedFasta(result);

  assert(fasta.startsWith('>Seq1'));
  assert(fasta.includes('>Seq2'));
});
