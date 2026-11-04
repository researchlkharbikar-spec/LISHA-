/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit tests for NCBI BLAST utility
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  formatSeqForBlast,
  buildNcbiBlastUrl,
} from './ncbiBlast';

test('formatSeqForBlast converts RNA Uracil to Thymine and formats valid FASTA header', () => {
  const rnaSeq = 'AUGCCGAUUGAC';
  const payload = formatSeqForBlast(rnaSeq, 'ALEX1 (Oryza sativa)');

  assert.strictEqual(payload.cleanSeq, 'ATGCCGATTGAC');
  assert.ok(payload.fasta.startsWith('>ALEX1_Oryza_sativa'));
  assert.ok(payload.fasta.includes('Length: 12 nt'));
  assert.ok(payload.fasta.includes('ATGCCGATTGAC'));
  assert.ok(payload.url.startsWith('https://blast.ncbi.nlm.nih.gov/Blast.cgi?PROGRAM=blastn&PAGE=MegaBlast&QUERY='));
});

test('buildNcbiBlastUrl generates valid URL-encoded NCBI BLAST web link', () => {
  const url = buildNcbiBlastUrl('AUGCAUGC', 'Test_lncRNA');
  assert.ok(url.includes('blast.ncbi.nlm.nih.gov'));
  assert.ok(url.includes('PROGRAM=blastn'));
  assert.ok(url.includes('PAGE=MegaBlast'));
  assert.ok(url.includes('QUERY='));
  assert.ok(url.includes('ATGCATGC'));
});

test('formatSeqForBlast sanitizes special characters in name and sequence', () => {
  const dirtySeq = '  aug c  g-u!\n';
  const dirtyName = 'lncRNA / 123 # $ (Plant)';
  const payload = formatSeqForBlast(dirtySeq, dirtyName);

  assert.strictEqual(payload.cleanSeq, 'ATGCGT');
  assert.ok(payload.fasta.includes('>lncRNA_123_Plant'));
});
