import { test } from 'node:test';
import assert from 'node:assert';
import { generateBiophysicalFasta, wrapSequence } from './fastaExporter';

test('wrapSequence wraps long sequences into specified line length', () => {
  const seq = 'AUGC'.repeat(30); // 120 nt
  const wrapped60 = wrapSequence(seq, 60);
  assert.strictEqual(wrapped60.length, 2);
  assert.strictEqual(wrapped60[0].length, 60);
  assert.strictEqual(wrapped60[1].length, 60);

  const wrapped80 = wrapSequence(seq, 80);
  assert.strictEqual(wrapped80.length, 2);
  assert.strictEqual(wrapped80[0].length, 80);
  assert.strictEqual(wrapped80[1].length, 40);

  const noWrap = wrapSequence(seq, 0);
  assert.strictEqual(noWrap.length, 1);
  assert.strictEqual(noWrap[0].length, 120);
});

test('generateBiophysicalFasta creates valid bracket-attributes FASTA header with biophysical metrics', () => {
  const result = generateBiophysicalFasta({
    identifier: 'ALEX1',
    sequence: 'AUGCGAUCCGAAUUGCCGAAUGC',
    headerStyle: 'bracket-attributes',
    lineWrap: 60,
  });

  assert(result.header.startsWith('>ALEX1'));
  assert(result.header.includes('[length=23nt]'));
  assert(result.header.includes('[molecule=lncRNA]'));
  assert(result.header.includes('[gc='));
  assert(result.header.includes('[tm_nn='));
  assert(result.header.includes('[dg37='));
  assert(result.header.includes('[mfe='));
  assert(result.rawFastaText.startsWith('>ALEX1'));
  assert(result.rawFastaText.includes('AUGCGAUCCGAAUUGCCGAAUGC'));
  assert.strictEqual(result.metadata.length, 23);
  assert(result.metadata.tmNearestNeighbor > 0);
});

test('generateBiophysicalFasta creates pipe-delimited format', () => {
  const result = generateBiophysicalFasta({
    identifier: 'lncRNA-Rsm1',
    sequence: 'GGGAAACCCUUUGGGAAACCCUUU',
    headerStyle: 'pipe-delimited',
    organism: 'Oryza sativa',
  });

  assert(result.header.includes('>lncRNA-Rsm1 | Organism: Oryza sativa | Type: lncRNA | Length: 24nt | GC:'));
  assert(result.header.includes('Tm(NN):'));
  assert(result.header.includes('ΔG°37:'));
});

test('generateBiophysicalFasta creates ViennaRNA format with secondary structure line', () => {
  const result = generateBiophysicalFasta({
    identifier: 'Hairpin_lncRNA',
    sequence: 'GGGGAAAACCCC',
    headerStyle: 'viennarna-structure',
  });

  assert(result.header.startsWith('>Hairpin_lncRNA'));
  assert.strictEqual(result.sequenceLines[0], 'GGGGAAAACCCC');
  assert(result.structureLine !== undefined);
  assert(result.structureLine.includes('kcal/mol'));
  assert(result.rawFastaText.includes('GGGGAAAACCCC\n((((....))))'));
});

test('generateBiophysicalFasta creates detailed-biophysical header with ionic conditions', () => {
  const result = generateBiophysicalFasta({
    identifier: 'Stress_Probe',
    sequence: 'AUCGAUCGAUCG',
    headerStyle: 'detailed-biophysical',
    saltNaM: 0.15, // 150 mM
    saltMgM: 0.002, // 2 mM
    isHairpin: true,
  });

  assert(result.header.includes('[base_counts=A:3,C:3,G:3,U/T:3]'));
  assert(result.header.includes('[ionic_conditions="Na+:150mM, Mg2+:2mM, Ct:1uM, Hairpin(monomolecular)"]'));
  assert(result.header.includes('[delta_h_nn='));
  assert(result.header.includes('[delta_s_nn='));
  assert(result.header.includes('[tm_wallace='));
});

test('generateBiophysicalFasta converts to cDNA when asDna is true', () => {
  const result = generateBiophysicalFasta({
    identifier: 'cDNA_clone',
    sequence: 'AUGCUUUAA',
    asDna: true,
  });

  assert.strictEqual(result.sequenceLines[0], 'ATGCTTTAA');
  assert(result.header.includes('cDNA'));
  assert.strictEqual(result.metadata.isDna, true);
});
